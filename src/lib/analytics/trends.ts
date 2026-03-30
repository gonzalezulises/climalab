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

  const waves = [];
  for (const campaign of campaigns) {
    const { data: results } = await supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, favorability_pct")
      .eq("campaign_id", campaign.id)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");

    waves.push({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      ends_at: campaign.ends_at ?? "",
      dimensions: (results ?? []).map((result) => ({
        code: result.dimension_code!,
        avg_score: Number(result.avg_score),
        favorability_pct: Number(result.favorability_pct),
      })),
    });
  }

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

  const series: Record<string, Array<{ campaign_id: string; avg_score: number }>> = {};

  for (const campaign of campaigns) {
    const { data: results } = await supabase
      .from("campaign_results")
      .select("dimension_code, avg_score")
      .eq("campaign_id", campaign.id)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");

    for (const result of results ?? []) {
      if (!result.dimension_code) continue;
      if (!series[result.dimension_code]) series[result.dimension_code] = [];
      series[result.dimension_code].push({
        campaign_id: campaign.id,
        avg_score: Number(result.avg_score),
      });
    }
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
