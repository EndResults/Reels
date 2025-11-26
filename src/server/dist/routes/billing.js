"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-08-16'
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
router.get('/public-plans-config', async (_req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
        res.setHeader('CDN-Cache-Control', 'no-store');
        res.setHeader('Surrogate-Control', 'no-store');
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const plans = sys?.settings?.subscriptionPlans || {};
        const normalize = (p, defInc, defMonthly, defYearly, defShops) => ({
            included: Math.max(0, parseInt(String(p?.included ?? defInc), 10) || defInc),
            priceMonthlyEUR: (p?.priceMonthlyEUR == null || p?.priceMonthlyEUR === '') ? defMonthly : Number(p.priceMonthlyEUR),
            priceYearlyEUR: (p?.priceYearlyEUR == null || p?.priceYearlyEUR === '') ? defYearly : Number(p.priceYearlyEUR),
            shopsLimit: (() => {
                const v = p?.shopsLimit;
                if (v == null || v === '')
                    return defShops;
                const n = Number(v);
                return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : defShops;
            })(),
            allowSubdomains: !!(p?.allowSubdomains)
        });
        const STARTER = normalize(plans.STARTER, 50, 0, 0, 1);
        const BASIC = normalize(plans.BASIC, 500, 29.95, 25.0, 3);
        const PREMIUM = normalize(plans.PREMIUM, 2500, 99.0, 89.0, 12);
        const ENTERPRISE = normalize(plans.ENTERPRISE, 2500, null, null, null);
        res.json({ success: true, data: { STARTER, BASIC, PREMIUM, ENTERPRISE } });
    }
    catch (e) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
        res.setHeader('CDN-Cache-Control', 'no-store');
        res.setHeader('Surrogate-Control', 'no-store');
        res.status(200).json({ success: true, data: {
                STARTER: { included: 50, priceMonthlyEUR: 0, priceYearlyEUR: 0, shopsLimit: 1, allowSubdomains: false },
                BASIC: { included: 500, priceMonthlyEUR: 29.95, priceYearlyEUR: 25.0, shopsLimit: 3, allowSubdomains: false },
                PREMIUM: { included: 2500, priceMonthlyEUR: 99.0, priceYearlyEUR: 89.0, shopsLimit: 12, allowSubdomains: false },
                ENTERPRISE: { included: 2500, priceMonthlyEUR: null, priceYearlyEUR: null, shopsLimit: null, allowSubdomains: false }
            } });
    }
});
const monthStart = () => {
    const d = new Date();
    const m = new Date(d.getFullYear(), d.getMonth(), 1);
    return m.toISOString().slice(0, 10);
};
async function ensureCreditRow(retailerId, included) {
    try {
        await supabase_1.supabaseAdmin.rpc('ensure_credit_row', { _retailer: retailerId, _included: included || 0 });
    }
    catch (e) {
        console.warn('ensure_credit_row failed (non-fatal):', e);
    }
}
function resolvePriceId(planType, interval) {
    const candidates = [];
    if (interval) {
        const suf1 = interval === 'year' ? '_YEARLY' : '_MONTHLY';
        const suf2 = interval === 'year' ? '_YEAR' : '_MONTH';
        candidates.push(`STRIPE_PRICE_${planType}${suf1}`);
        candidates.push(`STRIPE_PRICE_${planType}${suf2}`);
    }
    candidates.push(`STRIPE_PRICE_${planType}`);
    for (const key of candidates) {
        const val = process.env[key];
        if (val)
            return val;
    }
    return undefined;
}
async function getStripeCustomerIdForRetailer(retailerId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('retailer_id', retailerId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return (data && data.stripe_customer_id) ? String(data.stripe_customer_id) : null;
}
async function getRetailerEmail(retailerId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('retailers')
        .select('email')
        .eq('id', retailerId)
        .maybeSingle();
    return (data && data.email) ? String(data.email) : null;
}
async function resolveCheckoutCustomer(retailerId, retailerEmail) {
    try {
        const cid = await getStripeCustomerIdForRetailer(retailerId);
        if (cid) {
            try {
                const cust = await stripe.customers.retrieve(cid);
                if (cust?.id) {
                    return { customerId: cid };
                }
            }
            catch (e) {
                console.warn('Invalid or mismatched Stripe customer id stored for retailer; falling back to email', {
                    retailerId,
                    cid,
                    error: e?.message
                });
            }
        }
    }
    catch { }
    return { customerEmail: retailerEmail };
}
router.post('/checkout', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers kunnen afrekenen' });
            return;
        }
        const retailerId = req.user.id;
        const retailerEmail = req.user.email;
        const { planType, interval, lang } = req.body;
        const langRaw = (req.body && req.body.lang) || req.query?.lang || '';
        const locale = ['nl', 'en', 'fr', 'de'].includes((langRaw || '').toLowerCase().slice(0, 2)) ? (langRaw || '').toLowerCase().slice(0, 2) : 'auto';
        if (!planType || !['BASIC', 'PREMIUM', 'ENTERPRISE'].includes(planType)) {
            res.status(400).json({ success: false, message: 'Ongeldig planType' });
            return;
        }
        const clientUrl = (() => {
            const o = req.headers.origin;
            try {
                if (o) {
                    const host = new URL(o).host;
                    if (isAllowedClientHost(host))
                        return o;
                }
            }
            catch { }
            return process.env.CLIENT_URL || 'http://localhost:5173';
        })();
        const priceKey = (() => {
            const suf = (interval === 'year' ? '_YEARLY' : '_MONTHLY');
            if (planType === 'BASIC')
                return `STRIPE_PRICE_BASIC${interval ? suf : ''}`;
            if (planType === 'PREMIUM')
                return `STRIPE_PRICE_PREMIUM${interval ? suf : ''}`;
            return `STRIPE_PRICE_ENTERPRISE${interval ? suf : ''}`;
        })();
        let priceId = process.env[priceKey];
        if (!priceId) {
            const fallbackKey = `STRIPE_PRICE_${planType}`;
            priceId = process.env[fallbackKey];
        }
        if (!priceId) {
            res.status(500).json({ success: false, message: `Stripe price ID ontbreekt. Stel ${priceKey} (of STRIPE_PRICE_${planType}) in in de omgeving.` });
            return;
        }
        const cust = await resolveCheckoutCustomer(retailerId, retailerEmail);
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            allow_promotion_codes: true,
            locale: locale,
            payment_method_types: ['card', 'ideal'],
            success_url: `${clientUrl}/retailer/settings?checkout=success`,
            cancel_url: `${clientUrl}/retailer/settings?checkout=cancel`,
            customer: cust.customerId,
            customer_email: cust.customerId ? undefined : cust.customerEmail,
            metadata: {
                retailerId,
                planType
            }
        });
        res.json({ success: true, url: session.url });
    }
    catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Checkout mislukt' });
    }
});
router.post('/checkout/subscription', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers kunnen afrekenen' });
            return;
        }
        const retailerId = req.user.id;
        const retailerEmail = req.user.email;
        const { planType, interval, lang } = req.body;
        const langRaw2 = (req.body && req.body.lang) || req.query?.lang || '';
        const locale2 = ['nl', 'en', 'fr', 'de'].includes((langRaw2 || '').toLowerCase().slice(0, 2)) ? (langRaw2 || '').toLowerCase().slice(0, 2) : 'auto';
        if (!planType || !['BASIC', 'PREMIUM', 'ENTERPRISE'].includes(planType)) {
            res.status(400).json({ success: false, message: 'Ongeldig planType' });
            return;
        }
        const origin = req.headers.origin;
        const clientUrl = (() => {
            try {
                if (origin) {
                    const host = new URL(origin).host;
                    if (isAllowedClientHost(host))
                        return origin;
                }
            }
            catch { }
            return process.env.CLIENT_URL || 'http://localhost:5173';
        })();
        const priceId = resolvePriceId(planType, interval);
        if (!priceId) {
            res.status(500).json({ success: false, message: `Stripe price ID ontbreekt. Stel STRIPE_PRICE_${planType}_MONTHLY/STRIPE_PRICE_${planType}_YEARLY (of *_MONTH/_YEAR) in.` });
            return;
        }
        const cust = await resolveCheckoutCustomer(retailerId, retailerEmail);
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
            locale: locale2,
            payment_method_types: ['card', 'ideal'],
            success_url: `${clientUrl}/retailer/settings?checkout=success`,
            cancel_url: `${clientUrl}/retailer/settings?checkout=cancel`,
            customer: cust.customerId,
            customer_email: cust.customerId ? undefined : cust.customerEmail,
            metadata: { retailerId, planType }
        });
        res.json({ success: true, url: session.url });
    }
    catch (error) {
        console.error('Stripe subscription checkout error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Checkout mislukt' });
    }
});
router.post('/checkout/bundle', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers kunnen bundels kopen' });
            return;
        }
        const retailerId = req.user.id;
        const retailerEmail = req.user.email;
        const providedPriceId = req.body?.bundlePriceId || undefined;
        const langRaw3 = (req.body && req.body.lang) || req.query?.lang || '';
        const locale3 = ['nl', 'en', 'fr', 'de'].includes((langRaw3 || '').toLowerCase().slice(0, 2)) ? (langRaw3 || '').toLowerCase().slice(0, 2) : 'auto';
        const { data: sub } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('plan_type, status')
            .eq('retailer_id', retailerId)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        const planUpper = String(sub?.plan_type || 'STARTER').toUpperCase();
        if (planUpper === 'STARTER') {
            res.status(403).json({ success: false, message: 'Starter-abonnement kan geen losse bundels kopen' });
            return;
        }
        let priceId = providedPriceId;
        if (!priceId) {
            const planKey = (planUpper === 'BASIC' || planUpper === 'PREMIUM' || planUpper === 'ENTERPRISE') ? planUpper : 'BASIC';
            const map = {
                BASIC: ['STRIPE_PRICE_BUNDLE_BASIC_100'],
                PREMIUM: ['STRIPE_PRICE_BUNDLE_PREMIUM_500'],
                ENTERPRISE: ['STRIPE_PRICE_BUNDLE_ENT_1000']
            };
            const envKeys = map[planKey] || [];
            for (const k of envKeys) {
                const v = process.env[k];
                if (v) {
                    priceId = v;
                    break;
                }
            }
        }
        if (!priceId) {
            res.status(400).json({ success: false, message: 'bundlePriceId ontbreekt en geen standaard bundel voor je plan gevonden' });
            return;
        }
        const origin = req.headers.origin;
        const clientUrl = (() => {
            try {
                if (origin) {
                    const host = new URL(origin).host;
                    if (isAllowedClientHost(host))
                        return origin;
                }
            }
            catch { }
            return process.env.CLIENT_URL || 'http://localhost:5173';
        })();
        const cust = await resolveCheckoutCustomer(retailerId, retailerEmail);
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: priceId, quantity: 1 }],
            locale: locale3,
            payment_method_types: ['card', 'ideal'],
            success_url: `${clientUrl}/retailer/settings?bundle=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/retailer/settings?bundle=cancel`,
            customer: cust.customerId,
            customer_email: cust.customerId ? undefined : cust.customerEmail,
            metadata: { retailerId }
        });
        res.json({ success: true, url: session.url });
    }
    catch (error) {
        console.error('Stripe bundle checkout error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Bundle checkout mislukt' });
    }
});
router.post('/portal', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers hebben toegang tot de portal' });
            return;
        }
        const retailerId = req.user.id;
        const origin = req.headers.origin;
        const clientBase = (() => {
            try {
                if (origin) {
                    const host = new URL(origin).host;
                    if (isAllowedClientHost(host))
                        return origin;
                }
            }
            catch { }
            return process.env.CLIENT_URL || 'http://localhost:5173';
        })();
        const returnUrl = clientBase + '/retailer/billing';
        const cid = await getStripeCustomerIdForRetailer(retailerId);
        let customerId = null;
        if (cid) {
            try {
                const cust = await stripe.customers.retrieve(cid);
                if (cust?.id)
                    customerId = cid;
            }
            catch (e) {
                console.warn('Invalid Stripe customer for portal, treating as not found', { retailerId, cid, error: e?.message });
            }
        }
        if (!customerId) {
            res.status(400).json({ success: false, message: 'Geen Stripe klant gevonden. Start eerst een checkout om een klant aan te maken.' });
            return;
        }
        const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl
        });
        res.json({ success: true, url: portal.url });
    }
    catch (error) {
        console.error('Stripe portal error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Portal sessie mislukt' });
    }
});
router.get('/invoices', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers kunnen facturen bekijken' });
            return;
        }
        const retailerId = req.user.id;
        const limit = Math.min(parseInt(String(req.query.limit || '12'), 10) || 12, 24);
        const explicitCustomer = req.query.stripeCustomerId || undefined;
        let customerId = explicitCustomer || await getStripeCustomerIdForRetailer(retailerId);
        if (customerId) {
            try {
                const c = await stripe.customers.retrieve(customerId);
                if (!c?.id)
                    customerId = null;
            }
            catch {
                customerId = null;
            }
        }
        if (!customerId) {
            res.json({ success: true, data: [] });
            return;
        }
        const inv = await stripe.invoices.list({ customer: customerId, limit });
        const data = inv.data.map(i => ({
            id: i.id,
            amount_due: i.amount_due,
            amount_paid: i.amount_paid,
            currency: i.currency,
            status: i.status,
            hosted_invoice_url: i.hosted_invoice_url,
            invoice_pdf: i.invoice_pdf,
            created: i.created
        }));
        res.json({ success: true, data });
    }
    catch (error) {
        console.error('Fetch invoices error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Kan facturen niet ophalen' });
    }
});
router.get('/credits', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers kunnen credits bekijken' });
            return;
        }
        const retailerId = req.user.id;
        const period = monthStart();
        let { data, error } = await supabase_1.supabaseAdmin
            .from('v_fit_credit_balances')
            .select('*')
            .eq('retailer_id', retailerId)
            .eq('period_month', period)
            .maybeSingle();
        if (error)
            throw error;
        try {
            const { data: sub } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('included_sessions, status, current_period_start, current_period_end')
                .eq('retailer_id', retailerId)
                .eq('status', 'ACTIVE')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            const inc = Math.max(0, Number(sub?.included_sessions || 0));
            const currentIncluded = Number(data?.included || 0);
            if (inc > 0 && (!data || !Number.isFinite(currentIncluded) || currentIncluded < inc)) {
                await ensureCreditRow(retailerId, inc);
                const retry = await supabase_1.supabaseAdmin
                    .from('v_fit_credit_balances')
                    .select('*')
                    .eq('retailer_id', retailerId)
                    .eq('period_month', period)
                    .maybeSingle();
                if (!retry.error && retry.data)
                    data = retry.data;
                if (!data)
                    data = { retailer_id: retailerId, period_month: period, included: inc, purchased: 0, consumed: 0, available: inc };
            }
            if (sub) {
                data = data || { retailer_id: retailerId, period_month: period, included: 0, purchased: 0, consumed: 0, available: 0 };
                data.subscription_period_start = sub.current_period_start || null;
                data.subscription_period_end = sub.current_period_end || null;
            }
        }
        catch (e) {
            console.warn('credits ensure/raise failed:', e);
        }
        res.json({
            success: true,
            data: data || {
                retailer_id: retailerId,
                period_month: period,
                included: 0,
                purchased: 0,
                consumed: 0,
                available: 0,
                subscription_period_start: null,
                subscription_period_end: null
            }
        });
    }
    catch (error) {
        console.error('Fetch credits error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Kan credits niet ophalen' });
    }
});
router.post('/downgrade/starter', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers kunnen downgraden' });
            return;
        }
        const retailerId = req.user.id;
        let effectiveEnd = null;
        const { data: sub } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('id, stripe_subscription_id, status, current_period_end')
            .eq('retailer_id', retailerId)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (sub && sub.stripe_subscription_id) {
            try {
                const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
                if (updated && updated.current_period_end) {
                    effectiveEnd = new Date(updated.current_period_end * 1000).toISOString();
                }
            }
            catch (e) {
                console.warn('Stripe cancel_at_period_end failed; scheduling locally:', e?.message || e);
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
        if (sub?.id) {
            await supabase_1.supabaseAdmin
                .from('subscriptions')
                .update({
                cancel_at_period_end: true,
                next_plan_type: 'STARTER',
                updated_at: new Date().toISOString()
            })
                .eq('id', sub.id);
        }
        res.json({ success: true, message: 'Downgrade gepland: blijft actief tot einde periode', data: { effectiveEnd, scheduledPlan: 'STARTER' } });
    }
    catch (error) {
        console.error('Downgrade to STARTER error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Downgrade mislukt' });
    }
});
exports.default = router;
//# sourceMappingURL=billing.js.map