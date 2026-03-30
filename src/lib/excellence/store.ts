import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function replaceCampaignAiEvidence(
  campaignId: string,
  insightType: string,
  rows: Database["public"]["Tables"]["campaign_ai_evidence"]["Insert"][]
) {
  const supabase = await createClient();
  await supabase
    .from("campaign_ai_evidence")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("insight_type", insightType);

  if (rows.length > 0) {
    await supabase.from("campaign_ai_evidence").insert(rows);
  }
}

export async function listCampaignAiEvidence(campaignId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_ai_evidence")
    .select(
      "id, campaign_id, analysis_run_id, insight_type, claim_key, claim_text, evidence, metric_refs, dimension_codes, confidence_label, policy_warnings, created_at"
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLatestStatisticalBaseline(campaignId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analysis_statistical_baselines")
    .select(
      "id, campaign_id, analysis_run_id, comparison_scope, baseline_version, robustness_score, drift_summary, interpretation_status, interpretation_warnings, created_at"
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function insertStatisticalBaseline(
  row: Database["public"]["Tables"]["analysis_statistical_baselines"]["Insert"]
) {
  const supabase = createAdminClient();
  await supabase.from("analysis_statistical_baselines").insert(row);
}

export async function insertPipelineSloSnapshots(
  rows: Database["public"]["Tables"]["pipeline_slo_snapshots"]["Insert"][]
) {
  if (rows.length === 0) return;
  const supabase = createAdminClient();
  await supabase.from("pipeline_slo_snapshots").insert(rows);
}

export async function insertPerformanceBaseline(
  row: Database["public"]["Tables"]["performance_baselines"]["Insert"]
) {
  const supabase = createAdminClient();
  await supabase.from("performance_baselines").insert(row);
}

export async function listLatestPipelineSloSnapshots(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_slo_snapshots")
    .select(
      "id, snapshot_date, domain, slo_target, observed_success_rate, observed_latency_ms, error_budget_remaining, status, summary, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listLatestPerformanceBaselines(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("performance_baselines")
    .select("id, scope, metric_key, baseline_version, summary, observed_at")
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
