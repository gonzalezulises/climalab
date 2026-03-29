CREATE TABLE IF NOT EXISTS campaign_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL,
  insight_type text NOT NULL,
  provider text,
  model text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, insight_type)
);

CREATE INDEX IF NOT EXISTS idx_campaign_ai_insights_campaign_type
  ON campaign_ai_insights(campaign_id, insight_type);
