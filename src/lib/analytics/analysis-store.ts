import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

async function getCampaignAnalysisData<T>(
  campaignId: string,
  analysisType: string,
  fallback: T
): Promise<ActionResult<T>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", analysisType)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data?.data ?? fallback) as T };
}

export async function hasONAData(campaignId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("campaign_analytics")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "ona_network");

  return (count ?? 0) > 0;
}

export async function getCorrelationMatrix(
  campaignId: string
): Promise<ActionResult<Record<string, Record<string, { r: number; pValue: number; n: number }>>>> {
  return getCampaignAnalysisData(campaignId, "correlation_matrix", {});
}

export async function getEngagementDrivers(
  campaignId: string
): Promise<
  ActionResult<Array<{ code: string; name: string; r: number; pValue: number; n: number }>>
> {
  return getCampaignAnalysisData(campaignId, "engagement_drivers", []);
}

export async function getAlerts(campaignId: string): Promise<
  ActionResult<
    Array<{
      severity: string;
      type: string;
      dimension_code?: string;
      item_id?: string;
      item_text?: string;
      segment_key?: string;
      value: number;
      threshold: number;
      message: string;
    }>
  >
> {
  return getCampaignAnalysisData(campaignId, "alerts", []);
}

export async function getCategoryScores(campaignId: string): Promise<
  ActionResult<
    Array<{
      category: string;
      avg_score: number;
      favorability_pct: number;
      dimension_count: number;
    }>
  >
> {
  return getCampaignAnalysisData(campaignId, "categories", []);
}

export async function getReliabilityData(campaignId: string): Promise<
  ActionResult<
    Array<{
      dimension_code: string;
      dimension_name: string;
      alpha: number | null;
      alphaStatus: "calculated" | "insufficient_n" | "insufficient_items" | "zero_variance";
      item_count: number;
      respondent_count: number;
    }>
  >
> {
  return getCampaignAnalysisData(campaignId, "reliability", []);
}
