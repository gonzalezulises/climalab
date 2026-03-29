CREATE TABLE IF NOT EXISTS campaign_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  instrument_type instrument_type NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, instrument_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_instruments_campaign_order
  ON campaign_instruments(campaign_id, sort_order, created_at);

INSERT INTO campaign_instruments (campaign_id, instrument_id, instrument_type, sort_order)
SELECT
  campaign.id,
  campaign.instrument_id,
  'base'::instrument_type,
  0
FROM campaigns AS campaign
ON CONFLICT (campaign_id, instrument_id) DO NOTHING;

INSERT INTO campaign_instruments (campaign_id, instrument_id, instrument_type, sort_order)
SELECT
  campaign.id,
  module_ids.instrument_id,
  'module'::instrument_type,
  module_ids.ordinality
FROM campaigns AS campaign
CROSS JOIN LATERAL unnest(campaign.module_instrument_ids) WITH ORDINALITY AS module_ids(instrument_id, ordinality)
ON CONFLICT (campaign_id, instrument_id) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_campaign_instruments_from_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM campaign_instruments
  WHERE campaign_id = NEW.id;

  INSERT INTO campaign_instruments (campaign_id, instrument_id, instrument_type, sort_order)
  VALUES (NEW.id, NEW.instrument_id, 'base', 0)
  ON CONFLICT (campaign_id, instrument_id) DO NOTHING;

  IF array_length(NEW.module_instrument_ids, 1) IS NOT NULL THEN
    INSERT INTO campaign_instruments (campaign_id, instrument_id, instrument_type, sort_order)
    SELECT
      NEW.id,
      module_ids.instrument_id,
      'module'::instrument_type,
      module_ids.ordinality
    FROM unnest(NEW.module_instrument_ids) WITH ORDINALITY AS module_ids(instrument_id, ordinality)
    ON CONFLICT (campaign_id, instrument_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_campaign_instruments ON campaigns;

CREATE TRIGGER trg_sync_campaign_instruments
AFTER INSERT OR UPDATE OF instrument_id, module_instrument_ids ON campaigns
FOR EACH ROW
EXECUTE FUNCTION sync_campaign_instruments_from_campaign();

CREATE TABLE IF NOT EXISTS dimension_taxonomy (
  dimension_id uuid PRIMARY KEY REFERENCES dimensions(id) ON DELETE CASCADE,
  analytics_category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO dimension_taxonomy (dimension_id, analytics_category)
SELECT
  d.id,
  CASE
    WHEN i.instrument_type = 'module' THEN 'modulos'
    ELSE COALESCE(d.category, 'otro')
  END
FROM dimensions d
JOIN instruments i ON i.id = d.instrument_id
ON CONFLICT (dimension_id) DO UPDATE
SET
  analytics_category = EXCLUDED.analytics_category,
  updated_at = now();
