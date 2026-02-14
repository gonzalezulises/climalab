"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, CampaignAnalytics } from "@/types";

// ---------------------------------------------------------------------------
// getAvailableSegments — distinct segment types/keys with n >= 5
// ---------------------------------------------------------------------------
export async function getAvailableSegments(
  campaignId: string
): Promise<ActionResult<{ department: string[]; tenure: string[]; gender: string[] }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_results")
    .select("segment_type, segment_key, respondent_count")
    .eq("campaign_id", campaignId)
    .eq("result_type", "dimension")
    .neq("segment_type", "global");

  if (error) return { success: false, error: error.message };

  const segments: { department: Set<string>; tenure: Set<string>; gender: Set<string> } = {
    department: new Set(),
    tenure: new Set(),
    gender: new Set(),
  };

  for (const row of data ?? []) {
    const st = row.segment_type as keyof typeof segments;
    if (st in segments && row.segment_key && (row.respondent_count ?? 0) >= 5) {
      segments[st].add(row.segment_key);
    }
  }

  return {
    success: true,
    data: {
      department: [...segments.department].sort(),
      tenure: [...segments.tenure].sort(),
      gender: [...segments.gender].sort(),
    },
  };
}

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
// getBenchmarkData — department comparison and gap analysis
// ---------------------------------------------------------------------------
export async function getBenchmarkData(campaignId: string): Promise<
  ActionResult<{
    overallRanking: Array<{
      department: string;
      avgScore: number;
      avgFav: number;
      n: number;
      strengths: string[];
      weaknesses: string[];
    }>;
    dimensionGaps: Array<{
      code: string;
      name: string;
      gap: number;
      best: { dept: string; score: number };
      worst: { dept: string; score: number };
    }>;
    heatmapData: Array<{
      segment_key: string;
      dimension_code: string;
      avg_score: number;
      favorability_pct: number;
      respondent_count: number;
    }>;
  }>
> {
  const heatmapResult = await getHeatmapData(campaignId);
  if (!heatmapResult.success) return { success: false, error: heatmapResult.error };

  // Filter to department segments only
  const deptData = heatmapResult.data.filter((r) => r.segment_type === "department");
  if (deptData.length === 0) {
    return {
      success: true,
      data: { overallRanking: [], dimensionGaps: [], heatmapData: [] },
    };
  }

  const departments = [...new Set(deptData.map((d) => d.segment_key))];
  const dimCodes = [...new Set(deptData.map((d) => d.dimension_code))];

  // Fetch dimension names from global results
  const supabase = await createClient();
  const { data: globalDims } = await supabase
    .from("campaign_results")
    .select("dimension_code, metadata")
    .eq("campaign_id", campaignId)
    .eq("result_type", "dimension")
    .eq("segment_type", "global");

  const dimNameMap = new Map<string, string>();
  for (const d of globalDims ?? []) {
    if (d.dimension_code) {
      dimNameMap.set(
        d.dimension_code,
        (d.metadata as { dimension_name?: string })?.dimension_name ?? d.dimension_code
      );
    }
  }

  // Build lookup: dept -> dimCode -> score
  const lookup = new Map<string, Map<string, { score: number; fav: number }>>();
  for (const d of deptData) {
    if (!lookup.has(d.segment_key)) lookup.set(d.segment_key, new Map());
    lookup.get(d.segment_key)!.set(d.dimension_code, {
      score: d.avg_score,
      fav: d.favorability_pct,
    });
  }

  // Overall ranking
  const overallRanking = departments
    .map((dept) => {
      const scores = lookup.get(dept)!;
      const allScores = [...scores.values()];
      const avgScore =
        allScores.length > 0
          ? Math.round((allScores.reduce((s, v) => s + v.score, 0) / allScores.length) * 100) / 100
          : 0;
      const avgFav =
        allScores.length > 0
          ? Math.round((allScores.reduce((s, v) => s + v.fav, 0) / allScores.length) * 10) / 10
          : 0;
      const n = deptData.find((d) => d.segment_key === dept)?.respondent_count ?? 0;

      // Sort dimensions by score for strengths/weaknesses
      const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
      const strengths = sorted.slice(0, 3).map(([code]) => dimNameMap.get(code) ?? code);
      const weaknesses = sorted
        .slice(-3)
        .reverse()
        .map(([code]) => dimNameMap.get(code) ?? code);

      return { department: dept, avgScore, avgFav, n, strengths, weaknesses };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  // Dimension gap analysis
  const dimensionGaps = dimCodes
    .map((code) => {
      let best = { dept: "", score: -Infinity };
      let worst = { dept: "", score: Infinity };

      for (const dept of departments) {
        const val = lookup.get(dept)?.get(code);
        if (!val) continue;
        if (val.score > best.score) best = { dept, score: val.score };
        if (val.score < worst.score) worst = { dept, score: val.score };
      }

      return {
        code,
        name: dimNameMap.get(code) ?? code,
        gap: Math.round((best.score - worst.score) * 100) / 100,
        best: { dept: best.dept, score: best.score },
        worst: { dept: worst.dept, score: worst.score },
      };
    })
    .sort((a, b) => b.gap - a.gap);

  return {
    success: true,
    data: {
      overallRanking,
      dimensionGaps,
      heatmapData: deptData.map((d) => ({
        segment_key: d.segment_key,
        dimension_code: d.dimension_code,
        avg_score: d.avg_score,
        favorability_pct: d.favorability_pct,
        respondent_count: d.respondent_count,
      })),
    },
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
