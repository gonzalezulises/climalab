"use server";

import { createClient } from "@/lib/supabase/server";
import { buildSemanticResultFamilies } from "@/lib/semantic-results";
import type { ActionResult } from "@/types";

export async function getSemanticResultFamilies(
  campaignId: string
): Promise<ActionResult<ReturnType<typeof buildSemanticResultFamilies>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_results")
    .select("dimension_code, instrument_type, avg_score, favorability_pct, metadata")
    .eq("campaign_id", campaignId)
    .eq("result_type", "dimension")
    .eq("segment_type", "global");

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: buildSemanticResultFamilies(
      (data ?? []).map((row) => {
        const metadata = (row.metadata ?? {}) as {
          dimension_name?: string;
          analytics_category?: string | null;
        };

        return {
          dimensionCode: row.dimension_code ?? "unknown",
          dimensionName: metadata.dimension_name ?? row.dimension_code ?? "unknown",
          analyticsCategory: metadata.analytics_category ?? null,
          instrumentType: row.instrument_type,
          avgScore: Number(row.avg_score),
          favorabilityPct: Number(row.favorability_pct),
        };
      })
    ),
  };
}
