import express from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { getFileUrl } from '../lib/fileUpload';
import Joi from 'joi';

const router = express.Router();

// Validation schema for n8n webhook
const webhookSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  status: Joi.string().valid('COMPLETED', 'FAILED').required(),
  resultUrl: Joi.string().optional(),
  aiProcessingData: Joi.object().optional(),
  error: Joi.string().optional()
});

// Middleware to verify n8n API key
const verifyApiKey = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;
  const expectedApiKey = process.env.N8N_API_KEY;

  if (!expectedApiKey) {
    console.error('N8N_API_KEY not configured');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }

  if (apiKey !== expectedApiKey) {
    console.error('Invalid API key for n8n webhook');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  next();
};

// POST /ai-processing-complete - Webhook endpoint for n8n
router.post('/ai-processing-complete', verifyApiKey, async (req, res) => {
  try {
    console.log('🔔 Received AI processing webhook:', req.body);

    // Validate input
    const { error: validationError, value } = webhookSchema.validate(req.body);
    if (validationError) {
      console.error('Webhook validation error:', validationError.details);
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data',
        errors: validationError.details.map(detail => detail.message)
      });
    }

    const { sessionId, status, resultUrl, aiProcessingData, error: processingError } = value;

    // Get current session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('fit_sessions')
      .select('id, status, user_id, retailer_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionId);
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Prepare update data
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'COMPLETED') {
      if (resultUrl) {
        updateData.result_url = resultUrl;
      }
      if (aiProcessingData) {
        updateData.ai_processing_data = aiProcessingData;
      }
      console.log(`✅ Session ${sessionId} completed successfully`);
    } else if (status === 'FAILED') {
      if (processingError) {
        updateData.ai_processing_data = { error: processingError };
      }
      console.log(`❌ Session ${sessionId} failed:`, processingError);
    }

    // Update session in database
    const { error: updateError } = await supabaseAdmin
      .from('fit_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      throw updateError;
    }

    // TODO: Send notification to user (email, push notification, etc.)
    // This could be implemented later as part of the notification system

    return res.json({
      success: true,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /session-status/:sessionId - Check session status (for polling)
router.get('/session-status/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    const { data: session, error } = await supabaseAdmin
      .from('fit_sessions')
      .select('id, status, result_url, ai_processing_data, updated_at')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const response = {
      id: session.id,
      status: session.status,
      resultUrl: session.result_url ? getFileUrl(session.result_url) : null,
      aiProcessingData: session.ai_processing_data,
      updatedAt: session.updated_at
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Get session status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van de sessie status'
    });
  }
});

export default router;
