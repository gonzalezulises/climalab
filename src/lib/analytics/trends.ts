import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function getWaveComparison(organizationId: string): Promise<
  ActionResult<
    Array<{
      campaign_id: string;
      campaign_name: string;
      ends_at: string;
      dimensions: Array<{ code: string; avg_score: number; favorability_pct: number }>;
    }>
  >
> {
  const supabase = await createClient();
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, ends_at")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .order("ends_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  if (!campaigns || campaigns.length === 0) return { success: true, data: [] };

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const { data: allResults, error: resultsError } = await supabase
    .from("campaign_results")
    .select("campaign_id, dimension_code, avg_score, favorability_pct")
    .in("campaign_id", campaignIds)
    .eq("result_type", "dimension")
    .eq("segment_type", "global");

  if (resultsError) return { success: false, error: resultsError.message };

  const resultsByCampaign = (allResults ?? []).reduce(
    (accumulator, result) => {
      if (!result.campaign_id || !result.dimension_code) return accumulator;
      if (!accumulator[result.campaign_id]) {
        accumulator[result.campaign_id] = [];
      }

      accumulator[result.campaign_id].push({
        code: result.dimension_code,
        avg_score: Number(result.avg_score),
        favorability_pct: Number(result.favorability_pct),
      });
      return accumulator;
    },
    {} as Record<string, Array<{ code: string; avg_score: number; favorability_pct: number }>>
  );

  const waves = campaigns.map((campaign) => ({
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    ends_at: campaign.ends_at ?? "",
    dimensions: resultsByCampaign[campaign.id] ?? [],
  }));

  return { success: true, data: waves };
}

export async function getTrendsData(organizationId: string): Promise<
  ActionResult<{
    campaigns: Array<{ id: string; name: string; ends_at: string }>;
    series: Record<string, Array<{ campaign_id: string; avg_score: number }>>;
  }>
> {
  const supabase = await createClient();
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, ends_at")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .order("ends_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  if (!campaigns || campaigns.length === 0) {
    return { success: true, data: { campaigns: [], series: {} } };
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const { data: allResults, error: resultsError } = await supabase
    .from("campaign_results")
    .select("campaign_id, dimension_code, avg_score")
    .in("campaign_id", campaignIds)
    .eq("result_type", "dimension")
    .eq("segment_type", "global");

  if (resultsError) return { success: false, error: resultsError.message };

  const series: Record<string, Array<{ campaign_id: string; avg_score: number }>> = {};

  for (const result of allResults ?? []) {
    if (!result.dimension_code || !result.campaign_id) continue;
    if (!series[result.dimension_code]) series[result.dimension_code] = [];
    series[result.dimension_code].push({
      campaign_id: result.campaign_id,
      avg_score: Number(result.avg_score),
    });
  }

  return {
    success: true,
    data: {
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        ends_at: campaign.ends_at ?? "",
      })),
      series,
    },
  };
}
