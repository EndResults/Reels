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
router.post('/cancel', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'retailer') {
            res.status(403).json({ success: false, message: 'Alleen retailers kunnen opzeggen' });
            return;
        }
        const retailerId = req.user.id;
        const providedId = req.body?.subscriptionId || undefined;
        const { data: sub, error } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('id, stripe_subscription_id, status, current_period_end')
            .eq('retailer_id', retailerId)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error)
            throw error;
        if (!sub && !providedId) {
            res.status(404).json({ success: false, message: 'Geen actief abonnement gevonden' });
            return;
        }
        let effectiveEnd = null;
        const stripeSubId = sub?.stripe_subscription_id || (providedId?.startsWith('sub_') ? providedId : undefined);
        if (stripeSubId) {
            try {
                const updated = await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
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
        const targetId = sub?.id || providedId;
        if (!targetId) {
            res.status(400).json({ success: false, message: 'subscriptionId ontbreekt' });
            return;
        }
        await supabase_1.supabaseAdmin
            .from('subscriptions')
            .update({
            cancel_at_period_end: true,
            next_plan_type: 'STARTER',
            updated_at: new Date().toISOString()
        })
            .eq(typeof targetId === 'string' && targetId.startsWith('sub_') ? 'stripe_subscription_id' : 'id', targetId);
        res.json({ success: true, message: 'Opzegging gepland tot einde periode', data: { effectiveEnd, scheduledPlan: 'STARTER' } });
    }
    catch (error) {
        console.error('Subscription cancel error:', error);
        res.status(500).json({ success: false, message: error?.message || 'Opzegging mislukt' });
    }
});
exports.default = router;
router.post('/cron/run-renewal', async (req, res) => {
    try {
        const key = req.headers['x-cron-key'];
        if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { error } = await supabase_1.supabaseAdmin.rpc('process_subscriptions_renewal');
        if (error) {
            res.status(500).json({ success: false, message: error.message });
            return;
        }
        res.json({ success: true, message: 'Renewal job executed' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e?.message || 'Cron run failed' });
    }
});
//# sourceMappingURL=subscription.js.map