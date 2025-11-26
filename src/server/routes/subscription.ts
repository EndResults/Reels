import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-08-16'
});
router.post('/cancel', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'retailer') {
      res.status(403).json({ success: false, message: 'Alleen retailers kunnen opzeggen' });
      return;
    }

    const retailerId = req.user.id as string;
    const providedId = (req.body?.subscriptionId as string | undefined) || undefined;

    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, current_period_end')
      .eq('retailer_id', retailerId)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!sub && !providedId) {
      res.status(404).json({ success: false, message: 'Geen actief abonnement gevonden' });
      return;
    }

    let effectiveEnd: string | null = null;
    const stripeSubId = sub?.stripe_subscription_id || (providedId?.startsWith('sub_') ? providedId : undefined);

    if (stripeSubId) {
      try {
        const updated = await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
        if (updated && updated.current_period_end) {
          effectiveEnd = new Date(updated.current_period_end * 1000).toISOString();
        }
      } catch (e: any) {
        console.warn('Stripe cancel_at_period_end failed; scheduling locally:', e?.message || e);
      }
    }

    if (!effectiveEnd && sub?.current_period_end) {
      try { effectiveEnd = new Date(sub.current_period_end as any).toISOString(); } catch { effectiveEnd = String(sub.current_period_end); }
    }

    const targetId = sub?.id || providedId;
    if (!targetId) {
      res.status(400).json({ success: false, message: 'subscriptionId ontbreekt' });
      return;
    }

    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        next_plan_type: 'STARTER',
        updated_at: new Date().toISOString()
      })
      .eq(typeof targetId === 'string' && targetId.startsWith('sub_') ? 'stripe_subscription_id' : 'id', targetId);

    res.json({ success: true, message: 'Opzegging gepland tot einde periode', data: { effectiveEnd, scheduledPlan: 'STARTER' } });
  } catch (error: any) {
    console.error('Subscription cancel error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Opzegging mislukt' });
  }
});

export default router;

router.post('/cron/run-renewal', async (req, res) => {
  try {
    const key = req.headers['x-cron-key'] as string | undefined;
    if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { error } = await supabaseAdmin.rpc('process_subscriptions_renewal');
    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }
    res.json({ success: true, message: 'Renewal job executed' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Cron run failed' });
  }
});
