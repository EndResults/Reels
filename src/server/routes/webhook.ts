import express from 'express';
import Stripe from 'stripe';
import { db, supabaseAdmin } from '../lib/supabase';
import { EmailService } from '../services/emailService';
import { uploadFile } from '../lib/supabase';
import axios from 'axios';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});
const emailService = new EmailService();

// Helper: map Stripe priceId -> plan + included sessions using ENV
type PlanLower = 'basic' | 'premium' | 'enterprise';
type PlanUpper = 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

function buildPricePlanMap(): Record<string, { plan: PlanLower; included: number }> {
  const map: Record<string, { plan: PlanLower; included: number }> = {};
  const pairs: Array<[string | undefined, { plan: PlanLower; included: number }]> = [
    [process.env.STRIPE_PRICE_BASIC_MONTHLY,   { plan: 'basic',   included: 500 }],
    [process.env.STRIPE_PRICE_BASIC_YEARLY,    { plan: 'basic',   included: 500 }],
    [process.env.STRIPE_PRICE_BASIC_MONTH,     { plan: 'basic',   included: 500 }],
    [process.env.STRIPE_PRICE_BASIC_YEAR,      { plan: 'basic',   included: 500 }],
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY, { plan: 'premium', included: 2500 }],
    [process.env.STRIPE_PRICE_PREMIUM_YEARLY,  { plan: 'premium', included: 2500 }],
    [process.env.STRIPE_PRICE_PREMIUM_MONTH,   { plan: 'premium', included: 2500 }],
    [process.env.STRIPE_PRICE_PREMIUM_YEAR,    { plan: 'premium', included: 2500 }],
    // Enterprise: custom; include mapping if you add price envs
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, { plan: 'enterprise', included: 2500 }],
    [process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,  { plan: 'enterprise', included: 2500 }],
  ];
  for (const [priceId, cfg] of pairs) {
    if (priceId) map[String(priceId)] = cfg;
  }
  return map;
}
const PRICE_TO_PLAN = buildPricePlanMap();

function toUpperPlan(p?: PlanLower | string | null): PlanUpper | null {
  if (!p) return null;
  const u = String(p).toUpperCase();
  return (u === 'BASIC' || u === 'PREMIUM' || u === 'ENTERPRISE') ? (u as PlanUpper) : null;
}

// Resolve n8n webhook URL (same envs as signup)
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

// Lean plan-change webhook
const sendRetailerPlanChange = async (retailer: any, subscription: string) => {
  const url = resolveRetailerSignupWebhookUrl();
  if (!url) return;
  const headers: any = { 'Content-Type': 'application/json' };
  if (process.env.N8N_API_KEY) headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
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
    } catch {}
    await axios.post(url, payload, { headers, timeout });
    console.info('[Webhook] Retailer plan: delivered');
  } catch (e: any) {
    console.warn('Retailer plan webhook failed:', e?.message || e);
  }
};

async function includedFromConfig(plan?: PlanUpper | null): Promise<number> {
  const fallback = (pl?: PlanUpper | null) => {
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

async function ensureCreditRow(retailerId: string, included: number): Promise<void> {
  try {
    await supabaseAdmin.rpc('ensure_credit_row', { _retailer: retailerId, _included: included || 0 });
  } catch (e) {
    console.warn('ensure_credit_row failed (non-fatal):', e);
  }
}

async function creditBundle(retailerId: string, delta: number, paymentIntentId?: string): Promise<void> {
  // Ensure monthly row exists
  await ensureCreditRow(retailerId, 0);
  // Compute month key
  const d = new Date();
  const month = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  // Read current purchased
  const { data: row } = await supabaseAdmin
    .from('fit_credits')
    .select('purchased')
    .eq('retailer_id', retailerId)
    .eq('period_month', month)
    .maybeSingle();
  const purchased = (row?.purchased || 0) + (delta || 0);
  await supabaseAdmin
    .from('fit_credits')
    .update({ purchased, updated_at: new Date().toISOString() })
    .eq('retailer_id', retailerId)
    .eq('period_month', month);
  await supabaseAdmin.from('fit_credit_events').insert({
    retailer_id: retailerId,
    period_month: month,
    delta: Number(delta || 0),
    source: 'bundle',
    stripe_payment_intent: paymentIntentId || null,
  });
}

// On plan upgrade, add plan included on top of current month's included balance
async function creditUpgradeIncluded(retailerId: string, delta: number, subscriptionId?: string): Promise<void> {
  await ensureCreditRow(retailerId, 0);
  const d = new Date();
  const month = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const { data: row } = await supabaseAdmin
    .from('fit_credits')
    .select('included')
    .eq('retailer_id', retailerId)
    .eq('period_month', month)
    .maybeSingle();
  const currentIncl = Number((row as any)?.included || 0);
  const newIncl = currentIncl + Number(delta || 0);
  await supabaseAdmin
    .from('fit_credits')
    .update({ included: newIncl, updated_at: new Date().toISOString() })
    .eq('retailer_id', retailerId)
    .eq('period_month', month);
  try {
    await supabaseAdmin.from('fit_credit_events').insert({
      retailer_id: retailerId,
      period_month: month,
      delta: Number(delta || 0),
      source: 'upgrade'
    } as any);
  } catch {}
}

// Stripe webhook handler
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') {
          await handleBundleCheckoutCompleted(session);
        } else if (session.mode === 'subscription') {
          await handleCheckoutSessionCompleted(session);
        }
        break;
      }
      case 'invoice.finalized':
        // Bewust genegeerd – businesslogica wordt afgehandeld in invoice.payment_succeeded / invoice.payment_failed
        break;
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        try {
          if ((invoice.billing_reason as string | undefined) === 'subscription_create') {
            await sendWelcomeInvoiceEmail(invoice);
          }
        } catch (e) {
          console.error('Failed to send welcome invoice email:', e);
        }
        break;
      }
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        // Checkout/invoice flow handelt deze intents al af via de gekoppelde invoice events
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.json({ received: true, error: 'logged' });
  }
});

async function sendWelcomeInvoiceEmail(invoice: Stripe.Invoice): Promise<void> {
  try {
    let email: string | null = (invoice.customer_email as string | null) || null;
    let firstName: string | null = null;
    let emailSource: 'invoice' | 'db_fallback' | 'unknown' = email ? 'invoice' : 'unknown';

    // Fallback: probeer retailer uit eigen DB op te zoeken als customer_email ontbreekt
    if (!email) {
      try {
        const stripeCustomerId = (invoice.customer as string | undefined) || undefined;
        if (stripeCustomerId) {
          const { data: subRow } = await supabaseAdmin
            .from('subscriptions')
            .select('retailer_id')
            .eq('stripe_customer_id', stripeCustomerId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const retailerId = (subRow as any)?.retailer_id as string | undefined;
          if (retailerId) {
            const { data: retailer } = await supabaseAdmin
              .from('retailers')
              .select('email, first_name')
              .eq('id', retailerId)
              .maybeSingle();
            if (retailer && (retailer as any).email) {
              email = String((retailer as any).email);
              if ((retailer as any).first_name) {
                firstName = String((retailer as any).first_name);
              }
              emailSource = 'db_fallback';
            }
          }
        }
      } catch (fallbackErr) {
        console.warn('[sendWelcomeInvoiceEmail] Fallback retailer lookup failed', fallbackErr);
      }
    }

    if (!email) {
      console.warn('[sendWelcomeInvoiceEmail] Missing customer email for invoice', invoice.id);
      return;
    }

    console.log('[sendWelcomeInvoiceEmail] Using customer email source', { invoiceId: invoice.id, source: emailSource });

    const fullName = (invoice.customer_name as string | null) || '';
    const effectiveFirst = (firstName || fullName.split(' ')[0] || '').trim();
    const safeFirst = effectiveFirst || 'daar';

    const line = invoice.lines?.data?.[0];
    const planTypeRaw = (invoice.metadata?.planType as string | undefined) || (line?.plan?.nickname as string | undefined) || 'BASIC';
    const planType = String(planTypeRaw).toUpperCase();
    const intervalRaw = (line?.plan?.interval as string | undefined) || 'month';
    const interval = intervalRaw === 'year' ? 'year' : 'month';

    const baseLabel = planType === 'BASIC' ? 'BASIC' : planType;
    const suffix = interval === 'year' ? 'jaarabonnement' : 'maandabonnement';
    const planLabel = `${baseLabel} ${suffix}`;

    const dashboardUrl = process.env.CLIENT_URL
      ? `${process.env.CLIENT_URL.replace(/\/?$/, '')}/retailer/abonnement/payments`
      : 'https://fit.brendr.io/retailer/abonnement/payments';

    let attachment: any[] = [];
    if (invoice.invoice_pdf) {
      try {
        const resp = await axios.get<ArrayBuffer>(invoice.invoice_pdf, { responseType: 'arraybuffer', timeout: 20000 });
        const buf = Buffer.from(resp.data);
        const content = buf.toString('base64');
        const filename = `factuur-${invoice.number || invoice.id}.pdf`;
        attachment = [{ content, name: filename }];
      } catch (e) {
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

    const payload: any = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject,
      htmlContent: htmlBody,
      textContent: textBody,
    };
    if (attachment.length) {
      (payload as any).attachment = attachment;
    }

    await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      timeout: 20000,
    });
    console.log(`[sendWelcomeInvoiceEmail] Mail verzonden naar ${email} voor invoice ${invoice.id}`);
  } catch (e) {
    console.error('[sendWelcomeInvoiceEmail] Fout bij versturen mail', e);
  }
}

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const retailerId = session.metadata?.retailerId as string | undefined;
  const planTypeMeta = session.metadata?.planType as string | undefined;
  if (!retailerId) {
    console.error('Missing retailerId in checkout session metadata:', session.id);
    return;
  }
  if (session.mode !== 'subscription') return;

  try {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0]?.price?.id || null;
    const map = priceId ? PRICE_TO_PLAN[String(priceId)] : undefined;
    const planLower: PlanLower | null = map?.plan || (planTypeMeta ? (String(planTypeMeta).toLowerCase() as PlanLower) : null);
    const planUpper: PlanUpper | null = toUpperPlan(planLower);
    const included = await includedFromConfig(planUpper);
    const cancel = !!subscription.cancel_at_period_end;

    // Read previous plan before we overwrite the row, so we can detect an upgrade transition
    let prevPlan: string | null = null;
    let retailerIdForWebhook: string | null = null;
    try {
      const { data: existing } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_type, retailer_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();
      prevPlan = (existing as any)?.plan_type || 'STARTER';
      retailerIdForWebhook = (existing as any)?.retailer_id || null;
    } catch {}

    // Create subscription record (or update if exists)
    await supabaseAdmin
      .from('subscriptions')
      .upsert({
        retailer_id: retailerId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: 'ACTIVE',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        price_id: priceId,
        plan_type: planUpper || undefined,
        plan: planLower || undefined,
        included_sessions: included || undefined,
        cancel_at_period_end: cancel,
      }, { onConflict: 'stripe_subscription_id' });

    // Detect upgrade vs previous retailer plan; on upgrade, add included on top for current month
    try {
      let prevPlanType: PlanUpper | null = null;
      try {
        const { data: r } = await supabaseAdmin
          .from('retailers')
          .select('plan_type')
          .eq('id', retailerId)
          .maybeSingle();
        prevPlanType = (r && (r as any).plan_type) ? String((r as any).plan_type).toUpperCase() as any : 'STARTER';
      } catch {}
      const rank = (p?: string | null) => (p === 'BASIC' ? 1 : p === 'PREMIUM' ? 2 : p === 'ENTERPRISE' ? 3 : 0);
      const upgraded = rank(planUpper) > rank(prevPlanType);
      if (upgraded && (included || 0) > 0) {
        await creditUpgradeIncluded(retailerId, included || 0, subscription.id);
      } else {
        await ensureCreditRow(retailerId, 0);
      }
    } catch {
      // Fallback to ensuring row only
      await ensureCreditRow(retailerId, 0);
    }

    const retailer = await db.getRetailer(retailerId);
    if (planUpper === 'BASIC' || planUpper === 'PREMIUM') {
      try { void sendRetailerPlanChange(retailer, planUpper); } catch {}
    }
    console.log(`Subscription created/linked for retailer ${retailerId}: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  try {
    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    // Update subscription record
    await db.updateSubscription(subscriptionId, {
      status: 'ACTIVE',
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000)
    });

    // Ensure monthly credit row exists (do not overwrite current included)
    try {
      const customerId = subscription.customer as string;
      const { data: subRow } = await supabaseAdmin
        .from('subscriptions')
        .select('retailer_id')
        .eq('stripe_customer_id', customerId)
        .limit(1)
        .maybeSingle();
      if (subRow?.retailer_id) {
        await ensureCreditRow(String(subRow.retailer_id), 0);
      }
    } catch (e) {
      console.warn('Payment succeeded ensure_credit_row warn:', e);
    }

    console.log(`Payment succeeded for subscription: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  try {
    // Update subscription status
    const subscription = await db.updateSubscription(subscriptionId, {
      status: 'PAST_DUE'
    });

    // Get retailer for email
    const retailer = await db.getRetailer(subscription.retailer_id);
    // Send payment failed email
    try {
      await emailService.sendPaymentFailedEmail(
        retailer.email,
        retailer.first_name
      );
    } catch (emailError) {
      console.error('Failed to send payment failed email:', emailError);
    }

    console.log(`Payment failed for subscription: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  try {
    let status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
    switch (subscription.status) {
      case 'active': status = 'ACTIVE'; break;
      case 'canceled':
      case 'unpaid': status = 'CANCELED'; break;
      case 'past_due': status = 'PAST_DUE'; break;
      default: status = 'ACTIVE';
    }

    const priceId = subscription.items.data[0]?.price?.id || null;
    const map = priceId ? PRICE_TO_PLAN[String(priceId)] : undefined;
    const planLower: PlanLower | null = map?.plan || null;
    const planUpper: PlanUpper | null = toUpperPlan(planLower);
    const included = await includedFromConfig(planUpper);
    const cancel = !!subscription.cancel_at_period_end;

    // Read previous plan before updating, to detect upgrade transitions
    let prevPlan: string | null = null;
    let retailerIdForWebhook: string | null = null;
    try {
      const { data: existing } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_type, retailer_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();
      prevPlan = (existing as any)?.plan_type || 'STARTER';
      retailerIdForWebhook = (existing as any)?.retailer_id || null;
    } catch {}

    const updatedRow = await db.updateSubscription(subscription.id, {
      status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      price_id: priceId,
      plan_type: planUpper || undefined,
      plan: planLower || undefined,
      included_sessions: included || undefined,
      cancel_at_period_end: cancel,
    });

    // Update retailer profile plan_type to reflect active subscription plan
    try {
      const retailerId = (updatedRow as any)?.retailer_id;
      if (retailerId && planUpper) {
        await supabaseAdmin
          .from('retailers')
          .update({ plan_type: planUpper, updated_at: new Date().toISOString() })
          .eq('id', String(retailerId));
      }
    } catch (e) {
      console.warn('Failed to sync retailer plan_type from subscription:', (e as any)?.message || e);
    }

    // Ensure credit row exists (do not overwrite current month's included)
    try {
      const customerId = subscription.customer as string;
      const { data: subRow } = await supabaseAdmin
        .from('subscriptions')
        .select('retailer_id')
        .eq('stripe_customer_id', customerId)
        .limit(1)
        .maybeSingle();
      if (subRow?.retailer_id) await ensureCreditRow(String(subRow.retailer_id), 0);
    } catch {}

    try {
      const oldU = String(prevPlan || '').toUpperCase();
      const newU = String(planUpper || '').toUpperCase();
      if ((oldU === 'STARTER' && (newU === 'BASIC' || newU === 'PREMIUM')) || (oldU === 'BASIC' && newU === 'PREMIUM')) {
        const rid = retailerIdForWebhook || (updatedRow as any)?.retailer_id || null;
        if (rid) {
          try {
            const retailer = await db.getRetailer(String(rid));
            try { void sendRetailerPlanChange(retailer, newU); } catch {}
          } catch {}
        }
      }
    } catch {}

    console.log(`Subscription upserted: ${subscription.id} - Status: ${status} - Price: ${priceId}`);
  } catch (error) {
    console.error('Error handling subscription upsert:', error);
  }
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Mark this subscription as expired locally and reset cancel flag
    const updated = await db.updateSubscription(subscription.id, {
      status: 'EXPIRED',
      cancel_at_period_end: false
    });

    // Downgrade retailer to STARTER at end-of-period (deletion implies period ended when cancel_at_period_end was set)
    try {
      const retailerId = (updated as any)?.retailer_id;
      if (retailerId) {
        await supabaseAdmin
          .from('retailers')
          .update({ plan_type: 'STARTER', updated_at: new Date().toISOString() })
          .eq('id', String(retailerId));
      }
    } catch (e) {
      console.warn('Retailer downgrade to STARTER failed (non-fatal):', (e as any)?.message || e);
    }

    console.log(`Subscription deleted/expired: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Handle bundle purchase via Checkout Session (mode: 'payment')
async function handleBundleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const retailerId = session.metadata?.retailerId as string | undefined;
    if (!retailerId) return;

    // Determine purchased bundle by price id
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
    const priceId = lineItems.data[0]?.price?.id || null;
    if (!priceId) return;

    const bundleMap: Record<string, number> = {};
    if (process.env.STRIPE_PRICE_BUNDLE_BASIC_100) bundleMap[String(process.env.STRIPE_PRICE_BUNDLE_BASIC_100)] = 100;
    if (process.env.STRIPE_PRICE_BUNDLE_PREMIUM_500) bundleMap[String(process.env.STRIPE_PRICE_BUNDLE_PREMIUM_500)] = 500;
    if (process.env.STRIPE_PRICE_BUNDLE_ENT_1000) bundleMap[String(process.env.STRIPE_PRICE_BUNDLE_ENT_1000)] = 1000;
    const delta = bundleMap[String(priceId)] || 0;
    if (!delta) return;

    await creditBundle(retailerId, delta, session.payment_intent as string | undefined);

    // Notify retailer
    try {
      const retailer = await db.getRetailer(retailerId);
      await emailService.sendPaymentSuccessEmail(
        retailer.email,
        retailer.first_name,
        `Bundel +${delta}`
      );
    } catch (e) {
      console.warn('Bundle confirmation email failed:', e);
    }

    console.log(`Bundle credited (+${delta}) for retailer ${retailerId}`);
  } catch (e) {
    console.error('Error in handleBundleCheckoutCompleted:', e);
  }
}

// n8n webhook handler for AI processing results
router.post('/n8n/fit-result', express.json(), async (req, res): Promise<void> => {
  try {
    const { sessionId, generatedImageUrl, status, error } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
      return;
    }

    // Verify API key if provided
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (process.env.N8N_API_KEY && apiKey !== process.env.N8N_API_KEY) {
      res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
      return;
    }

    // Get the session
    const session = await db.getFitSession(sessionId);
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Update session with results
    const updates: any = {
      processed_at: new Date()
    };

    if (status === 'COMPLETED' && generatedImageUrl) {
      updates.status = 'COMPLETED';
      updates.generated_image_url = generatedImageUrl;
    } else if (status === 'FAILED' || error) {
      updates.status = 'FAILED';
    }

    const updatedSession = await db.updateFitSession(sessionId, updates);

    // Send completion email if session is completed - using 2 parameters only
    if (updates.status === 'COMPLETED' && session.user && session.retailer) {
      try {
        await emailService.sendFitSessionCompletedEmail(
          session.user.email,
          session.user.first_name
        );
      } catch (emailError) {
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
  } catch (error) {
    console.error('n8n webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Batch processing webhook for multiple sessions
router.post('/n8n/fit-batch-result', express.json(), async (req, res): Promise<void> => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results)) {
      res.status(400).json({
        success: false,
        message: 'Results must be an array'
      });
      return;
    }

    // Verify API key if provided
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

      if (!sessionId) continue;

      try {
        // Get the session
        const session = await db.getFitSession(sessionId);
        if (!session) continue;

        // Update session
        const updates: any = {
          processed_at: new Date()
        };

        if (status === 'COMPLETED' && generatedImageUrl) {
          updates.status = 'COMPLETED';
          updates.generated_image_url = generatedImageUrl;
        } else if (status === 'FAILED' || error) {
          updates.status = 'FAILED';
        }

        const updatedSession = await db.updateFitSession(sessionId, updates);
        processedSessions.push(updatedSession.id);

        // Queue email for completed sessions - using 2 parameters only
        if (updates.status === 'COMPLETED' && session.user && session.retailer) {
          emailPromises.push(
            emailService.sendFitSessionCompletedEmail(
              session.user.email,
              session.user.first_name
            ).catch(emailError => {
              console.error('Failed to send FiT completion email:', emailError);
            })
          );
        }
      } catch (sessionError) {
        console.error(`Error processing session ${sessionId}:`, sessionError);
      }
    }

    // Send all emails in parallel (don't wait for completion)
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
  } catch (error) {
    console.error('n8n batch webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;