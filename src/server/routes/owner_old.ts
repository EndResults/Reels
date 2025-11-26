import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getCategorySettingsByKey } from '../lib/categoryConfig';
import Stripe from 'stripe';
import axios from 'axios';

const router = express.Router();

// Multer in-memory uploader for category hero (image)
const catUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// POST /retailers/:id/restore - herstel soft-deleted retailer (admin)
router.post('/retailers/:id/restore', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'Ongeldig retailer id' });
      return;
    }

    // Reactivate retailer
    await supabaseAdmin
      .from('retailers')
      .update({ is_active: true, deactivated_at: null, close_reason: null, updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    // Reactivate shops
    await supabaseAdmin
      .from('shops')
      .update({ is_active: true, updated_at: new Date().toISOString() } as any)
      .eq('retailer_id', id);

    // Determine included sessions for STARTER from system settings
    let included = 50;
    try {
      const { data: sys } = await supabaseAdmin
        .from('category_settings')
        .select('settings')
        .eq('key', 'SYSTEM')
        .maybeSingle();
      const plans = (sys as any)?.settings?.subscriptionPlans || {};
      const v = parseInt(String((plans?.STARTER?.included ?? 50)), 10);
      if (Number.isFinite(v)) included = Math.max(0, v);
    } catch {}

    // Ensure ACTIVE subscription exists; if none, create STARTER placeholder
    const { data: active } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('retailer_id', id)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!active) {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          retailer_id: id,
          plan_type: 'STARTER',
          status: 'ACTIVE',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_subscription_id: null,
          stripe_customer_id: null,
          included_sessions: included,
          cancel_at_period_end: false,
          next_plan_type: null,
          metadata: {}
        } as any);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[owner] POST /retailers/:id/restore error:', e);
    res.status(500).json({ success: false, message: 'Kon retailer niet herstellen' });
  }
});

function resolveRetailerSignupWebhookUrl(): string | undefined {
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
}

async function sendRetailerClosureWebhook(payload: { email: string | null; deactivated_at?: string | null; close_reason?: string | null }) {
  const url = resolveRetailerSignupWebhookUrl();
  if (!url) return;
  const headers: any = { 'Content-Type': 'application/json' };
  if (process.env.N8N_API_KEY) headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
  const timeout = parseInt(String(process.env.N8N_TIMEOUT_MS || 10000), 10) || 10000;
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
}

router.patch('/retailers/:id/plan', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const planRaw = String(req.body?.planType || '').toUpperCase();
    if (!id || !['STARTER','BASIC','PREMIUM','ENTERPRISE'].includes(planRaw)) {
      res.status(400).json({ success: false, message: 'Ongeldige invoer' });
      return;
    }

    let included = 50;
    try {
      const { data: sys } = await supabaseAdmin
        .from('category_settings')
        .select('settings')
        .eq('key', 'SYSTEM')
        .maybeSingle();
      const plans = (sys as any)?.settings?.subscriptionPlans || {};
      const def = (p: string) => (p === 'BASIC' ? 500 : (p === 'PREMIUM' || p === 'ENTERPRISE') ? 2500 : 50);
      const cfg = (plans as any)[planRaw] || {};
      const val = parseInt(String(cfg.included ?? def(planRaw)), 10);
      included = Number.isFinite(val) ? Math.max(0, val) : def(planRaw);
    } catch {}

    const { data: active } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, plan_type')
      .eq('retailer_id', id)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active && (active as any).id) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ plan_type: planRaw, status: 'ACTIVE', included_sessions: included, cancel_at_period_end: false, next_plan_type: null, updated_at: new Date().toISOString() } as any)
        .eq('id', (active as any).id);
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          retailer_id: id,
          plan_type: planRaw,
          status: 'ACTIVE',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_subscription_id: null,
          stripe_customer_id: null,
          included_sessions: included,
          cancel_at_period_end: false,
          next_plan_type: null,
          metadata: {}
        } as any);
    }

    await supabaseAdmin
      .from('retailers')
      .update({ plan_type: planRaw, updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    const rank = (p: string) => (p === 'BASIC' ? 1 : p === 'PREMIUM' ? 2 : p === 'ENTERPRISE' ? 3 : 0);
    const prevPlan = String(((active as any)?.plan_type || 'STARTER')).toUpperCase();
    const isUpgrade = rank(planRaw) > rank(prevPlan);

    try {
      await supabaseAdmin.rpc('ensure_credit_row', { _retailer: id, _included: 0 });
    } catch {}

    if (isUpgrade && (included || 0) > 0) {
      try {
        const d = new Date();
        const month = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
        const { data: row } = await supabaseAdmin
          .from('fit_credits')
          .select('included')
          .eq('retailer_id', id)
          .eq('period_month', month)
          .maybeSingle();
        const currentIncluded = Number((row as any)?.included || 0);
        const newIncluded = currentIncluded + (included || 0);
        await supabaseAdmin
          .from('fit_credits')
          .update({ included: newIncluded, updated_at: new Date().toISOString() } as any)
          .eq('retailer_id', id)
          .eq('period_month', month);
        try {
          await supabaseAdmin.from('fit_credit_events').insert({
            retailer_id: id,
            period_month: month,
            delta: Number(included || 0),
            source: 'admin_plan_upgrade'
          } as any);
        } catch {}
      } catch {}
    }

    console.info('[Admin] Plan set', { retailerId: id, planType: planRaw, included });
    res.json({ success: true, data: { retailerId: id, planType: planRaw, included } });
  } catch (e) {
    console.error('[owner] PATCH /retailers/:id/plan error:', e);
    res.status(500).json({ success: false, message: 'Kon plan niet instellen' });
  }
});

router.post('/retailers/:id/close', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const reason = typeof req.body?.reason === 'string' ? String(req.body.reason).slice(0, 500) : null;
    if (!id) {
      res.status(400).json({ success: false, message: 'Ongeldig retailer id' });
      return;
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, current_period_end')
      .eq('retailer_id', id)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const stripeId = (sub as any)?.stripe_subscription_id as string | undefined;
    if (stripeId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2023-08-16' });
        await stripe.subscriptions.update(stripeId, { cancel_at_period_end: true });
      } catch {}
    }

    if (sub?.id || stripeId) {
      let q = supabaseAdmin
        .from('subscriptions')
        .update({ cancel_at_period_end: true, next_plan_type: 'STARTER', updated_at: new Date().toISOString() });
      if (stripeId) q = q.eq('stripe_subscription_id', stripeId);
      else q = q.eq('id', sub!.id);
      await q;
    }

    await supabaseAdmin
      .from('retailers')
      .update({ is_active: false, deactivated_at: new Date().toISOString(), close_reason: reason, updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    await supabaseAdmin
      .from('shops')
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq('retailer_id', id);

    let email: string | null = null;
    try {
      const { data: row } = await supabaseAdmin
        .from('retailers')
        .select('email')
        .eq('id', id)
        .maybeSingle();
      email = (row as any)?.email || null;
    } catch {}
    try { await sendRetailerClosureWebhook({ email, deactivated_at: new Date().toISOString(), close_reason: reason }); } catch {}

    console.info('[Admin] Retailer soft-closed', { retailerId: id });
    res.json({ success: true });
  } catch (e) {
    console.error('[owner] POST /retailers/:id/close error:', e);
    res.status(500).json({ success: false, message: 'Kon account niet opheffen' });
  }
});

// PATCH /categories/:key/settings - update raw JSON settings
router.patch('/categories/:key/settings', requireAdmin, async (req, res) => {
  try {
    const key = String(req.params.key || '').toUpperCase();
    const settings = (req.body && (req.body as any).settings) as any;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      res.status(400).json({ success: false, message: 'Ongeldige settings payload' });
      return;
    }
    // Try update first; if no row updated, insert minimal row
    const { data: updatedRow, error: updErr } = await supabaseAdmin
      .from('category_settings')
      .update({ settings } as any)
      .eq('key', key)
      .select('key')
      .maybeSingle();
    if (updErr) throw updErr;
    if (!updatedRow) {
      const { error: insErr } = await supabaseAdmin
        .from('category_settings')
        .insert({ key, settings } as any);
      if (insErr) {
        // If NOT NULL violation mentions label, retry with label default
        const msg = String(insErr.message || insErr || '');
        if ((insErr.code === '23502' && /label/i.test(msg)) || /null value in column\s+"?label"?/i.test(msg)) {
          const { error: insErr2 } = await supabaseAdmin
            .from('category_settings')
            .insert({ key, label: key, settings } as any);
          if (insErr2) throw insErr2;
        } else {
          throw insErr;
        }
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    console.error('[owner] PATCH /categories/:key/settings error:', e);
    if (e && (e.code === '42703' || /column\s+"?settings"?\s+does\s+not\s+exist/i.test(String(e.message || e)))) {
      res.status(409).json({ success: false, message: 'Kolom "settings" ontbreekt op category_settings. Voer de migratie uit.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Kon settings niet bijwerken' });
  }
});


// PATCH /categories/:key/promo - update promo locales (nl/en)
router.patch('/categories/:key/promo', requireAdmin, async (req, res) => {
  try {
    const key = String(req.params.key || '').toUpperCase();
    const locales = req.body?.locales || {};
    if (typeof locales !== 'object' || !locales) {
      res.status(400).json({ success: false, message: 'Ongeldige payload' });
      return;
    }
    // Normalize allowed fields only
    const norm: any = {};
    for (const lang of ['nl','en']) {
      const v = locales[lang];
      if (v && typeof v === 'object') {
        norm[lang] = {
          video_url: typeof v.video_url === 'string' ? v.video_url : '',
          header: typeof v.header === 'string' ? v.header : '',
          body: typeof v.body === 'string' ? v.body : ''
        };
      }
    }
    // Update existing row first to avoid resetting settings; if none updated, insert minimal row
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('category_settings')
      .update({ promo_locales: norm } as any)
      .eq('key', key)
      .select('key')
      .maybeSingle();
    if (updErr) {
      if (updErr.code === '42703' || /column\s+"?promo_locales"?\s+does\s+not\s+exist/i.test(String(updErr.message || updErr))) {
        res.status(409).json({ success: false, message: 'Kolom "promo_locales" ontbreekt op category_settings. Voer de migratie add_promo_locales.sql uit.' });
        return;
      }
      throw updErr;
    }
    if (!updated) {
      const { error: insErr } = await supabaseAdmin
        .from('category_settings')
        .insert({ key, settings: {}, promo_locales: norm } as any);
      if (insErr) {
        const msg = String(insErr.message || insErr || '');
        if ((insErr.code === '23502' && /label/i.test(msg)) || /null value in column\s+"?label"?/i.test(msg)) {
          const { error: insErr2 } = await supabaseAdmin
            .from('category_settings')
            .insert({ key, label: key, settings: {}, promo_locales: norm } as any);
          if (insErr2) throw insErr2;
        } else if (insErr.code === '42703' || /column\s+"?promo_locales"?\s+does\s+not\s+exist/i.test(msg)) {
          res.status(409).json({ success: false, message: 'Kolom "promo_locales" ontbreekt op category_settings. Voer de migratie add_promo_locales.sql uit.' });
          return;
        } else {
          throw insErr;
        }
      }
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[owner] PATCH /categories/:key/promo error:', e);
    res.status(500).json({ success: false, message: 'Kon promo niet bijwerken' });
  }
});

async function requireAdmin(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  try {
    await authenticateToken(req, res, async () => {
      // must be a consumer-side user
      if (!req.user || req.user.role !== 'user') {
        res.status(403).json({ success: false, message: 'Admin toegang vereist' });
        return;
      }
      try {
        const { data: profile, error } = await supabaseAdmin
          .from('users')
          .select('user_type')
          .eq('id', req.user.id)
          .maybeSingle();
        if (error || !profile || (profile as any).user_type !== 'ADMIN') {
          res.status(403).json({ success: false, message: 'Admin toegang vereist' });
          return;
        }
        next();
      } catch (e) {
        res.status(403).json({ success: false, message: 'Admin toegang vereist' });
      }
    });
  } catch (e) {
    // authenticateToken already responded
  }
}

// GET /categories - list all categories with shops count and status
router.get('/categories', requireAdmin, async (_req, res) => {
  try {
    // Try to read status column when available; fallback to only key when column doesn't exist
    let cats: any[] | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('category_settings')
        .select('key, status');
      if (error) throw error;
      cats = data || [];
    } catch (err: any) {
      if ((err && (err.code === '42703' || /column\s+"?status"?/i.test(String(err.message)))) || /column\s+status\s+does\s+not\s+exist/i.test(String(err))) {
        const { data } = await supabaseAdmin
          .from('category_settings')
          .select('key');
        cats = data || [];
      } else {
        throw err;
      }
    }

    const results: Array<{ key: string; shopsCount: number; status: string }> = [];
    for (const c of (cats || [])) {
      const k = String((c as any).key).toUpperCase();
      const st = String((c as any).status || 'ACTIVE').toUpperCase();
      let shopsCount = 0;
      try {
        const { count } = await supabaseAdmin
          .from('shops')
          .select('id', { count: 'exact', head: true })
          .eq('category', k);
        shopsCount = count || 0;
      } catch {}
      results.push({ key: k, shopsCount, status: st });
    }

    res.json({ success: true, categories: results });
  } catch (e) {
    console.error('[owner] GET /categories error:', e);
    res.status(500).json({ success: false, message: 'Kon categorieën niet laden' });
  }
});

// POST /categories/:key/hero - upload/replace category hero image
router.post('/categories/:key/hero', requireAdmin, catUpload.single('hero'), async (req, res) => {
  try {
    const key = String(req.params.key || '').toUpperCase();
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'Geen bestand geüpload' });
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      res.status(400).json({ success: false, message: 'Alleen PNG, JPG of WEBP toegestaan' });
      return;
    }
    const ext = ((): string => {
      const e = path.extname(file.originalname || '')?.toLowerCase();
      if (e) return e;
      if (file.mimetype === 'image/png') return '.png';
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') return '.jpg';
      if (file.mimetype === 'image/webp') return '.webp';
      return '.png';
    })();
    const fileName = `Category_image_${key}${ext}`;

    // Upload to existing public bucket used for category content
    const bucket = 'Content_general';
    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (upErr) {
      res.status(500).json({ success: false, message: `Upload mislukt: ${upErr.message}` });
      return;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Update DB
    const { data: row, error: updErr } = await supabaseAdmin
      .from('category_settings')
      .update({ category_hero: publicUrl })
      .eq('key', key)
      .select('key')
      .maybeSingle();
    if (updErr) {
      res.status(500).json({ success: false, message: 'Kon database niet bijwerken' });
      return;
    }
    if (!row) {
      // Insert minimal row when missing
      const { error: insErr } = await supabaseAdmin
        .from('category_settings')
        .insert({ key, settings: {}, category_hero: publicUrl } as any);
      if (insErr) {
        const msg = String(insErr.message || insErr || '');
        if ((insErr.code === '23502' && /label/i.test(msg)) || /null value in column\s+"?label"?/i.test(msg)) {
          const { error: insErr2 } = await supabaseAdmin
            .from('category_settings')
            .insert({ key, label: key, settings: {}, category_hero: publicUrl } as any);
          if (insErr2) {
            res.status(500).json({ success: false, message: 'Kon categorie niet aanmaken' });
            return;
          }
        } else {
          res.status(500).json({ success: false, message: 'Kon categorie niet aanmaken' });
          return;
        }
      }
    }

    res.json({ success: true, url: publicUrl, fileName });
  } catch (e) {
    console.error('[owner] POST /categories/:key/hero error:', e);
    res.status(500).json({ success: false, message: 'Upload mislukt' });
  }
});

// GET /categories/:key - category details and shops list
router.get('/categories/:key', requireAdmin, async (req, res) => {
  try {
    const key = String(req.params.key || '').toUpperCase();
    const settings = await getCategorySettingsByKey(key);
    let statusVal: string = 'ACTIVE';
    let heroUrl: string | null = null;
    let promoLocales: any | null = null;
    try {
      const { data } = await supabaseAdmin
        .from('category_settings')
        .select('status, category_hero, promo_locales')
        .eq('key', key)
        .maybeSingle();
      statusVal = String((data as any)?.status || 'ACTIVE').toUpperCase();
      heroUrl = (data as any)?.category_hero || null;
      promoLocales = (data as any)?.promo_locales || null;
    } catch (err: any) {
      if (!(err && (err.code === '42703' || /column\s+"?status"?/i.test(String(err.message))))) {
        // ignore missing column; otherwise rethrow
      }
    }

    const { data: shops, error: shopsErr } = await supabaseAdmin
      .from('shops')
      .select('id, name, category, url, domain, is_active, language, created_at')
      .eq('category', key)
      .order('name', { ascending: true });
    if (shopsErr) throw shopsErr;

    res.json({
      success: true,
      key,
      status: statusVal,
      settings: settings || {},
      hero: heroUrl,
      promo: promoLocales,
      shops: shops || []
    });
  } catch (e) {
    console.error('[owner] GET /categories/:key error:', e);
    res.status(500).json({ success: false, message: 'Kon categorie details niet laden' });
  }
});

// PATCH /categories/:key/status - update category status (ACTIVE/INACTIVE)
router.patch('/categories/:key/status', requireAdmin, async (req, res) => {
  try {
    const key = String(req.params.key || '').toUpperCase();
    const statusRaw = String(req.body?.status || '').toUpperCase();
    if (!['ACTIVE','INACTIVE'].includes(statusRaw)) {
      res.status(400).json({ success: false, message: 'Ongeldige status, gebruik ACTIVE of INACTIVE' });
      return;
    }
    // First try update (handles existing row)
    let updErr: any | null = null;
    try {
      const { error } = await supabaseAdmin
        .from('category_settings')
        .update({ status: statusRaw } as any)
        .eq('key', key);
      updErr = error || null;
    } catch (e: any) {
      // If status column missing, bubble up meaningful error
      if (e && (e.code === '42703' || /column\s+"?status"?/i.test(String(e.message)))) {
        res.status(409).json({ success: false, message: 'Kolom "status" ontbreekt op category_settings. Voer eerst de migratie uit.' });
        return;
      }
      throw e;
    }

    if (updErr) {
      // If no rows updated, insert row (in case settings row missing)
      try {
        const { data: exists } = await supabaseAdmin
          .from('category_settings')
          .select('key')
          .eq('key', key)
          .maybeSingle();
        if (!exists) {
          // create minimal row
          const { error: insErr } = await supabaseAdmin
            .from('category_settings')
            .insert({ key, settings: {}, status: statusRaw } as any);
          if (insErr) throw insErr;
        }
      } catch (e) {
        throw e;
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[owner] PATCH /categories/:key/status error:', e);
    res.status(500).json({ success: false, message: 'Kon categorystatus niet bijwerken' });
  }
});

// List recent scrape results
router.get('/scrape-results', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10) || 100, 1), 500);
    const domain = typeof req.query.domain === 'string' && req.query.domain.trim() ? req.query.domain.trim() : undefined;
    let query = supabaseAdmin
      .from('scrape_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (domain) query = query.eq('domain', domain);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, results: data || [] });
  } catch (e) {
    console.error('[owner] GET /scrape-results error:', e);
    res.status(500).json({ success: false, message: 'Kon scrape resultaten niet laden' });
  }
});

// GET /retailers - list retailers with search/filter/sort/pagination
router.get('/retailers', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
    const planTypeRaw = typeof req.query.planType === 'string' ? req.query.planType.trim().toUpperCase() : '';
    const regFrom = typeof req.query.regFrom === 'string' ? req.query.regFrom.trim() : '';
    const regTo = typeof req.query.regTo === 'string' ? req.query.regTo.trim() : '';
    const lastLoginFrom = typeof req.query.lastLoginFrom === 'string' ? req.query.lastLoginFrom.trim() : '';
    const lastLoginTo = typeof req.query.lastLoginTo === 'string' ? req.query.lastLoginTo.trim() : '';
    const sortBy = (typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at').toLowerCase();
    const sortDirAsc = String(req.query.sortDir || 'desc').toLowerCase() === 'asc';

    const normalizeStart = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T00:00:00.000Z').toISOString()) : undefined;
    const normalizeEnd = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T23:59:59.999Z').toISOString()) : undefined;

    let query = supabaseAdmin
      .from('retailers')
      .select('id, auth_id, email, first_name, last_name, plan_type, created_at', { count: 'exact' });

    if (email) query = query.ilike('email', `%${email}%`);
    if (planTypeRaw && ['STARTER','BASIC','PREMIUM','ENTERPRISE'].includes(planTypeRaw)) query = query.eq('plan_type', planTypeRaw);
    if (regFrom) query = query.gte('created_at', normalizeStart(regFrom) as string);
    if (regTo) query = query.lte('created_at', normalizeEnd(regTo) as string);
    if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);

    const sortableDbCols = ['first_name','last_name','email','plan_type','created_at'];
    if (sortableDbCols.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortDirAsc });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query as any;
    if (error) throw error;

    const items = await Promise.all((rows || []).map(async (r: any) => {
      let lastLoginAt: string | null = null;
      try {
        const aid = r.auth_id || r.id;
        if (aid) {
          const au = await supabaseAdmin.auth.admin.getUserById(String(aid));
          lastLoginAt = (au as any)?.user?.last_sign_in_at || null;
        }
      } catch {}
      let sessionsCount = 0;
      try {
        const { count: sc } = await supabaseAdmin
          .from('fit_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('retailer_id', r.id);
        sessionsCount = sc || 0;
      } catch {}
      let shopsCount = 0;
      try {
        const { count: shc } = await supabaseAdmin
          .from('shops')
          .select('id', { count: 'exact', head: true })
          .eq('retailer_id', r.id);
        shopsCount = shc || 0;
      } catch {}
      // Determine effective plan: prefer active subscription.plan_type, fallback to retailers.plan_type
      let effectivePlanType: string | null = r.plan_type || null;
      try {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('plan_type, status')
          .eq('retailer_id', r.id)
          .eq('status', 'ACTIVE')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sub && (sub as any).plan_type) effectivePlanType = (sub as any).plan_type;
      } catch {}
      return {
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        planType: effectivePlanType || null,
        registeredAt: r.created_at,
        lastLoginAt,
        totalSessions: sessionsCount,
        shopsCount
      };
    }));

    const withinLastLoginRange = (dt: string | null, start: string, end: string) => {
      if (!start && !end) return true;
      if (!dt) return false;
      const t = new Date(dt).getTime();
      if (start) {
        const s = new Date(normalizeStart(start) as string).getTime();
        if (t < s) return false;
      }
      if (end) {
        const e = new Date(normalizeEnd(end) as string).getTime();
        if (t > e) return false;
      }
      return true;
    };

    const filtered = items.filter(it => withinLastLoginRange(it.lastLoginAt, lastLoginFrom, lastLoginTo));

    if (['last_login','sessions_total','shops_count'].includes(sortBy)) {
      filtered.sort((a: any, b: any) => {
        let av: any = a[sortBy === 'last_login' ? 'lastLoginAt' : sortBy === 'sessions_total' ? 'totalSessions' : 'shopsCount'];
        let bv: any = b[sortBy === 'last_login' ? 'lastLoginAt' : sortBy === 'sessions_total' ? 'totalSessions' : 'shopsCount'];
        if (sortBy === 'last_login') {
          av = av ? new Date(av).getTime() : 0;
          bv = bv ? new Date(bv).getTime() : 0;
        }
        return sortDirAsc ? (av - bv) : (bv - av);
      });
    }

    res.json({
      success: true,
      data: {
        items: filtered,
        pagination: { page, limit, totalCount: typeof count === 'number' ? count : filtered.length }
      }
    });
  } catch (e) {
    console.error('[owner] GET /retailers error:', e);
    res.status(500).json({ success: false, message: 'Kon retailers niet laden' });
  }
});

// GET /shops - list all shops with retailer email and sessions count
router.get('/shops', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim().toUpperCase() : '';
    const retailerEmail = typeof req.query.retailerEmail === 'string' ? req.query.retailerEmail.trim() : '';
    const sessionsMin = parseInt(String(req.query.sessionsMin || ''), 10);
    const sessionsMax = parseInt(String(req.query.sessionsMax || ''), 10);
    const regFrom = typeof req.query.regFrom === 'string' ? req.query.regFrom.trim() : '';
    const regTo = typeof req.query.regTo === 'string' ? req.query.regTo.trim() : '';
    const sortBy = (typeof req.query.sortBy === 'string' ? req.query.sortBy : 'name').toLowerCase();
    const sortDirAsc = String(req.query.sortDir || 'asc').toLowerCase() === 'asc';

    const normalizeStart = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T00:00:00.000Z').toISOString()) : undefined;
    const normalizeEnd = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T23:59:59.999Z').toISOString()) : undefined;

    let query = supabaseAdmin
      .from('shops')
      .select('id, retailer_id, name, category, created_at, retailers:retailer_id ( email )', { count: 'exact' });
    if (category) query = query.eq('category', category);
    if (regFrom) query = query.gte('created_at', normalizeStart(regFrom) as string);
    if (regTo) query = query.lte('created_at', normalizeEnd(regTo) as string);
    if (q) query = query.ilike('name', `%${q}%`);

    const sortableDbCols = ['name','category','created_at'];
    if (sortableDbCols.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortDirAsc });
    } else {
      query = query.order('name', { ascending: true });
    }
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query as any;
    if (error) throw error;

    const enriched = await Promise.all((rows || []).map(async (r: any) => {
      let sessionsCount = 0;
      try {
        const { count: sc } = await supabaseAdmin
          .from('fit_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', r.id);
        sessionsCount = sc || 0;
      } catch {}
      const rEmail = Array.isArray(r.retailers) ? (r.retailers[0]?.email || '') : (r.retailers?.email || '');
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        createdAt: r.created_at,
        retailerEmail: rEmail,
        totalSessions: sessionsCount
      };
    }));

    const filtered = enriched.filter((it: any) => {
      if (retailerEmail && !String(it.retailerEmail || '').toLowerCase().includes(retailerEmail.toLowerCase())) return false;
      if (!isNaN(sessionsMin) && typeof it.totalSessions === 'number' && it.totalSessions < sessionsMin) return false;
      if (!isNaN(sessionsMax) && typeof it.totalSessions === 'number' && it.totalSessions > sessionsMax) return false;
      return true;
    });

    if (['sessions_total','retailer_email'].includes(sortBy)) {
      if (sortBy === 'sessions_total') {
        filtered.sort((a: any, b: any) => sortDirAsc ? (a.totalSessions - b.totalSessions) : (b.totalSessions - a.totalSessions));
      } else {
        filtered.sort((a: any, b: any) => {
          const av = String(a.retailerEmail || '').toLowerCase();
          const bv = String(b.retailerEmail || '').toLowerCase();
          return sortDirAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
    }

    res.json({
      success: true,
      data: {
        items: filtered,
        pagination: { page, limit, totalCount: typeof count === 'number' ? count : filtered.length }
      }
    });
  } catch (e) {
    console.error('[owner] GET /shops error:', e);
    res.status(500).json({ success: false, message: 'Kon shops niet laden' });
  }
});

// GET /sessions - list all FiT sessions across shops/retailers
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const gender = typeof req.query.gender === 'string' ? req.query.gender.trim().toUpperCase() : '';
    const userType = typeof req.query.userType === 'string' ? req.query.userType.trim().toLowerCase() : '';
    const shopId = typeof req.query.shopId === 'string' ? req.query.shopId.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : '';
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo.trim() : '';
    const satisfied = typeof req.query.satisfied === 'string' ? req.query.satisfied.trim().toLowerCase() : '';
    const sortBy = (typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at').toLowerCase();
    const sortDirAsc = String(req.query.sortDir || 'desc').toLowerCase() === 'asc';

    const normalizeStart = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T00:00:00.000Z').toISOString()) : undefined;
    const normalizeEnd = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T23:59:59.999Z').toISOString()) : undefined;

    let query = supabaseAdmin
      .from('fit_sessions')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        satisfied,
        feedback,
        shop_id,
        shops:shop_id ( id, name, url ),
        users:user_id ( gender, is_guest ),
        fit_session_products ( product_name, product_url, product_image_url )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (shopId) query = query.eq('shop_id', shopId);
    if (status && ['PENDING','PROCESSING','COMPLETED','FAILED'].includes(status)) query = query.eq('status', status);
    if (dateFrom) query = query.gte('created_at', normalizeStart(dateFrom) as string);
    if (dateTo) query = query.lte('created_at', normalizeEnd(dateTo) as string);
    if (satisfied === 'true') query = query.eq('satisfied', true);
    if (satisfied === 'false') query = query.eq('satisfied', false);

    const { data: rows, error, count } = await query as any;
    if (error) throw error;

    const mapSession = (s: any) => {
      const shopRel = Array.isArray(s.shops) ? s.shops[0] : s.shops;
      const userRel = Array.isArray(s.users) ? s.users[0] : s.users;
      const products = Array.isArray(s.fit_session_products) ? s.fit_session_products : [];
      const firstProduct = products.length > 0 ? products[0] : null;
      const productTitle = firstProduct?.product_name || null;
      const productUrl = firstProduct?.product_url || null;
      const genderVal = userRel?.gender || null;
      const isGuest = (userRel && typeof userRel.is_guest === 'boolean') ? !!userRel.is_guest : (!userRel ? true : false);
      return {
        id: s.id,
        productTitle,
        productUrl,
        gender: genderVal,
        userType: isGuest ? 'GUEST' : 'LOGGED',
        shop: shopRel ? { id: shopRel.id, name: shopRel.name, url: shopRel.url || null } : null,
        status: s.status,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        satisfied: typeof s.satisfied === 'boolean' ? s.satisfied : null,
        feedback: s.feedback || null
      };
    };

    let items = (rows || []).map(mapSession);

    if (gender) items = items.filter((it: any) => String(it.gender || '').toUpperCase() === gender);
    if (userType === 'guest') items = items.filter((it: any) => it.userType === 'GUEST');
    if (userType === 'logged') items = items.filter((it: any) => it.userType === 'LOGGED');
    if (q) {
      const qq = q.toLowerCase();
      items = items.filter((it: any) =>
        (it.productTitle && String(it.productTitle).toLowerCase().includes(qq)) ||
        (it.shop && String(it.shop.name || '').toLowerCase().includes(qq))
      );
    }

    if (['product_title','gender','user_type','shop_name','status','created_at','satisfied'].includes(sortBy)) {
      items.sort((a: any, b: any) => {
        const keyMap: any = {
          product_title: 'productTitle',
          gender: 'gender',
          user_type: 'userType',
          shop_name: 'shop',
          status: 'status',
          created_at: 'createdAt',
          satisfied: 'satisfied'
        };
        const ka = keyMap[sortBy];
        let av: any = ka === 'shop' ? (a.shop ? a.shop.name : '') : (a as any)[ka];
        let bv: any = ka === 'shop' ? (b.shop ? b.shop.name : '') : (b as any)[ka];
        if (ka === 'createdAt') {
          av = av ? new Date(av).getTime() : 0;
          bv = bv ? new Date(bv).getTime() : 0;
        }
        if (typeof av === 'string' && typeof bv === 'string') {
          return sortDirAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return sortDirAsc ? ((av ?? 0) - (bv ?? 0)) : ((bv ?? 0) - (av ?? 0));
      });
    }

    res.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, totalCount: typeof count === 'number' ? count : items.length }
      }
    });
  } catch (e) {
    console.error('[owner] GET /sessions error:', e);
    res.status(500).json({ success: false, message: 'Kon sessies niet laden' });
  }
});

router.get('/fit-settings', requireAdmin, async (_req, res) => {
  try {
    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const fitLimits = (sys as any)?.settings?.fitLimits || {};
    const userDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.userDailyMax ?? 50), 10) || 50));
    const guestDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.guestDailyMax ?? 3), 10) || 3));
    res.json({ success: true, data: { userDailyMax, guestDailyMax } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kon FiT instellingen niet laden' });
  }
});

router.put('/fit-settings', requireAdmin, async (req, res) => {
  try {
    const rawUser = req.body?.userDailyMax;
    const rawGuest = req.body?.guestDailyMax;
    if (rawUser == null || rawGuest == null) {
      res.status(400).json({ success: false, message: 'userDailyMax en guestDailyMax zijn verplicht' });
      return;
    }
    const userDailyMax = Math.max(0, Math.min(999, parseInt(String(rawUser), 10)));
    const guestDailyMax = Math.max(0, Math.min(999, parseInt(String(rawGuest), 10)));
    if (!Number.isFinite(userDailyMax) || !Number.isFinite(guestDailyMax)) {
      res.status(400).json({ success: false, message: 'Ongeldige numerieke waarden' });
      return;
    }
    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const settings = (sys as any)?.settings && typeof (sys as any).settings === 'object' ? (sys as any).settings : {};
    (settings as any).fitLimits = { userDailyMax, guestDailyMax };
    const { data: updatedRow, error: updErr } = await supabaseAdmin
      .from('category_settings')
      .update({ settings } as any)
      .eq('key', 'SYSTEM')
      .select('key')
      .maybeSingle();
    if (updErr) throw updErr;
    if (!updatedRow) {
      const { error: insErr } = await supabaseAdmin
        .from('category_settings')
        .insert({ key: 'SYSTEM', label: 'SYSTEM', settings } as any);
      if (insErr) throw insErr;
    }
    res.json({ success: true, data: { userDailyMax, guestDailyMax } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kon FiT instellingen niet opslaan' });
  }
});

router.post('/fit-settings/apply-all-users', requireAdmin, async (req, res) => {
  try {
    const rawFromBody = (req.body as any)?.userDailyMax;
    let userDailyMax: number | null = null;
    if (rawFromBody != null) {
      const parsed = parseInt(String(rawFromBody), 10);
      if (Number.isFinite(parsed)) {
        userDailyMax = Math.max(0, Math.min(999, parsed));
      }
    }
    if (userDailyMax == null) {
      const { data: sys } = await supabaseAdmin
        .from('category_settings')
        .select('settings')
        .eq('key', 'SYSTEM')
        .maybeSingle();
      const fitLimits = (sys as any)?.settings?.fitLimits || {};
      const parsed = parseInt(String(fitLimits.userDailyMax ?? 50), 10);
      userDailyMax = Math.max(0, Math.min(999, Number.isFinite(parsed) ? parsed : 50));
    }
    const { error: updErr } = await supabaseAdmin
      .from('users')
      .update({ max_sessions: userDailyMax, updated_at: new Date().toISOString() })
      .eq('is_guest', false)
      .eq('user_type', 'USER');
    if (updErr) throw updErr;
    const { count } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_guest', false)
      .eq('user_type', 'USER');
    res.json({ success: true, updated: typeof count === 'number' ? count : 0, userDailyMax });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kon maxima niet toepassen op alle gebruikers' });
  }
});

// GET /subscription-settings - read admin-configured plans (included sessions + display prices in EUR)
router.get('/subscription-settings', requireAdmin, async (_req, res) => {
  try {
    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const plans = (sys as any)?.settings?.subscriptionPlans || {};
    const normalize = (p: any, defInc: number) => ({
      included: Math.max(0, parseInt(String(p?.included ?? defInc), 10) || defInc),
      priceMonthlyEUR: (p?.priceMonthlyEUR == null || p?.priceMonthlyEUR === '') ? null : Number(p.priceMonthlyEUR),
      priceYearlyEUR: (p?.priceYearlyEUR == null || p?.priceYearlyEUR === '') ? null : Number(p.priceYearlyEUR),
      shopsLimit: ((): number | null => {
        const v = (p?.shopsLimit as any);
        if (v == null || v === '') return null; // leeg = ∞
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
      })(),
      allowSubdomains: !!(p?.allowSubdomains)
    });
    const STARTER = normalize(plans?.STARTER, 50);
    const BASIC = normalize(plans?.BASIC, 500);
    const PREMIUM = normalize(plans?.PREMIUM, 2500);
    const ENTERPRISE = normalize(plans?.ENTERPRISE, 2500);
    res.json({ success: true, data: { STARTER, BASIC, PREMIUM, ENTERPRISE } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kon subscription settings niet laden' });
  }
});

// PUT /subscription-settings - upsert admin-configured plans
router.put('/subscription-settings', requireAdmin, async (req, res) => {
  try {
    const body = (req.body as any) || {};
    const plans = body?.plans || body; // allow both shapes
    if (!plans || typeof plans !== 'object') {
      res.status(400).json({ success: false, message: 'Ongeldige payload' });
      return;
    }
    const normNum = (v: any, min = 0, max = 100000) => {
      if (v == null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.min(Math.max(Math.floor(n), min), max);
    };
    const normalize = (p: any, defInc: number) => ({
      included: normNum(p?.included, 0, 100000) ?? defInc,
      priceMonthlyEUR: normNum(p?.priceMonthlyEUR, 0, 1000000),
      priceYearlyEUR: normNum(p?.priceYearlyEUR, 0, 1000000),
      shopsLimit: normNum(p?.shopsLimit, 0, 100000), // null = ∞
      allowSubdomains: !!(p?.allowSubdomains)
    });
    const STARTER = normalize(plans?.STARTER || {}, 50);
    const BASIC = normalize(plans?.BASIC || {}, 500);
    const PREMIUM = normalize(plans?.PREMIUM || {}, 2500);
    const ENTERPRISE = normalize(plans?.ENTERPRISE || {}, 2500);

    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const settings = (sys as any)?.settings && typeof (sys as any).settings === 'object' ? (sys as any).settings : {};
    (settings as any).subscriptionPlans = { STARTER, BASIC, PREMIUM, ENTERPRISE };
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('category_settings')
      .update({ settings } as any)
      .eq('key', 'SYSTEM')
      .select('key')
      .maybeSingle();
    if (updErr) throw updErr;
    if (!updated) {
      const { error: insErr } = await supabaseAdmin
        .from('category_settings')
        .insert({ key: 'SYSTEM', label: 'SYSTEM', settings } as any);
      if (insErr) throw insErr;
    }
    res.json({ success: true, data: { STARTER, BASIC, PREMIUM, ENTERPRISE } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kon subscription settings niet opslaan' });
  }
});

// POST /subscription-settings/apply-included - sync subscriptions.included_sessions per plan
router.post('/subscription-settings/apply-included', requireAdmin, async (_req, res) => {
  try {
    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const plans = (sys as any)?.settings?.subscriptionPlans || {};
    const getInc = (p: any, defVal: number) => Math.max(0, parseInt(String(p?.included ?? defVal), 10) || defVal);
    const inc = {
      STARTER: getInc(plans.STARTER, 50),
      BASIC: getInc(plans.BASIC, 500),
      PREMIUM: getInc(plans.PREMIUM, 2500),
      ENTERPRISE: getInc(plans.ENTERPRISE, 2500)
    } as const;
    // Update active subscriptions per plan
    for (const p of ['STARTER','BASIC','PREMIUM','ENTERPRISE'] as const) {
      const val = (inc as any)[p];
      try {
        await supabaseAdmin
          .from('subscriptions')
          .update({ included_sessions: val, updated_at: new Date().toISOString() } as any)
          .eq('status', 'ACTIVE')
          .eq('plan_type', p);
      } catch {}
    }
    res.json({ success: true, updated: true, included: inc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kon included sessies niet toepassen' });
  }
});

export default router;
