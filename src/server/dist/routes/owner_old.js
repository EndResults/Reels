"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const categoryConfig_1 = require("../lib/categoryConfig");
const stripe_1 = __importDefault(require("stripe"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const catUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});
router.post('/retailers/:id/restore', requireAdmin, async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) {
            res.status(400).json({ success: false, message: 'Ongeldig retailer id' });
            return;
        }
        await supabase_1.supabaseAdmin
            .from('retailers')
            .update({ is_active: true, deactivated_at: null, close_reason: null, updated_at: new Date().toISOString() })
            .eq('id', id);
        await supabase_1.supabaseAdmin
            .from('shops')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('retailer_id', id);
        let included = 50;
        try {
            const { data: sys } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('settings')
                .eq('key', 'SYSTEM')
                .maybeSingle();
            const plans = sys?.settings?.subscriptionPlans || {};
            const v = parseInt(String((plans?.STARTER?.included ?? 50)), 10);
            if (Number.isFinite(v))
                included = Math.max(0, v);
        }
        catch { }
        const { data: active } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('retailer_id', id)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!active) {
            await supabase_1.supabaseAdmin
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
            });
        }
        res.json({ success: true });
    }
    catch (e) {
        console.error('[owner] POST /retailers/:id/restore error:', e);
        res.status(500).json({ success: false, message: 'Kon retailer niet herstellen' });
    }
});
function resolveRetailerSignupWebhookUrl() {
    const direct = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL || '').trim();
    if (direct)
        return direct;
    const server = (process.env.SERVER_URL || '').toLowerCase();
    const isUat = /fit-uat|uat/.test(server);
    if (isUat) {
        const uat = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_UAT || '').trim();
        if (uat)
            return uat;
        const prod = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_PROD || '').trim();
        return prod || undefined;
    }
    const prod = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_PROD || '').trim();
    if (prod)
        return prod;
    const uat = (process.env.N8N_RETAILER_SIGNUP_WEBHOOK_URL_UAT || '').trim();
    return uat || undefined;
}
async function sendRetailerClosureWebhook(payload) {
    const url = resolveRetailerSignupWebhookUrl();
    if (!url)
        return;
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.N8N_API_KEY)
        headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
    const timeout = parseInt(String(process.env.N8N_TIMEOUT_MS || 10000), 10) || 10000;
    try {
        try {
            const u = new URL(url);
            const safe = `${u.origin}${u.pathname}`;
            console.info('[Webhook] Retailer close: POST', safe, { email: payload.email });
        }
        catch { }
        await axios_1.default.post(url, payload, { headers, timeout });
        console.info('[Webhook] Retailer close: delivered');
    }
    catch (e) {
        console.warn('Retailer close webhook failed:', e?.message || e);
    }
}
router.patch('/retailers/:id/plan', requireAdmin, async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        const planRaw = String(req.body?.planType || '').toUpperCase();
        if (!id || !['STARTER', 'BASIC', 'PREMIUM', 'ENTERPRISE'].includes(planRaw)) {
            res.status(400).json({ success: false, message: 'Ongeldige invoer' });
            return;
        }
        let included = 50;
        try {
            const { data: sys } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('settings')
                .eq('key', 'SYSTEM')
                .maybeSingle();
            const plans = sys?.settings?.subscriptionPlans || {};
            const def = (p) => (p === 'BASIC' ? 500 : (p === 'PREMIUM' || p === 'ENTERPRISE') ? 2500 : 50);
            const cfg = plans[planRaw] || {};
            const val = parseInt(String(cfg.included ?? def(planRaw)), 10);
            included = Number.isFinite(val) ? Math.max(0, val) : def(planRaw);
        }
        catch { }
        const { data: active } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('id, stripe_subscription_id, plan_type')
            .eq('retailer_id', id)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (active && active.id) {
            await supabase_1.supabaseAdmin
                .from('subscriptions')
                .update({ plan_type: planRaw, status: 'ACTIVE', included_sessions: included, cancel_at_period_end: false, next_plan_type: null, updated_at: new Date().toISOString() })
                .eq('id', active.id);
        }
        else {
            await supabase_1.supabaseAdmin
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
            });
        }
        await supabase_1.supabaseAdmin
            .from('retailers')
            .update({ plan_type: planRaw, updated_at: new Date().toISOString() })
            .eq('id', id);
        const rank = (p) => (p === 'BASIC' ? 1 : p === 'PREMIUM' ? 2 : p === 'ENTERPRISE' ? 3 : 0);
        const prevPlan = String((active?.plan_type || 'STARTER')).toUpperCase();
        const isUpgrade = rank(planRaw) > rank(prevPlan);
        try {
            await supabase_1.supabaseAdmin.rpc('ensure_credit_row', { _retailer: id, _included: 0 });
        }
        catch { }
        if (isUpgrade && (included || 0) > 0) {
            try {
                const d = new Date();
                const month = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
                const { data: row } = await supabase_1.supabaseAdmin
                    .from('fit_credits')
                    .select('included')
                    .eq('retailer_id', id)
                    .eq('period_month', month)
                    .maybeSingle();
                const currentIncluded = Number(row?.included || 0);
                const newIncluded = currentIncluded + (included || 0);
                await supabase_1.supabaseAdmin
                    .from('fit_credits')
                    .update({ included: newIncluded, updated_at: new Date().toISOString() })
                    .eq('retailer_id', id)
                    .eq('period_month', month);
                try {
                    await supabase_1.supabaseAdmin.from('fit_credit_events').insert({
                        retailer_id: id,
                        period_month: month,
                        delta: Number(included || 0),
                        source: 'admin_plan_upgrade'
                    });
                }
                catch { }
            }
            catch { }
        }
        console.info('[Admin] Plan set', { retailerId: id, planType: planRaw, included });
        res.json({ success: true, data: { retailerId: id, planType: planRaw, included } });
    }
    catch (e) {
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
        const { data: sub } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('id, stripe_subscription_id, status, current_period_end')
            .eq('retailer_id', id)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        const stripeId = sub?.stripe_subscription_id;
        if (stripeId && process.env.STRIPE_SECRET_KEY) {
            try {
                const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });
                await stripe.subscriptions.update(stripeId, { cancel_at_period_end: true });
            }
            catch { }
        }
        if (sub?.id || stripeId) {
            let q = supabase_1.supabaseAdmin
                .from('subscriptions')
                .update({ cancel_at_period_end: true, next_plan_type: 'STARTER', updated_at: new Date().toISOString() });
            if (stripeId)
                q = q.eq('stripe_subscription_id', stripeId);
            else
                q = q.eq('id', sub.id);
            await q;
        }
        await supabase_1.supabaseAdmin
            .from('retailers')
            .update({ is_active: false, deactivated_at: new Date().toISOString(), close_reason: reason, updated_at: new Date().toISOString() })
            .eq('id', id);
        await supabase_1.supabaseAdmin
            .from('shops')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('retailer_id', id);
        let email = null;
        try {
            const { data: row } = await supabase_1.supabaseAdmin
                .from('retailers')
                .select('email')
                .eq('id', id)
                .maybeSingle();
            email = row?.email || null;
        }
        catch { }
        try {
            await sendRetailerClosureWebhook({ email, deactivated_at: new Date().toISOString(), close_reason: reason });
        }
        catch { }
        console.info('[Admin] Retailer soft-closed', { retailerId: id });
        res.json({ success: true });
    }
    catch (e) {
        console.error('[owner] POST /retailers/:id/close error:', e);
        res.status(500).json({ success: false, message: 'Kon account niet opheffen' });
    }
});
router.patch('/categories/:key/settings', requireAdmin, async (req, res) => {
    try {
        const key = String(req.params.key || '').toUpperCase();
        const settings = (req.body && req.body.settings);
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            res.status(400).json({ success: false, message: 'Ongeldige settings payload' });
            return;
        }
        const { data: updatedRow, error: updErr } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .update({ settings })
            .eq('key', key)
            .select('key')
            .maybeSingle();
        if (updErr)
            throw updErr;
        if (!updatedRow) {
            const { error: insErr } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .insert({ key, settings });
            if (insErr) {
                const msg = String(insErr.message || insErr || '');
                if ((insErr.code === '23502' && /label/i.test(msg)) || /null value in column\s+"?label"?/i.test(msg)) {
                    const { error: insErr2 } = await supabase_1.supabaseAdmin
                        .from('category_settings')
                        .insert({ key, label: key, settings });
                    if (insErr2)
                        throw insErr2;
                }
                else {
                    throw insErr;
                }
            }
        }
        res.json({ success: true });
    }
    catch (e) {
        console.error('[owner] PATCH /categories/:key/settings error:', e);
        if (e && (e.code === '42703' || /column\s+"?settings"?\s+does\s+not\s+exist/i.test(String(e.message || e)))) {
            res.status(409).json({ success: false, message: 'Kolom "settings" ontbreekt op category_settings. Voer de migratie uit.' });
            return;
        }
        res.status(500).json({ success: false, message: 'Kon settings niet bijwerken' });
    }
});
router.patch('/categories/:key/promo', requireAdmin, async (req, res) => {
    try {
        const key = String(req.params.key || '').toUpperCase();
        const locales = req.body?.locales || {};
        if (typeof locales !== 'object' || !locales) {
            res.status(400).json({ success: false, message: 'Ongeldige payload' });
            return;
        }
        const norm = {};
        for (const lang of ['nl', 'en']) {
            const v = locales[lang];
            if (v && typeof v === 'object') {
                norm[lang] = {
                    video_url: typeof v.video_url === 'string' ? v.video_url : '',
                    header: typeof v.header === 'string' ? v.header : '',
                    body: typeof v.body === 'string' ? v.body : ''
                };
            }
        }
        const { data: updated, error: updErr } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .update({ promo_locales: norm })
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
            const { error: insErr } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .insert({ key, settings: {}, promo_locales: norm });
            if (insErr) {
                const msg = String(insErr.message || insErr || '');
                if ((insErr.code === '23502' && /label/i.test(msg)) || /null value in column\s+"?label"?/i.test(msg)) {
                    const { error: insErr2 } = await supabase_1.supabaseAdmin
                        .from('category_settings')
                        .insert({ key, label: key, settings: {}, promo_locales: norm });
                    if (insErr2)
                        throw insErr2;
                }
                else if (insErr.code === '42703' || /column\s+"?promo_locales"?\s+does\s+not\s+exist/i.test(msg)) {
                    res.status(409).json({ success: false, message: 'Kolom "promo_locales" ontbreekt op category_settings. Voer de migratie add_promo_locales.sql uit.' });
                    return;
                }
                else {
                    throw insErr;
                }
            }
        }
        res.json({ success: true });
    }
    catch (e) {
        console.error('[owner] PATCH /categories/:key/promo error:', e);
        res.status(500).json({ success: false, message: 'Kon promo niet bijwerken' });
    }
});
async function requireAdmin(req, res, next) {
    try {
        await (0, auth_1.authenticateToken)(req, res, async () => {
            if (!req.user || req.user.role !== 'user') {
                res.status(403).json({ success: false, message: 'Admin toegang vereist' });
                return;
            }
            try {
                const { data: profile, error } = await supabase_1.supabaseAdmin
                    .from('users')
                    .select('user_type')
                    .eq('id', req.user.id)
                    .maybeSingle();
                if (error || !profile || profile.user_type !== 'ADMIN') {
                    res.status(403).json({ success: false, message: 'Admin toegang vereist' });
                    return;
                }
                next();
            }
            catch (e) {
                res.status(403).json({ success: false, message: 'Admin toegang vereist' });
            }
        });
    }
    catch (e) {
    }
}
router.get('/categories', requireAdmin, async (_req, res) => {
    try {
        let cats = null;
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('key, status');
            if (error)
                throw error;
            cats = data || [];
        }
        catch (err) {
            if ((err && (err.code === '42703' || /column\s+"?status"?/i.test(String(err.message)))) || /column\s+status\s+does\s+not\s+exist/i.test(String(err))) {
                const { data } = await supabase_1.supabaseAdmin
                    .from('category_settings')
                    .select('key');
                cats = data || [];
            }
            else {
                throw err;
            }
        }
        const results = [];
        for (const c of (cats || [])) {
            const k = String(c.key).toUpperCase();
            const st = String(c.status || 'ACTIVE').toUpperCase();
            let shopsCount = 0;
            try {
                const { count } = await supabase_1.supabaseAdmin
                    .from('shops')
                    .select('id', { count: 'exact', head: true })
                    .eq('category', k);
                shopsCount = count || 0;
            }
            catch { }
            results.push({ key: k, shopsCount, status: st });
        }
        res.json({ success: true, categories: results });
    }
    catch (e) {
        console.error('[owner] GET /categories error:', e);
        res.status(500).json({ success: false, message: 'Kon categorieën niet laden' });
    }
});
router.post('/categories/:key/hero', requireAdmin, catUpload.single('hero'), async (req, res) => {
    try {
        const key = String(req.params.key || '').toUpperCase();
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, message: 'Geen bestand geüpload' });
            return;
        }
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            res.status(400).json({ success: false, message: 'Alleen PNG, JPG of WEBP toegestaan' });
            return;
        }
        const ext = (() => {
            const e = path_1.default.extname(file.originalname || '')?.toLowerCase();
            if (e)
                return e;
            if (file.mimetype === 'image/png')
                return '.png';
            if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg')
                return '.jpg';
            if (file.mimetype === 'image/webp')
                return '.webp';
            return '.png';
        })();
        const fileName = `Category_image_${key}${ext}`;
        const bucket = 'Content_general';
        const { error: upErr } = await supabase_1.supabaseAdmin.storage
            .from(bucket)
            .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
        if (upErr) {
            res.status(500).json({ success: false, message: `Upload mislukt: ${upErr.message}` });
            return;
        }
        const { data: urlData } = supabase_1.supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;
        const { data: row, error: updErr } = await supabase_1.supabaseAdmin
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
            const { error: insErr } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .insert({ key, settings: {}, category_hero: publicUrl });
            if (insErr) {
                const msg = String(insErr.message || insErr || '');
                if ((insErr.code === '23502' && /label/i.test(msg)) || /null value in column\s+"?label"?/i.test(msg)) {
                    const { error: insErr2 } = await supabase_1.supabaseAdmin
                        .from('category_settings')
                        .insert({ key, label: key, settings: {}, category_hero: publicUrl });
                    if (insErr2) {
                        res.status(500).json({ success: false, message: 'Kon categorie niet aanmaken' });
                        return;
                    }
                }
                else {
                    res.status(500).json({ success: false, message: 'Kon categorie niet aanmaken' });
                    return;
                }
            }
        }
        res.json({ success: true, url: publicUrl, fileName });
    }
    catch (e) {
        console.error('[owner] POST /categories/:key/hero error:', e);
        res.status(500).json({ success: false, message: 'Upload mislukt' });
    }
});
router.get('/categories/:key', requireAdmin, async (req, res) => {
    try {
        const key = String(req.params.key || '').toUpperCase();
        const settings = await (0, categoryConfig_1.getCategorySettingsByKey)(key);
        let statusVal = 'ACTIVE';
        let heroUrl = null;
        let promoLocales = null;
        try {
            const { data } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('status, category_hero, promo_locales')
                .eq('key', key)
                .maybeSingle();
            statusVal = String(data?.status || 'ACTIVE').toUpperCase();
            heroUrl = data?.category_hero || null;
            promoLocales = data?.promo_locales || null;
        }
        catch (err) {
            if (!(err && (err.code === '42703' || /column\s+"?status"?/i.test(String(err.message))))) {
            }
        }
        const { data: shops, error: shopsErr } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, name, category, url, domain, is_active, language, created_at')
            .eq('category', key)
            .order('name', { ascending: true });
        if (shopsErr)
            throw shopsErr;
        res.json({
            success: true,
            key,
            status: statusVal,
            settings: settings || {},
            hero: heroUrl,
            promo: promoLocales,
            shops: shops || []
        });
    }
    catch (e) {
        console.error('[owner] GET /categories/:key error:', e);
        res.status(500).json({ success: false, message: 'Kon categorie details niet laden' });
    }
});
router.patch('/categories/:key/status', requireAdmin, async (req, res) => {
    try {
        const key = String(req.params.key || '').toUpperCase();
        const statusRaw = String(req.body?.status || '').toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(statusRaw)) {
            res.status(400).json({ success: false, message: 'Ongeldige status, gebruik ACTIVE of INACTIVE' });
            return;
        }
        let updErr = null;
        try {
            const { error } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .update({ status: statusRaw })
                .eq('key', key);
            updErr = error || null;
        }
        catch (e) {
            if (e && (e.code === '42703' || /column\s+"?status"?/i.test(String(e.message)))) {
                res.status(409).json({ success: false, message: 'Kolom "status" ontbreekt op category_settings. Voer eerst de migratie uit.' });
                return;
            }
            throw e;
        }
        if (updErr) {
            try {
                const { data: exists } = await supabase_1.supabaseAdmin
                    .from('category_settings')
                    .select('key')
                    .eq('key', key)
                    .maybeSingle();
                if (!exists) {
                    const { error: insErr } = await supabase_1.supabaseAdmin
                        .from('category_settings')
                        .insert({ key, settings: {}, status: statusRaw });
                    if (insErr)
                        throw insErr;
                }
            }
            catch (e) {
                throw e;
            }
        }
        res.json({ success: true });
    }
    catch (e) {
        console.error('[owner] PATCH /categories/:key/status error:', e);
        res.status(500).json({ success: false, message: 'Kon categorystatus niet bijwerken' });
    }
});
router.get('/scrape-results', requireAdmin, async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10) || 100, 1), 500);
        const domain = typeof req.query.domain === 'string' && req.query.domain.trim() ? req.query.domain.trim() : undefined;
        let query = supabase_1.supabaseAdmin
            .from('scrape_results')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (domain)
            query = query.eq('domain', domain);
        const { data, error } = await query;
        if (error)
            throw error;
        res.json({ success: true, results: data || [] });
    }
    catch (e) {
        console.error('[owner] GET /scrape-results error:', e);
        res.status(500).json({ success: false, message: 'Kon scrape resultaten niet laden' });
    }
});
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
        const normalizeStart = (d) => d ? (d.includes('T') ? d : new Date(d + 'T00:00:00.000Z').toISOString()) : undefined;
        const normalizeEnd = (d) => d ? (d.includes('T') ? d : new Date(d + 'T23:59:59.999Z').toISOString()) : undefined;
        let query = supabase_1.supabaseAdmin
            .from('retailers')
            .select('id, auth_id, email, first_name, last_name, plan_type, created_at', { count: 'exact' });
        if (email)
            query = query.ilike('email', `%${email}%`);
        if (planTypeRaw && ['STARTER', 'BASIC', 'PREMIUM', 'ENTERPRISE'].includes(planTypeRaw))
            query = query.eq('plan_type', planTypeRaw);
        if (regFrom)
            query = query.gte('created_at', normalizeStart(regFrom));
        if (regTo)
            query = query.lte('created_at', normalizeEnd(regTo));
        if (q)
            query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
        const sortableDbCols = ['first_name', 'last_name', 'email', 'plan_type', 'created_at'];
        if (sortableDbCols.includes(sortBy)) {
            query = query.order(sortBy, { ascending: sortDirAsc });
        }
        else {
            query = query.order('created_at', { ascending: false });
        }
        query = query.range(offset, offset + limit - 1);
        const { data: rows, error, count } = await query;
        if (error)
            throw error;
        const items = await Promise.all((rows || []).map(async (r) => {
            let lastLoginAt = null;
            try {
                const aid = r.auth_id || r.id;
                if (aid) {
                    const au = await supabase_1.supabaseAdmin.auth.admin.getUserById(String(aid));
                    lastLoginAt = au?.user?.last_sign_in_at || null;
                }
            }
            catch { }
            let sessionsCount = 0;
            try {
                const { count: sc } = await supabase_1.supabaseAdmin
                    .from('fit_sessions')
                    .select('id', { count: 'exact', head: true })
                    .eq('retailer_id', r.id);
                sessionsCount = sc || 0;
            }
            catch { }
            let shopsCount = 0;
            try {
                const { count: shc } = await supabase_1.supabaseAdmin
                    .from('shops')
                    .select('id', { count: 'exact', head: true })
                    .eq('retailer_id', r.id);
                shopsCount = shc || 0;
            }
            catch { }
            let effectivePlanType = r.plan_type || null;
            try {
                const { data: sub } = await supabase_1.supabaseAdmin
                    .from('subscriptions')
                    .select('plan_type, status')
                    .eq('retailer_id', r.id)
                    .eq('status', 'ACTIVE')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (sub && sub.plan_type)
                    effectivePlanType = sub.plan_type;
            }
            catch { }
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
        const withinLastLoginRange = (dt, start, end) => {
            if (!start && !end)
                return true;
            if (!dt)
                return false;
            const t = new Date(dt).getTime();
            if (start) {
                const s = new Date(normalizeStart(start)).getTime();
                if (t < s)
                    return false;
            }
            if (end) {
                const e = new Date(normalizeEnd(end)).getTime();
                if (t > e)
                    return false;
            }
            return true;
        };
        const filtered = items.filter(it => withinLastLoginRange(it.lastLoginAt, lastLoginFrom, lastLoginTo));
        if (['last_login', 'sessions_total', 'shops_count'].includes(sortBy)) {
            filtered.sort((a, b) => {
                let av = a[sortBy === 'last_login' ? 'lastLoginAt' : sortBy === 'sessions_total' ? 'totalSessions' : 'shopsCount'];
                let bv = b[sortBy === 'last_login' ? 'lastLoginAt' : sortBy === 'sessions_total' ? 'totalSessions' : 'shopsCount'];
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
    }
    catch (e) {
        console.error('[owner] GET /retailers error:', e);
        res.status(500).json({ success: false, message: 'Kon retailers niet laden' });
    }
});
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
        const normalizeStart = (d) => d ? (d.includes('T') ? d : new Date(d + 'T00:00:00.000Z').toISOString()) : undefined;
        const normalizeEnd = (d) => d ? (d.includes('T') ? d : new Date(d + 'T23:59:59.999Z').toISOString()) : undefined;
        let query = supabase_1.supabaseAdmin
            .from('shops')
            .select('id, retailer_id, name, category, created_at, retailers:retailer_id ( email )', { count: 'exact' });
        if (category)
            query = query.eq('category', category);
        if (regFrom)
            query = query.gte('created_at', normalizeStart(regFrom));
        if (regTo)
            query = query.lte('created_at', normalizeEnd(regTo));
        if (q)
            query = query.ilike('name', `%${q}%`);
        const sortableDbCols = ['name', 'category', 'created_at'];
        if (sortableDbCols.includes(sortBy)) {
            query = query.order(sortBy, { ascending: sortDirAsc });
        }
        else {
            query = query.order('name', { ascending: true });
        }
        query = query.range(offset, offset + limit - 1);
        const { data: rows, error, count } = await query;
        if (error)
            throw error;
        const enriched = await Promise.all((rows || []).map(async (r) => {
            let sessionsCount = 0;
            try {
                const { count: sc } = await supabase_1.supabaseAdmin
                    .from('fit_sessions')
                    .select('id', { count: 'exact', head: true })
                    .eq('shop_id', r.id);
                sessionsCount = sc || 0;
            }
            catch { }
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
        const filtered = enriched.filter((it) => {
            if (retailerEmail && !String(it.retailerEmail || '').toLowerCase().includes(retailerEmail.toLowerCase()))
                return false;
            if (!isNaN(sessionsMin) && typeof it.totalSessions === 'number' && it.totalSessions < sessionsMin)
                return false;
            if (!isNaN(sessionsMax) && typeof it.totalSessions === 'number' && it.totalSessions > sessionsMax)
                return false;
            return true;
        });
        if (['sessions_total', 'retailer_email'].includes(sortBy)) {
            if (sortBy === 'sessions_total') {
                filtered.sort((a, b) => sortDirAsc ? (a.totalSessions - b.totalSessions) : (b.totalSessions - a.totalSessions));
            }
            else {
                filtered.sort((a, b) => {
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
    }
    catch (e) {
        console.error('[owner] GET /shops error:', e);
        res.status(500).json({ success: false, message: 'Kon shops niet laden' });
    }
});
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
        const normalizeStart = (d) => d ? (d.includes('T') ? d : new Date(d + 'T00:00:00.000Z').toISOString()) : undefined;
        const normalizeEnd = (d) => d ? (d.includes('T') ? d : new Date(d + 'T23:59:59.999Z').toISOString()) : undefined;
        let query = supabase_1.supabaseAdmin
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
        if (shopId)
            query = query.eq('shop_id', shopId);
        if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status))
            query = query.eq('status', status);
        if (dateFrom)
            query = query.gte('created_at', normalizeStart(dateFrom));
        if (dateTo)
            query = query.lte('created_at', normalizeEnd(dateTo));
        if (satisfied === 'true')
            query = query.eq('satisfied', true);
        if (satisfied === 'false')
            query = query.eq('satisfied', false);
        const { data: rows, error, count } = await query;
        if (error)
            throw error;
        const mapSession = (s) => {
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
        if (gender)
            items = items.filter((it) => String(it.gender || '').toUpperCase() === gender);
        if (userType === 'guest')
            items = items.filter((it) => it.userType === 'GUEST');
        if (userType === 'logged')
            items = items.filter((it) => it.userType === 'LOGGED');
        if (q) {
            const qq = q.toLowerCase();
            items = items.filter((it) => (it.productTitle && String(it.productTitle).toLowerCase().includes(qq)) ||
                (it.shop && String(it.shop.name || '').toLowerCase().includes(qq)));
        }
        if (['product_title', 'gender', 'user_type', 'shop_name', 'status', 'created_at', 'satisfied'].includes(sortBy)) {
            items.sort((a, b) => {
                const keyMap = {
                    product_title: 'productTitle',
                    gender: 'gender',
                    user_type: 'userType',
                    shop_name: 'shop',
                    status: 'status',
                    created_at: 'createdAt',
                    satisfied: 'satisfied'
                };
                const ka = keyMap[sortBy];
                let av = ka === 'shop' ? (a.shop ? a.shop.name : '') : a[ka];
                let bv = ka === 'shop' ? (b.shop ? b.shop.name : '') : b[ka];
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
    }
    catch (e) {
        console.error('[owner] GET /sessions error:', e);
        res.status(500).json({ success: false, message: 'Kon sessies niet laden' });
    }
});
router.get('/fit-settings', requireAdmin, async (_req, res) => {
    try {
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const fitLimits = sys?.settings?.fitLimits || {};
        const userDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.userDailyMax ?? 50), 10) || 50));
        const guestDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.guestDailyMax ?? 3), 10) || 3));
        res.json({ success: true, data: { userDailyMax, guestDailyMax } });
    }
    catch (e) {
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
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const settings = sys?.settings && typeof sys.settings === 'object' ? sys.settings : {};
        settings.fitLimits = { userDailyMax, guestDailyMax };
        const { data: updatedRow, error: updErr } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .update({ settings })
            .eq('key', 'SYSTEM')
            .select('key')
            .maybeSingle();
        if (updErr)
            throw updErr;
        if (!updatedRow) {
            const { error: insErr } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .insert({ key: 'SYSTEM', label: 'SYSTEM', settings });
            if (insErr)
                throw insErr;
        }
        res.json({ success: true, data: { userDailyMax, guestDailyMax } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Kon FiT instellingen niet opslaan' });
    }
});
router.post('/fit-settings/apply-all-users', requireAdmin, async (req, res) => {
    try {
        const rawFromBody = req.body?.userDailyMax;
        let userDailyMax = null;
        if (rawFromBody != null) {
            const parsed = parseInt(String(rawFromBody), 10);
            if (Number.isFinite(parsed)) {
                userDailyMax = Math.max(0, Math.min(999, parsed));
            }
        }
        if (userDailyMax == null) {
            const { data: sys } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('settings')
                .eq('key', 'SYSTEM')
                .maybeSingle();
            const fitLimits = sys?.settings?.fitLimits || {};
            const parsed = parseInt(String(fitLimits.userDailyMax ?? 50), 10);
            userDailyMax = Math.max(0, Math.min(999, Number.isFinite(parsed) ? parsed : 50));
        }
        const { error: updErr } = await supabase_1.supabaseAdmin
            .from('users')
            .update({ max_sessions: userDailyMax, updated_at: new Date().toISOString() })
            .eq('is_guest', false)
            .eq('user_type', 'USER');
        if (updErr)
            throw updErr;
        const { count } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('is_guest', false)
            .eq('user_type', 'USER');
        res.json({ success: true, updated: typeof count === 'number' ? count : 0, userDailyMax });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Kon maxima niet toepassen op alle gebruikers' });
    }
});
router.get('/subscription-settings', requireAdmin, async (_req, res) => {
    try {
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const plans = sys?.settings?.subscriptionPlans || {};
        const normalize = (p, defInc) => ({
            included: Math.max(0, parseInt(String(p?.included ?? defInc), 10) || defInc),
            priceMonthlyEUR: (p?.priceMonthlyEUR == null || p?.priceMonthlyEUR === '') ? null : Number(p.priceMonthlyEUR),
            priceYearlyEUR: (p?.priceYearlyEUR == null || p?.priceYearlyEUR === '') ? null : Number(p.priceYearlyEUR),
            shopsLimit: (() => {
                const v = p?.shopsLimit;
                if (v == null || v === '')
                    return null;
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Kon subscription settings niet laden' });
    }
});
router.put('/subscription-settings', requireAdmin, async (req, res) => {
    try {
        const body = req.body || {};
        const plans = body?.plans || body;
        if (!plans || typeof plans !== 'object') {
            res.status(400).json({ success: false, message: 'Ongeldige payload' });
            return;
        }
        const normNum = (v, min = 0, max = 100000) => {
            if (v == null || v === '')
                return null;
            const n = Number(v);
            if (!Number.isFinite(n))
                return null;
            return Math.min(Math.max(Math.floor(n), min), max);
        };
        const normalize = (p, defInc) => ({
            included: normNum(p?.included, 0, 100000) ?? defInc,
            priceMonthlyEUR: normNum(p?.priceMonthlyEUR, 0, 1000000),
            priceYearlyEUR: normNum(p?.priceYearlyEUR, 0, 1000000),
            shopsLimit: normNum(p?.shopsLimit, 0, 100000),
            allowSubdomains: !!(p?.allowSubdomains)
        });
        const STARTER = normalize(plans?.STARTER || {}, 50);
        const BASIC = normalize(plans?.BASIC || {}, 500);
        const PREMIUM = normalize(plans?.PREMIUM || {}, 2500);
        const ENTERPRISE = normalize(plans?.ENTERPRISE || {}, 2500);
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const settings = sys?.settings && typeof sys.settings === 'object' ? sys.settings : {};
        settings.subscriptionPlans = { STARTER, BASIC, PREMIUM, ENTERPRISE };
        const { data: updated, error: updErr } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .update({ settings })
            .eq('key', 'SYSTEM')
            .select('key')
            .maybeSingle();
        if (updErr)
            throw updErr;
        if (!updated) {
            const { error: insErr } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .insert({ key: 'SYSTEM', label: 'SYSTEM', settings });
            if (insErr)
                throw insErr;
        }
        res.json({ success: true, data: { STARTER, BASIC, PREMIUM, ENTERPRISE } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Kon subscription settings niet opslaan' });
    }
});
router.post('/subscription-settings/apply-included', requireAdmin, async (_req, res) => {
    try {
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const plans = sys?.settings?.subscriptionPlans || {};
        const getInc = (p, defVal) => Math.max(0, parseInt(String(p?.included ?? defVal), 10) || defVal);
        const inc = {
            STARTER: getInc(plans.STARTER, 50),
            BASIC: getInc(plans.BASIC, 500),
            PREMIUM: getInc(plans.PREMIUM, 2500),
            ENTERPRISE: getInc(plans.ENTERPRISE, 2500)
        };
        for (const p of ['STARTER', 'BASIC', 'PREMIUM', 'ENTERPRISE']) {
            const val = inc[p];
            try {
                await supabase_1.supabaseAdmin
                    .from('subscriptions')
                    .update({ included_sessions: val, updated_at: new Date().toISOString() })
                    .eq('status', 'ACTIVE')
                    .eq('plan_type', p);
            }
            catch { }
        }
        res.json({ success: true, updated: true, included: inc });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Kon included sessies niet toepassen' });
    }
});
exports.default = router;
//# sourceMappingURL=owner_old.js.map