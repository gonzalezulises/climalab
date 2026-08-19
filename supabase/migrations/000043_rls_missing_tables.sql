-- ============================================================
-- RLS policies for 6 tables missing coverage
-- Tables: analysis_runs, analysis_run_respondent_quality,
--         campaign_instruments, dimension_taxonomy,
--         campaign_ai_insights, campaign_ai_generation_events
-- ============================================================

-- RLS already enabled via direct ALTER TABLE execution.
-- This migration documents the policies applied.

-- 1. analysis_runs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_runs' 
    AND policyname = 'authenticated can view org analysis_runs'
  ) THEN
    CREATE POLICY "authenticated can view org analysis_runs"
      ON analysis_runs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = analysis_runs.campaign_id
          AND campaigns.organization_id = get_user_org_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_runs' 
    AND policyname = 'super_admin can manage analysis_runs'
  ) THEN
    CREATE POLICY "super_admin can manage analysis_runs"
      ON analysis_runs FOR ALL
      TO authenticated
      USING (get_user_role() = 'super_admin')
      WITH CHECK (get_user_role() = 'super_admin');
  END IF;
END $$;

-- 2. analysis_run_respondent_quality
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_run_respondent_quality' 
    AND policyname = 'authenticated can view org respondent_quality'
  ) THEN
    CREATE POLICY "authenticated can view org respondent_quality"
      ON analysis_run_respondent_quality FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM analysis_runs
          JOIN campaigns ON campaigns.id = analysis_runs.campaign_id
          WHERE analysis_runs.id = analysis_run_respondent_quality.analysis_run_id
          AND campaigns.organization_id = get_user_org_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_run_respondent_quality' 
    AND policyname = 'super_admin can manage respondent_quality'
  ) THEN
    CREATE POLICY "super_admin can manage respondent_quality"
      ON analysis_run_respondent_quality FOR ALL
      TO authenticated
      USING (get_user_role() = 'super_admin')
      WITH CHECK (get_user_role() = 'super_admin');
  END IF;
END $$;

-- 3. campaign_instruments (read-only for users, writes via trigger)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_instruments' 
    AND policyname = 'authenticated can view org campaign_instruments'
  ) THEN
    CREATE POLICY "authenticated can view org campaign_instruments"
      ON campaign_instruments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_instruments.campaign_id
          AND campaigns.organization_id = get_user_org_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_instruments' 
    AND policyname = 'super_admin can manage campaign_instruments'
  ) THEN
    CREATE POLICY "super_admin can manage campaign_instruments"
      ON campaign_instruments FOR ALL
      TO authenticated
      USING (get_user_role() = 'super_admin')
      WITH CHECK (get_user_role() = 'super_admin');
  END IF;
END $$;

-- 4. dimension_taxonomy (global read, admin write)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dimension_taxonomy' 
    AND policyname = 'authenticated can view dimension_taxonomy'
  ) THEN
    CREATE POLICY "authenticated can view dimension_taxonomy"
      ON dimension_taxonomy FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dimension_taxonomy' 
    AND policyname = 'super_admin can manage dimension_taxonomy'
  ) THEN
    CREATE POLICY "super_admin can manage dimension_taxonomy"
      ON dimension_taxonomy FOR ALL
      TO authenticated
      USING (get_user_role() = 'super_admin')
      WITH CHECK (get_user_role() = 'super_admin');
  END IF;
END $$;

-- 5. campaign_ai_insights
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_ai_insights' 
    AND policyname = 'authenticated can view org ai_insights'
  ) THEN
    CREATE POLICY "authenticated can view org ai_insights"
      ON campaign_ai_insights FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_ai_insights.campaign_id
          AND campaigns.organization_id = get_user_org_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_ai_insights' 
    AND policyname = 'org_admin can manage ai_insights'
  ) THEN
    CREATE POLICY "org_admin can manage ai_insights"
      ON campaign_ai_insights FOR ALL
      TO authenticated
      USING (
        get_user_role() IN ('super_admin', 'org_admin')
        AND EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_ai_insights.campaign_id
          AND campaigns.organization_id = get_user_org_id()
        )
      )
      WITH CHECK (
        get_user_role() IN ('super_admin', 'org_admin')
        AND EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_ai_insights.campaign_id
          AND campaigns.organization_id = get_user_org_id()
        )
      );
  END IF;
END $$;

-- 6. campaign_ai_generation_events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_ai_generation_events' 
    AND policyname = 'authenticated can view org ai_generation_events'
  ) THEN
    CREATE POLICY "authenticated can view org ai_generation_events"
      ON campaign_ai_generation_events FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_ai_generation_events.campaign_id
          AND campaigns.organization_id = get_user_org_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_ai_generation_events' 
    AND policyname = 'org_admin can insert ai_generation_events'
  ) THEN
    CREATE POLICY "org_admin can insert ai_generation_events"
      ON campaign_ai_generation_events FOR INSERT
      TO authenticated
      WITH CHECK (
        get_user_role() IN ('super_admin', 'org_admin')
        AND EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_ai_generation_events.campaign_id
          AND campaigns.organization_id = get_user_org_id()
        )
      );
  END IF;
END $$;
