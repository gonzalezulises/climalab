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
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/types";

export type CommentAnalysis = CommentAnalysisContract;
export type DashboardNarrative = DashboardNarrativeContract;
export type DriverInsights = DriverInsightsContract;
export type AlertContext = AlertContextContract;
export type SegmentProfiles = SegmentProfilesContract;
export type TrendsNarrative = TrendsNarrativeContract;

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
  campaignId: string
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
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code,
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }))
    .sort((a, b) => b.avg - a.avg);

  const engagement = results.find((r) => r.result_type === "engagement");
  const enps = results.find((r) => r.result_type === "enps");
  const alertsRaw = analytics.find((a) => a.analysis_type === "alerts")?.data;
  const alertsArr = Array.isArray(alertsRaw)
    ? (alertsRaw as Array<{ severity: string; message: string }>)
    : [];
  const categoriesRaw = analytics.find((a) => a.analysis_type === "categories")?.data;
  const categoriesArr = Array.isArray(categoriesRaw)
    ? (categoriesRaw as Array<{ category: string; avg_score: number; favorability_pct: number }>)
    : [];

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

  const result = await generateGovernedInsight({
    campaignId,
    analysisRunId: await getLatestAnalysisRunId(campaignId),
    insightType: "dashboard_narrative",
    userContent,
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

export async function interpretDrivers(campaignId: string): Promise<ActionResult<DriverInsights>> {
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

  const drivers = (driversRes.data?.data ?? []) as Array<{ code: string; name: string; r: number }>;
  const dimensions = (resultsRes.data ?? [])
    .filter((row) => row.dimension_code)
    .map((row) => ({
      code: row.dimension_code!,
      name: ((row.metadata as { dimension_name?: string })?.dimension_name ?? row.dimension_code)!,
      avgScore: Number(row.avg_score),
    }));

  const dimScores = new Map<string, number>();
  for (const dimension of dimensions) {
    dimScores.set(dimension.code, dimension.avgScore);
  }

  if (drivers.length === 0) {
    return { success: false, error: "No hay datos de drivers" };
  }

  const userContent = `Drivers de engagement (ordenados por correlación):
${drivers.map((d) => `- ${d.name} (${d.code}): r=${d.r.toFixed(3)}, score actual=${(dimScores.get(d.code) ?? 0).toFixed(2)}`).join("\n")}

Score de engagement global: ${(dimScores.get("ENG") ?? 0).toFixed(2)} de 5.0

Interpreta estos drivers, identifica paradojas y sugiere quick wins.`;

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

export async function contextualizeAlerts(campaignId: string): Promise<ActionResult<AlertContext>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "alerts")
    .single();

  const alerts = (data?.data ?? []) as Array<{
    severity: string;
    message: string;
    type: string;
    value: number;
    threshold: number;
  }>;
  if (alerts.length === 0) {
    return { success: false, error: "No hay alertas" };
  }

  const userContent = `Alertas detectadas en la encuesta de clima organizacional:
${alerts.map((a, i) => `${i}. [${a.severity}] ${a.message} (valor: ${a.value}, umbral: ${a.threshold})`).join("\n")}

Para cada alerta, genera una hipótesis de causa raíz y una recomendación concreta.`;

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

export async function profileSegments(campaignId: string): Promise<ActionResult<SegmentProfiles>> {
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
      name: ((row.metadata as { dimension_name?: string })?.dimension_name ?? row.dimension_code)!,
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
      const dimName =
        (row.metadata as { dimension_name?: string })?.dimension_name ?? row.dimension_code;
      const global = globalScores.get(row.dimension_code!) ?? 0;
      const diff = Number(row.avg_score) - global;
      userContent += `  ${dimName} (${row.dimension_code}): ${Number(row.avg_score).toFixed(2)} (global: ${global.toFixed(2)}, delta: ${diff > 0 ? "+" : ""}${diff.toFixed(2)})\n`;
    }
    userContent += "\n";
  }

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
      const dimName =
        (row.metadata as { dimension_name?: string })?.dimension_name ?? row.dimension_code;
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

export async function generateAllInsights(campaignId: string): Promise<
  ActionResult<{
    comment_analysis: boolean;
    dashboard_narrative: boolean;
    driver_insights: boolean;
    alert_context: boolean;
    segment_profiles: boolean;
    trends_narrative: boolean;
  }>
> {
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

  const [comments, narrative, drivers, alerts, segments, trends] = await Promise.all([
    analyzeComments(campaignId),
    generateNarrative(campaignId),
    interpretDrivers(campaignId),
    contextualizeAlerts(campaignId),
    profileSegments(campaignId),
    generateTrendsNarrative(organizationId, campaignId),
  ]);

  return {
    success: true,
    data: {
      comment_analysis: comments.success,
      dashboard_narrative: narrative.success,
      driver_insights: drivers.success,
      alert_context: alerts.success,
      segment_profiles: segments.success,
      trends_narrative: trends.success,
    },
  };
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
