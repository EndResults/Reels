"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailService_1 = __importDefault(require("../services/emailService"));
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const supabase_1 = require("../lib/supabase");
const supabaseAuth_1 = require("../lib/supabaseAuth");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const isProd = process.env.NODE_ENV === 'production';
const SHOP_TYPES = ['FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS'];
const retailerRegisterSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).required(),
    firstName: joi_1.default.string().min(1).max(50).required(),
    lastName: joi_1.default.string().min(1).max(50).required(),
    shopName: joi_1.default.string().min(1).max(100).required(),
    shopUrl: joi_1.default.string().uri().required(),
    shopType: joi_1.default.string().valid(...SHOP_TYPES).empty('').default('FASHION')
});
const userRegisterSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).required(),
    firstName: joi_1.default.string().min(1).max(50).required(),
    lastName: joi_1.default.string().min(1).max(50).required(),
    dateOfBirth: joi_1.default.date().max('now').optional().allow(null, ''),
    gender: joi_1.default.string().valid('MALE', 'FEMALE', 'OTHER').optional().allow(null, '')
});
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required()
});
const forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required()
});
const addDomainSchema = joi_1.default.object({
    domain: joi_1.default.string().uri().required(),
    category: joi_1.default.string().valid(...SHOP_TYPES).required(),
    name: joi_1.default.string().min(1).max(100).optional()
});
const updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(1).max(50).required(),
    lastName: joi_1.default.string().min(1).max(50).required(),
    shopName: joi_1.default.string().min(1).max(100).optional(),
    shopUrl: joi_1.default.string().uri().optional(),
    shopType: joi_1.default.string().valid(...SHOP_TYPES).optional()
});
const allowedClientHostsRaw = (process.env.ALLOWED_CLIENT_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
function matchWildcardHost(pattern, host) {
    const p = String(pattern || '').toLowerCase();
    const h = String(host || '').toLowerCase();
    if (p.startsWith('*.')) {
        const dom = p.slice(1);
        return h === p.slice(2) || h.endsWith(dom);
    }
    return h === p;
}
function isAllowedClientHost(host) {
    const h = String(host || '').toLowerCase();
    if (!h)
        return false;
    if (h === 'localhost:5173')
        return true;
    if (/\.brendr\.io$/i.test(h))
        return true;
    if (/\.up\.railway\.app$/i.test(h))
        return true;
    for (const pat of allowedClientHostsRaw) {
        if (pat === '*')
            return true;
        if (matchWildcardHost(pat, h))
            return true;
    }
    return false;
}
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
    console.info('[Webhook] Retailer signup: falling back to uat URL');
    return uat || undefined;
};
const sendRetailerSignup = async (retailer) => {
    const url = resolveRetailerSignupWebhookUrl();
    if (!url) {
        console.warn('[Webhook] Retailer signup: no URL configured (check N8N_RETAILER_SIGNUP_WEBHOOK_URL* env and SERVER_URL)');
        return;
    }
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.N8N_API_KEY)
        headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
    const timeout = parseInt(String(process.env.N8N_TIMEOUT_MS || 10000), 10) || 10000;
    const payload = {
        registeredAt: retailer?.created_at || new Date().toISOString(),
        email: retailer?.email || null,
        shopUrl: retailer?.shop_url || null,
        shopName: retailer?.shop_name || null,
        firstName: retailer?.first_name || null,
        lastName: retailer?.last_name || null,
        category: retailer?.shop_type || null,
        subscription: 'Starter'
    };
    try {
        try {
            const u = new URL(url);
            const safe = `${u.origin}${u.pathname}`;
            console.info('[Webhook] Retailer signup: POST', safe, { id: retailer?.id, email: retailer?.email });
        }
        catch { }
        await axios_1.default.post(url, payload, { headers, timeout });
        console.info('[Webhook] Retailer signup: delivered');
    }
    catch (e) {
        console.warn('Retailer signup webhook failed:', e?.message || e);
    }
};
const sendRetailerClosure = async (retailer) => {
    const url = resolveRetailerSignupWebhookUrl();
    if (!url) {
        console.warn('[Webhook] Retailer close: no URL configured (check N8N_RETAILER_SIGNUP_WEBHOOK_URL* env and SERVER_URL)');
        return;
    }
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
const resolveConsumerSignupWebhookUrl = () => {
    const direct = (process.env.N8N_CONSUMER_SIGNUP_WEBHOOK_URL || '').trim();
    if (direct)
        return direct;
    const server = (process.env.SERVER_URL || '').toLowerCase();
    const isUat = /fit-uat|uat/.test(server);
    if (isUat) {
        const uat = (process.env.N8N_CONSUMER_SIGNUP_WEBHOOK_URL_UAT || '').trim();
        if (uat)
            return uat;
        const prod = (process.env.N8N_CONSUMER_SIGNUP_WEBHOOK_URL_PROD || '').trim();
        return prod || undefined;
    }
    const prod = (process.env.N8N_CONSUMER_SIGNUP_WEBHOOK_URL_PROD || '').trim();
    if (prod)
        return prod;
    const uat = (process.env.N8N_CONSUMER_SIGNUP_WEBHOOK_URL_UAT || '').trim();
    console.info('[Webhook] Consumer signup: falling back to uat URL');
    return uat || undefined;
};
const sendConsumerSignup = async (user) => {
    const url = resolveConsumerSignupWebhookUrl();
    if (!url) {
        console.warn('[Webhook] Consumer signup: no URL configured (check N8N_CONSUMER_SIGNUP_WEBHOOK_URL* env and SERVER_URL)');
        return;
    }
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.N8N_API_KEY)
        headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
    const timeout = parseInt(String(process.env.N8N_TIMEOUT_MS || 10000), 10) || 10000;
    const payload = {
        registeredAt: user?.created_at || new Date().toISOString(),
        email: user?.email || null,
        firstName: user?.first_name || null,
        lastName: user?.last_name || null,
        dateOfBirth: user?.date_of_birth || null,
        gender: user?.gender || null
    };
    try {
        try {
            const u = new URL(url);
            const safe = `${u.origin}${u.pathname}`;
            console.info('[Webhook] Consumer signup: POST', safe, { id: user?.id, email: user?.email });
        }
        catch { }
        await axios_1.default.post(url, payload, { headers, timeout });
        console.info('[Webhook] Consumer signup: delivered');
    }
    catch (e) {
        console.warn('Consumer signup webhook failed:', e?.message || e);
    }
};
const normalizeShopType = (v) => {
    const t = String(v || '').toUpperCase();
    return SHOP_TYPES.includes(t) ? t : 'FASHION';
};
async function getStarterIncluded() {
    try {
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const plans = sys?.settings?.subscriptionPlans || {};
        const val = parseInt(String(plans.STARTER?.included ?? 50), 10);
        return Number.isFinite(val) ? Math.max(0, val) : 50;
    }
    catch {
        return 50;
    }
}
async function createStarterSubscriptionIfMissing(retailerId) {
    let hasActive = false;
    try {
        const { data: sub } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('retailer_id', retailerId)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        hasActive = !!sub;
    }
    catch { }
    if (hasActive)
        return;
    const included = await getStarterIncluded();
    try {
        await supabase_1.supabaseAdmin.from('subscriptions').insert({
            retailer_id: retailerId,
            plan_type: 'STARTER',
            status: 'ACTIVE',
            stripe_subscription_id: null,
            stripe_customer_id: null,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            price_id: null,
            included_sessions: included,
            cancel_at_period_end: false,
            next_plan_type: null,
            metadata: {}
        });
        console.info('[AutoPlan] Starter subscription created for retailer', retailerId);
    }
    catch (e) {
        console.warn('[AutoPlan] Failed to create Starter subscription', retailerId, e);
    }
    try {
        await supabase_1.supabaseAdmin.rpc('ensure_credit_row', { _retailer: retailerId, _included: included });
    }
    catch (e) {
        console.warn('ensure_credit_row on retailer create failed:', e);
        try {
            const d = new Date();
            const periodMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
            const { data: current } = await supabase_1.supabaseAdmin
                .from('fit_credits')
                .select('id, included')
                .eq('retailer_id', retailerId)
                .eq('period_month', periodMonth)
                .maybeSingle();
            if (!current) {
                await supabase_1.supabaseAdmin
                    .from('fit_credits')
                    .insert({ retailer_id: retailerId, period_month: periodMonth, included, purchased: 0, consumed: 0 })
                    .select('id')
                    .single();
            }
            else if (Number(current.included || 0) < included) {
                await supabase_1.supabaseAdmin
                    .from('fit_credits')
                    .update({ included, updated_at: new Date().toISOString() })
                    .eq('retailer_id', retailerId)
                    .eq('period_month', periodMonth);
            }
        }
        catch (_eUpsert) {
            console.warn('fit_credits manual upsert fallback failed:', _eUpsert);
        }
    }
}
const base64urlEncode = (input) => {
    const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};
const base64urlDecode = (input) => {
    const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return Buffer.from(base64, 'base64');
};
const signState = (payload) => {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const body = JSON.stringify(payload);
    const bodyB64 = base64urlEncode(body);
    const sig = crypto_1.default.createHmac('sha256', secret).update(bodyB64).digest();
    const sigB64 = base64urlEncode(sig);
    return `${bodyB64}.${sigB64}`;
};
const verifyState = (state) => {
    try {
        const [bodyB64, sigB64] = String(state || '').split('.');
        if (!bodyB64 || !sigB64)
            return null;
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const expected = crypto_1.default.createHmac('sha256', secret).update(bodyB64).digest();
        const got = base64urlDecode(sigB64);
        if (expected.length !== got.length || !crypto_1.default.timingSafeEqual(expected, got))
            return null;
        const json = base64urlDecode(bodyB64).toString('utf8');
        const parsed = JSON.parse(json);
        if (!parsed || typeof parsed.t !== 'number' || Date.now() - parsed.t > 10 * 60 * 1000)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
};
const getServerUrl = () => {
    if (process.env.SERVER_URL)
        return process.env.SERVER_URL;
    return process.env.NODE_ENV === 'production'
        ? 'https://reels-production.up.railway.app'
        : 'http://localhost:3001';
};
router.get('/oauth/google/start', async (req, res) => {
    try {
        const type = (String(req.query.type || 'consumer').toLowerCase() === 'retailer') ? 'retailer' : 'consumer';
        const next = typeof req.query.next === 'string' ? req.query.next : undefined;
        const retailerMeta = (type === 'retailer') ? {
            shopName: typeof req.query.shopName === 'string' ? req.query.shopName : undefined,
            shopUrl: typeof req.query.shopUrl === 'string' ? req.query.shopUrl : undefined,
            shopType: typeof req.query.shopType === 'string' ? req.query.shopType : undefined,
            planType: typeof req.query.planType === 'string' ? req.query.planType : undefined,
        } : undefined;
        const statePayload = { t: Date.now(), type, next, retailer: retailerMeta };
        const state = signState(statePayload);
        const redirectTo = `${getServerUrl()}/api/auth-supabase/oauth/callback?x=${encodeURIComponent(state)}`;
        const { data, error } = await supabaseAuth_1.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                scopes: 'openid email profile',
                queryParams: {
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code'
                },
                flowType: 'pkce'
            }
        });
        router.get('/oauth/fallback.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            const js = `;(function(){
    try{
      var qs=new URLSearchParams(location.search);
      var x=qs.get('x')||'';
      var h=location.hash?location.hash.substring(1):'';
      var hp=new URLSearchParams(h);
      var at=hp.get('access_token');
      if(!at){ document.body.textContent='Missing code'; return; }
      fetch('/api/auth-supabase/oauth/sso-complete',{
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ access_token: at, x: x })
      })
      .then(function(r){ return r.json().catch(function(){ return {}; }); })
      .then(function(j){
        if(j && j.success && j.redirect){ location.replace(j.redirect); }
        else { document.body.textContent='Login failed'; }
      })
      .catch(function(){ document.body.textContent='Login failed'; });
    }catch(e){ document.body.textContent='Login failed'; }
  })();`;
            res.status(200).send(js);
        });
        router.post('/oauth/sso-complete', async (req, res) => {
            try {
                const accessToken = String(req.body?.access_token || '').trim();
                const customStateParam = typeof req.body?.x === 'string' ? req.body.x : '';
                if (!accessToken) {
                    res.status(400).json({ success: false, message: 'Access token ontbreekt' });
                    return;
                }
                let state = null;
                if (customStateParam) {
                    state = verifyState(customStateParam);
                    if (!state) {
                        res.status(400).json({ success: false, message: 'Invalid state' });
                        return;
                    }
                }
                else {
                    state = { t: Date.now(), type: 'consumer', next: '/customer/dashboard' };
                }
                const { data, error } = await supabaseAuth_1.supabaseAuth.auth.getUser(accessToken);
                if (error || !data?.user) {
                    console.error('getUser(access_token) error:', error);
                    res.status(400).json({ success: false, message: 'Kon gebruiker niet ophalen' });
                    return;
                }
                const user = data.user;
                const provider = user?.app_metadata?.provider || (Array.isArray(user?.identities) && user.identities[0]?.provider) || 'google';
                const um = user.user_metadata || {};
                const fullName = typeof um.name === 'string' ? um.name : undefined;
                let firstName = (um.given_name || um.first_name || (fullName ? fullName.split(' ')[0] : undefined));
                let lastName = (um.family_name || um.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : undefined));
                if (!firstName)
                    firstName = 'Gebruiker';
                if (!lastName)
                    lastName = '';
                const email = user.email;
                const clientBase = (() => {
                    const envClient = (process.env.CLIENT_URL || '').trim();
                    if (envClient)
                        return envClient;
                    const o = req.headers.origin;
                    try {
                        if (o) {
                            const host = new URL(o).host;
                            if (isAllowedClientHost(host))
                                return o;
                        }
                    }
                    catch { }
                    return 'http://localhost:5173';
                })();
                if (state.type === 'retailer') {
                    let retailer = null;
                    try {
                        const { data: r } = await supabase_1.supabaseAdmin
                            .from('retailers')
                            .select('*')
                            .eq('auth_id', user.id)
                            .maybeSingle();
                        retailer = r;
                    }
                    catch { }
                    if (!retailer) {
                        const meta = state.retailer || {};
                        if (meta.shopName && meta.shopUrl) {
                            const apiKey = crypto_1.default.randomBytes(32).toString('hex');
                            const insert = await supabase_1.supabaseAdmin
                                .from('retailers')
                                .insert({
                                id: user.id,
                                auth_id: user.id,
                                email,
                                password_hash: `SUPABASE_AUTH_${provider.toUpperCase()}`,
                                first_name: firstName,
                                last_name: lastName,
                                shop_name: meta.shopName,
                                shop_url: meta.shopUrl,
                                shop_type: (meta.shopType || 'FASHION'),
                                plan_type: 'STARTER',
                                is_active: true,
                                api_key: apiKey
                            })
                                .select()
                                .single();
                            if (insert.error) {
                                console.error('Create retailer via OAuth (fallback) error:', insert.error);
                                res.status(500).json({ success: false, message: 'Database fout bij retailer aanmaken' });
                                return;
                            }
                            retailer = insert.data;
                            try {
                                await createStarterSubscriptionIfMissing(retailer.id);
                            }
                            catch (e) {
                                console.warn('[AutoPlan] createStarterSubscriptionIfMissing failed:', e);
                            }
                            try {
                                void sendRetailerSignup(retailer);
                            }
                            catch { }
                        }
                        else {
                            const params = new URLSearchParams({ email, firstName, lastName }).toString();
                            res.json({ success: true, redirect: `${clientBase}/register/retailer?${params}` });
                            return;
                        }
                    }
                    const token = jsonwebtoken_1.default.sign({ userId: user.id, email, userType: 'retailer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
                    try {
                        res.cookie('fit_session', token, { httpOnly: true, secure: isProd, sameSite: 'none', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
                        res.cookie('fit_token', token, { httpOnly: false, secure: isProd, sameSite: 'none', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
                    }
                    catch (cookieErr) {
                        console.warn('Could not set session cookie after OAuth (retailer, fallback):', cookieErr);
                    }
                    let next = state.next || '/dashboard';
                    try {
                        const { count } = await supabase_1.supabaseAdmin
                            .from('shops')
                            .select('id', { count: 'exact', head: true })
                            .eq('retailer_id', retailer.id);
                        if ((count || 0) === 0)
                            next = '/retailer/webshops?expand=first';
                    }
                    catch (e) {
                        console.warn('Could not count shops for retailer during OAuth fallback:', e);
                    }
                    const hasQuery = next.includes('?');
                    const redirectUrl = `${clientBase}${next}${hasQuery ? '&' : '?'}sso=${provider}&status=ok`;
                    res.json({ success: true, redirect: redirectUrl });
                    return;
                }
                try {
                    const { data: existing } = await supabase_1.supabaseAdmin
                        .from('users')
                        .select('id')
                        .eq('auth_id', user.id)
                        .maybeSingle();
                    if (!existing) {
                        let userDailyMax = 50;
                        try {
                            const { data: sys } = await supabase_1.supabaseAdmin
                                .from('category_settings')
                                .select('settings')
                                .eq('key', 'SYSTEM')
                                .maybeSingle();
                            const fitLimits = sys?.settings?.fitLimits || {};
                            userDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.userDailyMax ?? 50), 10) || 50));
                        }
                        catch { }
                        const { error: userInsertError } = await supabase_1.supabaseAdmin
                            .from('users')
                            .insert({
                            id: user.id,
                            auth_id: user.id,
                            email,
                            password_hash: `SUPABASE_AUTH_${provider.toUpperCase()}`,
                            first_name: firstName,
                            last_name: lastName,
                            date_of_birth: '1900-01-01',
                            gender: 'OTHER',
                            profile_image_url: (um.avatar_url || um.picture || null),
                            is_active: true,
                            max_sessions: userDailyMax
                        });
                        if (userInsertError) {
                            console.error('Create consumer via OAuth (fallback) error:', userInsertError);
                        }
                    }
                }
                catch (e) {
                    console.error('Consumer upsert exception (fallback):', e);
                }
                const token = jsonwebtoken_1.default.sign({ userId: user.id, email, userType: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
                try {
                    res.cookie('fit_session', token, { httpOnly: true, secure: isProd, sameSite: 'none', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
                    res.cookie('fit_token', token, { httpOnly: false, secure: isProd, sameSite: 'none', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
                }
                catch (cookieErr) {
                    console.warn('Could not set session cookie after OAuth (consumer, fallback):', cookieErr);
                }
                let next = state.next || '/customer/dashboard';
                let baseForNext = clientBase;
                if (/^https?:\/\//i.test(next)) {
                    try {
                        const u = new URL(next);
                        const path = u.pathname || '/';
                        const search = u.search || '';
                        const sepAbs = (search ? '&' : '?');
                        if (path.startsWith('/api/')) {
                            const serverBase = getServerUrl();
                            const redirectUrlAbs = `${serverBase}${path}${search}${sepAbs}sso=${provider}&status=ok`;
                            res.json({ success: true, redirect: redirectUrlAbs });
                            return;
                        }
                        else {
                            const redirectUrlAbs = `${next}${sepAbs}sso=${provider}&status=ok`;
                            res.json({ success: true, redirect: redirectUrlAbs });
                            return;
                        }
                    }
                    catch (e) {
                        console.warn('[OAuth fallback] Failed to parse absolute next, falling back:', e);
                    }
                }
                if (next.startsWith('/api/')) {
                    baseForNext = getServerUrl();
                }
                const sep = next.includes('?') ? '&' : '?';
                const redirectUrl = `${baseForNext}${next}${sep}sso=${provider}&status=ok`;
                res.json({ success: true, redirect: redirectUrl });
            }
            catch (e) {
                console.error('OAuth sso-complete exception:', e);
                res.status(500).json({ success: false, message: 'Interne fout bij OAuth sso-complete' });
            }
        });
        router.get('/sso-bridge.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            const js = `;(function(){
    function qp(name){ try{ var p=new URLSearchParams(location.search); return p.get(name)||''; }catch(e){ return ''; } }
    var target = qp('target') || ${JSON.stringify(process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://reels.brendr.io' : 'http://localhost:5173'))};
    var server = ${JSON.stringify((process.env.SERVER_URL || (process.env.NODE_ENV === 'production' ? 'https://reels-production.up.railway.app' : 'http://localhost:3001')))};
    var nonce = qp('n') || '';
    var dbg = qp('debug') === '1';
    function log(){ try{ if(dbg && console && console.log) console.log.apply(console, arguments); }catch(e){} }
    // Prepare BroadcastChannel as robust fallback on mobile browsers
    var channelName = nonce ? ('fit_sso_' + nonce) : '';
    var bc = null; try{ if (channelName && 'BroadcastChannel' in window) { bc = new BroadcastChannel(channelName); log('[sso-bridge] BroadcastChannel opened', channelName); } }catch(e){ log('[sso-bridge] BroadcastChannel error', e); }
    function post(status, payload){
      var msg = { type:'FIT_SSO_BRIDGE', status: status, token: (payload&&payload.token)||null, user: (payload&&payload.user)||null, nonce: nonce };
      try{ if(window.opener){ window.opener.postMessage(msg, target); log('[sso-bridge] postMessage sent to', target, msg); } else { log('[sso-bridge] window.opener missing'); } }catch(e){ log('[sso-bridge] postMessage error', e); }
      try{ if (bc) { bc.postMessage(msg); log('[sso-bridge] BroadcastChannel sent'); } }catch(e){ log('[sso-bridge] BroadcastChannel send error', e); }
      try{ window.close(); }catch(_e){ log('[sso-bridge] window.close failed'); }
    }
    log('[sso-bridge] start', { target: target, server: server, nonce: nonce });
    fetch(server + '/api/consumer/profile', { credentials:'include' })
      .then(function(r){ return r.json().catch(function(){ return {}; }); })
      .then(function(j){ if(j && j.success){
          log('[sso-bridge] profile OK, minting widget token');
          return fetch(server + '/api/auth-supabase/mint-widget-token', { method:'POST', credentials:'include' })
            .then(function(r){ return r.json().catch(function(){ return {}; }); })
            .then(function(m){ if(m && m.success && m.token){ log('[sso-bridge] mint OK'); post('ok', { token:m.token, user:j.profile||m.user||null }); } else { log('[sso-bridge] mint failed'); post('no_session'); } });
        } else { log('[sso-bridge] profile failed'); post('no_session'); } })
      .catch(function(err){ log('[sso-bridge] fetch error', err); post('no_session'); });
  })();`;
            res.status(200).send(js);
        });
        if (error) {
            console.error('OAuth start error:', error);
            res.status(500).json({ success: false, message: 'Kon Google OAuth niet starten' });
            return;
        }
        const url = data?.url;
        if (!url) {
            res.status(500).json({ success: false, message: 'Geen OAuth redirect URL ontvangen' });
            return;
        }
        res.redirect(String(url));
    }
    catch (e) {
        console.error('OAuth start exception:', e);
        res.status(500).json({ success: false, message: 'Interne fout bij OAuth start' });
    }
});
router.post('/resend-verification', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const type = req.body?.type || 'user';
        if (!email) {
            res.status(400).json({ success: false, message: 'E-mailadres ontbreekt' });
            return;
        }
        const redirectBase = (() => {
            const envClient = (process.env.CLIENT_URL || '').trim();
            if (envClient)
                return envClient;
            const o = req.headers.origin;
            try {
                if (o) {
                    const host = new URL(o).host;
                    if (isAllowedClientHost(host))
                        return o;
                }
            }
            catch { }
            return 'http://localhost:5173';
        })();
        const verifyPath = type === 'retailer' ? '/verify/retailer' : '/verify/consumer';
        const redirectTo = `${redirectBase}${verifyPath}`;
        let actionLink;
        try {
            const { data, error } = await supabaseAuth_1.supabaseAuth.auth.admin.generateLink({
                type: 'signup',
                email,
                options: { redirectTo }
            });
            if (error)
                throw error;
            actionLink = data?.properties?.action_link || data?.action_link;
        }
        catch (e1) {
            const msg1 = String(e1?.message || '');
            console.warn('[resend-verification] signup link generation failed:', msg1);
            try {
                const { data, error } = await supabaseAuth_1.supabaseAuth.auth.admin.generateLink({
                    type: 'magiclink',
                    email,
                    options: { redirectTo }
                });
                if (error)
                    throw error;
                actionLink = data?.properties?.action_link || data?.action_link;
            }
            catch (e2) {
                res.status(500).json({ success: false, message: 'Kon geen verificatielink genereren', error: e2?.message || msg1 });
                return;
            }
        }
        if (!actionLink) {
            res.status(500).json({ success: false, message: 'Verificatielink ontbreekt' });
            return;
        }
        try {
            const sent = await emailService_1.default.sendVerificationEmail(email, actionLink, type === 'retailer' ? 'retailer' : 'user');
            if (!sent) {
                res.json({ success: true, message: 'Verificatielink gegenereerd', data: { link: actionLink } });
                return;
            }
        }
        catch (mailErr) {
            console.warn('[resend-verification] Brevo send failed:', mailErr?.message || mailErr);
            res.json({ success: true, message: 'Verificatielink gegenereerd', data: { link: actionLink } });
            return;
        }
        res.json({ success: true, message: 'Verificatie e-mail opnieuw verstuurd' });
    }
    catch (error) {
        console.error('resend-verification error:', error);
        res.status(500).json({ success: false, message: 'Er ging iets mis bij opnieuw versturen' });
    }
});
router.get('/oauth/facebook/start', async (req, res) => {
    try {
        const type = (String(req.query.type || 'consumer').toLowerCase() === 'retailer') ? 'retailer' : 'consumer';
        const next = typeof req.query.next === 'string' ? req.query.next : undefined;
        const retailerMeta = (type === 'retailer') ? {
            shopName: typeof req.query.shopName === 'string' ? req.query.shopName : undefined,
            shopUrl: typeof req.query.shopUrl === 'string' ? req.query.shopUrl : undefined,
            shopType: typeof req.query.shopType === 'string' ? req.query.shopType : undefined,
            planType: typeof req.query.planType === 'string' ? req.query.planType : undefined,
        } : undefined;
        const statePayload = { t: Date.now(), type, next, retailer: retailerMeta };
        const state = signState(statePayload);
        const redirectTo = `${getServerUrl()}/api/auth-supabase/oauth/callback?x=${encodeURIComponent(state)}`;
        const { data, error } = await supabaseAuth_1.supabaseClient.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo,
                scopes: 'email public_profile',
                queryParams: {
                    response_type: 'code',
                    display: 'touch'
                },
                flowType: 'pkce'
            }
        });
        if (error) {
            console.error('OAuth (facebook) start error:', error);
            res.status(500).json({ success: false, message: 'Kon Facebook OAuth niet starten' });
            return;
        }
        const url = data?.url;
        if (!url) {
            res.status(500).json({ success: false, message: 'Geen OAuth redirect URL ontvangen' });
            return;
        }
        res.redirect(String(url));
    }
    catch (e) {
        console.error('OAuth facebook start exception:', e);
        res.status(500).json({ success: false, message: 'Interne fout bij OAuth start' });
    }
});
router.get('/oauth/callback', async (req, res) => {
    try {
        const code = String(req.query.code || '');
        const supaStateParam = typeof req.query.state === 'string' ? req.query.state : '';
        const customStateParam = typeof req.query.x === 'string' ? req.query.x : '';
        console.log('[OAuth callback] Incoming params:', {
            hasCode: !!code,
            supaStatePresent: !!supaStateParam,
            xPresent: !!customStateParam,
            xLen: customStateParam ? customStateParam.length : 0,
            origin: req.headers.origin,
            referer: req.headers.referer,
            host: req.headers.host
        });
        if (!code) {
            console.log('[FACEBOOK CALLBACK DEBUG]', req.query, req.headers);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>OAuth</title><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body>Bezig met aanmelden...<script src="/api/auth-supabase/oauth/fallback.js"></script></body></html>`;
            res.status(200).send(html);
            return;
        }
        let state = null;
        let supabaseSDKFlow = false;
        if (customStateParam) {
            state = verifyState(customStateParam);
            console.log('[OAuth callback] verifyState(x) ->', !!state);
            if (!state) {
                console.warn('[OAuth callback] Invalid signed x state');
                res.status(400).send('Invalid state');
                return;
            }
        }
        else if (supaStateParam) {
            supabaseSDKFlow = true;
            state = { t: Date.now(), type: 'consumer', next: '/customer/dashboard' };
        }
        else {
            res.status(400).send('Missing state');
            return;
        }
        console.log('[OAuth callback] Exchanging code for session...');
        const { data, error } = await supabaseAuth_1.supabaseClient.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('exchangeCodeForSession error:', error);
            res.status(400).send('Kon sessie niet ophalen');
            return;
        }
        const user = data?.user || data?.session?.user;
        const provider = user?.app_metadata?.provider || (Array.isArray(user?.identities) && user.identities[0]?.provider) || 'google';
        console.log('[OAuth callback] Session OK. user.id:', user?.id, 'provider:', provider);
        if (!user) {
            res.status(400).send('Geen gebruiker gevonden na OAuth');
            return;
        }
        const um = user.user_metadata || {};
        const fullName = typeof um.name === 'string' ? um.name : undefined;
        let firstName = (um.given_name || um.first_name || (fullName ? fullName.split(' ')[0] : undefined));
        let lastName = (um.family_name || um.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : undefined));
        if (!firstName)
            firstName = 'Gebruiker';
        if (!lastName)
            lastName = '';
        const email = user.email;
        const clientBase = (() => {
            const envClient = (process.env.CLIENT_URL || '').trim();
            if (envClient)
                return envClient;
            const o = req.headers.origin;
            try {
                if (o) {
                    const host = new URL(o).host;
                    if (isAllowedClientHost(host))
                        return o;
                }
            }
            catch { }
            return 'http://localhost:5173';
        })();
        console.log('[OAuth callback] clientBase:', clientBase);
        if (state.type === 'retailer') {
            let retailer = null;
            try {
                const { data: r } = await supabase_1.supabaseAdmin
                    .from('retailers')
                    .select('*')
                    .eq('auth_id', user.id)
                    .maybeSingle();
                retailer = r;
            }
            catch { }
            if (!retailer) {
                const meta = state.retailer || {};
                if (meta.shopName && meta.shopUrl) {
                    const apiKey = crypto_1.default.randomBytes(32).toString('hex');
                    const insert = await supabase_1.supabaseAdmin
                        .from('retailers')
                        .insert({
                        id: user.id,
                        auth_id: user.id,
                        email,
                        password_hash: `SUPABASE_AUTH_${provider.toUpperCase()}`,
                        first_name: firstName,
                        last_name: lastName,
                        shop_name: meta.shopName,
                        shop_url: meta.shopUrl,
                        shop_type: (meta.shopType || 'FASHION'),
                        plan_type: 'STARTER',
                        is_active: true,
                        api_key: apiKey
                    })
                        .select()
                        .single();
                    if (insert.error) {
                        console.error('Create retailer via OAuth error:', insert.error);
                        res.status(500).send('Database fout bij retailer aanmaken');
                        return;
                    }
                    retailer = insert.data;
                    try {
                        await createStarterSubscriptionIfMissing(retailer.id);
                    }
                    catch (e) {
                        console.warn('[AutoPlan] createStarterSubscriptionIfMissing failed:', e);
                    }
                    try {
                        void sendRetailerSignup(retailer);
                    }
                    catch { }
                }
                else {
                    const params = new URLSearchParams({ email, firstName, lastName }).toString();
                    res.redirect(`${clientBase}/register/retailer?${params}`);
                    return;
                }
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email, userType: 'retailer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
            try {
                res.cookie('fit_session', token, {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: 'none',
                    path: '/',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                res.cookie('fit_token', token, {
                    httpOnly: false,
                    secure: isProd,
                    sameSite: 'none',
                    path: '/',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
            }
            catch (cookieErr) {
                console.warn('Could not set session cookie after OAuth (retailer):', cookieErr);
            }
            let next = state.next || '/dashboard';
            try {
                const { count } = await supabase_1.supabaseAdmin
                    .from('shops')
                    .select('id', { count: 'exact', head: true })
                    .eq('retailer_id', retailer.id);
                if ((count || 0) === 0) {
                    next = '/retailer/webshops?expand=first';
                }
            }
            catch (e) {
                console.warn('Could not count shops for retailer during OAuth callback:', e);
            }
            const hasQuery = next.includes('?');
            const redirectUrl = `${clientBase}${next}${hasQuery ? '&' : '?'}sso=${provider}&status=ok`;
            console.log('[OAuth callback] Redirect retailer ->', redirectUrl);
            res.redirect(redirectUrl);
            return;
        }
        try {
            const { data: existing } = await supabase_1.supabaseAdmin
                .from('users')
                .select('id')
                .eq('auth_id', user.id)
                .maybeSingle();
            if (!existing) {
                let userDailyMax = 50;
                try {
                    const { data: sys } = await supabase_1.supabaseAdmin
                        .from('category_settings')
                        .select('settings')
                        .eq('key', 'SYSTEM')
                        .maybeSingle();
                    const fitLimits = sys?.settings?.fitLimits || {};
                    userDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.userDailyMax ?? 50), 10) || 50));
                }
                catch { }
                const { error: userInsertError } = await supabase_1.supabaseAdmin
                    .from('users')
                    .insert({
                    id: user.id,
                    auth_id: user.id,
                    email,
                    password_hash: `SUPABASE_AUTH_${provider.toUpperCase()}`,
                    first_name: firstName,
                    last_name: lastName,
                    date_of_birth: '1900-01-01',
                    gender: 'OTHER',
                    profile_image_url: (um.avatar_url || um.picture || null),
                    is_active: true,
                    max_sessions: userDailyMax
                });
                if (userInsertError) {
                    console.error('Create consumer via OAuth error:', userInsertError);
                }
            }
        }
        catch (e) {
            console.error('Consumer upsert exception:', e);
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email, userType: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        try {
            res.cookie('fit_session', token, {
                httpOnly: true,
                secure: isProd,
                sameSite: 'none',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.cookie('fit_token', token, {
                httpOnly: false,
                secure: isProd,
                sameSite: 'none',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }
        catch (cookieErr) {
            console.warn('Could not set session cookie after OAuth (consumer):', cookieErr);
        }
        let next = state.next || '/customer/dashboard';
        let baseForNext = clientBase;
        console.log('[OAuth callback] state.next =', next);
        try {
            const { data: profile } = await supabase_1.supabaseAdmin
                .from('users')
                .select('user_type')
                .eq('id', user.id)
                .maybeSingle();
            if ((!state.next || state.next === '/customer/dashboard') && profile?.user_type === 'ADMIN') {
                next = '/owner/dashboard';
            }
        }
        catch (e) {
            console.warn('[OAuth callback] Could not check user_type for ADMIN redirect:', e);
        }
        if (/^https?:\/\//i.test(next)) {
            try {
                const u = new URL(next);
                const path = u.pathname || '/';
                const search = u.search || '';
                const sepAbs = (search ? '&' : '?');
                if (path.startsWith('/api/')) {
                    const serverBase = getServerUrl();
                    const redirectUrlAbs = `${serverBase}${path}${search}${sepAbs}sso=${provider}&status=ok`;
                    console.log('[OAuth callback] Redirect consumer (rewrite absolute API URL to server) ->', redirectUrlAbs);
                    res.redirect(redirectUrlAbs);
                    return;
                }
                else {
                    const redirectUrlAbs = `${next}${sepAbs}sso=${provider}&status=ok`;
                    console.log('[OAuth callback] Redirect consumer (absolute, non-API) ->', redirectUrlAbs);
                    res.redirect(redirectUrlAbs);
                    return;
                }
            }
            catch (e) {
                console.warn('[OAuth callback] Failed to parse absolute next, falling back:', e);
            }
        }
        if (next.startsWith('/api/')) {
            baseForNext = getServerUrl();
        }
        const sep = next.includes('?') ? '&' : '?';
        const redirectUrl = `${baseForNext}${next}${sep}sso=${provider}&status=ok`;
        console.log('[OAuth callback] Redirect consumer ->', redirectUrl);
        res.redirect(redirectUrl);
    }
    catch (e) {
        console.error('OAuth callback exception:', e);
        res.status(500).json({ success: false, message: 'Interne fout bij OAuth callback' });
    }
});
router.post('/register/retailer', async (req, res) => {
    try {
        const { error, value } = retailerRegisterSchema.validate(req.body);
        if (error) {
            res.status(400).json({ success: false, message: error.details[0].message });
            return;
        }
        const { email, password, firstName, lastName, shopName, shopUrl, shopType } = value;
        const { data: existingRetailer } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('id')
            .eq('email', email)
            .maybeSingle();
        if (existingRetailer) {
            res.status(400).json({ success: false, message: 'Een account met dit emailadres bestaat al' });
            return;
        }
        const redirectBase = (() => {
            const envClient = (process.env.CLIENT_URL || '').trim();
            if (envClient)
                return envClient;
            const o = req.headers.origin;
            try {
                if (o) {
                    const host = new URL(o).host;
                    if (isAllowedClientHost(host))
                        return o;
                }
            }
            catch { }
            return 'http://localhost:5173';
        })();
        const retailerEmailRedirectTo = `${redirectBase}/verify/retailer`;
        let authUser;
        try {
            authUser = await supabaseAuth_1.authHelpers.createAuthUser(email, password, { firstName, lastName, userType: 'retailer' }, retailerEmailRedirectTo);
        }
        catch (signUpError) {
            const msg = String(signUpError?.message || '');
            if (/already\s+registered|user\s+exists|duplicate/i.test(msg)) {
                res.status(400).json({ success: false, message: 'Een account met dit e-mailadres bestaat al' });
                return;
            }
            res.status(500).json({ success: false, message: 'Fout bij het aanmaken van auth user', error: msg || 'unknown' });
            return;
        }
        if (!authUser?.user) {
            res.status(500).json({ success: false, message: 'Fout bij het aanmaken van auth user' });
        }
        const apiKey = crypto_1.default.randomBytes(32).toString('hex');
        const { data: retailer, error: retailerError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .insert({
            id: authUser.user.id,
            auth_id: authUser.user.id,
            email,
            password_hash: 'SUPABASE_AUTH',
            first_name: firstName,
            last_name: lastName,
            shop_name: shopName,
            shop_url: shopUrl || null,
            shop_type: normalizeShopType(shopType),
            plan_type: 'STARTER',
            is_active: true,
            api_key: apiKey
        })
            .select()
            .single();
        if (retailerError) {
            try {
                await supabaseAuth_1.authHelpers.deleteUser(authUser.user.id);
            }
            catch { }
            res.status(500).json({ success: false, message: 'Database fout bij retailer aanmaken', error: retailerError?.message || String(retailerError) });
            return;
        }
        try {
            void sendRetailerSignup(retailer);
        }
        catch { }
        try {
            await createStarterSubscriptionIfMissing(retailer.id);
        }
        catch (e) {
            console.warn('[AutoPlan] createStarterSubscriptionIfMissing failed:', e);
        }
        const emailConfirmedAt = authUser.user?.email_confirmed_at || authUser.user?.confirmed_at;
        if (!emailConfirmedAt) {
            let actionLink;
            try {
                const { data, error } = await supabaseAuth_1.supabaseAuth.auth.admin.generateLink({
                    type: 'signup',
                    email,
                    options: { redirectTo: retailerEmailRedirectTo }
                });
                if (error)
                    throw error;
                actionLink = data?.properties?.action_link || data?.action_link;
            }
            catch (e1) {
                const msg1 = String(e1?.message || '');
                console.warn('[register/retailer] signup verification link generation failed:', msg1);
                try {
                    const { data, error } = await supabaseAuth_1.supabaseAuth.auth.admin.generateLink({
                        type: 'magiclink',
                        email,
                        options: { redirectTo: retailerEmailRedirectTo }
                    });
                    if (error)
                        throw error;
                    actionLink = data?.properties?.action_link || data?.action_link;
                }
                catch (e2) {
                    console.warn('[register/retailer] magiclink generation failed:', e2?.message || e2);
                }
            }
            if (actionLink) {
                try {
                    await emailService_1.default.sendVerificationEmail(email, actionLink, 'retailer');
                }
                catch (mailErr) {
                    console.warn('[register/retailer] Brevo verification mail failed:', mailErr?.message || mailErr);
                }
            }
        }
        const token = jsonwebtoken_1.default.sign({ userId: authUser.user.id, email: authUser.user.email, userType: 'retailer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        try {
            res.cookie('fit_session', token, {
                httpOnly: true,
                secure: isProd,
                sameSite: 'none',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }
        catch (cookieErr) {
            console.warn('Could not set session cookie:', cookieErr);
        }
        res.status(201).json({
            success: true,
            message: 'Retailer succesvol geregistreerd',
            data: {
                token,
                retailer: {
                    id: retailer.id,
                    email: retailer.email,
                    firstName: retailer.first_name,
                    lastName: retailer.last_name,
                    shopName: retailer.shop_name,
                    shopUrl: retailer.shop_url,
                    shopType: retailer.shop_type,
                    isActive: retailer.is_active,
                    createdAt: retailer.created_at,
                    apiKey: retailer.api_key
                }
            }
        });
    }
    catch (e) {
        console.error('Retailer registration exception:', e);
        res.status(500).json({ success: false, message: 'Interne fout bij retailer registratie' });
    }
});
router.post('/register/user', async (req, res) => {
    console.log('🔵 User registration attempt with Supabase Auth');
    try {
        const { error, value } = userRegisterSchema.validate(req.body);
        if (error) {
            console.log('❌ Validation error:', error.details[0].message);
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { email, password, firstName, lastName, dateOfBirth, gender } = value;
        console.log('✅ Validation passed for:', email);
        console.log('🔍 Checking if user exists...');
        const existingUser = await supabaseAuth_1.authHelpers.getUserByEmail(email);
        if (existingUser) {
            console.log('❌ User already exists');
            res.status(400).json({
                success: false,
                message: 'Een account met dit emailadres bestaat al'
            });
            return;
        }
        console.log('👤 Creating Supabase Auth user...');
        const redirectBase = (() => {
            const envClient = (process.env.CLIENT_URL || '').trim();
            if (envClient)
                return envClient;
            const o = req.headers.origin;
            try {
                if (o) {
                    const host = new URL(o).host;
                    if (isAllowedClientHost(host))
                        return o;
                }
            }
            catch { }
            return 'http://localhost:5173';
        })();
        const emailRedirectTo = `${redirectBase}/verify/consumer`;
        console.log('[Register user] CLIENT_URL:', process.env.CLIENT_URL);
        console.log('[Register user] redirectBase:', redirectBase);
        console.log('[Register user] emailRedirectTo:', emailRedirectTo);
        let authUser;
        try {
            authUser = await supabaseAuth_1.authHelpers.createAuthUser(email, password, {
                role: 'user',
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth || null,
                gender: gender || null
            }, emailRedirectTo);
        }
        catch (signUpError) {
            console.error('❌ Supabase Auth signUp error (user):', signUpError);
            console.error('   redirectBase:', redirectBase);
            console.error('   emailRedirectTo:', emailRedirectTo);
            const msg = String(signUpError?.message || '');
            if (/already\s+registered|user\s+exists|duplicate/i.test(msg)) {
                res.status(400).json({ success: false, message: 'Een account met dit e-mailadres bestaat al' });
                return;
            }
            res.status(500).json({ success: false, message: 'Fout bij het aanmaken van auth user', error: msg || 'unknown' });
            return;
        }
        if (!authUser.user) {
            res.status(500).json({
                success: false,
                message: 'Fout bij het aanmaken van auth user'
            });
            return;
        }
        console.log('✅ User created with Supabase Auth:', authUser.user.id);
        console.log('Supabase Auth user details:', JSON.stringify(authUser.user, null, 2));
        console.log('📧 Email verification automatically sent by Supabase Auth');
        console.log('👤 Creating user record in users table...');
        let userDailyMax = 50;
        try {
            const { data: sys } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('settings')
                .eq('key', 'SYSTEM')
                .maybeSingle();
            const fitLimits = sys?.settings?.fitLimits || {};
            userDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.userDailyMax ?? 50), 10) || 50));
        }
        catch { }
        const userData = {
            id: authUser.user.id,
            auth_id: authUser.user.id,
            email,
            password_hash: 'SUPABASE_AUTH',
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            profile_image_url: null,
            is_active: true,
            max_sessions: userDailyMax
        };
        console.log('User data being inserted:', userData);
        const { data: user, error: userError } = await supabase_1.supabaseAdmin
            .from('users')
            .insert(userData)
            .select()
            .single();
        if (userError) {
            console.error('Error creating user record:', userError);
            console.error('User data attempted:', {
                id: authUser.user.id,
                email,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth || null,
                gender: gender || null
            });
            try {
                await supabaseAuth_1.authHelpers.deleteUser(authUser.user.id);
                console.log('✅ Cleaned up Supabase Auth user after database error');
            }
            catch (cleanupError) {
                console.error('❌ Failed to cleanup Supabase Auth user:', cleanupError);
            }
            res.status(500).json({
                success: false,
                message: 'Fout bij het aanmaken van gebruikersprofiel in database',
                error: userError.message
            });
            return;
        }
        console.log('✅ User record created:', user.id);
        try {
            void sendConsumerSignup(user);
        }
        catch { }
        const token = jsonwebtoken_1.default.sign({
            userId: authUser.user.id,
            email: authUser.user.email,
            userType: 'user'
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        try {
            res.cookie('fit_session', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }
        catch (cookieErr) {
            console.warn('Could not set session cookie:', cookieErr);
        }
        console.log('🎉 User registration completed for:', email);
        res.status(201).json({
            success: true,
            message: 'Gebruiker account succesvol aangemaakt',
            data: {
                token,
                user: {
                    id: authUser.user.id,
                    email: authUser.user.email,
                    firstName,
                    lastName,
                    dateOfBirth,
                    gender
                }
            }
        });
    }
    catch (error) {
        console.error('💥 User registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het aanmaken van het account'
        });
    }
});
router.post('/register/user/payed', async (req, res) => {
    try {
        const schema = joi_1.default.object({
            email: joi_1.default.string().email().required(),
            password: joi_1.default.string().min(8).required(),
            firstName: joi_1.default.string().min(1).max(50).required(),
            lastName: joi_1.default.string().min(1).max(50).required(),
            dateOfBirth: joi_1.default.date().max('now').optional().allow(null, ''),
            gender: joi_1.default.string().valid('MALE', 'FEMALE', 'OTHER').optional().allow(null, ''),
            registrationCode: joi_1.default.string().min(3).required()
        });
        const { error, value } = schema.validate(req.body);
        if (error) {
            res.status(400).json({ success: false, message: error.details[0].message });
            return;
        }
        const { email, password, firstName, lastName, dateOfBirth, gender, registrationCode } = value;
        const codesRaw = ((process.env.CONSUMER_PAYED_ACCESS_CODE || process.env.PAYED_REGISTRATION_CODE || '') + '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const allowedCodes = codesRaw.length > 0 ? codesRaw : (process.env.NODE_ENV === 'production' ? [] : ['dev-payed']);
        if (allowedCodes.length === 0) {
            res.status(500).json({ success: false, message: 'Registratiecode niet geconfigureerd' });
            return;
        }
        if (!allowedCodes.includes(String(registrationCode).trim())) {
            res.status(403).json({ success: false, message: 'Ongeldige registratie code' });
            return;
        }
        const existingUser = await supabaseAuth_1.authHelpers.getUserByEmail(email);
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Een account met dit e-mailadres bestaat al' });
            return;
        }
        const redirectBase = (() => {
            const envClient = (process.env.CLIENT_URL || '').trim();
            if (envClient)
                return envClient;
            const o = req.headers.origin;
            try {
                if (o) {
                    const host = new URL(o).host;
                    if (isAllowedClientHost(host))
                        return o;
                }
            }
            catch { }
            return 'http://localhost:5173';
        })();
        const emailRedirectTo = `${redirectBase}/verify/consumer`;
        let authUser;
        try {
            authUser = await supabaseAuth_1.authHelpers.createAuthUser(email, password, { role: 'user', first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth || null, gender: gender || null }, emailRedirectTo);
        }
        catch (signUpError) {
            const msg = String(signUpError?.message || '');
            if (/already\s+registered|user\s+exists|duplicate/i.test(msg)) {
                res.status(400).json({ success: false, message: 'Een account met dit e-mailadres bestaat al' });
                return;
            }
            res.status(500).json({ success: false, message: 'Fout bij het aanmaken van auth user', error: msg || 'unknown' });
            return;
        }
        if (!authUser?.user) {
            res.status(500).json({ success: false, message: 'Fout bij het aanmaken van auth user' });
            return;
        }
        let userDailyMax = 50;
        try {
            const { data: sys } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('settings')
                .eq('key', 'SYSTEM')
                .maybeSingle();
            const fitLimits = sys?.settings?.fitLimits || {};
            userDailyMax = Math.max(0, Math.min(999, parseInt(String(fitLimits.userDailyMax ?? 50), 10) || 50));
        }
        catch { }
        const insertPayload = {
            id: authUser.user.id,
            auth_id: authUser.user.id,
            email,
            password_hash: 'SUPABASE_AUTH',
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            profile_image_url: null,
            is_active: true,
            max_sessions: userDailyMax,
            user_type: 'PAYED'
        };
        const { data: user, error: userError } = await supabase_1.supabaseAdmin
            .from('users')
            .insert(insertPayload)
            .select()
            .single();
        if (userError) {
            try {
                await supabaseAuth_1.authHelpers.deleteUser(authUser.user.id);
            }
            catch { }
            res.status(500).json({ success: false, message: 'Fout bij het aanmaken van gebruikersprofiel in database', error: userError.message });
            return;
        }
        try {
            void sendConsumerSignup(user);
        }
        catch { }
        const token = jsonwebtoken_1.default.sign({ userId: authUser.user.id, email: authUser.user.email, userType: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        try {
            res.cookie('fit_session', token, { httpOnly: true, secure: isProd, sameSite: 'none', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.cookie('fit_token', token, { httpOnly: false, secure: isProd, sameSite: 'none', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
        }
        catch { }
        res.status(201).json({
            success: true,
            message: 'PAYED account succesvol aangemaakt',
            data: {
                token,
                user: {
                    id: authUser.user.id,
                    email: authUser.user.email,
                    firstName,
                    lastName,
                    dateOfBirth,
                    gender,
                    user_type: 'PAYED'
                }
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Interne fout bij PAYED-registratie' });
    }
});
router.post('/login/retailer', async (req, res) => {
    try {
        const { error: validationError, value } = loginSchema.validate(req.body);
        if (validationError) {
            res.status(400).json({
                success: false,
                message: 'Validatiefout',
                errors: validationError.details.map(detail => detail.message)
            });
            return;
        }
        const { email, password } = value;
        console.log('Retailer login attempt:', { email });
        let authResult;
        try {
            authResult = await supabaseAuth_1.authHelpers.signInUser(email, password);
        }
        catch (error) {
            console.error('Supabase Auth login error:', error);
            const code = String(error?.code || '').toLowerCase();
            if (code === 'email_not_confirmed') {
                res.status(403).json({
                    success: false,
                    code: 'email_not_confirmed',
                    message: 'Je e-mailadres is nog niet bevestigd. Controleer je inbox of verstuur de bevestigingsmail opnieuw.'
                });
                return;
            }
            res.status(401).json({
                success: false,
                message: error?.message || 'Ongeldige inloggegevens'
            });
            return;
        }
        if (!authResult.user) {
            console.error('Supabase Auth login failed: No user returned');
            res.status(401).json({
                success: false,
                message: 'Ongeldige inloggegevens'
            });
            return;
        }
        const { data: retailer, error: retailerError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('*')
            .eq('auth_id', authResult.user.id)
            .single();
        if (retailerError || !retailer) {
            console.error('Error fetching retailer:', retailerError);
            res.status(404).json({
                success: false,
                message: 'Retailer niet gevonden'
            });
            return;
        }
        if (!retailer.is_active) {
            let closing = false;
            let effectiveEnd = null;
            try {
                const { data: sub } = await supabase_1.supabaseAdmin
                    .from('subscriptions')
                    .select('plan_type, status, current_period_end')
                    .eq('retailer_id', retailer.id)
                    .eq('status', 'ACTIVE')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                const nonStarter = !!sub && String(sub.plan_type || '').toUpperCase() !== 'STARTER';
                if (nonStarter) {
                    closing = true;
                    if (sub?.current_period_end) {
                        try {
                            effectiveEnd = new Date(sub.current_period_end).toISOString();
                        }
                        catch {
                            effectiveEnd = String(sub.current_period_end);
                        }
                    }
                }
            }
            catch { }
            if (!closing) {
                res.status(403).json({
                    success: false,
                    message: 'Account is gedeactiveerd'
                });
                return;
            }
            const token = jsonwebtoken_1.default.sign({
                userId: authResult.user.id,
                email: authResult.user.email,
                userType: 'retailer'
            }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
            try {
                res.cookie('fit_session', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    path: '/',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
            }
            catch (cookieErr) {
                console.warn('Could not set session cookie on login (closing state):', cookieErr);
            }
            res.json({
                success: true,
                message: 'Succesvol ingelogd (closing)',
                data: {
                    token,
                    supabaseToken: authResult.session?.access_token,
                    firstLogin: false,
                    closing: true,
                    effectiveEnd,
                    retailer: {
                        id: retailer.id,
                        email: retailer.email,
                        firstName: retailer.first_name,
                        lastName: retailer.last_name,
                        shopName: retailer.shop_name,
                        shopUrl: retailer.shop_url,
                        shopType: retailer.shop_type,
                        isActive: retailer.is_active,
                        createdAt: retailer.created_at,
                        apiKey: retailer.api_key
                    }
                }
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: authResult.user.id,
            email: authResult.user.email,
            userType: 'retailer'
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        try {
            res.cookie('fit_session', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }
        catch (cookieErr) {
            console.warn('Could not set session cookie on login:', cookieErr);
        }
        let shopsCount = 0;
        try {
            const { count } = await supabase_1.supabaseAdmin
                .from('shops')
                .select('id', { count: 'exact', head: true })
                .eq('retailer_id', retailer.id);
            shopsCount = count || 0;
        }
        catch (e) {
            console.warn('Could not count shops for retailer on login:', e);
        }
        res.json({
            success: true,
            message: 'Succesvol ingelogd',
            data: {
                token,
                supabaseToken: authResult.session?.access_token,
                firstLogin: shopsCount === 0,
                retailer: {
                    id: retailer.id,
                    email: retailer.email,
                    firstName: retailer.first_name,
                    lastName: retailer.last_name,
                    shopName: retailer.shop_name,
                    shopUrl: retailer.shop_url,
                    shopType: retailer.shop_type,
                    isActive: retailer.is_active,
                    createdAt: retailer.created_at,
                    apiKey: retailer.api_key
                }
            }
        });
    }
    catch (error) {
        console.error('Retailer login error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het inloggen'
        });
    }
});
router.post('/login/user', async (req, res) => {
    console.log('🔵 User login attempt with Supabase Auth');
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            console.log('❌ Validation error:', error.details[0].message);
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { email, password } = value;
        console.log('✅ Validation passed for:', email);
        console.log('🔐 Attempting Supabase Auth login...');
        let authResult;
        try {
            authResult = await supabaseAuth_1.authHelpers.signInUser(email, password);
        }
        catch (error) {
            console.error('Supabase Auth login error:', error);
            const code = String(error?.code || '').toLowerCase();
            if (code === 'email_not_confirmed') {
                res.status(403).json({
                    success: false,
                    code: 'email_not_confirmed',
                    message: 'Je e-mailadres is nog niet bevestigd. Controleer je inbox of verstuur de bevestigingsmail opnieuw.'
                });
                return;
            }
            res.status(401).json({
                success: false,
                message: error.message || 'Ongeldige inloggegevens'
            });
            return;
        }
        if (!authResult.user) {
            console.log('❌ Supabase Auth login failed: No user returned');
            res.status(401).json({
                success: false,
                message: 'Ongeldige inloggegevens'
            });
            return;
        }
        console.log('✅ Supabase Auth login successful:', authResult.user.id);
        const token = jsonwebtoken_1.default.sign({
            userId: authResult.user.id,
            email: authResult.user.email,
            userType: 'user'
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        try {
            res.cookie('fit_session', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }
        catch (cookieErr) {
            console.warn('Could not set session cookie on user login:', cookieErr);
        }
        res.json({
            success: true,
            message: 'Succesvol ingelogd',
            data: {
                token,
                supabaseToken: authResult.session?.access_token,
                user: {
                    id: authResult.user.id,
                    email: authResult.user.email
                }
            }
        });
    }
    catch (error) {
        console.error('💥 User login error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het inloggen'
        });
    }
});
router.post('/forgot-password', async (req, res) => {
    console.log('🔵 Forgot password request with Supabase Auth');
    try {
        const { error, value } = forgotPasswordSchema.validate(req.body);
        if (error) {
            console.log('❌ Validation error:', error.details[0].message);
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { email } = value;
        console.log('✅ Validation passed for:', email);
        console.log('🔗 Generating password reset link...');
        const resetLink = await supabaseAuth_1.authHelpers.generatePasswordResetLink(email);
        console.log('✅ Password reset link generated:', resetLink);
        console.log('📧 Sending password reset email via Brevo...');
        const sent = await emailService_1.default.sendPasswordResetEmail(email, resetLink);
        if (!sent) {
            throw new Error('Kon resetmail niet versturen via Brevo');
        }
        console.log('🎉 Password reset email successfully sent to:', email);
        res.json({
            success: true,
            message: 'Er is een reset link naar je emailadres verstuurd.'
        });
    }
    catch (error) {
        console.error('💥 Forgot password error:', error.message || error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het versturen van de resetmail.'
        });
    }
});
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        const { data: retailer, error: retailerError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('id, auth_id, first_name, last_name, shop_name, shop_url, shop_type, is_active, api_key, created_at')
            .eq('auth_id', userId)
            .eq('is_active', true)
            .single();
        if (!retailerError && retailer) {
            res.json({
                success: true,
                data: {
                    id: retailer.id,
                    email: authUser.user.email,
                    firstName: retailer.first_name,
                    lastName: retailer.last_name,
                    shopName: retailer.shop_name,
                    shopUrl: retailer.shop_url,
                    shopType: retailer.shop_type,
                    isActive: retailer.is_active,
                    apiKey: retailer.api_key,
                    createdAt: retailer.created_at,
                    userType: 'retailer'
                }
            });
            return;
        }
        const { data: consumer, error: consumerError } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, auth_id, first_name, last_name, date_of_birth, gender, profile_image_url, is_active, created_at')
            .eq('auth_id', userId)
            .eq('is_active', true)
            .single();
        if (!consumerError && consumer) {
            res.json({
                success: true,
                data: {
                    id: consumer.id,
                    email: authUser.user.email,
                    firstName: consumer.first_name,
                    lastName: consumer.last_name,
                    dateOfBirth: consumer.date_of_birth,
                    gender: consumer.gender,
                    profileImageUrl: consumer.profile_image_url,
                    isActive: consumer.is_active,
                    createdAt: consumer.created_at,
                    userType: 'consumer'
                }
            });
            return;
        }
        res.status(404).json({
            success: false,
            message: 'User profile not found'
        });
    }
    catch (error) {
        console.error('Get user info error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to get user info'
        });
    }
});
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ success: false, message: 'No token provided' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser?.user) {
            res.status(401).json({ success: false, message: 'Invalid token' });
            return;
        }
        const { data: retailer } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('id, auth_id, first_name, last_name, shop_name, shop_url, shop_type, is_active, api_key, created_at, plan_type')
            .eq('auth_id', userId)
            .eq('is_active', true)
            .maybeSingle();
        if (retailer) {
            let effectivePlan = String(retailer?.plan_type || 'STARTER').toUpperCase();
            try {
                const { data: sub } = await supabase_1.supabaseAdmin
                    .from('subscriptions')
                    .select('plan_type, status')
                    .eq('retailer_id', retailer.id)
                    .eq('status', 'ACTIVE')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                const p = sub?.plan_type ? String(sub.plan_type).toUpperCase() : '';
                if (p === 'STARTER' || p === 'BASIC' || p === 'PREMIUM' || p === 'ENTERPRISE')
                    effectivePlan = p;
            }
            catch { }
            res.json({ success: true, data: {
                    id: retailer.id,
                    email: authUser.user.email,
                    firstName: retailer.first_name,
                    lastName: retailer.last_name,
                    shopName: retailer.shop_name,
                    shopUrl: retailer.shop_url,
                    shopType: retailer.shop_type,
                    isActive: retailer.is_active,
                    apiKey: retailer.api_key,
                    createdAt: retailer.created_at,
                    userType: 'retailer',
                    planType: effectivePlan,
                    plan: effectivePlan
                } });
            return;
        }
        const { data: consumer } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, auth_id, first_name, last_name, date_of_birth, gender, profile_image_url, is_active, created_at')
            .eq('auth_id', userId)
            .eq('is_active', true)
            .maybeSingle();
        if (consumer) {
            res.json({ success: true, data: { id: consumer.id, email: authUser.user.email, firstName: consumer.first_name, lastName: consumer.last_name, dateOfBirth: consumer.date_of_birth, gender: consumer.gender, profileImageUrl: consumer.profile_image_url, isActive: consumer.is_active, createdAt: consumer.created_at, userType: 'consumer' } });
            return;
        }
        res.status(404).json({ success: false, message: 'User profile not found' });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ success: false, message: 'Invalid token' });
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to get user info' });
    }
});
router.put('/update-profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        const schema = joi_1.default.object({
            firstName: joi_1.default.string().min(1).max(50).required(),
            lastName: joi_1.default.string().min(1).max(50).required(),
            shopName: joi_1.default.string().min(1).max(100).required(),
            shopUrl: joi_1.default.string().uri().required(),
            shopType: joi_1.default.string().valid('FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS').required()
        });
        const { error: validationError, value } = schema.validate(req.body);
        if (validationError) {
            res.status(400).json({
                success: false,
                message: validationError.details[0].message
            });
            return;
        }
        const { firstName, lastName, shopName, shopUrl, shopType } = value;
        const { data: retailer, error: updateError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .update({
            first_name: firstName,
            last_name: lastName,
            shop_name: shopName,
            shop_url: shopUrl,
            shop_type: shopType,
            updated_at: new Date().toISOString()
        })
            .eq('auth_id', userId)
            .select()
            .single();
        if (updateError) {
            throw updateError;
        }
        res.json({
            success: true,
            message: 'Profiel succesvol bijgewerkt',
            data: {
                id: retailer.id,
                firstName: retailer.first_name,
                lastName: retailer.last_name,
                shopName: retailer.shop_name,
                shopUrl: retailer.shop_url,
                shopType: retailer.shop_type
            }
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});
router.put('/change-password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        const schema = joi_1.default.object({
            currentPassword: joi_1.default.string().required(),
            newPassword: joi_1.default.string().min(8).required()
        });
        const { error: validationError, value } = schema.validate(req.body);
        if (validationError) {
            res.status(400).json({
                success: false,
                message: validationError.details[0].message
            });
            return;
        }
        const { currentPassword, newPassword } = value;
        const { error: signInError } = await supabase_1.supabaseAdmin.auth.signInWithPassword({
            email: authUser.user.email,
            password: currentPassword
        });
        if (signInError) {
            res.status(400).json({
                success: false,
                message: 'Huidig wachtwoord is onjuist'
            });
            return;
        }
        const { error: updateError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });
        if (updateError) {
            throw updateError;
        }
        res.json({
            success: true,
            message: 'Wachtwoord succesvol gewijzigd'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});
router.get('/plans', (req, res) => {
    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: 99,
            currency: 'EUR',
            interval: 'month',
            features: [
                '10.000 FiT sessies per maand',
                'Basis analytics dashboard',
                'Email ondersteuning',
                'Widget integratie'
            ],
            maxSessions: 10000,
            type: 'BASIC'
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 199,
            currency: 'EUR',
            interval: 'month',
            features: [
                '20.000 FiT sessies per maand',
                'Geavanceerde analytics',
                'Prioriteit ondersteuning',
                'Aangepaste widget styling',
                'Geen FiT branding'
            ],
            maxSessions: 20000,
            type: 'PREMIUM',
            popular: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 399,
            currency: 'EUR',
            interval: 'month',
            features: [
                '20.000+ FiT sessies per maand',
                'Volledige analytics suite',
                'Dedicated account manager',
                'Volledig aangepaste branding',
                'API toegang',
                'Custom integraties'
            ],
            maxSessions: 999999,
            type: 'ENTERPRISE'
        }
    ];
    res.json({
        success: true,
        data: plans
    });
});
router.post('/create-test-retailer', async (req, res) => {
    try {
        const testEmail = 'test@zoozoo.shop';
        const testPassword = 'testpassword123';
        console.log('Creating test retailer for widget testing...');
        const { data: existing } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('id, api_key')
            .eq('email', testEmail)
            .single();
        if (existing) {
            console.log('Test retailer already exists, returning API key');
            res.json({
                success: true,
                message: 'Test retailer already exists',
                data: {
                    email: testEmail,
                    password: testPassword,
                    apiKey: existing.api_key
                }
            });
            return;
        }
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    firstName: 'Test',
                    lastName: 'Retailer',
                    userType: 'retailer'
                }
            }
        });
        if (authError) {
            console.error('Auth creation error:', authError);
            throw authError;
        }
        if (!authData.user) {
            res.status(500).json({
                success: false,
                message: 'Failed to create auth user'
            });
            return;
        }
        const apiKey = crypto_1.default.randomBytes(32).toString('hex');
        const { data: retailer, error: retailerError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .insert({
            id: authData.user.id,
            email: testEmail,
            password_hash: 'SUPABASE_AUTH',
            first_name: 'Test',
            last_name: 'Retailer',
            shop_name: 'ZooZoo.shop',
            shop_url: 'https://zoozoo.shop',
            shop_type: 'FASHION',
            plan_type: 'STARTER',
            is_active: true,
            api_key: apiKey
        })
            .select()
            .single();
        if (retailerError) {
            console.error('Retailer creation error:', retailerError);
            throw retailerError;
        }
        console.log('Test retailer created successfully');
        try {
            await createStarterSubscriptionIfMissing(retailer.id);
        }
        catch (e) {
            console.warn('[AutoPlan] createStarterSubscriptionIfMissing failed:', e);
        }
        res.json({
            success: true,
            message: 'Test retailer created successfully',
            data: {
                email: testEmail,
                password: testPassword,
                apiKey: apiKey,
                retailerId: retailer.id
            }
        });
    }
    catch (error) {
        console.error('Test retailer creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test retailer',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/add-domain', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        const { error: validationError, value } = addDomainSchema.validate(req.body);
        if (validationError) {
            res.status(400).json({
                success: false,
                message: validationError.details[0].message
            });
            return;
        }
        const { domain, category, name } = value;
        const { data: currentRetailer, error: getCurrentError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('domains')
            .eq('email', authUser.user.email)
            .single();
        if (getCurrentError) {
            throw getCurrentError;
        }
        const currentDomains = currentRetailer.domains || {};
        const updatedDomains = {
            ...currentDomains,
            [domain]: name ? { category, name } : category
        };
        let plan = 'STARTER';
        try {
            const { data: sub } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('plan_type, status, updated_at')
                .eq('retailer_id', (await supabase_1.supabaseAdmin
                .from('retailers')
                .select('id')
                .eq('email', authUser.user.email)
                .single()).data?.id)
                .eq('status', 'ACTIVE')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (sub && sub.plan_type) {
                const p = String(sub.plan_type).toUpperCase();
                if (p === 'STARTER' || p === 'BASIC' || p === 'PREMIUM' || p === 'ENTERPRISE')
                    plan = p;
            }
        }
        catch { }
        const domainLimitByPlan = {
            STARTER: 1,
            BASIC: 2,
            PREMIUM: 10,
            ENTERPRISE: Number.MAX_SAFE_INTEGER
        };
        const prospectiveCount = Object.keys(updatedDomains).length;
        const allowed = domainLimitByPlan[plan];
        if (prospectiveCount > allowed) {
            res.status(403).json({
                success: false,
                message: `Domeinlimiet bereikt voor jouw abonnement (${plan}). Verwijder eerst een domein of upgrade je abonnement.`
            });
            return;
        }
        const { data: retailer, error: retailerError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .update({
            domains: updatedDomains
        })
            .eq('email', authUser.user.email)
            .select('id, domains')
            .single();
        if (retailerError) {
            throw retailerError;
        }
        const domainsArray = Object.entries(retailer.domains || {}).map(([domainUrl, meta]) => {
            let category;
            let name;
            if (typeof meta === 'string') {
                category = meta;
            }
            else if (meta && typeof meta === 'object') {
                const m = meta;
                category = typeof m.category === 'string' ? m.category : undefined;
                name = typeof m.name === 'string' ? m.name : undefined;
            }
            return {
                id: String(domainUrl),
                domain: String(domainUrl),
                category: String((category || 'FASHION')),
                name,
                isActive: true
            };
        });
        res.json({
            success: true,
            message: 'Domein succesvol toegevoegd',
            data: {
                id: retailer.id,
                domains: domainsArray
            }
        });
    }
    catch (error) {
        console.error('Add domain error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to add domain'
        });
    }
});
router.delete('/remove-domain', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        const { domainId } = req.body;
        if (!domainId) {
            res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
            return;
        }
        const { data: currentRetailer, error: getCurrentError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('domains')
            .eq('email', authUser.user.email)
            .single();
        if (getCurrentError) {
            throw getCurrentError;
        }
        const currentDomains = currentRetailer.domains || {};
        const updatedDomains = { ...currentDomains };
        delete updatedDomains[domainId];
        const { data: retailer, error: retailerError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .update({
            domains: updatedDomains
        })
            .eq('email', authUser.user.email)
            .select('id, domains')
            .single();
        if (retailerError) {
            throw retailerError;
        }
        const domainsArray = Object.entries(retailer.domains || {}).map(([domainUrl, meta]) => {
            let category;
            let name;
            if (typeof meta === 'string') {
                category = meta;
            }
            else if (meta && typeof meta === 'object') {
                const m = meta;
                category = typeof m.category === 'string' ? m.category : undefined;
                name = typeof m.name === 'string' ? m.name : undefined;
            }
            return {
                id: String(domainUrl),
                domain: String(domainUrl),
                category: String((category || 'FASHION')),
                name,
                isActive: true
            };
        });
        res.json({
            success: true,
            message: 'Domein succesvol verwijderd',
            data: {
                id: retailer.id,
                domains: domainsArray
            }
        });
    }
    catch (error) {
        console.error('Remove domain error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to remove domain'
        });
    }
});
router.put('/update-profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }
        const { error: validationError, value } = updateProfileSchema.validate(req.body);
        if (validationError) {
            res.status(400).json({
                success: false,
                message: validationError.details[0].message
            });
            return;
        }
        const { firstName, lastName, shopName, shopUrl, shopType } = value;
        const { data: retailer, error: retailerError } = await supabase_1.supabaseAdmin
            .from('retailers')
            .update({
            first_name: firstName,
            last_name: lastName,
            shop_name: shopName,
            shop_url: shopUrl,
            shop_type: normalizeShopType(shopType)
        })
            .eq('email', authUser.user.email)
            .select('id, first_name, last_name, shop_name, shop_url, shop_type, domains')
            .single();
        if (retailerError) {
            throw retailerError;
        }
        const domainsArray = Object.entries(retailer.domains || {}).map(([domainUrl, meta]) => {
            let category;
            let name;
            if (typeof meta === 'string') {
                category = meta;
            }
            else if (meta && typeof meta === 'object') {
                const m = meta;
                category = typeof m.category === 'string' ? m.category : undefined;
                name = typeof m.name === 'string' ? m.name : undefined;
            }
            return {
                id: String(domainUrl),
                domain: String(domainUrl),
                category: String((category || 'FASHION')),
                name,
                isActive: true
            };
        });
        res.json({
            success: true,
            message: 'Profiel succesvol bijgewerkt',
            data: {
                id: retailer.id,
                firstName: retailer.first_name,
                lastName: retailer.last_name,
                shopName: retailer.shop_name,
                shopUrl: retailer.shop_url,
                shopType: retailer.shop_type,
                domains: domainsArray
            }
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }
    }
});
router.post('/retailer/close', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ success: false, message: 'No token provided' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({ success: false, message: 'Invalid token' });
            return;
        }
        const reasonRaw = typeof req.body?.reason === 'string' ? req.body.reason : null;
        const reason = reasonRaw && reasonRaw.trim() ? reasonRaw.trim().slice(0, 500) : null;
        const now = new Date().toISOString();
        const { data: retailer, error: updErr } = await supabase_1.supabaseAdmin
            .from('retailers')
            .update({
            is_active: false,
            deactivated_at: now,
            close_reason: reason,
            updated_at: now
        })
            .eq('auth_id', userId)
            .select('id, email, deactivated_at, close_reason')
            .single();
        if (updErr) {
            res.status(500).json({ success: false, message: 'Kon account niet opheffen', error: updErr.message });
            return;
        }
        try {
            void sendRetailerClosure(retailer || { email: authUser.user.email, deactivated_at: now, close_reason: reason });
        }
        catch { }
        try {
            res.clearCookie('fit_session', { path: '/' });
            res.clearCookie('fit_token', { path: '/' });
        }
        catch { }
        res.json({ success: true, message: 'Account opgeheven', data: { deactivated_at: retailer?.deactivated_at || now } });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ success: false, message: 'Invalid token' });
            return;
        }
        res.status(500).json({ success: false, message: 'Interne fout bij opheffen' });
    }
});
router.post('/facebook/deletion', async (req, res) => {
    try {
        const signedRequest = (req.body && (req.body.signed_request || req.body.signedRequest));
        if (!signedRequest) {
            res.status(400).json({ error: 'Missing signed_request' });
            return;
        }
        const secret = process.env.FACEBOOK_APP_SECRET || process.env.FB_APP_SECRET || '';
        if (!secret) {
            res.status(500).json({ error: 'FACEBOOK_APP_SECRET is not configured' });
            return;
        }
        const [encodedSig, payload] = signedRequest.split('.', 2);
        if (!encodedSig || !payload) {
            res.status(400).json({ error: 'Invalid signed_request format' });
            return;
        }
        const base64urlToBuffer = (str) => Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        const sig = base64urlToBuffer(encodedSig);
        const expected = crypto_1.default.createHmac('sha256', secret).update(payload).digest();
        if (sig.length !== expected.length || !crypto_1.default.timingSafeEqual(sig, expected)) {
            res.status(400).json({ error: 'Bad signature' });
            return;
        }
        const data = JSON.parse(base64urlToBuffer(payload).toString('utf8')) || {};
        const userId = String(data.user_id || data.userId || 'unknown');
        const confirmationCode = crypto_1.default.createHash('sha256').update(userId + ':' + Date.now()).digest('hex').slice(0, 32);
        const clientBase = process.env.CLIENT_URL || 'http://localhost:5173';
        const statusUrl = `${clientBase}/privacy#facebook-data-deletion`;
        res.json({ url: statusUrl, confirmation_code: confirmationCode });
    }
    catch (e) {
        console.error('Facebook data deletion callback error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});
router.get('/facebook/deletion-status', async (_req, res) => {
    res.json({
        status: 'received',
        info: 'If the provided user identifier exists in our records, associated data will be deleted in accordance with our privacy policy.'
    });
});
router.post('/mint-widget-token', auth_1.authenticateToken, async (req, res) => {
    try {
        const u = req.user;
        if (!u || !u.id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const role = u.role === 'retailer' ? 'retailer' : 'user';
        const email = u.email || '';
        const token = jsonwebtoken_1.default.sign({ userId: u.id, email, userType: role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        const userOut = { id: u.id, email, role };
        if (u.first_name)
            userOut.firstName = u.first_name;
        if (u.last_name)
            userOut.lastName = u.last_name;
        res.json({ success: true, token, user: userOut });
    }
    catch {
        res.status(500).json({ success: false, message: 'Failed to mint token' });
    }
});
exports.default = router;
//# sourceMappingURL=authSupabase.js.map