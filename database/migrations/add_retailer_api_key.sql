-- Add API key column to retailers table for widget authentication
ALTER TABLE retailers 
ADD COLUMN api_key VARCHAR(64) UNIQUE;

-- Create index for fast API key lookups
CREATE INDEX idx_retailers_api_key ON retailers(api_key);

-- Update existing retailers with generated API keys (optional - can be done via application)
-- UPDATE retailers SET api_key = encode(gen_random_bytes(32), 'hex') WHERE api_key IS NULL;
