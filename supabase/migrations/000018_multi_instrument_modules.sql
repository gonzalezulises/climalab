-- Multi-instrument support: base + optional modules
-- Adds instrument_type to instruments and module_instrument_ids to campaigns

-- 1a. instrument_type enum + column on instruments
DO $$ BEGIN
  CREATE TYPE instrument_type AS ENUM ('base', 'module');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE instruments ADD COLUMN IF NOT EXISTS instrument_type instrument_type NOT NULL DEFAULT 'base';

UPDATE instruments SET instrument_type = 'module'
WHERE id IN (
  'b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000005'
);

-- 1b. module_instrument_ids array column on campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS module_instrument_ids uuid[] NOT NULL DEFAULT '{}';
