-- Adds promo_locales JSONB to store localized promo settings per category
-- Structure example:
-- {
--   "nl": { "video_url": "https://...", "header": "...", "body": "..." },
--   "en": { "video_url": "https://...", "header": "...", "body": "..." }
-- }

ALTER TABLE public.category_settings
  ADD COLUMN IF NOT EXISTS promo_locales jsonb;

-- Optional: validation comment
COMMENT ON COLUMN public.category_settings.promo_locales IS 'Localized promo content per category: {nl:{video_url,header,body}, en:{video_url,header,body}}';

-- No backfill needed; UI will handle empty values. Ensure rows exist for keys via owner UI before saving.
