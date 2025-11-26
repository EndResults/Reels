-- Add reset token fields to retailers table
ALTER TABLE retailers 
ADD COLUMN reset_token TEXT,
ADD COLUMN reset_token_expires TIMESTAMPTZ;

-- Add index for faster lookups on reset tokens
CREATE INDEX idx_retailers_reset_token ON retailers(reset_token) WHERE reset_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN retailers.reset_token IS 'JWT token for password reset, valid for 1 hour';
COMMENT ON COLUMN retailers.reset_token_expires IS 'Expiration timestamp for reset token';
