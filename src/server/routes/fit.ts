import express from 'express';
import multer from 'multer';
import path from 'path';
import Joi from 'joi';
import axios from 'axios';
import { authenticateToken, requireUser, AuthRequest } from '../middleware/auth';
import { db, uploadFile, supabaseAdmin } from '../lib/supabase';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Alleen JPEG, PNG en WebP bestanden zijn toegestaan'));
    }
  }
});

// Validation schemas
const createSessionSchema = Joi.object({
  retailerId: Joi.string().uuid().required(),
  shopId: Joi.string().uuid().required(),
  productName: Joi.string().min(1).max(255).required(),
  productUrl: Joi.string().uri().allow(''),
  productPrice: Joi.string().max(50).allow(''),
  productImageUrl: Joi.string().uri().allow('')
});

// Create new FiT session
router.post('/sessions', authenticateToken, requireUser, upload.single('userImage'), async (req: AuthRequest, res): Promise<void> => {
  try {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Gebruikersfoto is verplicht'
      });
      return;
    }

    const userId = req.user!.id;
    const { retailerId, shopId, productName, productUrl, productPrice, productImageUrl } = value;
    const file = req.file;

    // Verify retailer exists
    const retailer = await db.getRetailer(retailerId);
    if (!retailer) {
      res.status(404).json({
        success: false,
        message: 'Retailer niet gevonden'
      });
      return;
    }

    // Verify shop exists and belongs to retailer
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, retailer_id, name, category, is_active')
      .eq('id', shopId)
      .single();
    if (shopError || !shop || shop.retailer_id !== retailerId || shop.is_active === false) {
      res.status(404).json({
        success: false,
        message: 'Webshop niet gevonden of niet actief'
      });
      return;
    }

    // Check retailer subscription and session limits
    const { data: subscription } = await db.getRetailerSubscription(retailerId);
    if (!subscription) {
      res.status(403).json({
        success: false,
        message: 'Retailer heeft geen actief abonnement'
      });
      return;
    }

    // Upload user image to Supabase Storage
    const fileExtension = path.extname(file.originalname);
    const fileName = `${userId}-${Date.now()}${fileExtension}`;
    const userImageUrl = await uploadFile('fit-results', fileName, file.buffer, file.mimetype);

    // Create FiT session (new schema)
    const { data: createdSession, error: createSessionError } = await supabaseAdmin
      .from('fit_sessions')
      .insert({
        user_id: userId,
        retailer_id: retailerId,
        shop_id: shopId,
        user_image_url: userImageUrl,
        status: 'PROCESSING',
        category: shop.category || null
      })
      .select()
      .single();
    if (createSessionError || !createdSession) {
      throw createSessionError;
    }

    // Store product info in fit_session_products
    if (productName || productUrl || productPrice || productImageUrl) {
      await supabaseAdmin
        .from('fit_session_products')
        .insert({
          session_id: createdSession.id,
          product_name: productName || null,
          product_url: productUrl || null,
          product_price: productPrice || null,
          product_image_url: productImageUrl || null
        });
    }

    // Trigger AI processing via n8n webhook
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await axios.post(process.env.N8N_WEBHOOK_URL, {
          sessionId: createdSession.id,
          userImageUrl: userImageUrl,
          productImageUrl: productImageUrl,
          productName: productName,
          retailerId: retailerId,
          shopId: shopId,
          category: shop.category || null,
          userId: userId
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
      } catch (webhookError) {
        console.error('Failed to trigger AI processing:', webhookError);
        // Don't fail the session creation if webhook fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'FiT sessie succesvol aangemaakt',
      data: {
        session: {
          id: createdSession.id,
          shopId: createdSession.shop_id,
          retailerId: createdSession.retailer_id,
          userImageUrl: createdSession.user_image_url,
          status: createdSession.status,
          category: createdSession.category,
          createdAt: createdSession.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create FiT session error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het aanmaken van de FiT sessie'
    });
  }
});

// Get FiT session by ID
router.get('/sessions/:sessionId', async (req: AuthRequest, res): Promise<void> => {
  try {
    const sessionId = req.params.sessionId;
    const session = await db.getFitSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'FiT sessie niet gevonden'
      });
      return;
    }

    // Check if user has access to this session
    if (req.user) {
      const hasAccess = 
        (req.user.role === 'user' && session.user_id === req.user.id) ||
        (req.user.role === 'retailer' && session.retailer_id === req.user.id);
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Geen toegang tot deze FiT sessie'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          productName: session.product_name,
          productUrl: session.product_url,
          productPrice: session.product_price,
          productImageUrl: session.product_image_url,
          userImageUrl: session.user_image_url,
          generatedImageUrl: session.generated_image_url,
          status: session.status,
          retailer: session.retailer ? {
            id: session.retailer.id,
            shopName: session.retailer.shop_name,
            shopUrl: session.retailer.shop_url
          } : null,
          user: session.user ? {
            id: session.user.id,
            firstName: session.user.first_name,
            lastName: session.user.last_name
          } : null,
          createdAt: session.created_at,
          processedAt: session.processed_at
        }
      }
    });
  } catch (error) {
    console.error('Get FiT session error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van de FiT sessie'
    });
  }
});

// Get session status (public endpoint for widget)
router.get('/sessions/:sessionId/status', async (req, res): Promise<void> => {
  try {
    const sessionId = req.params.sessionId;
    const session = await db.getFitSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'FiT sessie niet gevonden'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        status: session.status,
        generatedImageUrl: session.generated_image_url,
        processedAt: session.processed_at
      }
    });
  } catch (error) {
    console.error('Get session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van de sessie status'
    });
  }
});

// List FiT sessions with pagination
router.get('/sessions', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const userId = req.user!.id;

    let sessions;
    if (req.user!.role === 'user') {
      sessions = await db.getUserFitSessions(userId, limit, offset);
    } else if (req.user!.role === 'retailer') {
      sessions = await db.getRetailerFitSessions(userId, limit, offset);
    } else {
      res.status(403).json({
        success: false,
        message: 'Ongeautoriseerd'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          productName: session.product_name,
          productUrl: session.product_url,
          productPrice: session.product_price,
          productImageUrl: session.product_image_url,
          userImageUrl: session.user_image_url,
          generatedImageUrl: session.generated_image_url,
          status: session.status,
          retailer: req.user!.role === 'user' && session.retailer ? {
            shopName: session.retailer.shop_name
          } : null,
          user: req.user!.role === 'retailer' && session.user ? {
            firstName: session.user.first_name,
            lastName: session.user.last_name
          } : null,
          createdAt: session.created_at,
          processedAt: session.processed_at
        })),
        pagination: {
          page,
          limit,
          hasMore: sessions.length === limit
        }
      }
    });
  } catch (error) {
    console.error('List FiT sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van FiT sessies'
    });
  }
});

// Delete FiT session
router.delete('/sessions/:sessionId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.user!.id;

    // Get session to verify ownership
    const session = await db.getFitSession(sessionId);
    
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'FiT sessie niet gevonden'
      });
      return;
    }

    // Check ownership
    const hasAccess = 
      (req.user!.role === 'user' && session.user_id === userId) ||
      (req.user!.role === 'retailer' && session.retailer_id === userId);

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Geen toegang tot deze FiT sessie'
      });
      return;
    }

    // Delete session
    await db.deleteFitSession(sessionId);

    res.json({
      success: true,
      message: 'FiT sessie succesvol verwijderd'
    });
  } catch (error) {
    console.error('Delete FiT session error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het verwijderen van de FiT sessie'
    });
  }
});

export default router;