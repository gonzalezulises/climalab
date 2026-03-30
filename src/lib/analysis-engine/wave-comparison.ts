import { welchTTestFromStats, cohensD } from "@/lib/statistics";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WaveComparisonMetadata = {
  previous_campaign_id: string;
  previous_avg: number;
  current_avg: number;
  delta: number;
  welch: { t: number; df: number; p_value: number; significant: boolean } | null;
  bootstrap: { lower: number; upper: number; mean_diff: number; significant: boolean } | null;
  effect_size: { d: number; label: string };
  method: string;
};

const ROUND = (v: number) => Math.round(v * 1000) / 1000;

export type WaveComparisonFromStatsInput = {
  currentAvg: number;
  currentStd: number;
  currentN: number;
  previousAvg: number;
  previousStd: number;
  previousN: number;
  previousCampaignId: string;
};

export function buildWaveComparisonFromStats(
  input: WaveComparisonFromStatsInput
): WaveComparisonMetadata | null {
  if (input.currentN === 0 || input.previousN === 0) return null;

  const welch = welchTTestFromStats(
    input.currentAvg,
    input.currentStd,
    input.currentN,
    input.previousAvg,
    input.previousStd,
    input.previousN
  );
  const effectSize = cohensD(
    input.currentAvg,
    input.previousAvg,
    input.currentStd,
    input.previousStd,
    input.currentN,
    input.previousN
  );
  const delta = ROUND(input.currentAvg - input.previousAvg);

  return {
    previous_campaign_id: input.previousCampaignId,
    previous_avg: ROUND(input.previousAvg),
    current_avg: ROUND(input.currentAvg),
    delta,
    welch: welch
      ? { t: welch.t, df: welch.df, p_value: welch.pValue, significant: welch.significant }
      : null,
    bootstrap: null,
    effect_size: { d: effectSize.d, label: effectSize.label },
    method: "welch_t_from_stats",
  };
}

/**
 * Enriches dimension results with wave comparison metadata by finding
 * the previous campaign for the same organization.
 */
export async function enrichResultsWithWaveComparison(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  campaignId: string,
  organizationId: string,
  results: Array<{
    result_type: string;
    segment_type: string | null;
    dimension_code: string | null;
    avg_score: number | null;
    std_score: number | null;
    respondent_count: number | null;
    metadata: unknown;
  }>
): Promise<void> {
  const { data: prevCampaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .neq("id", campaignId)
    .order("ends_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!prevCampaign) return;

  const { data: prevResults } = await supabase
    .from("campaign_results")
    .select("dimension_code, avg_score, std_score, respondent_count")
    .eq("campaign_id", prevCampaign.id)
    .eq("result_type", "dimension")
    .eq("segment_type", "global");

  if (!prevResults || prevResults.length === 0) return;

  const prevByDim = new Map(
    prevResults.filter((r) => r.dimension_code != null).map((r) => [r.dimension_code!, r] as const)
  );

  for (const row of results) {
    if (row.result_type === "dimension" && row.segment_type === "global" && row.dimension_code) {
      const prev = prevByDim.get(row.dimension_code);
      if (prev && prev.avg_score != null && row.avg_score != null) {
        const wc = buildWaveComparisonFromStats({
          currentAvg: row.avg_score,
          currentStd: row.std_score ?? 0.5,
          currentN: row.respondent_count ?? 0,
          previousAvg: Number(prev.avg_score),
          previousStd: Number(prev.std_score) || 0.5,
          previousN: prev.respondent_count ?? 0,
          previousCampaignId: prevCampaign.id,
        });
        if (wc) {
          row.metadata = { ...(row.metadata as Record<string, unknown>), wave_comparison: wc };
        }
      }
    }
  }
}
