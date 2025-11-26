-- Cleanup retailer-level branding/promo columns now managed per shop
-- Safe idempotent migration

begin;

-- Drop columns if they exist
alter table public.retailers drop column if exists branding_hide_logo;
alter table public.retailers drop column if exists promo_enabled;
alter table public.retailers drop column if exists promo_start_date;
alter table public.retailers drop column if exists promo_end_date;

-- Best-effort: drop any indexes that may reference these columns (defensive)
-- This loop finds indexes on retailers whose definitions mention the removed columns
DO $$
DECLARE idx record;
BEGIN
  FOR idx IN 
    SELECT schemaname, tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'retailers'
      AND (
        indexdef ILIKE '%promo_enabled%'
        OR indexdef ILIKE '%promo_start_date%'
        OR indexdef ILIKE '%promo_end_date%'
        OR indexdef ILIKE '%branding_hide_logo%'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I.%I', idx.schemaname, idx.indexname);
  END LOOP;
END $$;

commit;
