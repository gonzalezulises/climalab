"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type AlertContext as AlertContextContract,
  type CampaignAiInsightType,
  type CommentAnalysis as CommentAnalysisContract,
  type DashboardNarrative as DashboardNarrativeContract,
  type DriverInsights as DriverInsightsContract,
  type SegmentProfiles as SegmentProfilesContract,
  type TrendsNarrative as TrendsNarrativeContract,
} from "@/lib/ai/contracts";
import { generateGovernedInsight } from "@/lib/ai/generate";
import {
  getCampaignAiInsight,
  getCampaignOrganizationId,
  replaceCampaignAiInsights,
} from "@/lib/ai/persistence";
import { replaceCampaignAiEvidence } from "@/lib/excellence/store";
import { getAiProviderMetadata, hasConfiguredAiProvider } from "@/lib/ai/provider";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { getCampaignHLM, getCampaignInvariance } from "@/actions/statistical-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  analyticsAlertSchema,
  analyticsCategorySchema,
  analyticsDriverSchema,
  analyticsHlmSchema,
  analyticsInvarianceGroupSchema,
  parseAnalyticsArray,
  parseAnalyticsObject,
} from "@/lib/validations/analytics";
import type { ActionResult } from "@/types";

export type CommentAnalysis = CommentAnalysisContract;
export type DashboardNarrative = DashboardNarrativeContract;
export type DriverInsights = DriverInsightsContract;
export type AlertContext = AlertContextContract;
export type SegmentProfiles = SegmentProfilesContract;
export type TrendsNarrative = TrendsNarrativeContract;

/** Safely extract dimension_name from an opaque JSONB metadata field. */
function getDimensionName(metadata: unknown, fallback: string | null): string {
  if (
    metadata !== null &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    "dimension_name" in metadata
  ) {
    const name = (metadata as Record<string, unknown>).dimension_name;
    if (typeof name === "string") return name;
  }
  return fallback ?? "";
}

async function buildStatisticalContext(campaignId: string): Promise<string> {
  const parts: string[] = [];

  const [hlmResult, invarianceResult] = await Promise.all([
    getCampaignHLM(campaignId),
    getCampaignInvariance(campaignId),
  ]);

  if (hlmResult.success && hlmResult.data) {
    const hlm = parseAnalyticsObject(analyticsHlmSchema, hlmResult.data);
    const highIcc = hlm?.dimensions?.filter((d) => d.icc_label === "alto") ?? [];
    if (highIcc.length > 0) {
      parts.push(
        `CONTEXTO ESTADÍSTICO (HLM): Las siguientes dimensiones presentan alta varianza entre departamentos (ICC alto): ${highIcc.map((d) => `${d.code} (ICC=${d.icc.toFixed(3)})`).join(", ")}. Esto indica que la percepción de estas dimensiones varía significativamente según el departamento.`
      );
    }
  }

  if (invarianceResult.success && invarianceResult.data.length > 0) {
    const failures = parseAnalyticsArray(
      analyticsInvarianceGroupSchema,
      invarianceResult.data
    ).filter((g) => g.levels?.some((l) => !l.passed));

    if (failures.length > 0) {
      const failedVars = failures.map((g) => g.grouping_variable ?? "desconocida").join(", ");
      parts.push(
        `ADVERTENCIA ESTADÍSTICA: La invariancia de medición no se cumple para la(s) variable(s): ${failedVars}. Las comparaciones directas entre estos grupos deben interpretarse con cautela.`
      );
    }
  }

  return parts.join("\n\n");
}

async function getLatestAnalysisRunId(campaignId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

async function persistGovernedInsight(
  campaignId: string,
  insightType: CampaignAiInsightType,
  generated: {
    insert: Parameters<typeof replaceCampaignAiInsights>[2][number];
    evidenceRows: Array<{
      campaign_id: string;
      analysis_run_id: string | null;
      insight_type: CampaignAiInsightType;
      claim_key: string;
      claim_text: string;
      evidence: string[];
      metric_refs: string[];
      dimension_codes: string[];
      confidence_label: "low" | "medium" | "high";
      policy_warnings: string[];
    }>;
  }
) {
  await replaceCampaignAiInsights(campaignId, [insightType], [generated.insert]);
  await replaceCampaignAiEvidence(campaignId, insightType, generated.evidenceRows);
}

export async function analyzeComments(campaignId: string): Promise<ActionResult<CommentAnalysis>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data: respondents } = await supabase
    .from("respondents")
    .select("id")
    .eq("campaign_id", campaignId)
    .in("status", ["completed"]);

  if (!respondents || respondents.length === 0) {
    return { success: false, error: "No hay comentarios para analizar" };
  }

  const { data: comments } = await supabase
    .from("open_responses")
    .select("question_type, text")
    .in(
      "respondent_id",
      respondents.map((r) => r.id)
    )
    .order("question_type");

  if (!comments || comments.length === 0) {
    return { success: false, error: "No hay comentarios para analizar" };
  }

  const grouped = {
    strength: comments.filter((c) => c.question_type === "strength").map((c) => c.text),
    improvement: comments.filter((c) => c.question_type === "improvement").map((c) => c.text),
    general: comments.filter((c) => c.question_type === "general").map((c) => c.text),
  };

  const userContent = `Analiza estos ${comments.length} comentarios de una encuesta de clima organizacional:

FORTALEZAS (${grouped.strength.length} comentarios):
${grouped.strength.map((t, i) => `${i + 1}. ${t}`).join("\n")}

ÁREAS DE MEJORA (${grouped.improvement.length} comentarios):
${grouped.improvement.map((t, i) => `${i + 1}. ${t}`).join("\n")}

GENERAL (${grouped.general.length} comentarios):
${grouped.general.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  const result = await generateGovernedInsight({
    campaignId,
    analysisRunId: await getLatestAnalysisRunId(campaignId),
    insightType: "comment_analysis",
    userContent,
  });
  if (!result.success) return result;

  await persistGovernedInsight(campaignId, "comment_analysis", result.data);
  return { success: true, data: result.data.content as CommentAnalysis };
}

export async function generateNarrative(
  campaignId: string,
  cachedStatContext?: string
): Promise<ActionResult<DashboardNarrative>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();
  const [resultsRes, analyticsRes] = await Promise.all([
    supabase
      .from("campaign_results")
      .select("result_type, segment_type, dimension_code, avg_score, favorability_pct, metadata")
      .eq("campaign_id", campaignId)
      .eq("segment_type", "global"),
    supabase.from("campaign_analytics").select("analysis_type, data").eq("campaign_id", campaignId),
  ]);

  const results = resultsRes.data ?? [];
  const analytics = analyticsRes.data ?? [];

  const dimensions = results
    .filter((r) => r.result_type === "dimension")
    .map((r) => ({
      code: r.dimension_code,
      name: getDimensionName(r.metadata, r.dimension_code),
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }))
    .sort((a, b) => b.avg - a.avg);

  const engagement = results.find((r) => r.result_type === "engagement");
  const enps = results.find((r) => r.result_type === "enps");
  const alertsArr = parseAnalyticsArray(
    analyticsAlertSchema,
    analytics.find((a) => a.analysis_type === "alerts")?.data
  );
  const categoriesArr = parseAnalyticsArray(
    analyticsCategorySchema,
    analytics.find((a) => a.analysis_type === "categories")?.data
  );

  const userContent = `Datos de la encuesta de clima organizacional:

ENGAGEMENT GLOBAL: ${engagement ? Number(engagement.avg_score).toFixed(2) : "N/A"} de 5.0
eNPS: ${enps ? Number(enps.avg_score) : "N/A"}
ALERTAS: ${alertsArr.length} detectadas

CATEGORÍAS:
${
  categoriesArr.length > 0
    ? categoriesArr
        .map(
          (c) =>
            `- ${CATEGORY_LABELS[c.category] ?? c.category}: ${c.avg_score.toFixed(2)} (${c.favorability_pct}% favorable)`
        )
        .join("\n")
    : "N/A"
}

TOP 5 DIMENSIONES:
${dimensions
  .slice(0, 5)
  .map((d) => `- ${d.name} (${d.code}): ${d.avg.toFixed(2)} — ${d.fav}% favorable`)
  .join("\n")}

BOTTOM 5 DIMENSIONES:
${dimensions
  .slice(-5)
  .map((d) => `- ${d.name} (${d.code}): ${d.avg.toFixed(2)} — ${d.fav}% favorable`)
  .join("\n")}

ALERTAS PRINCIPALES:
${
  alertsArr.length > 0
    ? alertsArr
        .slice(0, 5)
        .map((a) => `- [${a.severity}] ${a.message}`)
        .join("\n")
    : "Ninguna"
}`;

  const statContext = cachedStatContext ?? (await buildStatisticalContext(campaignId));
  const enrichedContent = statContext ? `${userContent}\n\n${statContext}` : userContent;

  const result = await generateGovernedInsight({
    campaignId,
    analysisRunId: await getLatestAnalysisRunId(campaignId),
    insightType: "dashboard_narrative",
    userContent: enrichedContent,
    dimensions: dimensions
      .filter((dimension) => Boolean(dimension.code))
      .map((dimension) => ({
        code: dimension.code ?? "unknown",
        name: dimension.name ?? dimension.code ?? "unknown",
      })),
  });
  if (!result.success) return result;

  await persistGovernedInsight(campaignId, "dashboard_narrative", result.data);
  return { success: true, data: result.data.content as DashboardNarrative };
}

export async function interpretDrivers(
  campaignId: string,
  cachedStatContext?: string
): Promise<ActionResult<DriverInsights>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();
  const [driversRes, resultsRes] = await Promise.all([
    supabase
      .from("campaign_analytics")
      .select("data")
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "engagement_drivers")
      .single(),
    supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, metadata")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
  ]);

  const drivers = parseAnalyticsArray(analyticsDriverSchema, driversRes.data?.data);
  const dimensions = (resultsRes.data ?? [])
    .filter((row) => row.dimension_code)
    .map((row) => ({
      code: row.dimension_code!,
      name: getDimensionName(row.metadata, row.dimension_code),
      avgScore: Number(row.avg_score),
    }));

  const dimScores = new Map<string, number>();
  for (const dimension of dimensions) {
    dimScores.set(dimension.code, dimension.avgScore);
  }

  if (drivers.length === 0) {
    return { success: false, error: "No hay datos de drivers" };
  }

  let userContent = `Drivers de engagement (ordenados por correlación):
${drivers.map((d) => `- ${d.name} (${d.code}): r=${d.r.toFixed(3)}, score actual=${(dimScores.get(d.code) ?? 0).toFixed(2)}`).join("\n")}

Score de engagement global: ${(dimScores.get("ENG") ?? 0).toFixed(2)} de 5.0

Interpreta estos drivers, identifica paradojas y sugiere quick wins.`;

  const statContext = cachedStatContext ?? (await buildStatisticalContext(campaignId));
  if (statContext) userContent += `\n\n${statContext}`;

  const result = await generateGovernedInsight({
    campaignId,
    analysisRunId: await getLatestAnalysisRunId(campaignId),
    insightType: "driver_insights",
    userContent,
    dimensions: dimensions.map((dimension) => ({ code: dimension.code, name: dimension.name })),
  });
  if (!result.success) return result;

  await persistGovernedInsight(campaignId, "driver_insights", result.data);
  return { success: true, data: result.data.content as DriverInsights };
}

export async function contextualizeAlerts(
  campaignId: string,
  cachedStatContext?: string
): Promise<ActionResult<AlertContext>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "alerts")
    .single();

  const alerts = parseAnalyticsArray(analyticsAlertSchema, data?.data);
  if (alerts.length === 0) {
    return { success: false, error: "No hay alertas" };
  }

  let userContent = `Alertas detectadas en la encuesta de clima organizacional:
${alerts.map((a, i) => `${i}. [${a.severity}] ${a.message} (valor: ${a.value}, umbral: ${a.threshold})`).join("\n")}

Para cada alerta, genera una hipótesis de causa raíz y una recomendación concreta.`;

  const statContext = cachedStatContext ?? (await buildStatisticalContext(campaignId));
  if (statContext) userContent += `\n\n${statContext}`;

  const result = await generateGovernedInsight({
    campaignId,
    analysisRunId: await getLatestAnalysisRunId(campaignId),
    insightType: "alert_context",
    userContent,
  });
  if (!result.success) return result;

  await persistGovernedInsight(campaignId, "alert_context", result.data);
  return { success: true, data: result.data.content as AlertContext };
}

export async function profileSegments(
  campaignId: string,
  cachedStatContext?: string
): Promise<ActionResult<SegmentProfiles>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();

  const [segRes, globalRes] = await Promise.all([
    supabase
      .from("campaign_results")
      .select("segment_key, segment_type, dimension_code, avg_score, metadata")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .neq("segment_type", "global"),
    supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, metadata")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
  ]);

  const segData = segRes.data ?? [];
  const globalData = globalRes.data ?? [];

  if (segData.length === 0) {
    return { success: false, error: "No hay datos de segmentos" };
  }

  const globalScores = new Map<string, number>();
  const dimensions = globalData
    .filter((row) => row.dimension_code)
    .map((row) => ({
      code: row.dimension_code!,
      name: getDimensionName(row.metadata, row.dimension_code),
    }));

  for (const row of globalData) {
    if (row.dimension_code) globalScores.set(row.dimension_code, Number(row.avg_score));
  }

  const segGroups = new Map<string, typeof segData>();
  for (const row of segData) {
    const key = `${row.segment_type}|${row.segment_key}`;
    if (!segGroups.has(key)) segGroups.set(key, []);
    segGroups.get(key)!.push(row);
  }

  let userContent = "Datos de segmentos vs promedio global:\n\n";
  for (const [key, rows] of segGroups) {
    const [segType, segKey] = key.split("|");
    userContent += `SEGMENTO: ${segKey} (${segType})\n`;
    for (const row of rows) {
      const dimName = getDimensionName(row.metadata, row.dimension_code);
      const global = globalScores.get(row.dimension_code!) ?? 0;
      const diff = Number(row.avg_score) - global;
      userContent += `  ${dimName} (${row.dimension_code}): ${Number(row.avg_score).toFixed(2)} (global: ${global.toFixed(2)}, delta: ${diff > 0 ? "+" : ""}${diff.toFixed(2)})\n`;
    }
    userContent += "\n";
  }

  const statContext = cachedStatContext ?? (await buildStatisticalContext(campaignId));
  if (statContext) userContent += `\n${statContext}`;

  const result = await generateGovernedInsight({
    campaignId,
    analysisRunId: await getLatestAnalysisRunId(campaignId),
    insightType: "segment_profiles",
    userContent,
    dimensions,
    options: { maxTokens: 6144 },
  });
  if (!result.success) return result;

  await persistGovernedInsight(campaignId, "segment_profiles", result.data);
  return { success: true, data: result.data.content as SegmentProfiles };
}

export async function generateTrendsNarrative(
  organizationId: string,
  campaignId?: string
): Promise<ActionResult<TrendsNarrative>> {
  if (!hasConfiguredAiProvider()) {
    return {
      success: false,
      error:
        "Motor de IA no configurado. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY o OLLAMA_BASE_URL.",
    };
  }
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, ends_at")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .order("ends_at", { ascending: true });

  if (!campaigns || campaigns.length < 2) {
    return { success: false, error: "Se necesitan al menos 2 campañas para analizar tendencias" };
  }

  let userContent = "Evolución temporal de dimensiones de clima:\n\n";
  const dimensions = new Map<string, { code: string; name: string }>();

  for (const campaign of campaigns) {
    const { data: results } = await supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, metadata")
      .eq("campaign_id", campaign.id)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");

    userContent += `CAMPAÑA: ${campaign.name} (${campaign.ends_at ?? "sin fecha"})\n`;
    for (const row of results ?? []) {
      const dimName = getDimensionName(row.metadata, row.dimension_code);
      if (row.dimension_code) {
        dimensions.set(row.dimension_code, {
          code: row.dimension_code,
          name: dimName ?? row.dimension_code,
        });
      }
      userContent += `  ${dimName} (${row.dimension_code}): ${Number(row.avg_score).toFixed(2)}\n`;
    }
    userContent += "\n";
  }

  const targetCampaignId = campaignId ?? campaigns[campaigns.length - 1]?.id;
  if (!targetCampaignId) {
    return { success: false, error: "No se encontró campaña para persistir tendencias" };
  }

  const result = await generateGovernedInsight({
    campaignId: targetCampaignId,
    analysisRunId: await getLatestAnalysisRunId(targetCampaignId),
    insightType: "trends_narrative",
    userContent,
    dimensions: [...dimensions.values()],
  });
  if (!result.success) return result;

  await persistGovernedInsight(targetCampaignId, "trends_narrative", result.data);
  return { success: true, data: result.data.content as TrendsNarrative };
}

const ALL_INSIGHT_TYPES = [
  "comment_analysis",
  "dashboard_narrative",
  "driver_insights",
  "alert_context",
  "segment_profiles",
  "trends_narrative",
] as const;

// ---------------------------------------------------------------------------
// generateAllInsights
// When AI_INSIGHT_HOOK_SECRET is configured → background jobs via pg_net.
// Otherwise → synchronous fallback (dev mode / no Vault secrets set).
// ---------------------------------------------------------------------------
export async function generateAllInsights(
  campaignId: string
): Promise<ActionResult<{ batch_id: string; job_count: number } | { synced: true }>> {
  if (!hasConfiguredAiProvider()) {
    return {
      success: false,
      error:
        "Motor de IA no configurado. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY o OLLAMA_BASE_URL.",
    };
  }

  const blocked = await checkAiRateLimit(2, "ai-all");
  if (blocked) return blocked;

  const organizationId = await getCampaignOrganizationId(campaignId);
  if (!organizationId) return { success: false, error: "Campaña no encontrada" };

  // Background mode: insert jobs and let pg_net dispatch Vercel invocations.
  if (env.AI_INSIGHT_HOOK_SECRET) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const batchId = crypto.randomUUID();
    const admin = createAdminClient();

    const rows = ALL_INSIGHT_TYPES.map((insightType) => ({
      campaign_id: campaignId,
      organization_id: organizationId,
      batch_id: batchId,
      insight_type: insightType,
      created_by: user?.id ?? null,
    }));

    const { error } = await admin.from("ai_insight_jobs" as never).insert(rows as never);
    if (error) {
      return { success: false, error: `Error al encolar jobs: ${error.message}` };
    }

    return { success: true, data: { batch_id: batchId, job_count: rows.length } };
  }

  // Synchronous fallback (dev mode — no pg_net / Vault secrets configured).
  const statContext = await buildStatisticalContext(campaignId);

  const results = await Promise.all([
    analyzeComments(campaignId),
    generateNarrative(campaignId, statContext),
    interpretDrivers(campaignId, statContext),
    contextualizeAlerts(campaignId, statContext),
    profileSegments(campaignId, statContext),
    generateTrendsNarrative(organizationId, campaignId),
  ]);

  const firstFailure = results.find((r) => !r.success);
  if (firstFailure && !firstFailure.success) {
    return { success: false, error: firstFailure.error };
  }

  return { success: true, data: { synced: true } };
}

// ---------------------------------------------------------------------------
// getInsightJobStatus — polling endpoint for the progress UI.
// ---------------------------------------------------------------------------
export type InsightJobStatus = {
  insight_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  attempt_count: number;
};

export type InsightBatchStatus = {
  jobs: InsightJobStatus[];
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  is_done: boolean;
};

export async function getInsightJobStatus(
  batchId: string
): Promise<ActionResult<InsightBatchStatus>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_insight_jobs" as never)
    .select("insight_type, status, error_message, attempt_count")
    .eq("batch_id", batchId);

  if (error) return { success: false, error: error.message };

  const jobs = (data ?? []) as InsightJobStatus[];
  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const pending = jobs.filter((j) => j.status === "pending").length;
  const processing = jobs.filter((j) => j.status === "processing").length;

  return {
    success: true,
    data: {
      jobs,
      total: jobs.length,
      completed,
      failed,
      pending,
      processing,
      is_done: jobs.length > 0 && completed + failed === jobs.length,
    },
  };
}

// ---------------------------------------------------------------------------
// retryFailedInsights — resets failed jobs to pending (trigger re-fires).
// ---------------------------------------------------------------------------
export async function retryFailedInsights(batchId: string): Promise<ActionResult<number>> {
  const admin = createAdminClient();

  // Read failed jobs first
  const { data: failed, error: readError } = await admin
    .from("ai_insight_jobs" as never)
    .select("campaign_id, organization_id, insight_type, created_by")
    .eq("batch_id", batchId)
    .eq("status", "failed");

  if (readError) return { success: false, error: readError.message };
  if (!failed || (failed as unknown[]).length === 0) return { success: true, data: 0 };

  // Delete failed rows — new inserts re-trigger dispatch_ai_insight_job()
  const { error: deleteError } = await admin
    .from("ai_insight_jobs" as never)
    .delete()
    .eq("batch_id", batchId)
    .eq("status", "failed");

  if (deleteError) return { success: false, error: deleteError.message };

  const rows = (
    failed as Array<{
      campaign_id: string;
      organization_id: string;
      insight_type: string;
      created_by: string | null;
    }>
  ).map((j) => ({
    campaign_id: j.campaign_id,
    organization_id: j.organization_id,
    batch_id: batchId,
    insight_type: j.insight_type,
    created_by: j.created_by,
  }));

  const { error: insertError } = await admin.from("ai_insight_jobs" as never).insert(rows as never);

  if (insertError) return { success: false, error: insertError.message };
  return { success: true, data: rows.length };
}

export async function getCommentAnalysis(
  campaignId: string
): Promise<ActionResult<CommentAnalysis>> {
  return getCampaignAiInsight<CommentAnalysis>(campaignId, "comment_analysis");
}

export async function getDashboardNarrative(
  campaignId: string
): Promise<ActionResult<DashboardNarrative>> {
  return getCampaignAiInsight<DashboardNarrative>(campaignId, "dashboard_narrative");
}

export async function getDriverInsights(campaignId: string): Promise<ActionResult<DriverInsights>> {
  return getCampaignAiInsight<DriverInsights>(campaignId, "driver_insights");
}

export async function getAlertContext(campaignId: string): Promise<ActionResult<AlertContext>> {
  return getCampaignAiInsight<AlertContext>(campaignId, "alert_context");
}

export async function getSegmentProfiles(
  campaignId: string
): Promise<ActionResult<SegmentProfiles>> {
  return getCampaignAiInsight<SegmentProfiles>(campaignId, "segment_profiles");
}

export async function getTrendsNarrative(
  campaignId: string
): Promise<ActionResult<TrendsNarrative>> {
  return getCampaignAiInsight<TrendsNarrative>(campaignId, "trends_narrative");
}

export { getAiProviderMetadata };
