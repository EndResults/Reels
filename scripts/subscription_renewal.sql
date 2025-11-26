-- =========================================================
-- 🔁 AUTO-RENEW & DOWNGRADE SUBSCRIPTIONS
-- Run daily via Railway Cron (00:00 UTC)
-- =========================================================

UPDATE subscriptions
SET
  status = CASE
    WHEN cancel_at_period_end AND current_period_end <= NOW() THEN 'EXPIRED'
    WHEN NOT cancel_at_period_end AND current_period_end <= NOW() THEN 'ACTIVE'
    ELSE status
  END,
  plan_type = CASE
    WHEN cancel_at_period_end AND current_period_end <= NOW() THEN COALESCE(next_plan_type, 'STARTER')
    ELSE plan_type
  END,
  current_period_start = CASE
    WHEN NOT cancel_at_period_end AND current_period_end <= NOW() THEN current_period_end
    ELSE current_period_start
  END,
  current_period_end = CASE
    WHEN NOT cancel_at_period_end AND current_period_end <= NOW() THEN current_period_end + INTERVAL '1 month'
    ELSE current_period_end
  END,
  cancel_at_period_end = CASE
    WHEN cancel_at_period_end AND current_period_end <= NOW() THEN false
    ELSE cancel_at_period_end
  END,
  updated_at = NOW()
WHERE status = 'ACTIVE';
