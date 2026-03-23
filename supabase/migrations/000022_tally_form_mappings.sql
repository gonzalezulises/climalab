-- Tally.so integration: store field mappings between Tally forms and ClimaLab items
CREATE TABLE tally_form_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tally_form_id text NOT NULL,
  tally_form_url text NOT NULL,
  tally_field_key text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('item', 'demographic', 'open_response', 'enps')),
  target_id uuid REFERENCES items(id),
  target_meta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, tally_field_key)
);

-- Index for webhook lookups
CREATE INDEX idx_tally_mappings_form_id ON tally_form_mappings(tally_form_id);

-- RLS
ALTER TABLE tally_form_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read tally mappings"
  ON tally_form_mappings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated can manage tally mappings"
  ON tally_form_mappings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Anon needs to read mappings for webhook processing (service_role bypasses RLS anyway)
CREATE POLICY "anon can read tally mappings"
  ON tally_form_mappings FOR SELECT TO anon
  USING (true);
