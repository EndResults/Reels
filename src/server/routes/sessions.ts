import express from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { upload, getFileUrl } from '../lib/fileUpload';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import axios from 'axios';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Validation schemas
const createSessionSchema = Joi.object({
  retailerId: Joi.string().uuid().required(),
  shopId: Joi.string().uuid().required(),
  productId: Joi.string().optional()
});

// Middleware to verify JWT token
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Geen authenticatie token gevonden'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.userType !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Alleen consumers hebben toegang tot deze functie'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Ongeldige authenticatie token'
    });
  }
};

// POST /create - Create new FiT session with photo upload
router.post('/create', authenticateUser, upload.single('photo'), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Geen foto geüpload'
      });
    }

    // Validate input
    const { error: validationError, value } = createSessionSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Validatiefout',
        errors: validationError.details.map(detail => detail.message)
      });
    }

    const { retailerId, shopId, productId } = value;

    // Verify retailer exists and is active
    const { data: retailer, error: retailerError } = await supabaseAdmin
      .from('retailers')
      .select('id, shop_name, is_active, sessions_used, sessions_limit')
      .eq('id', retailerId)
      .eq('is_active', true)
      .single();

    if (retailerError || !retailer) {
      return res.status(404).json({
        success: false,
        message: 'Retailer niet gevonden of niet actief'
      });
    }

    // Check session limits
    if (retailer.sessions_used >= retailer.sessions_limit) {
      return res.status(403).json({
        success: false,
        message: 'Retailer heeft sessie limiet bereikt'
      });
    }

    // Verify shop exists and belongs to retailer
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, retailer_id, is_active')
      .eq('id', shopId)
      .single();
    if (shopError || !shop || shop.retailer_id !== retailerId || shop.is_active === false) {
      return res.status(404).json({
        success: false,
        message: 'Webshop niet gevonden of niet actief'
      });
    }

    // Create session record
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('fit_sessions')
      .insert({
        user_id: userId,
        retailer_id: retailerId,
        shop_id: shopId,
        product_id: productId,
        photo_url: req.file.path,
        status: 'PENDING'
      })
      .select()
      .single();

    if (sessionError) {
      throw sessionError;
    }

    // Update retailer session count
    await supabaseAdmin
      .from('retailers')
      .update({ 
        sessions_used: retailer.sessions_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', retailerId);

    // Start AI processing (async)
    processSessionAsync(session.id, req.file.path);

    const photoUrl = getFileUrl(req.file.path);

    return res.status(201).json({
      success: true,
      message: 'FiT sessie succesvol gestart',
      data: {
        sessionId: session.id,
        photoUrl: photoUrl,
        status: 'PENDING',
        shopId: shopId,
        retailer: {
          id: retailer.id,
          shopName: retailer.shop_name
        }
      }
    });

  } catch (error) {
    console.error('Create session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het starten van de sessie'
    });
  }
});

// GET /user/:userId - Get sessions for user
router.get('/user/:userId', authenticateUser, async (req: any, res) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.userId;

    // Users can only view their own sessions
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Geen toegang tot deze sessies'
      });
    }

    const { data: sessions, error } = await supabaseAdmin
      .from('fit_sessions')
      .select(`
        *,
        shops:shop_id ( id, name ),
        retailers (
          id,
          shop_name,
          shop_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const formattedSessions = sessions.map(session => {
      const shopRel = Array.isArray(session.shops) ? session.shops[0] : session.shops;
      return {
        id: session.id,
        shopId: session.shop_id || (shopRel ? shopRel.id : null),
        shop: shopRel ? { id: shopRel.id, name: shopRel.name } : null,
        photoUrl: getFileUrl(session.photo_url),
        resultUrl: session.result_url ? getFileUrl(session.result_url) : null,
        status: session.status,
        productId: session.product_id,
        aiProcessingData: session.ai_processing_data,
        retailer: session.retailers,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    });

    return res.json({
      success: true,
      data: formattedSessions
    });

  } catch (error) {
    console.error('Get user sessions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van sessies'
    });
  }
});

// GET /:sessionId - Get specific session
router.get('/:sessionId', authenticateUser, async (req: any, res) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.user.userId;

    const { data: session, error } = await supabaseAdmin
      .from('fit_sessions')
      .select(`
        *,
        shops:shop_id ( id, name ),
        retailers (
          id,
          shop_name,
          shop_url
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: 'Sessie niet gevonden'
      });
    }

    const shopRel = Array.isArray(session.shops) ? session.shops[0] : session.shops;
    const formattedSession = {
      id: session.id,
      shopId: session.shop_id || (shopRel ? shopRel.id : null),
      shop: shopRel ? { id: shopRel.id, name: shopRel.name } : null,
      photoUrl: getFileUrl(session.photo_url),
      resultUrl: session.result_url ? getFileUrl(session.result_url) : null,
      status: session.status,
      productId: session.product_id,
      aiProcessingData: session.ai_processing_data,
      retailer: session.retailers,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };

    return res.json({
      success: true,
      data: formattedSession
    });

  } catch (error) {
    console.error('Get session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van de sessie'
    });
  }
});

// POST /feedback - Save satisfaction and feedback for a session (logged-in user)
router.post('/feedback', authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.body?.sessionId;
    const satisfied = !!req.body?.satisfied;
    const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback : null;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is verplicht' });
      return;
    }

    // Ensure session belongs to the user
    const { data: session, error: sErr } = await supabaseAdmin
      .from('fit_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sErr || !session || session.user_id !== userId) {
      res.status(403).json({ success: false, message: 'Geen toegang tot deze sessie' });
      return;
    }

    const { error: uErr } = await supabaseAdmin
      .from('fit_sessions')
      .update({ satisfied, feedback, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (uErr) {
      res.status(500).json({ success: false, message: 'Opslaan van feedback mislukt' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Feedback save error:', err);
    res.status(500).json({ success: false, message: 'Interne serverfout' });
  }
});

// Async function to process session with AI
async function processSessionAsync(sessionId: string, photoPath: string) {
  try {
    console.log(`🤖 Starting AI processing for session ${sessionId}`);
    
    // Update session status to PROCESSING
    await supabaseAdmin
      .from('fit_sessions')
      .update({ 
        status: 'PROCESSING',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Call n8n webhook for AI processing
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    const photoUrl = getFileUrl(photoPath);
    await axios.post(n8nWebhookUrl, {
      sessionId: sessionId,
      photoUrl: `${process.env.VITE_API_URL}${photoUrl}`,
      apiKey: process.env.N8N_API_KEY
    }, {
      timeout: 30000 // 30 second timeout
    });

    console.log(`✅ AI processing initiated for session ${sessionId}`);
    
    // Note: The actual completion will be handled by a webhook from n8n
    // For now, we just mark it as processing
  } catch (error) {
    console.error(`❌ AI processing failed for session ${sessionId}:`, error);
    
    // Update session status to FAILED
    await supabaseAdmin
      .from('fit_sessions')
      .update({ 
        status: 'FAILED',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }
}

export default router;