"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const supabase_1 = require("../lib/supabase");
const emailService_1 = require("../services/emailService");
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-08-16'
});
const emailService = new emailService_1.EmailService();
function buildPricePlanMap() {
    const map = {};
    const pairs = [
        [process.env.STRIPE_PRICE_BASIC_MONTHLY, { plan: 'basic', included: 500 }],
        [process.env.STRIPE_PRICE_BASIC_YEARLY, { plan: 'basic', included: 500 }],
        [process.env.STRIPE_PRICE_BASIC_MONTH, { plan: 'basic', included: 500 }],
        [process.env.STRIPE_PRICE_BASIC_YEAR, { plan: 'basic', included: 500 }],
        [process.env.STRIPE_PRICE_PREMIUM_MONTHLY, { plan: 'premium', included: 2500 }],
        [process.env.STRIPE_PRICE_PREMIUM_YEARLY, { plan: 'premium', included: 2500 }],
        [process.env.STRIPE_PRICE_PREMIUM_MONTH, { plan: 'premium', included: 2500 }],
        [process.env.STRIPE_PRICE_PREMIUM_YEAR, { plan: 'premium', included: 2500 }],
        [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, { plan: 'enterprise', included: 2500 }],
        [process.env.STRIPE_PRICE_ENTERPRISE_YEARLY, { plan: 'enterprise', included: 2500 }],
    ];
    for (const [priceId, cfg] of pairs) {
        if (priceId)
            map[String(priceId)] = cfg;
    }
    return map;
}
const PRICE_TO_PLAN = buildPricePlanMap();
function toUpperPlan(p) {
    if (!p)
        return null;
    const u = String(p).toUpperCase();
    return (u === 'BASIC' || u === 'PREMIUM' || u === 'ENTERPRISE') ? u : null;
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
    return uat || undefined;
};
const sendRetailerPlanChange = async (retailer, subscription) => {
    const url = resolveRetailerSignupWebhookUrl();
    if (!url)
        return;
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.N8N_API_KEY)
        headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
    const timeout = parseInt(String(process.env.N8N_TIMEOUT_MS || 10000), 10) || 10000;
    const payload = {
        email: retailer?.email || null,
        firstName: retailer?.first_name || null,
        lastName: retailer?.last_name || null,
        subscription: String(subscription || '').toUpperCase()
    };
    try {
        try {
            const u = new URL(url);
            const safe = `${u.origin}${u.pathname}`;
            console.info('[Webhook] Retailer plan: POST', safe, { email: payload.email, subscription: payload.subscription });
        }
        catch { }
        await axios_1.default.post(url, payload, { headers, timeout });
        console.info('[Webhook] Retailer plan: delivered');
    }
    catch (e) {
        console.warn('Retailer plan webhook failed:', e?.message || e);
    }
};
async function includedFromConfig(plan) {
    const fallback = (pl) => {
        if (pl === 'BASIC')
            return 500;
        if (pl === 'PREMIUM')
            return 2500;
        if (pl === 'ENTERPRISE')
            return 2500;
        return 50;
    };
    try {
        const { data: sys } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', 'SYSTEM')
            .maybeSingle();
        const plans = sys?.settings?.subscriptionPlans || {};
        const cfg = plans[plan || 'STARTER'] || {};
        const val = parseInt(String(cfg.included ?? fallback(plan)), 10);
        return Number.isFinite(val) ? Math.max(0, val) : fallback(plan);
    }
    catch {
        return fallback(plan);
    }
}
async function ensureCreditRow(retailerId, included) {
    try {
        await supabase_1.supabaseAdmin.rpc('ensure_credit_row', { _retailer: retailerId, _included: included || 0 });
    }
    catch (e) {
        console.warn('ensure_credit_row failed (non-fatal):', e);
    }
}
async function creditBundle(retailerId, delta, paymentIntentId) {
    await ensureCreditRow(retailerId, 0);
    const d = new Date();
    const month = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const { data: row } = await supabase_1.supabaseAdmin
        .from('fit_credits')
        .select('purchased')
        .eq('retailer_id', retailerId)
        .eq('period_month', month)
        .maybeSingle();
    const purchased = (row?.purchased || 0) + (delta || 0);
    await supabase_1.supabaseAdmin
        .from('fit_credits')
        .update({ purchased, updated_at: new Date().toISOString() })
        .eq('retailer_id', retailerId)
        .eq('period_month', month);
    await supabase_1.supabaseAdmin.from('fit_credit_events').insert({
        retailer_id: retailerId,
        period_month: month,
        delta: Number(delta || 0),
        source: 'bundle',
        stripe_payment_intent: paymentIntentId || null,
    });
}
async function creditUpgradeIncluded(retailerId, delta, subscriptionId) {
    await ensureCreditRow(retailerId, 0);
    const d = new Date();
    const month = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const { data: row } = await supabase_1.supabaseAdmin
        .from('fit_credits')
        .select('included')
        .eq('retailer_id', retailerId)
        .eq('period_month', month)
        .maybeSingle();
    const currentIncl = Number(row?.included || 0);
    const newIncl = currentIncl + Number(delta || 0);
    await supabase_1.supabaseAdmin
        .from('fit_credits')
        .update({ included: newIncl, updated_at: new Date().toISOString() })
        .eq('retailer_id', retailerId)
        .eq('period_month', month);
    try {
        await supabase_1.supabaseAdmin.from('fit_credit_events').insert({
            retailer_id: retailerId,
            period_month: month,
            delta: Number(delta || 0),
            source: 'upgrade'
        });
    }
    catch { }
}
router.post('/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).send('Webhook signature verification failed');
        return;
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.mode === 'payment') {
                    await handleBundleCheckoutCompleted(session);
                }
                else if (session.mode === 'subscription') {
                    await handleCheckoutSessionCompleted(session);
                }
                break;
            }
            case 'invoice.finalized':
                break;
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                await handlePaymentSucceeded(invoice);
                try {
                    if (invoice.billing_reason === 'subscription_create') {
                        await sendWelcomeInvoiceEmail(invoice);
                    }
                }
                catch (e) {
                    console.error('Failed to send welcome invoice email:', e);
                }
                break;
            }
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            case 'payment_intent.succeeded':
            case 'payment_intent.payment_failed':
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpsert(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook handler error:', error);
        res.json({ received: true, error: 'logged' });
    }
});
async function sendWelcomeInvoiceEmail(invoice) {
    try {
        let email = invoice.customer_email || null;
        let firstName = null;
        let emailSource = email ? 'invoice' : 'unknown';
        if (!email) {
            try {
                const stripeCustomerId = invoice.customer || undefined;
                if (stripeCustomerId) {
                    const { data: subRow } = await supabase_1.supabaseAdmin
                        .from('subscriptions')
                        .select('retailer_id')
                        .eq('stripe_customer_id', stripeCustomerId)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    const retailerId = subRow?.retailer_id;
                    if (retailerId) {
                        const { data: retailer } = await supabase_1.supabaseAdmin
                            .from('retailers')
                            .select('email, first_name')
                            .eq('id', retailerId)
                            .maybeSingle();
                        if (retailer && retailer.email) {
                            email = String(retailer.email);
                            if (retailer.first_name) {
                                firstName = String(retailer.first_name);
                            }
                            emailSource = 'db_fallback';
                        }
                    }
                }
            }
            catch (fallbackErr) {
                console.warn('[sendWelcomeInvoiceEmail] Fallback retailer lookup failed', fallbackErr);
            }
        }
        if (!email) {
            console.warn('[sendWelcomeInvoiceEmail] Missing customer email for invoice', invoice.id);
            return;
        }
        console.log('[sendWelcomeInvoiceEmail] Using customer email source', { invoiceId: invoice.id, source: emailSource });
        const fullName = invoice.customer_name || '';
        const effectiveFirst = (firstName || fullName.split(' ')[0] || '').trim();
        const safeFirst = effectiveFirst || 'daar';
        const line = invoice.lines?.data?.[0];
        const planTypeRaw = invoice.metadata?.planType || line?.plan?.nickname || 'BASIC';
        const planType = String(planTypeRaw).toUpperCase();
        const intervalRaw = line?.plan?.interval || 'month';
        const interval = intervalRaw === 'year' ? 'year' : 'month';
        const baseLabel = planType === 'BASIC' ? 'BASIC' : planType;
        const suffix = interval === 'year' ? 'jaarabonnement' : 'maandabonnement';
        const planLabel = `${baseLabel} ${suffix}`;
        const dashboardUrl = process.env.CLIENT_URL
            ? `${process.env.CLIENT_URL.replace(/\/?$/, '')}/retailer/abonnement/payments`
            : 'https://fit.brendr.io/retailer/abonnement/payments';
        let attachment = [];
        if (invoice.invoice_pdf) {
            try {
                const resp = await axios_1.default.get(invoice.invoice_pdf, { responseType: 'arraybuffer', timeout: 20000 });
                const buf = Buffer.from(resp.data);
                const content = buf.toString('base64');
                const filename = `factuur-${invoice.number || invoice.id}.pdf`;
                attachment = [{ content, name: filename }];
            }
            catch (e) {
                console.warn('[sendWelcomeInvoiceEmail] Failed to download invoice_pdf', invoice.id, e);
            }
        }
        const subject = `Welkom bij FiT – je ${planLabel} is actief ✅`;
        const textBody = `Hoi ${safeFirst},\n\nBedankt voor je aanmelding bij FiT by BrendR.\n\nJe ${planLabel} is succesvol geactiveerd.\nVanaf nu kun je de FiT-widget gebruiken om bezoekers in jouw webshop te helpen zien hoe producten in hun situatie staan.\n\nFactuur\nIn de bijlage vind je de factuur van deze betaling als PDF.\nJe kunt je facturen later altijd terugvinden in je FiT-dashboard onder Abonnement → Facturen & betalingen.\n\nAan de slag\nLog in op je dashboard: ${dashboardUrl}\nVoeg (of controleer) je webshop(s)\nVolg de stappen om de FiT-widget te plaatsen op je site\n\nKom je er ergens niet uit?\nReageer gerust op deze e-mail of mail ons op support@brendr.io.\n\nHartelijke groet,\nHet FiT by BrendR team`;
        const htmlBody = `<!doctype html><html lang="nl"><body style="margin:0; padding:0; background:#f5f5f7;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7; padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:32px; font-family:Arial, sans-serif;"><tr><td align="left"><div style="font-size:18px; font-weight:bold; color:#ff8a00; margin-bottom:16px;">FiT by BrendR</div><h1 style="font-size:24px; color:#111827; margin:0 0 16px;">Welkom bij FiT, ${safeFirst}!</h1><p style="font-size:15px; color:#374151; line-height:1.5; margin:0 0 12px;">Bedankt voor je aanmelding bij <strong>FiT by BrendR</strong>.</p><p style="font-size:15px; color:#374151; line-height:1.5; margin:0 0 20px;">Je <strong>${planLabel}</strong> is succesvol geactiveerd. Vanaf nu kun je de FiT-widget gebruiken om bezoekers in jouw webshop te helpen zien hoe producten in hun situatie staan.</p><hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" /><h2 style="font-size:18px; color:#111827; margin:0 0 8px;">📄 Factuur</h2><p style="font-size:15px; color:#374151; line-height:1.5; margin:0 0 16px;">In de bijlage vind je de factuur van deze betaling als PDF.<br />Later kun je al je facturen terugvinden via je FiT-dashboard onder <strong>Abonnement → Facturen &amp; betalingen</strong>.</p><h2 style="font-size:18px; color:#111827; margin:0 0 8px;">🚀 Aan de slag met FiT</h2><ol style="font-size:15px; color:#374151; line-height:1.6; padding-left:20px; margin:0 0 16px;"><li>Log in op je dashboard via de knop hieronder.</li><li>Controleer of je webshop(s) goed zijn ingesteld.</li><li>Volg de instructies om de FiT-widget op je webshop te plaatsen.</li></ol><p style="margin:0 0 24px;"><a href="${dashboardUrl}" style="display:inline-block; background:#0074dd; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; font-size:15px; font-weight:600;">Open FiT dashboard</a></p><p style="font-size:13px; color:#6b7280; line-height:1.5; margin:0 0 4px;">Hulp nodig? Reageer op deze e-mail of mail ons op <a href="mailto:support@brendr.io" style="color:#0074dd; text-decoration:none;">support@brendr.io</a>.</p><p style="font-size:13px; color:#9ca3af; line-height:1.5; margin:16px 0 0;">Hartelijke groet,<br />Het FiT by BrendR team</p></td></tr></table><p style="font-size:11px; color:#9ca3af; margin-top:8px; font-family:Arial, sans-serif;">Je ontvangt deze e-mail omdat je een FiT abonnement hebt geactiveerd met het e-mailadres ${email}.</p></td></tr></table></body></html>`;
        const apiKey = process.env.BREVO_API_KEY || '';
        if (!apiKey) {
            console.error('BREVO_API_KEY ontbreekt; kan welcome invoice mail niet versturen');
            return;
        }
        const senderName = process.env.EMAIL_FROM_NAME || 'FiT by BrendR';
        const senderEmail = process.env.EMAIL_FROM || 'fit@brendr.io';
        const payload = {
            sender: { name: senderName, email: senderEmail },
            to: [{ email }],
            subject,
            htmlContent: htmlBody,
            textContent: textBody,
        };
        if (attachment.length) {
            payload.attachment = attachment;
        }
        await axios_1.default.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            timeout: 20000,
        });
        console.log(`[sendWelcomeInvoiceEmail] Mail verzonden naar ${email} voor invoice ${invoice.id}`);
    }
    catch (e) {
        console.error('[sendWelcomeInvoiceEmail] Fout bij versturen mail', e);
    }
}
async function handleCheckoutSessionCompleted(session) {
    const retailerId = session.metadata?.retailerId;
    const planTypeMeta = session.metadata?.planType;
    if (!retailerId) {
        console.error('Missing retailerId in checkout session metadata:', session.id);
        return;
    }
    if (session.mode !== 'subscription')
        return;
    try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id || null;
        const map = priceId ? PRICE_TO_PLAN[String(priceId)] : undefined;
        const planLower = map?.plan || (planTypeMeta ? String(planTypeMeta).toLowerCase() : null);
        const planUpper = toUpperPlan(planLower);
        const included = await includedFromConfig(planUpper);
        const cancel = !!subscription.cancel_at_period_end;
        let prevPlan = null;
        let retailerIdForWebhook = null;
        try {
            const { data: existing } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('plan_type, retailer_id')
                .eq('stripe_subscription_id', subscription.id)
                .maybeSingle();
            prevPlan = existing?.plan_type || 'STARTER';
            retailerIdForWebhook = existing?.retailer_id || null;
        }
        catch { }
        await supabase_1.supabaseAdmin
            .from('subscriptions')
            .upsert({
            retailer_id: retailerId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            status: 'ACTIVE',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            price_id: priceId,
            plan_type: planUpper || undefined,
            plan: planLower || undefined,
            included_sessions: included || undefined,
            cancel_at_period_end: cancel,
        }, { onConflict: 'stripe_subscription_id' });
        try {
            let prevPlanType = null;
            try {
                const { data: r } = await supabase_1.supabaseAdmin
                    .from('retailers')
                    .select('plan_type')
                    .eq('id', retailerId)
                    .maybeSingle();
                prevPlanType = (r && r.plan_type) ? String(r.plan_type).toUpperCase() : 'STARTER';
            }
            catch { }
            const rank = (p) => (p === 'BASIC' ? 1 : p === 'PREMIUM' ? 2 : p === 'ENTERPRISE' ? 3 : 0);
            const upgraded = rank(planUpper) > rank(prevPlanType);
            if (upgraded && (included || 0) > 0) {
                await creditUpgradeIncluded(retailerId, included || 0, subscription.id);
            }
            else {
                await ensureCreditRow(retailerId, 0);
            }
        }
        catch {
            await ensureCreditRow(retailerId, 0);
        }
        const retailer = await supabase_1.db.getRetailer(retailerId);
        if (planUpper === 'BASIC' || planUpper === 'PREMIUM') {
            try {
                void sendRetailerPlanChange(retailer, planUpper);
            }
            catch { }
        }
        console.log(`Subscription created/linked for retailer ${retailerId}: ${subscription.id}`);
    }
    catch (error) {
        console.error('Error handling checkout session completed:', error);
    }
}
async function handlePaymentSucceeded(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await supabase_1.db.updateSubscription(subscriptionId, {
            status: 'ACTIVE',
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000)
        });
        try {
            const customerId = subscription.customer;
            const { data: subRow } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('retailer_id')
                .eq('stripe_customer_id', customerId)
                .limit(1)
                .maybeSingle();
            if (subRow?.retailer_id) {
                await ensureCreditRow(String(subRow.retailer_id), 0);
            }
        }
        catch (e) {
            console.warn('Payment succeeded ensure_credit_row warn:', e);
        }
        console.log(`Payment succeeded for subscription: ${subscriptionId}`);
    }
    catch (error) {
        console.error('Error handling payment succeeded:', error);
    }
}
async function handlePaymentFailed(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    try {
        const subscription = await supabase_1.db.updateSubscription(subscriptionId, {
            status: 'PAST_DUE'
        });
        const retailer = await supabase_1.db.getRetailer(subscription.retailer_id);
        try {
            await emailService.sendPaymentFailedEmail(retailer.email, retailer.first_name);
        }
        catch (emailError) {
            console.error('Failed to send payment failed email:', emailError);
        }
        console.log(`Payment failed for subscription: ${subscriptionId}`);
    }
    catch (error) {
        console.error('Error handling payment failed:', error);
    }
}
async function handleSubscriptionUpsert(subscription) {
    try {
        let status;
        switch (subscription.status) {
            case 'active':
                status = 'ACTIVE';
                break;
            case 'canceled':
            case 'unpaid':
                status = 'CANCELED';
                break;
            case 'past_due':
                status = 'PAST_DUE';
                break;
            default: status = 'ACTIVE';
        }
        const priceId = subscription.items.data[0]?.price?.id || null;
        const map = priceId ? PRICE_TO_PLAN[String(priceId)] : undefined;
        const planLower = map?.plan || null;
        const planUpper = toUpperPlan(planLower);
        const included = await includedFromConfig(planUpper);
        const cancel = !!subscription.cancel_at_period_end;
        let prevPlan = null;
        let retailerIdForWebhook = null;
        try {
            const { data: existing } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('plan_type, retailer_id')
                .eq('stripe_subscription_id', subscription.id)
                .maybeSingle();
            prevPlan = existing?.plan_type || 'STARTER';
            retailerIdForWebhook = existing?.retailer_id || null;
        }
        catch { }
        const updatedRow = await supabase_1.db.updateSubscription(subscription.id, {
            status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            price_id: priceId,
            plan_type: planUpper || undefined,
            plan: planLower || undefined,
            included_sessions: included || undefined,
            cancel_at_period_end: cancel,
        });
        try {
            const retailerId = updatedRow?.retailer_id;
            if (retailerId && planUpper) {
                await supabase_1.supabaseAdmin
                    .from('retailers')
                    .update({ plan_type: planUpper, updated_at: new Date().toISOString() })
                    .eq('id', String(retailerId));
            }
        }
        catch (e) {
            console.warn('Failed to sync retailer plan_type from subscription:', e?.message || e);
        }
        try {
            const customerId = subscription.customer;
            const { data: subRow } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('retailer_id')
                .eq('stripe_customer_id', customerId)
                .limit(1)
                .maybeSingle();
            if (subRow?.retailer_id)
                await ensureCreditRow(String(subRow.retailer_id), 0);
        }
        catch { }
        try {
            const oldU = String(prevPlan || '').toUpperCase();
            const newU = String(planUpper || '').toUpperCase();
            if ((oldU === 'STARTER' && (newU === 'BASIC' || newU === 'PREMIUM')) || (oldU === 'BASIC' && newU === 'PREMIUM')) {
                const rid = retailerIdForWebhook || updatedRow?.retailer_id || null;
                if (rid) {
                    try {
                        const retailer = await supabase_1.db.getRetailer(String(rid));
                        try {
                            void sendRetailerPlanChange(retailer, newU);
                        }
                        catch { }
                    }
                    catch { }
                }
            }
        }
        catch { }
        console.log(`Subscription upserted: ${subscription.id} - Status: ${status} - Price: ${priceId}`);
    }
    catch (error) {
        console.error('Error handling subscription upsert:', error);
    }
}
async function handleSubscriptionDeleted(subscription) {
    try {
        const updated = await supabase_1.db.updateSubscription(subscription.id, {
            status: 'EXPIRED',
            cancel_at_period_end: false
        });
        try {
            const retailerId = updated?.retailer_id;
            if (retailerId) {
                await supabase_1.supabaseAdmin
                    .from('retailers')
                    .update({ plan_type: 'STARTER', updated_at: new Date().toISOString() })
                    .eq('id', String(retailerId));
            }
        }
        catch (e) {
            console.warn('Retailer downgrade to STARTER failed (non-fatal):', e?.message || e);
        }
        console.log(`Subscription deleted/expired: ${subscription.id}`);
    }
    catch (error) {
        console.error('Error handling subscription deleted:', error);
    }
}
async function handleBundleCheckoutCompleted(session) {
    try {
        const retailerId = session.metadata?.retailerId;
        if (!retailerId)
            return;
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        const priceId = lineItems.data[0]?.price?.id || null;
        if (!priceId)
            return;
        const bundleMap = {};
        if (process.env.STRIPE_PRICE_BUNDLE_BASIC_100)
            bundleMap[String(process.env.STRIPE_PRICE_BUNDLE_BASIC_100)] = 100;
        if (process.env.STRIPE_PRICE_BUNDLE_PREMIUM_500)
            bundleMap[String(process.env.STRIPE_PRICE_BUNDLE_PREMIUM_500)] = 500;
        if (process.env.STRIPE_PRICE_BUNDLE_ENT_1000)
            bundleMap[String(process.env.STRIPE_PRICE_BUNDLE_ENT_1000)] = 1000;
        const delta = bundleMap[String(priceId)] || 0;
        if (!delta)
            return;
        await creditBundle(retailerId, delta, session.payment_intent);
        try {
            const retailer = await supabase_1.db.getRetailer(retailerId);
            await emailService.sendPaymentSuccessEmail(retailer.email, retailer.first_name, `Bundel +${delta}`);
        }
        catch (e) {
            console.warn('Bundle confirmation email failed:', e);
        }
        console.log(`Bundle credited (+${delta}) for retailer ${retailerId}`);
    }
    catch (e) {
        console.error('Error in handleBundleCheckoutCompleted:', e);
    }
}
router.post('/n8n/fit-result', express_1.default.json(), async (req, res) => {
    try {
        const { sessionId, generatedImageUrl, status, error } = req.body;
        if (!sessionId) {
            res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
            return;
        }
        const apiKey = req.headers.authorization?.replace('Bearer ', '');
        if (process.env.N8N_API_KEY && apiKey !== process.env.N8N_API_KEY) {
            res.status(401).json({
                success: false,
                message: 'Invalid API key'
            });
            return;
        }
        const session = await supabase_1.db.getFitSession(sessionId);
        if (!session) {
            res.status(404).json({
                success: false,
                message: 'Session not found'
            });
            return;
        }
        const updates = {
            processed_at: new Date()
        };
        if (status === 'COMPLETED' && generatedImageUrl) {
            updates.status = 'COMPLETED';
            updates.generated_image_url = generatedImageUrl;
        }
        else if (status === 'FAILED' || error) {
            updates.status = 'FAILED';
        }
        const updatedSession = await supabase_1.db.updateFitSession(sessionId, updates);
        if (updates.status === 'COMPLETED' && session.user && session.retailer) {
            try {
                await emailService.sendFitSessionCompletedEmail(session.user.email, session.user.first_name);
            }
            catch (emailError) {
                console.error('Failed to send FiT completion email:', emailError);
            }
        }
        res.json({
            success: true,
            message: 'Session updated successfully',
            data: {
                sessionId: updatedSession.id,
                status: updatedSession.status
            }
        });
    }
    catch (error) {
        console.error('n8n webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.post('/n8n/fit-batch-result', express_1.default.json(), async (req, res) => {
    try {
        const { results } = req.body;
        if (!Array.isArray(results)) {
            res.status(400).json({
                success: false,
                message: 'Results must be an array'
            });
            return;
        }
        const apiKey = req.headers.authorization?.replace('Bearer ', '');
        if (process.env.N8N_API_KEY && apiKey !== process.env.N8N_API_KEY) {
            res.status(401).json({
                success: false,
                message: 'Invalid API key'
            });
            return;
        }
        const processedSessions = [];
        const emailPromises = [];
        for (const result of results) {
            const { sessionId, generatedImageUrl, status, error } = result;
            if (!sessionId)
                continue;
            try {
                const session = await supabase_1.db.getFitSession(sessionId);
                if (!session)
                    continue;
                const updates = {
                    processed_at: new Date()
                };
                if (status === 'COMPLETED' && generatedImageUrl) {
                    updates.status = 'COMPLETED';
                    updates.generated_image_url = generatedImageUrl;
                }
                else if (status === 'FAILED' || error) {
                    updates.status = 'FAILED';
                }
                const updatedSession = await supabase_1.db.updateFitSession(sessionId, updates);
                processedSessions.push(updatedSession.id);
                if (updates.status === 'COMPLETED' && session.user && session.retailer) {
                    emailPromises.push(emailService.sendFitSessionCompletedEmail(session.user.email, session.user.first_name).catch(emailError => {
                        console.error('Failed to send FiT completion email:', emailError);
                    }));
                }
            }
            catch (sessionError) {
                console.error(`Error processing session ${sessionId}:`, sessionError);
            }
        }
        if (emailPromises.length > 0) {
            Promise.all(emailPromises).catch(error => {
                console.error('Batch email sending failed:', error);
            });
        }
        res.json({
            success: true,
            message: `Processed ${processedSessions.length} sessions`,
            data: {
                processedSessions,
                totalProcessed: processedSessions.length
            }
        });
    }
    catch (error) {
        console.error('n8n batch webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhook.js.map