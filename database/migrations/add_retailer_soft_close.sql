-- Soft-delete ondersteuning voor retailers: auditkolommen + index
ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS close_reason TEXT;

-- Versnellen van lookups op actieve/inactieve status
CREATE INDEX IF NOT EXISTS idx_retailers_is_active ON retailers(is_active);
