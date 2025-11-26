import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-08-16'
});

// Allowed client origins for redirects (supports wildcard via ALLOWED_CLIENT_HOSTS)
const allowedClientHostsRaw = (process.env.ALLOWED_CLIENT_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
function matchWildcardHost(pattern: string, host: string): boolean {
  const p = String(pattern || '').toLowerCase();
  const h = String(host || '').toLowerCase();
  if (p.startsWith('*.')) {
    const dom = p.slice(1);
    return h === p.slice(2) || h.endsWith(dom);
  }
  return h === p;
}
function isAllowedClientHost(host: string): boolean {
  const h = String(host || '').toLowerCase();
  if (!h) return false;
  if (h === 'localhost:5173') return true;
  if (/\.brendr\.io$/i.test(h)) return true;
  if (/\.up\.railway\.app$/i.test(h)) return true;
  for (const pat of allowedClientHostsRaw) {
    if (pat === '*') return true;
    if (matchWildcardHost(pat, h)) return true;
  }
  return false;
}

// Public: configuration used by frontend pricing displays
router.get('/public-plans-config', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Surrogate-Control', 'no-store');
    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const plans = (sys as any)?.settings?.subscriptionPlans || {};
    const normalize = (p: any, defInc: number, defMonthly: number | null, defYearly: number | null, defShops: number | null) => ({
      included: Math.max(0, parseInt(String(p?.included ?? defInc), 10) || defInc),
      priceMonthlyEUR: (p?.priceMonthlyEUR == null || p?.priceMonthlyEUR === '') ? defMonthly : Number(p.priceMonthlyEUR),
      priceYearlyEUR: (p?.priceYearlyEUR == null || p?.priceYearlyEUR === '') ? defYearly : Number(p.priceYearlyEUR),
      shopsLimit: ((): number | null => {
        const v = (p?.shopsLimit as any);
        if (v == null || v === '') return defShops; // null => ∞ when defShops is null
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : defShops;
      })(),
      allowSubdomains: !!(p?.allowSubdomains)
    });
    // Defaults for shopsLimit follow current public site: Starter 1, Basic 3, Premium 12, Enterprise ∞ (null)
    const STARTER = normalize(plans.STARTER, 50, 0, 0, 1);
    const BASIC = normalize(plans.BASIC, 500, 29.95, 25.0, 3);
    const PREMIUM = normalize(plans.PREMIUM, 2500, 99.0, 89.0, 12);
    const ENTERPRISE = normalize(plans.ENTERPRISE, 2500, null, null, null);
    res.json({ success: true, data: { STARTER, BASIC, PREMIUM, ENTERPRISE } });
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Surrogate-Control', 'no-store');
    res.status(200).json({ success: true, data: {
      STARTER: { included: 50, priceMonthlyEUR: 0, priceYearlyEUR: 0, shopsLimit: 1, allowSubdomains: false },
      BASIC: { included: 500, priceMonthlyEUR: 29.95, priceYearlyEUR: 25.0, shopsLimit: 3, allowSubdomains: false },
      PREMIUM: { included: 2500, priceMonthlyEUR: 99.0, priceYearlyEUR: 89.0, shopsLimit: 12, allowSubdomains: false },
      ENTERPRISE: { included: 2500, priceMonthlyEUR: null, priceYearlyEUR: null, shopsLimit: null, allowSubdomains: false }
    }});
  }
});

// Helpers
const monthStart = (): string => {
  const d = new Date();
  const m = new Date(d.getFullYear(), d.getMonth(), 1);
  return m.toISOString().slice(0, 10); // YYYY-MM-01
};

async function ensureCreditRow(retailerId: string, included: number): Promise<void> {
  try {
    await supabaseAdmin.rpc('ensure_credit_row', { _retailer: retailerId, _included: included || 0 });
  } catch (e) {
    console.warn('ensure_credit_row failed (non-fatal):', e);
  }
}

type PlanKey = 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

function resolvePriceId(planType: PlanKey, interval?: 'month' | 'year'): string | undefined {
  // Try multiple ENV conventions for robustness
  const candidates: string[] = [];
  if (interval) {
    const suf1 = interval === 'year' ? '_YEARLY' : '_MONTHLY';
    const suf2 = interval === 'year' ? '_YEAR' : '_MONTH';
    candidates.push(`STRIPE_PRICE_${planType}${suf1}`);
    candidates.push(`STRIPE_PRICE_${planType}${suf2}`);
  }
  candidates.push(`STRIPE_PRICE_${planType}`); // fallback without suffix
  for (const key of candidates) {
    const val = process.env[key as keyof NodeJS.ProcessEnv] as string | undefined;
    if (val) return val;
  }
  return undefined;
}

async function getStripeCustomerIdForRetailer(retailerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('retailer_id', retailerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data && data.stripe_customer_id) ? String(data.stripe_customer_id) : null;
}

async function getRetailerEmail(retailerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('retailers')
    .select('email')
    .eq('id', retailerId)
    .maybeSingle();
  return (data && data.email) ? String(data.email) : null;
}

// Ensure we only pass a valid Stripe customer to Checkout/Portal calls.
// If the stored customer id is invalid or missing, fall back to customer_email so Stripe creates/uses the right one for the current environment.
async function resolveCheckoutCustomer(retailerId: string, retailerEmail: string): Promise<{ customerId?: string; customerEmail?: string }> {
  try {
    const cid = await getStripeCustomerIdForRetailer(retailerId);
    if (cid) {
      try {
        const cust = await stripe.customers.retrieve(cid);
        if ((cust as any)?.id) {
          return { customerId: cid };
        }
      } catch (e: any) {
        console.warn('Invalid or mismatched Stripe customer id stored for retailer; falling back to email', {
          retailerId,
          cid,
          error: e?.message
        });
      }
    }
  } catch {}
  return { customerEmail: retailerEmail };
}

// POST /api/billing/checkout
// Body: { planType: 'BASIC' | 'PREMIUM' | 'ENTERPRISE', interval?: 'month' | 'year' }
router.post('/checkout', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers kunnen afrekenen' });
      return;
    }

    const retailerId = req.user.id;
    const retailerEmail = req.user.email;
    const { planType, interval, lang } = req.body as { planType: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'; interval?: 'month' | 'year'; lang?: string };

    const langRaw = ((req.body && (req.body as any).lang) as string | undefined) || (req.query?.lang as string | undefined) || '';
    const locale = ['nl', 'en', 'fr', 'de'].includes((langRaw || '').toLowerCase().slice(0, 2)) ? (langRaw || '').toLowerCase().slice(0, 2) as any : 'auto';

    if (!planType || !['BASIC', 'PREMIUM', 'ENTERPRISE'].includes(planType)) {
      res.status(400).json({ success: false, message: 'Ongeldig planType' });
      return;
    }

    const clientUrl = (() => {
      const o = req.headers.origin as string | undefined;
      try {
        if (o) {
          const host = new URL(o).host;
          if (isAllowedClientHost(host)) return o;
        }
      } catch {}
      return process.env.CLIENT_URL || 'http://localhost:5173';
    })();

    // Resolve price id from environment
    const priceKey = (() => {
      const suf = (interval === 'year' ? '_YEARLY' : '_MONTHLY');
      if (planType === 'BASIC') return `STRIPE_PRICE_BASIC${interval ? suf : ''}`;
      if (planType === 'PREMIUM') return `STRIPE_PRICE_PREMIUM${interval ? suf : ''}`;
      return `STRIPE_PRICE_ENTERPRISE${interval ? suf : ''}`;
    })();

    let priceId = process.env[priceKey as keyof NodeJS.ProcessEnv] as string | undefined;
    // Fallback to non-suffixed env var if monthly/yearly-specific not set
    if (!priceId) {
      const fallbackKey = `STRIPE_PRICE_${planType}`;
      priceId = process.env[fallbackKey as keyof NodeJS.ProcessEnv] as string | undefined;
    }

    if (!priceId) {
      res.status(500).json({ success: false, message: `Stripe price ID ontbreekt. Stel ${priceKey} (of STRIPE_PRICE_${planType}) in in de omgeving.` });
      return;
    }

    // Create checkout session
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
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Checkout mislukt' });
  }
});

// Alias: POST /api/billing/checkout/subscription (zelfde gedrag als /checkout)
router.post('/checkout/subscription', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers kunnen afrekenen' });
      return;
    }

    const retailerId = req.user.id;
    const retailerEmail = req.user.email;
    const { planType, interval, lang } = req.body as { planType: PlanKey; interval?: 'month' | 'year'; lang?: string };

    const langRaw2 = ((req.body && (req.body as any).lang) as string | undefined) || (req.query?.lang as string | undefined) || '';
    const locale2 = ['nl', 'en', 'fr', 'de'].includes((langRaw2 || '').toLowerCase().slice(0, 2)) ? (langRaw2 || '').toLowerCase().slice(0, 2) as any : 'auto';

    if (!planType || !['BASIC', 'PREMIUM', 'ENTERPRISE'].includes(planType)) {
      res.status(400).json({ success: false, message: 'Ongeldig planType' });
      return;
    }

    const origin = req.headers.origin as string | undefined;
    const clientUrl = (() => {
      try {
        if (origin) {
          const host = new URL(origin).host;
          if (isAllowedClientHost(host)) return origin;
        }
      } catch {}
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
  } catch (error: any) {
    console.error('Stripe subscription checkout error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Checkout mislukt' });
  }
});

// POST /api/billing/checkout/bundle
// Body: { bundlePriceId?: string }
router.post('/checkout/bundle', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers kunnen bundels kopen' });
      return;
    }

    const retailerId = req.user.id;
    const retailerEmail = req.user.email;
    const providedPriceId = (req.body?.bundlePriceId as string | undefined) || undefined;
    const langRaw3 = ((req.body && (req.body as any).lang) as string | undefined) || (req.query?.lang as string | undefined) || '';
    const locale3 = ['nl', 'en', 'fr', 'de'].includes((langRaw3 || '').toLowerCase().slice(0, 2)) ? (langRaw3 || '').toLowerCase().slice(0, 2) as any : 'auto';

    // Determine active plan and block bundle purchases for STARTER
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type, status')
      .eq('retailer_id', retailerId)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const planUpper = String((sub as any)?.plan_type || 'STARTER').toUpperCase();
    if (planUpper === 'STARTER') {
      res.status(403).json({ success: false, message: 'Starter-abonnement kan geen losse bundels kopen' });
      return;
    }

    // Determine default bundle price by active plan if not provided
    let priceId = providedPriceId;
    if (!priceId) {
      const planKey = (planUpper === 'BASIC' || planUpper === 'PREMIUM' || planUpper === 'ENTERPRISE') ? (planUpper as PlanKey) : 'BASIC';
      const map: Record<PlanKey, string[]> = {
        BASIC: ['STRIPE_PRICE_BUNDLE_BASIC_100'],
        PREMIUM: ['STRIPE_PRICE_BUNDLE_PREMIUM_500'],
        ENTERPRISE: ['STRIPE_PRICE_BUNDLE_ENT_1000']
      };
      const envKeys = map[planKey] || [];
      for (const k of envKeys) {
        const v = process.env[k as keyof NodeJS.ProcessEnv] as string | undefined;
        if (v) { priceId = v; break; }
      }
    }

    if (!priceId) {
      res.status(400).json({ success: false, message: 'bundlePriceId ontbreekt en geen standaard bundel voor je plan gevonden' });
      return;
    }

    const origin = req.headers.origin as string | undefined;
    const clientUrl = (() => {
      try {
        if (origin) {
          const host = new URL(origin).host;
          if (isAllowedClientHost(host)) return origin;
        }
      } catch {}
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
  } catch (error: any) {
    console.error('Stripe bundle checkout error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Bundle checkout mislukt' });
  }
});

// POST /api/billing/portal
router.post('/portal', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers hebben toegang tot de portal' });
      return;
    }

    const retailerId = req.user.id;
    const origin = req.headers.origin as string | undefined;
    const clientBase = (() => {
      try {
        if (origin) {
          const host = new URL(origin).host;
          if (isAllowedClientHost(host)) return origin;
        }
      } catch {}
      return process.env.CLIENT_URL || 'http://localhost:5173';
    })();
    const returnUrl = clientBase + '/retailer/billing';

    const cid = await getStripeCustomerIdForRetailer(retailerId);
    let customerId: string | null = null;
    if (cid) {
      try {
        const cust = await stripe.customers.retrieve(cid);
        if ((cust as any)?.id) customerId = cid;
      } catch (e: any) {
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
  } catch (error: any) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Portal sessie mislukt' });
  }
});

// GET /api/billing/invoices
router.get('/invoices', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers kunnen facturen bekijken' });
      return;
    }

    const retailerId = req.user.id;
    const limit = Math.min(parseInt(String(req.query.limit || '12'), 10) || 12, 24);
    const explicitCustomer = (req.query.stripeCustomerId as string | undefined) || undefined;
    let customerId = explicitCustomer || await getStripeCustomerIdForRetailer(retailerId);
    if (customerId) {
      // Validate customer
      try {
        const c = await stripe.customers.retrieve(customerId);
        if (!(c as any)?.id) customerId = null as any;
      } catch {
        customerId = null as any;
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
  } catch (error: any) {
    console.error('Fetch invoices error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Kan facturen niet ophalen' });
  }
});

// GET /api/billing/credits
router.get('/credits', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers kunnen credits bekijken' });
      return;
    }
    const retailerId = req.user.id;
    const period = monthStart();
    let { data, error } = await supabaseAdmin
      .from('v_fit_credit_balances')
      .select('*')
      .eq('retailer_id', retailerId)
      .eq('period_month', period)
      .maybeSingle();
    if (error) throw error;

    // If stored included is missing or lower than active subscription's included, raise it for current month
    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('included_sessions, status, current_period_start, current_period_end')
        .eq('retailer_id', retailerId)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const inc = Math.max(0, Number((sub as any)?.included_sessions || 0));
      const currentIncluded = Number((data as any)?.included || 0);
      if (inc > 0 && (!data || !Number.isFinite(currentIncluded) || currentIncluded < inc)) {
        await ensureCreditRow(retailerId, inc);
        const retry = await supabaseAdmin
          .from('v_fit_credit_balances')
          .select('*')
          .eq('retailer_id', retailerId)
          .eq('period_month', period)
          .maybeSingle();
        if (!retry.error && retry.data) data = retry.data as any;
        if (!data) data = { retailer_id: retailerId, period_month: period, included: inc, purchased: 0, consumed: 0, available: inc } as any;
      }

      // Abonnementsperiode puur ter informatie meesturen
      if (sub) {
        (data as any) = (data as any) || { retailer_id: retailerId, period_month: period, included: 0, purchased: 0, consumed: 0, available: 0 };
        (data as any).subscription_period_start = (sub as any).current_period_start || null;
        (data as any).subscription_period_end = (sub as any).current_period_end || null;
      }
    } catch (e) {
      console.warn('credits ensure/raise failed:', e);
    }

    res.json({
      success: true,
      data:
        data || {
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
  } catch (error: any) {
    console.error('Fetch credits error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Kan credits niet ophalen' });
  }
});
// Schedules cancellation at period end on Stripe (if subscription exists)
// and immediately sets retailer plan_type to STARTER in our DB.
router.post('/downgrade/starter', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers kunnen downgraden' });
      return;
    }

    const retailerId = req.user.id as string;
    let effectiveEnd: string | null = null;

    // Find latest ACTIVE subscription for this retailer
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, current_period_end')
      .eq('retailer_id', retailerId)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Prefer Stripe's period end if possible, but always reflect scheduled cancellation in DB
    if (sub && sub.stripe_subscription_id) {
      try {
        const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
        if (updated && updated.current_period_end) {
          effectiveEnd = new Date(updated.current_period_end * 1000).toISOString();
        }
      } catch (e: any) {
        console.warn('Stripe cancel_at_period_end failed; scheduling locally:', e?.message || e);
      }
    }

    // Fallback to current_period_end from DB if Stripe did not return it
    if (!effectiveEnd && sub?.current_period_end) {
      try { effectiveEnd = new Date(sub.current_period_end as any).toISOString(); } catch { effectiveEnd = String(sub.current_period_end); }
    }

    // Persist scheduled cancellation and next plan in our DB regardless of Stripe outcome
    if (sub?.id) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          next_plan_type: 'STARTER',
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);
    }

    // Do NOT immediately change retailer plan; keep paid plan active until effectiveEnd
    res.json({ success: true, message: 'Downgrade gepland: blijft actief tot einde periode', data: { effectiveEnd, scheduledPlan: 'STARTER' } });
  } catch (error: any) {
    console.error('Downgrade to STARTER error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Downgrade mislukt' });
  }
});

export default router;
