import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

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
    const segmentType = row.segment_type as keyof typeof segments;
    if (segmentType in segments && row.segment_key && (row.respondent_count ?? 0) >= 5) {
      segments[segmentType].add(row.segment_key);
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
    data: (data ?? []).map((row) => ({
      segment_key: row.segment_key!,
      segment_type: row.segment_type!,
      dimension_code: row.dimension_code!,
      avg_score: Number(row.avg_score),
      favorability_pct: Number(row.favorability_pct),
      respondent_count: row.respondent_count!,
      rwg: (row.metadata as { rwg?: number | null })?.rwg ?? null,
    })),
  };
}

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

  const departmentData = heatmapResult.data.filter((row) => row.segment_type === "department");
  if (departmentData.length === 0) {
    return {
      success: true,
      data: { overallRanking: [], dimensionGaps: [], heatmapData: [] },
    };
  }

  const departments = [...new Set(departmentData.map((row) => row.segment_key))];
  const dimensionCodes = [...new Set(departmentData.map((row) => row.dimension_code))];

  const supabase = await createClient();
  const { data: globalDimensions } = await supabase
    .from("campaign_results")
    .select("dimension_code, metadata")
    .eq("campaign_id", campaignId)
    .eq("result_type", "dimension")
    .eq("segment_type", "global");

  const dimensionNameMap = new Map<string, string>();
  for (const dimension of globalDimensions ?? []) {
    if (dimension.dimension_code) {
      dimensionNameMap.set(
        dimension.dimension_code,
        (dimension.metadata as { dimension_name?: string })?.dimension_name ??
          dimension.dimension_code
      );
    }
  }

  const lookup = new Map<string, Map<string, { score: number; fav: number }>>();
  for (const row of departmentData) {
    if (!lookup.has(row.segment_key)) lookup.set(row.segment_key, new Map());
    lookup.get(row.segment_key)!.set(row.dimension_code, {
      score: row.avg_score,
      fav: row.favorability_pct,
    });
  }

  const overallRanking = departments
    .map((department) => {
      const scores = lookup.get(department)!;
      const values = [...scores.values()];
      const avgScore =
        values.length > 0
          ? Math.round(
              (values.reduce((sum, value) => sum + value.score, 0) / values.length) * 100
            ) / 100
          : 0;
      const avgFav =
        values.length > 0
          ? Math.round((values.reduce((sum, value) => sum + value.fav, 0) / values.length) * 10) /
            10
          : 0;
      const n = departmentData.find((row) => row.segment_key === department)?.respondent_count ?? 0;
      const sorted = [...scores.entries()].sort((left, right) => right[1].score - left[1].score);

      return {
        department,
        avgScore,
        avgFav,
        n,
        strengths: sorted.slice(0, 3).map(([code]) => dimensionNameMap.get(code) ?? code),
        weaknesses: sorted
          .slice(-3)
          .reverse()
          .map(([code]) => dimensionNameMap.get(code) ?? code),
      };
    })
    .sort((left, right) => right.avgScore - left.avgScore);

  const dimensionGaps = dimensionCodes
    .map((code) => {
      let best = { dept: "", score: -Infinity };
      let worst = { dept: "", score: Infinity };

      for (const department of departments) {
        const value = lookup.get(department)?.get(code);
        if (!value) continue;
        if (value.score > best.score) best = { dept: department, score: value.score };
        if (value.score < worst.score) worst = { dept: department, score: value.score };
      }

      return {
        code,
        name: dimensionNameMap.get(code) ?? code,
        gap: Math.round((best.score - worst.score) * 100) / 100,
        best,
        worst,
      };
    })
    .sort((left, right) => right.gap - left.gap);

  return {
    success: true,
    data: {
      overallRanking,
      dimensionGaps,
      heatmapData: departmentData.map((row) => ({
        segment_key: row.segment_key,
        dimension_code: row.dimension_code,
        avg_score: row.avg_score,
        favorability_pct: row.favorability_pct,
        respondent_count: row.respondent_count,
      })),
    },
  };
}
