import { createClient } from "@/lib/supabase/server";
import { buildAiEvaluationMatrix } from "@/lib/quality/ai-evaluation";
import { buildInstrumentQualityReport } from "@/lib/quality/instrument-quality";
import { loadCampaignQuality } from "@/lib/campaign-quality";
import type { Json } from "@/types/database";

type ReliabilityRow = {
  dimension_code: string;
  dimension_name?: string;
  alpha: number | null;
  alphaStatus: "calculated" | "insufficient_n" | "insufficient_items" | "zero_variance";
  item_count: number;
  respondent_count: number;
};

type DriverRow = {
  code: string;
  name: string;
  r: number;
};

type AlertRow = {
  severity: string;
  dimension_code?: string;
  message: string;
};

function extractRwg(metadata: Json | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, Json>).rwg;
  return typeof value === "number" ? value : null;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function getCampaignQualityArtifacts(campaignId: string) {
  const supabase = await createClient();

  const [
    campaignResult,
    qualitySummary,
    latestRunResult,
    reliabilityResult,
    globalDimensionsResult,
    aiInsightsResult,
    alertsResult,
    driversResult,
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, population_n, sample_n, response_rate, margin_of_error")
      .eq("id", campaignId)
      .single(),
    loadCampaignQuality(supabase, campaignId),
    supabase
      .from("analysis_runs")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("campaign_analytics")
      .select("data")
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "reliability")
      .maybeSingle(),
    supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, favorability_pct, metadata")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
    supabase
      .from("campaign_ai_insights")
      .select("insight_type, provider, model, data, created_at, updated_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_analytics")
      .select("data")
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "alerts")
      .maybeSingle(),
    supabase
      .from("campaign_analytics")
      .select("data")
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "engagement_drivers")
      .maybeSingle(),
  ]);

  const firstError =
    campaignResult.error ??
    latestRunResult.error ??
    reliabilityResult.error ??
    globalDimensionsResult.error ??
    aiInsightsResult.error ??
    alertsResult.error ??
    driversResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }
  if (!campaignResult.data) {
    throw new Error("Campaña no encontrada");
  }

  const analysisRunId = latestRunResult.data?.id ?? null;
  let validRespondentIds: string[] = [];

  if (analysisRunId) {
    const respondentQualityResult = await supabase
      .from("analysis_run_respondent_quality")
      .select("respondent_id, quality_status")
      .eq("analysis_run_id", analysisRunId);

    if (respondentQualityResult.error) {
      throw new Error(respondentQualityResult.error.message);
    }

    validRespondentIds = (respondentQualityResult.data ?? [])
      .filter((row) => row.quality_status === "valid")
      .map((row) => row.respondent_id);
  }

  if (validRespondentIds.length === 0) {
    const respondentsResult = await supabase
      .from("respondents")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("status", "completed");
    if (respondentsResult.error) {
      throw new Error(respondentsResult.error.message);
    }
    validRespondentIds = (respondentsResult.data ?? []).map((row) => row.id);
  }

  let responseRows: Array<{ respondent_id: string; item_id: string; score: number | null }> = [];
  let itemRows: Array<{
    id: string;
    text: string;
    dimension_id: string;
    is_attention_check: boolean;
  }> = [];
  let dimensionRows: Array<{ id: string; code: string; name: string }> = [];

  if (validRespondentIds.length > 0) {
    const responsesResult = await supabase
      .from("responses")
      .select("respondent_id, item_id, score")
      .in("respondent_id", validRespondentIds);
    if (responsesResult.error) {
      throw new Error(responsesResult.error.message);
    }

    responseRows = responsesResult.data ?? [];
    const itemIds = [...new Set(responseRows.map((row) => row.item_id))];
    if (itemIds.length > 0) {
      const itemsResult = await supabase
        .from("items")
        .select("id, text, dimension_id, is_attention_check")
        .in("id", itemIds);
      if (itemsResult.error) {
        throw new Error(itemsResult.error.message);
      }
      itemRows = itemsResult.data ?? [];

      const dimensionIds = [...new Set(itemRows.map((row) => row.dimension_id))];
      if (dimensionIds.length > 0) {
        const dimensionsResult = await supabase
          .from("dimensions")
          .select("id, code, name")
          .in("id", dimensionIds);
        if (dimensionsResult.error) {
          throw new Error(dimensionsResult.error.message);
        }
        dimensionRows = dimensionsResult.data ?? [];
      }
    }
  }

  return {
    campaign: campaignResult.data,
    qualitySummary,
    reliability: safeArray<ReliabilityRow>(reliabilityResult.data?.data),
    globalDimensions: globalDimensionsResult.data ?? [],
    aiInsights: aiInsightsResult.data ?? [],
    alerts: safeArray<AlertRow>(alertsResult.data?.data),
    drivers: safeArray<DriverRow>(driversResult.data?.data),
    validRespondentIds,
    responseRows,
    itemRows,
    dimensionRows,
  };
}

export async function loadCampaignQualityReport(campaignId: string) {
  const artifacts = await getCampaignQualityArtifacts(campaignId);

  const reliabilityByCode = new Map(
    artifacts.reliability.map((row) => [row.dimension_code, row] as const)
  );
  const rwgByCode = new Map(
    (artifacts.globalDimensions ?? [])
      .filter((row) => row.dimension_code)
      .map((row) => [row.dimension_code!, extractRwg(row.metadata)] as const)
  );
  const dimensionById = new Map(artifacts.dimensionRows.map((row) => [row.id, row] as const));
  const responsesByItem = new Map<string, Map<string, number>>();

  for (const response of artifacts.responseRows) {
    if (typeof response.score !== "number") continue;
    const itemMap = responsesByItem.get(response.item_id) ?? new Map<string, number>();
    itemMap.set(response.respondent_id, response.score);
    responsesByItem.set(response.item_id, itemMap);
  }

  const dimensionInputMap = new Map<
    string,
    {
      code: string;
      name: string;
      alpha: number | null;
      alphaStatus: "calculated" | "insufficient_n" | "insufficient_items" | "zero_variance";
      rwg: number | null;
      respondentCount: number;
      itemScores: Array<{ itemId: string; itemText: string; scores: Array<number | null> }>;
    }
  >();

  for (const item of artifacts.itemRows) {
    if (item.is_attention_check) continue;
    const dimension = dimensionById.get(item.dimension_id);
    if (!dimension) continue;

    const reliability = reliabilityByCode.get(dimension.code);
    const itemResponseMap = responsesByItem.get(item.id) ?? new Map<string, number>();

    const existing = dimensionInputMap.get(dimension.code) ?? {
      code: dimension.code,
      name: dimension.name,
      alpha: reliability?.alpha ?? null,
      alphaStatus: reliability?.alphaStatus ?? "insufficient_items",
      rwg: rwgByCode.get(dimension.code) ?? null,
      respondentCount: reliability?.respondent_count ?? artifacts.validRespondentIds.length,
      itemScores: [],
    };

    existing.itemScores.push({
      itemId: item.id,
      itemText: item.text,
      scores: artifacts.validRespondentIds.map(
        (respondentId) => itemResponseMap.get(respondentId) ?? null
      ),
    });

    dimensionInputMap.set(dimension.code, existing);
  }

  for (const reliability of artifacts.reliability) {
    if (dimensionInputMap.has(reliability.dimension_code)) continue;
    dimensionInputMap.set(reliability.dimension_code, {
      code: reliability.dimension_code,
      name: reliability.dimension_name ?? reliability.dimension_code,
      alpha: reliability.alpha,
      alphaStatus: reliability.alphaStatus,
      rwg: rwgByCode.get(reliability.dimension_code) ?? null,
      respondentCount: reliability.respondent_count,
      itemScores: [],
    });
  }

  const instrumentQuality = buildInstrumentQualityReport({
    sample: {
      populationN: artifacts.campaign.population_n,
      sampleN: artifacts.campaign.sample_n ?? artifacts.validRespondentIds.length,
      responseRate: Number(artifacts.campaign.response_rate ?? 0),
      marginOfError: artifacts.campaign.margin_of_error,
    },
    campaignQuality: artifacts.qualitySummary,
    dimensions: [...dimensionInputMap.values()],
  });

  const aiEvaluation = buildAiEvaluationMatrix({
    campaignQualityStatus: instrumentQuality.overallStatus,
    qualityWarnings: [...instrumentQuality.warnings, ...instrumentQuality.dimensionWarnings],
    dimensions: (artifacts.globalDimensions ?? [])
      .filter((row) => row.dimension_code)
      .map((row) => ({
        code: row.dimension_code!,
        name:
          ((row.metadata as Record<string, Json> | null)?.dimension_name as string | undefined) ??
          row.dimension_code!,
        avgScore: Number(row.avg_score),
        favorabilityPct: Number(row.favorability_pct),
      })),
    drivers: artifacts.drivers,
    alerts: artifacts.alerts.map((alert) => ({
      severity: alert.severity,
      dimensionCode: alert.dimension_code ?? null,
      message: alert.message,
    })),
    insightTypes: artifacts.aiInsights.map((insight) => ({
      insightType: insight.insight_type as Parameters<
        typeof buildAiEvaluationMatrix
      >[0]["insightTypes"][number]["insightType"],
      provider: insight.provider,
      model: insight.model,
      data: insight.data,
    })),
  });

  return {
    instrumentQuality,
    aiEvaluation,
  };
}
