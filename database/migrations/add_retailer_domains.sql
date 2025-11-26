-- Add domains support to retailers table for multi-domain management
-- This allows retailers to manage multiple domains with different categories

-- Add domains column as JSONB for flexible domain storage
ALTER TABLE retailers 
ADD COLUMN domains JSONB DEFAULT '{}';

-- Create index for domain queries
CREATE INDEX idx_retailers_domains ON retailers USING GIN (domains);

-- Add comments for documentation
COMMENT ON COLUMN retailers.domains IS 'JSON object storing domain URLs as keys and categories as values, e.g. {"https://shop1.com": "FASHION", "https://shop2.com": "BIKES"}';

-- Example of domains structure:
-- {
--   "https://mijnshop.nl": "FASHION",
--   "https://outlet.mijnshop.nl": "FASHION", 
--   "https://bikes.mijnshop.nl": "BIKES"
-- }
