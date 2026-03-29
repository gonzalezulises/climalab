"use server";

import { createClient } from "@/lib/supabase/server";
import { buildCampaignDataQuality } from "@/lib/data-quality";
import type { ActionResult } from "@/types";

export async function getCampaignDataQuality(
  campaignId: string
): Promise<ActionResult<ReturnType<typeof buildCampaignDataQuality>>> {
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

  const [respondentsResult, ingestEventsResult, qualityResult] = await Promise.all([
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
  ]);

  const firstError = respondentsResult.error ?? ingestEventsResult.error ?? qualityResult.error;
  if (firstError) {
    return { success: false, error: firstError.message };
  }

  const respondents = respondentsResult.data ?? [];
  const qualityRows = qualityResult.data ?? [];
  const ingestEvents = ingestEventsResult.data ?? [];

  return {
    success: true,
    data: buildCampaignDataQuality({
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
    }),
  };
}
