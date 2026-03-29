import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCampaignDataQuality, type CampaignDataQualitySummary } from "@/lib/data-quality";
import { normalizeONAStatus } from "@/lib/ona-status";
import { buildStatisticalHealthSummary } from "@/lib/statistical-health";
import type { Database, Json } from "@/types/database";

type DatabaseClient = SupabaseClient<Database>;

type ReliabilityRow = {
  dimension_code: string | null;
  alpha: number | null;
};

type RwgRow = {
  dimension_code: string | null;
  metadata: Json | null;
};

function extractRwg(metadata: Json | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const rwg = (metadata as Record<string, Json>).rwg;
  return typeof rwg === "number" ? rwg : null;
}

export function buildCampaignStatisticalHealthFromArtifacts(input: {
  quality: CampaignDataQualitySummary;
  reliabilityRows: ReliabilityRow[];
  rwgRows: RwgRow[];
  onaStatus: string | null;
  onaErrorMessage: string | null;
}) {
  return buildStatisticalHealthSummary({
    qualityLabel: input.quality.qualityLabel,
    validRespondentPct: input.quality.validRespondentPct,
    respondentCoveragePct: input.quality.respondentCoveragePct,
    duplicateIngestEvents: input.quality.duplicateIngestEvents,
    failedIngestEvents: input.quality.failedIngestEvents,
    reliability: input.reliabilityRows.map((row) => ({
      dimensionCode: row.dimension_code ?? "unknown",
      alpha: row.alpha ?? null,
    })),
    rwg: input.rwgRows.map((row) => ({
      dimensionCode: row.dimension_code ?? "unknown",
      rwg: extractRwg(row.metadata),
    })),
    onaStatus: normalizeONAStatus(input.onaStatus, input.onaErrorMessage),
  });
}

export async function loadCampaignQuality(
  client: DatabaseClient,
  campaignId: string
): Promise<CampaignDataQualitySummary> {
  const latestRunResult = await client
    .from("analysis_runs")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRunResult.error) {
    throw new Error(latestRunResult.error.message);
  }

  const [respondentsResult, ingestEventsResult, qualityResult] = await Promise.all([
    client
      .from("respondents")
      .select("department, tenure, gender", { count: "exact" })
      .eq("campaign_id", campaignId),
    client.from("ingest_events").select("status, error_message").eq("campaign_id", campaignId),
    latestRunResult.data?.id
      ? client
          .from("analysis_run_respondent_quality")
          .select("quality_status")
          .eq("analysis_run_id", latestRunResult.data.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError = respondentsResult.error ?? ingestEventsResult.error ?? qualityResult.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const respondents = respondentsResult.data ?? [];
  const qualityRows = qualityResult.data ?? [];
  const ingestEvents = ingestEventsResult.data ?? [];

  return buildCampaignDataQuality({
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
}

export async function loadStatisticalHealth(
  client: DatabaseClient,
  campaignId: string,
  quality: CampaignDataQualitySummary
) {
  const [reliabilityResult, rwgResult, onaResult] = await Promise.all([
    client
      .from("campaign_analytics")
      .select("data")
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "reliability")
      .maybeSingle(),
    client
      .from("campaign_results")
      .select("dimension_code, metadata")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
    client
      .from("campaign_ona_runs")
      .select("status, error_message")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = reliabilityResult.error ?? rwgResult.error ?? onaResult.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const reliabilityRows = Array.isArray(reliabilityResult.data?.data)
    ? (reliabilityResult.data.data as ReliabilityRow[])
    : [];

  return buildCampaignStatisticalHealthFromArtifacts({
    quality,
    reliabilityRows,
    rwgRows: rwgResult.data ?? [],
    onaStatus: onaResult.data?.status ?? null,
    onaErrorMessage: onaResult.data?.error_message ?? null,
  });
}
