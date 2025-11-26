import express from 'express';
import multer from 'multer';
import path from 'path';
import { supabaseAdmin } from '../lib/supabase';
import { requireAdmin } from '../middleware/auth';
import { getCategorySettingsByKey } from '../lib/categoryConfig';

const router = express.Router();

type PlanType = 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

// Multer in-memory uploader for category hero (image)
const catUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

async function includedFromConfigOwner(plan: PlanType): Promise<number> {
  const fallback = (pl: PlanType) => {
    if (pl === 'BASIC') return 500;
    if (pl === 'PREMIUM') return 2500;
    if (pl === 'ENTERPRISE') return 2500;
    return 50;
  };
  try {
    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const plans = (sys as any)?.settings?.subscriptionPlans || {};
    const cfg = (plans as any)[plan || 'STARTER'] || {};
    const val = parseInt(String(cfg.included ?? fallback(plan)), 10);
    return Number.isFinite(val) ? Math.max(0, val) : fallback(plan);
  } catch {
    return fallback(plan);
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

// GET /consumers - list users with filters, sorting, pagination and per-user session statistics
router.get('/consumers', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
    const userTypeRaw = typeof req.query.userType === 'string' ? req.query.userType.trim().toUpperCase() : '';
    const regFrom = typeof req.query.regFrom === 'string' ? req.query.regFrom.trim() : '';
    const regTo = typeof req.query.regTo === 'string' ? req.query.regTo.trim() : '';
    const sortBy = (typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at').toLowerCase();
    const sortDirAsc = String(req.query.sortDir || 'desc').toLowerCase() === 'asc';
    const hideGuests = String(req.query.hideGuests || 'false').toLowerCase() === 'true';

    const normalizeStart = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T00:00:00.000Z').toISOString()) : undefined;
    const normalizeEnd = (d: string) => d ? (d.includes('T') ? d : new Date(d + 'T23:59:59.999Z').toISOString()) : undefined;

    let query = supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, user_type, created_at, is_guest', { count: 'exact' });

    if (email) query = query.ilike('email', `%${email}%`);
    if (userTypeRaw && ['USER','ADMIN'].includes(userTypeRaw)) query = query.eq('user_type', userTypeRaw);
    if (hideGuests) query = query.eq('is_guest', false);
    if (regFrom) query = query.gte('created_at', normalizeStart(regFrom) as string);
    if (regTo) query = query.lte('created_at', normalizeEnd(regTo) as string);
    if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);

    const sortableDbCols = ['first_name','last_name','email','user_type','created_at'];
    if (sortableDbCols.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortDirAsc });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query as any;
    if (error) throw error;

    const userIds = (rows || []).map((u: any) => u.id).filter((id: any) => !!id);

    const statsByUser: Record<string, {
      totalSessions: number;
      completedSessions: number;
      processingSessions: number;
      satisfiedTrueSessions: number;
      satisfiedFalseSessions: number;
    }> = {};

    if (userIds.length > 0) {
      try {
        const { data: sessionRows } = await supabaseAdmin
          .from('fit_sessions')
          .select('user_id, status, satisfied')
          .in('user_id', userIds as any);

        (sessionRows || []).forEach((s: any) => {
          const uid = s.user_id;
          if (!uid) return;
          if (!statsByUser[uid]) {
            statsByUser[uid] = {
              totalSessions: 0,
              completedSessions: 0,
              processingSessions: 0,
              satisfiedTrueSessions: 0,
              satisfiedFalseSessions: 0
            };
          }
          const bucket = statsByUser[uid];
          bucket.totalSessions += 1;
          if (s.status === 'COMPLETED') bucket.completedSessions += 1;
          if (s.status === 'PROCESSING') bucket.processingSessions += 1;
          if (s.satisfied === true) bucket.satisfiedTrueSessions += 1;
          if (s.satisfied === false) bucket.satisfiedFalseSessions += 1;
        });
      } catch {}
    }

    const items = (rows || []).map((u: any) => {
      const stats = statsByUser[u.id] || {
        totalSessions: 0,
        completedSessions: 0,
        processingSessions: 0,
        satisfiedTrueSessions: 0,
        satisfiedFalseSessions: 0
      };
      return {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        userType: u.user_type,
        registeredAt: u.created_at,
        totalSessions: stats.totalSessions,
        completedSessions: stats.completedSessions,
        processingSessions: stats.processingSessions,
        satisfiedTrueSessions: stats.satisfiedTrueSessions,
        satisfiedFalseSessions: stats.satisfiedFalseSessions
      };
    });

    const sessionSortKeys = [
      'total_sessions',
      'completed_sessions',
      'processing_sessions',
      'satisfied_true_sessions',
      'satisfied_false_sessions'
    ];

    if (sessionSortKeys.includes(sortBy)) {
      const keyMap: Record<string, string> = {
        total_sessions: 'totalSessions',
        completed_sessions: 'completedSessions',
        processing_sessions: 'processingSessions',
        satisfied_true_sessions: 'satisfiedTrueSessions',
        satisfied_false_sessions: 'satisfiedFalseSessions'
      };

      const mappedKey = keyMap[sortBy] as string;

      items.sort((a: any, b: any) => {
        const av = Number((a as any)[mappedKey] ?? 0);
        const bv = Number((b as any)[mappedKey] ?? 0);
        return sortDirAsc ? (av - bv) : (bv - av);
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

router.get('/fit-settings', requireAdmin, async (_req: express.Request, res: express.Response) => {
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

router.put('/fit-settings', requireAdmin, async (req: express.Request, res: express.Response) => {
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

router.post('/fit-settings/apply-all-users', requireAdmin, async (req: express.Request, res: express.Response) => {
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
router.get('/subscription-settings', requireAdmin, async (_req: express.Request, res: express.Response) => {
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
router.put('/subscription-settings', requireAdmin, async (req: express.Request, res: express.Response) => {
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
router.post('/subscription-settings/apply-included', requireAdmin, async (_req: express.Request, res: express.Response) => {
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

router.get('/retailers', requireAdmin, async (req: express.Request, res: express.Response) => {
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

    const retailerIds = (rows || []).map((r: any) => r.id).filter((id: any) => !!id);

    const sessionsByRetailer: Record<string, number> = {};
    const shopsByRetailer: Record<string, number> = {};
    const activePlanByRetailer: Record<string, string | null> = {};

    if (retailerIds.length > 0) {
      try {
        const { data: sessionRows } = await supabaseAdmin
          .from('fit_sessions')
          .select('retailer_id')
          .in('retailer_id', retailerIds as any);
        (sessionRows || []).forEach((s: any) => {
          const rid = s.retailer_id;
          if (!rid) return;
          sessionsByRetailer[rid] = (sessionsByRetailer[rid] || 0) + 1;
        });
      } catch {}

      try {
        const { data: shopRows } = await supabaseAdmin
          .from('shops')
          .select('retailer_id')
          .in('retailer_id', retailerIds as any);
        (shopRows || []).forEach((s: any) => {
          const rid = s.retailer_id;
          if (!rid) return;
          shopsByRetailer[rid] = (shopsByRetailer[rid] || 0) + 1;
        });
      } catch {}

      try {
        const { data: subRows } = await supabaseAdmin
          .from('subscriptions')
          .select('retailer_id, plan_type, status, updated_at')
          .in('retailer_id', retailerIds as any)
          .eq('status', 'ACTIVE');
        const latestByRetailer: Record<string, { plan_type: string | null; updated_at: string | null }> = {};
        (subRows || []).forEach((s: any) => {
          const rid = s.retailer_id;
          if (!rid) return;
          const prev = latestByRetailer[rid];
          if (!prev || (prev.updated_at || '') < (s.updated_at || '')) {
            latestByRetailer[rid] = { plan_type: s.plan_type || null, updated_at: s.updated_at || null };
          }
        });
        Object.keys(latestByRetailer).forEach(rid => {
          activePlanByRetailer[rid] = latestByRetailer[rid].plan_type || null;
        });
      } catch {}
    }

    const items = await Promise.all((rows || []).map(async (r: any) => {
      let lastLoginAt: string | null = null;
      try {
        if (r.auth_id) {
          const au = await supabaseAdmin.auth.admin.getUserById(String(r.auth_id));
          lastLoginAt = (au as any)?.user?.last_sign_in_at || null;
        } else if (r.email) {
          const { data } = await supabaseAdmin.auth.admin.listUsers();
          const users = (data as any)?.users || [];
          const user = users.find((u: any) => String(u.email).toLowerCase() === String(r.email).toLowerCase());
          if (user?.last_sign_in_at) {
            lastLoginAt = user.last_sign_in_at;
          }
        }
      } catch {}

      const sessionsCount = sessionsByRetailer[r.id] || 0;
      const shopsCount = shopsByRetailer[r.id] || 0;
      const effectivePlanType: string | null = activePlanByRetailer[r.id] != null ? activePlanByRetailer[r.id] : (r.plan_type || null);

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

router.get('/shops', requireAdmin, async (req: express.Request, res: express.Response) => {
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

    if (q) query = query.ilike('name', `%${q}%`);
    if (category) query = query.eq('category', category);
    if (regFrom) query = query.gte('created_at', normalizeStart(regFrom) as string);
    if (regTo) query = query.lte('created_at', normalizeEnd(regTo) as string);
    if (retailerEmail) query = query.eq('retailers.email', retailerEmail);

    const sortableDbCols = ['name','category','created_at'];
    if (sortableDbCols.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortDirAsc });
    } else {
      query = query.order('name', { ascending: true });
    }
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query as any;
    if (error) throw error;

    const items = await Promise.all((rows || []).map(async (r: any) => {
      let sessionsCount = 0;
      try {
        const { count: sc } = await supabaseAdmin
          .from('fit_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', r.id);
        sessionsCount = sc || 0;
      } catch {}
      const retailer = Array.isArray(r.retailers) ? r.retailers[0] : r.retailers;
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        retailerEmail: retailer ? retailer.email : null,
        createdAt: r.created_at,
        totalSessions: sessionsCount
      };
    }));

    const filtered = items.filter(it => {
      if (!Number.isFinite(sessionsMin) && !Number.isFinite(sessionsMax)) return true;
      const c = it.totalSessions || 0;
      if (Number.isFinite(sessionsMin) && c < sessionsMin) return false;
      if (Number.isFinite(sessionsMax) && c > sessionsMax) return false;
      return true;
    });

    if (['sessions_total'].includes(sortBy)) {
      filtered.sort((a: any, b: any) => {
        const av = a.totalSessions || 0;
        const bv = b.totalSessions || 0;
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
    console.error('[owner] GET /shops error:', e);
    res.status(500).json({ success: false, message: 'Kon webshops niet laden' });
  }
});

router.patch('/retailers/:id/plan', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const retailerId = String(req.params.id || '').trim();
    const bodyPlan = (req.body as any)?.planType;
    const plan = typeof bodyPlan === 'string' ? bodyPlan.toUpperCase() : '';
    const allowed: PlanType[] = ['STARTER', 'BASIC', 'PREMIUM', 'ENTERPRISE'];
    if (!retailerId || !allowed.includes(plan as PlanType)) {
      res.status(400).json({ success: false, message: 'Ongeldige retailer of planType' });
      return;
    }

    const { data: retailer, error: rErr } = await supabaseAdmin
      .from('retailers')
      .select('id, plan_type')
      .eq('id', retailerId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!retailer) {
      res.status(404).json({ success: false, message: 'Retailer niet gevonden' });
      return;
    }

    const currentPlan = String((retailer as any).plan_type || 'STARTER').toUpperCase();
    if (currentPlan === plan) {
      res.json({ success: true, data: { retailerId, planType: plan } });
      return;
    }

    const included = await includedFromConfigOwner(plan as PlanType);

    const { error: updRetailerErr } = await supabaseAdmin
      .from('retailers')
      .update({ plan_type: plan, updated_at: new Date().toISOString() })
      .eq('id', retailerId);
    if (updRetailerErr) throw updRetailerErr;

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('retailer_id', retailerId)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ plan_type: plan, included_sessions: included, updated_at: new Date().toISOString() })
          .eq('id', (sub as any).id);
      } else {
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            retailer_id: retailerId,
            status: 'ACTIVE',
            plan_type: plan,
            included_sessions: included,
          } as any);
      }
    } catch (e) {
      console.warn('[owner] set plan subscriptions sync failed (non-fatal):', (e as any)?.message || e);
    }

    res.json({ success: true, data: { retailerId, planType: plan, included } });
  } catch (e) {
    console.error('[owner] PATCH /retailers/:id/plan error:', e);
    res.status(500).json({ success: false, message: 'Kon abonnement niet aanpassen' });
  }
});

router.get('/sessions', requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const gender = typeof req.query.gender === 'string' ? req.query.gender.trim() : '';
    const userType = typeof req.query.userType === 'string' ? req.query.userType.trim() : '';
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
        shop_id,
        satisfied,
        feedback,
        shops:shop_id ( id, name ),
        users: user_id ( first_name, last_name, email, user_type, gender, is_guest )
      `, { count: 'exact' });

    if (shopId) query = query.eq('shop_id', shopId);
    if (status && ['PENDING','PROCESSING','COMPLETED','FAILED'].includes(status)) query = query.eq('status', status);
    if (dateFrom) query = query.gte('created_at', normalizeStart(dateFrom) as string);
    if (dateTo) query = query.lte('created_at', normalizeEnd(dateTo) as string);
    if (gender) query = query.eq('users.gender', gender);
    if (userType === 'guest') query = query.eq('users.is_guest', true);
    if (userType === 'logged') query = query.eq('users.is_guest', false);
    if (satisfied === 'true') query = query.eq('satisfied', true);
    if (satisfied === 'false') query = query.eq('satisfied', false);
    if (q) {
      query = query.or(`users.first_name.ilike.%${q}%,users.last_name.ilike.%${q}%,users.email.ilike.%${q}%`);
    }

    const sortableDbCols = ['status','created_at'];
    if (sortableDbCols.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortDirAsc });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query as any;
    if (error) throw error;

    const sessionIds = (rows || []).map((r: any) => r.id).filter((id: any) => !!id);
    const productBySession: Record<string, { product_title: string | null; product_url: string | null }> = {};

    if (sessionIds.length > 0) {
      try {
        const { data: prodRows } = await supabaseAdmin
          .from('fit_session_products')
          .select('session_id, product_name, product_url')
          .in('session_id', sessionIds as any);
        (prodRows || []).forEach((p: any) => {
          const sid = p.session_id;
          if (!sid) return;
          if (!productBySession[sid]) {
            productBySession[sid] = {
              product_title: p.product_name || null,
              product_url: p.product_url || null
            };
          }
        });
      } catch {}
    }

    const items = (rows || []).map((r: any) => {
      const user = Array.isArray(r.users) ? r.users[0] : r.users;
      const shop = Array.isArray(r.shops) ? r.shops[0] : r.shops;
      const prod = productBySession[r.id] || { product_title: null, product_url: null };
      const userTypeVal = user ? (user.is_guest ? 'GUEST' : (user.user_type || 'USER')) : null;
      return {
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        shop: shop ? { id: shop.id, name: shop.name } : null,
        gender: user ? user.gender : null,
        userType: userTypeVal,
        satisfied: r.satisfied,
        feedback: r.feedback,
        productTitle: prod.product_title,
        productUrl: prod.product_url
      };
    });

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

export default router;
