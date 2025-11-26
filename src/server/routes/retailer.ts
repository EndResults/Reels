import express from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';
import Stripe from 'stripe';
import axios from 'axios';

const router = express.Router();

const resolveRetailerSignupWebhookUrl = (): string | undefined => {
  const direct = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL || '').trim();
  if (direct) return direct;
  const server = (process.env.SERVER_URL || '').toLowerCase();
  const isUat = /fit-uat|uat/.test(server);
  if (isUat) {
    const uat = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_UAT || '').trim();
    if (uat) return uat;
    const prod = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_PROD || '').trim();
    return prod || undefined;
  }
  const prod = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_PROD || '').trim();
  if (prod) return prod;
  const uat = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_UAT || '').trim();
  return uat || undefined;
};

const sendRetailerClosure = async (retailer: any) => {
  const url = resolveRetailerSignupWebhookUrl();
  if (!url) return;
  const headers: any = { 'Content-Type': 'application/json' };
  if (process.env.N8N_API_KEY) headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
  const timeout = parseInt(String(process.env.N8N_TIMEOUT_MS || 10000), 10) || 10000;
  const payload = {
    deactivated_at: retailer?.deactivated_at || new Date().toISOString(),
    close_reason: retailer?.close_reason || null,
    email: retailer?.email || null
  };
  try {
    try {
      const u = new URL(url);
      const safe = `${u.origin}${u.pathname}`;
      console.info('[Webhook] Retailer close: POST', safe, { email: payload.email });
    } catch {}
    await axios.post(url, payload, { headers, timeout });
    console.info('[Webhook] Retailer close: delivered');
  } catch (e: any) {
    console.warn('Retailer close webhook failed:', e?.message || e);
  }
};

// Validation schema voor promo instellingen
const promoSettingsSchema = Joi.object({
  promoEnabled: Joi.boolean().required(),
  promoStartDate: Joi.date().iso().allow(null).optional(),
  promoEndDate: Joi.date().iso().allow(null).optional()
});

// Middleware om te controleren of user een retailer is (lokale guard)
const requireRetailer = (req: any, res: any, next: any) => {
  if (req.user.role !== 'retailer') {
    res.status(403).json({
      success: false,
      message: 'Alleen retailers hebben toegang tot deze functie'
    });
    return;
  }
  next();
};

// POST /api/retailer/close-account - soft delete retailer account
router.post('/close-account', authenticateToken, requireRetailer, async (req: any, res: express.Response): Promise<void> => {
  try {
    const retailerId = req.user.id as string;
    const reason = typeof req.body?.reason === 'string' ? String(req.body.reason).slice(0, 500) : null;

    // Idempotent: if retailer already inactive, return success
    let { data: currentRetailer } = await supabaseAdmin
      .from('retailers')
      .select('id, is_active')
      .eq('id', retailerId)
      .maybeSingle();
    if (currentRetailer && (currentRetailer as any).is_active === false) {
      try {
        res.clearCookie('fit_session', { httpOnly: true, secure: true, sameSite: 'none', path: '/' } as any);
        res.clearCookie('fit_token', { httpOnly: false, secure: true, sameSite: 'none', path: '/' } as any);
      } catch {}
      res.json({ success: true, message: 'Account reeds opgeheven', data: { effectiveEnd: null } });
      return;
    }

    // Find latest ACTIVE subscription for this retailer
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, current_period_end')
      .eq('retailer_id', retailerId)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let effectiveEnd: string | null = null;
    const stripeId = (sub as any)?.stripe_subscription_id as string | undefined;
    if (stripeId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2023-08-16' });
        const updated = await stripe.subscriptions.update(stripeId, { cancel_at_period_end: true });
        if (updated?.current_period_end) {
          effectiveEnd = new Date(updated.current_period_end * 1000).toISOString();
        }
      } catch (e) {
        // Stripe down/failed: fall back to DB period end below
      }
    }
    if (!effectiveEnd && sub?.current_period_end) {
      try { effectiveEnd = new Date((sub as any).current_period_end as any).toISOString(); } catch { effectiveEnd = String((sub as any).current_period_end); }
    }

    // Persist scheduled cancellation and next plan locally regardless of Stripe response
    if (sub?.id || stripeId) {
      let q = supabaseAdmin
        .from('subscriptions')
        .update({ cancel_at_period_end: true, next_plan_type: 'STARTER', updated_at: new Date().toISOString() });
      if (stripeId) q = q.eq('stripe_subscription_id', stripeId);
      else q = q.eq('id', sub!.id);
      await q;
    }

    // Deactivate retailer (soft delete)
    {
      const { error: updErr } = await supabaseAdmin
        .from('retailers')
        .update({ is_active: false, deactivated_at: new Date().toISOString(), close_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', retailerId);
      if (updErr) {
        const msg = String(updErr?.message || updErr || '');
        if (updErr.code === '42703' || /column\s+.+\s+does\s+not\s+exist/i.test(msg)) {
          const { error: upd2 } = await supabaseAdmin
            .from('retailers')
            .update({ is_active: false, updated_at: new Date().toISOString() } as any)
            .eq('id', retailerId);
          if (upd2) {
            const msg2 = String(upd2?.message || upd2 || '');
            if (upd2.code === '42703' || /column\s+.+\s+does\s+not\s+exist/i.test(msg2)) {
              await supabaseAdmin
                .from('retailers')
                .update({ is_active: false } as any)
                .eq('id', retailerId);
            } else {
              throw upd2;
            }
          }
        } else {
          throw updErr;
        }
      }
    }

    // Deactivate all shops of retailer
    await supabaseAdmin
      .from('shops')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('retailer_id', retailerId);

    let email: string | null = null;
    try {
      const { data: row } = await supabaseAdmin
        .from('retailers')
        .select('email')
        .eq('id', retailerId)
        .single();
      email = (row as any)?.email || null;
    } catch {}
    try { void sendRetailerClosure({ email, deactivated_at: new Date().toISOString(), close_reason: reason }); } catch {}

    // Clear session cookie so browser is logged out
    try {
      res.clearCookie('fit_session', { httpOnly: true, secure: true, sameSite: 'none', path: '/' } as any);
      res.clearCookie('fit_token', { httpOnly: false, secure: true, sameSite: 'none', path: '/' } as any);
    } catch {}

    res.json({ success: true, message: 'Account opgeheven', data: { effectiveEnd } });
  } catch (error) {
    console.error('Close account error:', error);
    res.status(500).json({ success: false, message: 'Kon account niet opheffen' });
  }
});

// POST /api/retailer/undo-close - undo soft delete (reactivate retailer and shops)
router.post('/undo-close', authenticateToken, requireRetailer, async (req: any, res: express.Response): Promise<void> => {
  try {
    const retailerId = req.user.id as string;

    // Reactivate retailer; do NOT modify subscription cancellation flags
    {
      const { error: updErr } = await supabaseAdmin
        .from('retailers')
        .update({ is_active: true, deactivated_at: null, close_reason: null, updated_at: new Date().toISOString() } as any)
        .eq('id', retailerId);
      if (updErr) {
        const msg = String(updErr?.message || updErr || '');
        if (updErr.code === '42703' || /column\s+.+\s+does\s+not\s+exist/i.test(msg)) {
          await supabaseAdmin
            .from('retailers')
            .update({ is_active: true, updated_at: new Date().toISOString() } as any)
            .eq('id', retailerId);
        } else {
          throw updErr;
        }
      }
    }

    // Reactivate all shops of retailer
    await supabaseAdmin
      .from('shops')
      .update({ is_active: true, updated_at: new Date().toISOString() } as any)
      .eq('retailer_id', retailerId);

    res.json({ success: true, message: 'Opheffing ongedaan gemaakt' });
  } catch (error) {
    console.error('Undo close error:', error);
    res.status(500).json({ success: false, message: 'Kon opheffing niet ongedaan maken' });
  }
});

// Validation schema voor branding instellingen
const brandingSettingsSchema = Joi.object({
  hideLogo: Joi.boolean().required()
});

// GET /api/retailer/promo-settings - haal promo instellingen op
router.get('/promo-settings', authenticateToken, requireRetailer, async (_req: any, res: express.Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'Deze endpoint is vervallen. Beheer promo-instellingen nu per webshop via /api/shops/:shopId.'
  });
});

export default router;

// PUT /api/retailer/branding-settings - update branding instelling (Premium+)
router.put('/branding-settings', authenticateToken, requireRetailer, async (_req: any, res: express.Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'Deze endpoint is vervallen. Beheer branding (logo verbergen) per webshop via /api/shops/:shopId.'
  });
});

// PUT /api/retailer/promo-settings - Update promo instellingen
router.put('/promo-settings', authenticateToken, requireRetailer, async (_req: any, res: express.Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'Deze endpoint is vervallen. Beheer promo-instellingen per webshop via /api/shops/:shopId.'
  });
});

// GET /api/retailer/profile - haal retailer profiel op
router.get('/profile', authenticateToken, requireRetailer, async (req: any, res: express.Response): Promise<void> => {
  try {
    const retailerId = req.user.id;
    
    const { data: retailer, error } = await supabaseAdmin
      .from('retailers')
      .select('id, email, first_name, last_name, shop_name, shop_url, shop_type, api_key, domains')
      .eq('id', retailerId)
      .single();
    
    if (error) {
      console.error('❌ Database error bij ophalen retailer profiel:', error);
      throw error;
    }
    
    if (!retailer) {
      res.status(404).json({
        success: false,
        message: 'Retailer niet gevonden'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: retailer.id,
        email: retailer.email,
        firstName: retailer.first_name,
        lastName: retailer.last_name,
        shopName: retailer.shop_name,
        shopUrl: retailer.shop_url,
        shopType: retailer.shop_type,
        apiKey: retailer.api_key,
        domains: retailer.domains || {}
      }
    });
  } catch (error) {
    console.error('Fout bij ophalen retailer profiel:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij ophalen retailer profiel'
    });
  }
});

// GET /api/retailer/branding-settings - haal branding instelling (hide BrendR logo) op
router.get('/branding-settings', authenticateToken, requireRetailer, async (_req: any, res: express.Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'Deze endpoint is vervallen. Beheer branding per webshop via /api/shops/:shopId.'
  });
});
