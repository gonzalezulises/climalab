ALTER TABLE campaign_ai_insights
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS schema_version text,
  ADD COLUMN IF NOT EXISTS input_fingerprint text,
  ADD COLUMN IF NOT EXISTS warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE campaign_ai_insights
SET
  status = COALESCE(status, 'published'),
  prompt_version = COALESCE(prompt_version, 'legacy-v1'),
  schema_version = COALESCE(schema_version, 'legacy-v1'),
  warnings = COALESCE(warnings, '[]'::jsonb),
  validation_errors = COALESCE(validation_errors, '[]'::jsonb),
  generated_at = COALESCE(generated_at, created_at),
  published_at = COALESCE(published_at, created_at)
WHERE status IS NULL
   OR prompt_version IS NULL
   OR schema_version IS NULL
   OR generated_at IS NULL
   OR published_at IS NULL;

CREATE TABLE IF NOT EXISTS campaign_ai_generation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL,
  insight_type text NOT NULL,
  provider text,
  model text,
  prompt_version text,
  schema_version text,
  status text NOT NULL,
  error_message text,
  latency_ms integer,
  raw_excerpt text,
  input_fingerprint text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_ai_generation_events_campaign_type
  ON campaign_ai_generation_events(campaign_id, insight_type, created_at DESC);
