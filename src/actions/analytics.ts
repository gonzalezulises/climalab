"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, CampaignAnalytics } from "@/types";

// ---------------------------------------------------------------------------
// getCorrelationMatrix — Pearson correlation matrix between dimensions
// ---------------------------------------------------------------------------
export async function getCorrelationMatrix(
  campaignId: string
): Promise<ActionResult<Record<string, Record<string, { r: number; pValue: number; n: number }>>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "correlation_matrix")
    .single();

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: data.data as Record<string, Record<string, { r: number; pValue: number; n: number }>>,
  };
}

// ---------------------------------------------------------------------------
// getEngagementDrivers — dimensions ranked by correlation with ENG
// ---------------------------------------------------------------------------
export async function getEngagementDrivers(
  campaignId: string
): Promise<
  ActionResult<Array<{ code: string; name: string; r: number; pValue: number; n: number }>>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "engagement_drivers")
    .single();

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: data.data as Array<{ code: string; name: string; r: number; pValue: number; n: number }>,
  };
}

// ---------------------------------------------------------------------------
// getAlerts — automatic alerts (crisis, attention, decline, risk_group)
// ---------------------------------------------------------------------------
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "alerts")
    .single();

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: data.data as Array<{
      severity: string;
      type: string;
      dimension_code?: string;
      item_id?: string;
      item_text?: string;
      segment_key?: string;
      value: number;
      threshold: number;
      message: string;
    }>,
  };
}

// ---------------------------------------------------------------------------
// getCategoryScores — average scores by dimension category
// ---------------------------------------------------------------------------
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "categories")
    .single();

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: data.data as Array<{
      category: string;
      avg_score: number;
      favorability_pct: number;
      dimension_count: number;
    }>,
  };
}

// ---------------------------------------------------------------------------
// getReliabilityData — Cronbach's alpha per dimension
// ---------------------------------------------------------------------------
export async function getReliabilityData(campaignId: string): Promise<
  ActionResult<
    Array<{
      dimension_code: string;
      dimension_name: string;
      alpha: number | null;
      item_count: number;
      respondent_count: number;
    }>
  >
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "reliability")
    .single();

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: data.data as Array<{
      dimension_code: string;
      dimension_name: string;
      alpha: number | null;
      item_count: number;
      respondent_count: number;
    }>,
  };
}

// ---------------------------------------------------------------------------
// getHeatmapData — dimension scores segmented by department (with rwg)
// ---------------------------------------------------------------------------
export async function getHeatmapData(campaignId: string): Promise<
  ActionResult<
    Array<{
      segment_key: string;
      segment_type: string;
      dimension_code: string;
      avg_score: number;
      favorability_pct: number;
      respondent_count: number;
      rwg: number | null;
    }>
  >
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_results")
    .select(
      "segment_key, segment_type, dimension_code, avg_score, favorability_pct, respondent_count, metadata"
    )
    .eq("campaign_id", campaignId)
    .eq("result_type", "dimension")
    .neq("segment_type", "global");

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data ?? []).map((r) => ({
      segment_key: r.segment_key!,
      segment_type: r.segment_type!,
      dimension_code: r.dimension_code!,
      avg_score: Number(r.avg_score),
      favorability_pct: Number(r.favorability_pct),
      respondent_count: r.respondent_count!,
      rwg: (r.metadata as { rwg?: number | null })?.rwg ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// getWaveComparison — compare all closed campaigns for an organization
// ---------------------------------------------------------------------------
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

  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, name, ends_at")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .order("ends_at", { ascending: true });

  if (campErr) return { success: false, error: campErr.message };
  if (!campaigns || campaigns.length === 0) return { success: true, data: [] };

  const waves = [];
  for (const c of campaigns) {
    const { data: results } = await supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, favorability_pct")
      .eq("campaign_id", c.id)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");

    waves.push({
      campaign_id: c.id,
      campaign_name: c.name,
      ends_at: c.ends_at ?? "",
      dimensions: (results ?? []).map((r) => ({
        code: r.dimension_code!,
        avg_score: Number(r.avg_score),
        favorability_pct: Number(r.favorability_pct),
      })),
    });
  }

  return { success: true, data: waves };
}

// ---------------------------------------------------------------------------
// getTrendsData — historical dimension scores across all closed campaigns
// ---------------------------------------------------------------------------
export async function getTrendsData(organizationId: string): Promise<
  ActionResult<{
    campaigns: Array<{ id: string; name: string; ends_at: string }>;
    series: Record<string, Array<{ campaign_id: string; avg_score: number }>>;
  }>
> {
  const supabase = await createClient();

  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, name, ends_at")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .order("ends_at", { ascending: true });

  if (campErr) return { success: false, error: campErr.message };
  if (!campaigns || campaigns.length === 0) {
    return { success: true, data: { campaigns: [], series: {} } };
  }

  const series: Record<string, Array<{ campaign_id: string; avg_score: number }>> = {};

  for (const c of campaigns) {
    const { data: results } = await supabase
      .from("campaign_results")
      .select("dimension_code, avg_score")
      .eq("campaign_id", c.id)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");

    for (const r of results ?? []) {
      if (!r.dimension_code) continue;
      if (!series[r.dimension_code]) series[r.dimension_code] = [];
      series[r.dimension_code].push({
        campaign_id: c.id,
        avg_score: Number(r.avg_score),
      });
    }
  }

  return {
    success: true,
    data: {
      campaigns: campaigns.map((c) => ({ id: c.id, name: c.name, ends_at: c.ends_at ?? "" })),
      series,
    },
  };
}
