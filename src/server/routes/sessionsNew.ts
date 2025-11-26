import express from 'express';
import Joi from 'joi';
import { supabaseAdmin } from '../lib/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

const feedbackSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  satisfied: Joi.boolean().required(),
  feedback: Joi.string().allow('').max(1000).optional()
});

// POST /api/sessions/feedback
router.post('/feedback', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Niet geauthenticeerd' });
      return;
    }

    const { error, value } = feedbackSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: 'Ongeldige invoer', details: error.details.map(d => d.message) });
      return;
    }

    const { sessionId, satisfied, feedback } = value;

    // Ensure session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('fit_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session || session.user_id !== userId) {
      res.status(403).json({ success: false, message: 'Geen toegang tot deze sessie' });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('fit_sessions')
      .update({ satisfied, feedback: feedback ?? null, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) {
      res.status(500).json({ success: false, message: 'Opslaan van feedback mislukt' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Feedback save error:', err);
    res.status(500).json({ success: false, message: 'Interne serverfout' });
  }
});

export default router;
