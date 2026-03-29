"use server";

import { createClient } from "@/lib/supabase/server";
import { buildCampaignDataQuality } from "@/lib/data-quality";
import { buildStatisticalHealthSummary } from "@/lib/statistical-health";
import { normalizeONAStatus } from "@/lib/ona-status";
import type { ActionResult } from "@/types";

export async function getCampaignDataQuality(campaignId: string): Promise<
  ActionResult<
    ReturnType<typeof buildCampaignDataQuality> & {
      statisticalHealth: ReturnType<typeof buildStatisticalHealthSummary>;
    }
  >
> {
  const supabase = await createClient();
  const latestRunResult = await supabase
    .from("analysis_runs")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRunResult.error) {
    return { success: false, error: latestRunResult.error.message };
  }

  const [
    respondentsResult,
    ingestEventsResult,
    qualityResult,
    reliabilityResult,
    rwgResult,
    onaResult,
  ] = await Promise.all([
    supabase
      .from("respondents")
      .select("department, tenure, gender", { count: "exact" })
      .eq("campaign_id", campaignId),
    supabase.from("ingest_events").select("status, error_message").eq("campaign_id", campaignId),
    latestRunResult.data?.id
      ? supabase
          .from("analysis_run_respondent_quality")
          .select("quality_status")
          .eq("analysis_run_id", latestRunResult.data.id)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("campaign_analytics")
      .select("data")
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "reliability")
      .maybeSingle(),
    supabase
      .from("campaign_results")
      .select("dimension_code, metadata")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
    supabase
      .from("campaign_ona_runs")
      .select("status, error_message")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError =
    respondentsResult.error ??
    ingestEventsResult.error ??
    qualityResult.error ??
    reliabilityResult.error ??
    rwgResult.error ??
    onaResult.error;
  if (firstError) {
    return { success: false, error: firstError.message };
  }

  const respondents = respondentsResult.data ?? [];
  const qualityRows = qualityResult.data ?? [];
  const ingestEvents = ingestEventsResult.data ?? [];

  const quality = buildCampaignDataQuality({
    respondentsTotal: respondentsResult.count ?? respondents.length,
    validRespondents: qualityRows.filter((row) => row.quality_status === "valid").length,
    disqualifiedRespondents: qualityRows.filter((row) => row.quality_status === "disqualified")
      .length,
    duplicateIngestEvents: ingestEvents.filter((row) => row.error_message?.includes("duplicate"))
      .length,
    failedIngestEvents: ingestEvents.filter((row) => row.status === "failed").length,
    missingDepartment: respondents.filter((row) => !row.department).length,
    missingTenure: respondents.filter((row) => !row.tenure).length,
    missingGender: respondents.filter((row) => !row.gender).length,
  });

  const reliabilityRows = Array.isArray(reliabilityResult.data?.data)
    ? (reliabilityResult.data?.data as Array<{ dimension_code?: string; alpha?: number | null }>)
    : [];

  return {
    success: true,
    data: {
      ...quality,
      statisticalHealth: buildStatisticalHealthSummary({
        qualityLabel: quality.qualityLabel,
        validRespondentPct: quality.validRespondentPct,
        respondentCoveragePct: quality.respondentCoveragePct,
        duplicateIngestEvents: quality.duplicateIngestEvents,
        failedIngestEvents: quality.failedIngestEvents,
        reliability: reliabilityRows.map((row) => ({
          dimensionCode: row.dimension_code ?? "unknown",
          alpha: row.alpha ?? null,
        })),
        rwg: (rwgResult.data ?? []).map((row) => ({
          dimensionCode: row.dimension_code ?? "unknown",
          rwg: ((row.metadata as { rwg?: number | null } | null)?.rwg ?? null) as number | null,
        })),
        onaStatus: normalizeONAStatus(onaResult.data?.status, onaResult.data?.error_message),
      }),
    },
  };
}
