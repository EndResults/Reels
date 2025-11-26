"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const joi_1 = __importDefault(require("joi"));
const stripe_1 = __importDefault(require("stripe"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const resolveRetailerSignupWebhookUrl = () => {
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
};
const sendRetailerClosure = async (retailer) => {
    const url = resolveRetailerSignupWebhookUrl();
    if (!url)
        return;
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.N8N_API_KEY)
        headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
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
        }
        catch { }
        await axios_1.default.post(url, payload, { headers, timeout });
        console.info('[Webhook] Retailer close: delivered');
    }
    catch (e) {
        console.warn('Retailer close webhook failed:', e?.message || e);
    }
};
const promoSettingsSchema = joi_1.default.object({
    promoEnabled: joi_1.default.boolean().required(),
    promoStartDate: joi_1.default.date().iso().allow(null).optional(),
    promoEndDate: joi_1.default.date().iso().allow(null).optional()
});
const requireRetailer = (req, res, next) => {
    if (req.user.role !== 'retailer') {
        res.status(403).json({
            success: false,
            message: 'Alleen retailers hebben toegang tot deze functie'
        });
        return;
    }
    next();
};
router.post('/close-account', auth_1.authenticateToken, requireRetailer, async (req, res) => {
    try {
        const retailerId = req.user.id;
        const reason = typeof req.body?.reason === 'string' ? String(req.body.reason).slice(0, 500) : null;
        let { data: currentRetailer } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('id, is_active')
            .eq('id', retailerId)
            .maybeSingle();
        if (currentRetailer && currentRetailer.is_active === false) {
            try {
                res.clearCookie('fit_session', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
                res.clearCookie('fit_token', { httpOnly: false, secure: true, sameSite: 'none', path: '/' });
            }
            catch { }
            res.json({ success: true, message: 'Account reeds opgeheven', data: { effectiveEnd: null } });
            return;
        }
        const { data: sub } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('id, stripe_subscription_id, status, current_period_end')
            .eq('retailer_id', retailerId)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        let effectiveEnd = null;
        const stripeId = sub?.stripe_subscription_id;
        if (stripeId && process.env.STRIPE_SECRET_KEY) {
            try {
                const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });
                const updated = await stripe.subscriptions.update(stripeId, { cancel_at_period_end: true });
                if (updated?.current_period_end) {
                    effectiveEnd = new Date(updated.current_period_end * 1000).toISOString();
                }
            }
            catch (e) {
            }
        }
        if (!effectiveEnd && sub?.current_period_end) {
            try {
                effectiveEnd = new Date(sub.current_period_end).toISOString();
            }
            catch {
                effectiveEnd = String(sub.current_period_end);
            }
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
        {
            const { error: updErr } = await supabase_1.supabaseAdmin
                .from('retailers')
                .update({ is_active: false, deactivated_at: new Date().toISOString(), close_reason: reason, updated_at: new Date().toISOString() })
                .eq('id', retailerId);
            if (updErr) {
                const msg = String(updErr?.message || updErr || '');
                if (updErr.code === '42703' || /column\s+.+\s+does\s+not\s+exist/i.test(msg)) {
                    const { error: upd2 } = await supabase_1.supabaseAdmin
                        .from('retailers')
                        .update({ is_active: false, updated_at: new Date().toISOString() })
                        .eq('id', retailerId);
                    if (upd2) {
                        const msg2 = String(upd2?.message || upd2 || '');
                        if (upd2.code === '42703' || /column\s+.+\s+does\s+not\s+exist/i.test(msg2)) {
                            await supabase_1.supabaseAdmin
                                .from('retailers')
                                .update({ is_active: false })
                                .eq('id', retailerId);
                        }
                        else {
                            throw upd2;
                        }
                    }
                }
                else {
                    throw updErr;
                }
            }
        }
        await supabase_1.supabaseAdmin
            .from('shops')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('retailer_id', retailerId);
        let email = null;
        try {
            const { data: row } = await supabase_1.supabaseAdmin
                .from('retailers')
                .select('email')
                .eq('id', retailerId)
                .single();
            email = row?.email || null;
        }
        catch { }
        try {
            void sendRetailerClosure({ email, deactivated_at: new Date().toISOString(), close_reason: reason });
        }
        catch { }
        try {
            res.clearCookie('fit_session', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
            res.clearCookie('fit_token', { httpOnly: false, secure: true, sameSite: 'none', path: '/' });
        }
        catch { }
        res.json({ success: true, message: 'Account opgeheven', data: { effectiveEnd } });
    }
    catch (error) {
        console.error('Close account error:', error);
        res.status(500).json({ success: false, message: 'Kon account niet opheffen' });
    }
});
router.post('/undo-close', auth_1.authenticateToken, requireRetailer, async (req, res) => {
    try {
        const retailerId = req.user.id;
        {
            const { error: updErr } = await supabase_1.supabaseAdmin
                .from('retailers')
                .update({ is_active: true, deactivated_at: null, close_reason: null, updated_at: new Date().toISOString() })
                .eq('id', retailerId);
            if (updErr) {
                const msg = String(updErr?.message || updErr || '');
                if (updErr.code === '42703' || /column\s+.+\s+does\s+not\s+exist/i.test(msg)) {
                    await supabase_1.supabaseAdmin
                        .from('retailers')
                        .update({ is_active: true, updated_at: new Date().toISOString() })
                        .eq('id', retailerId);
                }
                else {
                    throw updErr;
                }
            }
        }
        await supabase_1.supabaseAdmin
            .from('shops')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('retailer_id', retailerId);
        res.json({ success: true, message: 'Opheffing ongedaan gemaakt' });
    }
    catch (error) {
        console.error('Undo close error:', error);
        res.status(500).json({ success: false, message: 'Kon opheffing niet ongedaan maken' });
    }
});
const brandingSettingsSchema = joi_1.default.object({
    hideLogo: joi_1.default.boolean().required()
});
router.get('/promo-settings', auth_1.authenticateToken, requireRetailer, async (_req, res) => {
    res.status(410).json({
        success: false,
        message: 'Deze endpoint is vervallen. Beheer promo-instellingen nu per webshop via /api/shops/:shopId.'
    });
});
exports.default = router;
router.put('/branding-settings', auth_1.authenticateToken, requireRetailer, async (_req, res) => {
    res.status(410).json({
        success: false,
        message: 'Deze endpoint is vervallen. Beheer branding (logo verbergen) per webshop via /api/shops/:shopId.'
    });
});
router.put('/promo-settings', auth_1.authenticateToken, requireRetailer, async (_req, res) => {
    res.status(410).json({
        success: false,
        message: 'Deze endpoint is vervallen. Beheer promo-instellingen per webshop via /api/shops/:shopId.'
    });
});
router.get('/profile', auth_1.authenticateToken, requireRetailer, async (req, res) => {
    try {
        const retailerId = req.user.id;
        const { data: retailer, error } = await supabase_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('Fout bij ophalen retailer profiel:', error);
        res.status(500).json({
            success: false,
            message: 'Fout bij ophalen retailer profiel'
        });
    }
});
router.get('/branding-settings', auth_1.authenticateToken, requireRetailer, async (_req, res) => {
    res.status(410).json({
        success: false,
        message: 'Deze endpoint is vervallen. Beheer branding per webshop via /api/shops/:shopId.'
    });
});
//# sourceMappingURL=retailer.js.map