"use server";

import { createClient } from "@/lib/supabase/server";
import { extractJSON } from "@/lib/ai/json";
import { getAiProviderMetadata, callAI, hasConfiguredAiProvider } from "@/lib/ai/provider";
import {
  getCampaignAiInsight,
  getCampaignOrganizationId,
  replaceCampaignAiInsights,
  type CampaignAiInsightInsert,
} from "@/lib/ai/persistence";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { COMMENTS_SYSTEM } from "@/lib/ai/prompts/comments";
import { NARRATIVE_SYSTEM } from "@/lib/ai/prompts/dashboard";
import { DRIVERS_SYSTEM } from "@/lib/ai/prompts/drivers";
import { ALERTS_SYSTEM } from "@/lib/ai/prompts/alerts";
import { SEGMENTS_SYSTEM } from "@/lib/ai/prompts/segments";
import { TRENDS_SYSTEM } from "@/lib/ai/prompts/trends";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/types";

// ---------------------------------------------------------------------------
// Types for AI insight payloads
// ---------------------------------------------------------------------------
export type CommentAnalysis = {
  themes: Array<{
    theme: string;
    count: number;
    sentiment: "positive" | "negative" | "neutral";
    examples: string[];
  }>;
  summary: { strengths: string; improvements: string; general: string };
  sentiment_distribution: { positive: number; negative: number; neutral: number };
};

export type DashboardNarrative = {
  executive_summary: string;
  highlights: string[];
  concerns: string[];
  recommendation: string;
};

export type DriverInsights = {
  narrative: string;
  paradoxes: string[];
  quick_wins: Array<{ dimension: string; action: string; impact: string }>;
};

export type AlertContext = Array<{
  alert_index: number;
  root_cause: string;
  recommendation: string;
}>;

export type SegmentProfiles = Array<{
  segment: string;
  segment_type: string;
  narrative: string;
  strengths: string[];
  risks: string[];
}>;

export type TrendsNarrative = {
  trajectory: string;
  improving: string[];
  declining: string[];
  stable: string[];
  inflection_points: string[];
};

// ---------------------------------------------------------------------------
// 1. analyzeComments — theme extraction, sentiment, summary
// ---------------------------------------------------------------------------
export async function analyzeComments(campaignId: string): Promise<ActionResult<CommentAnalysis>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();

  // open_responses has no campaign_id — join through respondents
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

  const result = await callAI(COMMENTS_SYSTEM, userContent);
  if (!result.success) return result;

  const parsed = extractJSON<CommentAnalysis>(result.data);
  if (!parsed) return { success: false, error: "El modelo no devolvió un análisis válido" };

  return { success: true, data: parsed };
}

// ---------------------------------------------------------------------------
// 2. generateNarrative — executive summary for dashboard
// ---------------------------------------------------------------------------
export async function generateNarrative(
  campaignId: string
): Promise<ActionResult<DashboardNarrative>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();

  // Fetch all needed data
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

  const result = await callAI(NARRATIVE_SYSTEM, userContent);
  if (!result.success) return result;

  const parsed = extractJSON<DashboardNarrative>(result.data);
  if (!parsed) return { success: false, error: "El modelo no devolvió una narrativa válida" };

  return { success: true, data: parsed };
}

// ---------------------------------------------------------------------------
// 3. interpretDrivers — narrative, paradoxes, quick wins
// ---------------------------------------------------------------------------
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
  const dimScores = new Map<string, number>();
  for (const r of resultsRes.data ?? []) {
    if (r.dimension_code) dimScores.set(r.dimension_code, Number(r.avg_score));
  }

  if (drivers.length === 0) {
    return { success: false, error: "No hay datos de drivers" };
  }

  const userContent = `Drivers de engagement (ordenados por correlación):
${drivers.map((d) => `- ${d.name} (${d.code}): r=${d.r.toFixed(3)}, score actual=${(dimScores.get(d.code) ?? 0).toFixed(2)}`).join("\n")}

Score de engagement global: ${(dimScores.get("ENG") ?? 0).toFixed(2)} de 5.0

Interpreta estos drivers, identifica paradojas y sugiere quick wins.`;

  const result = await callAI(DRIVERS_SYSTEM, userContent);
  if (!result.success) return result;

  const parsed = extractJSON<DriverInsights>(result.data);
  if (!parsed) return { success: false, error: "El modelo no devolvió insights válidos" };

  return { success: true, data: parsed };
}

// ---------------------------------------------------------------------------
// 4. contextualizeAlerts — root cause + recommendations per alert
// ---------------------------------------------------------------------------
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

  const result = await callAI(ALERTS_SYSTEM, userContent);
  if (!result.success) return result;

  const parsed = extractJSON<AlertContext>(result.data);
  if (!parsed) return { success: false, error: "El modelo no devolvió contexto válido" };

  return { success: true, data: parsed };
}

// ---------------------------------------------------------------------------
// 5. profileSegments — per-segment narrative
// ---------------------------------------------------------------------------
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
  for (const r of globalData) {
    if (r.dimension_code) globalScores.set(r.dimension_code, Number(r.avg_score));
  }

  // Group by segment
  const segGroups = new Map<string, typeof segData>();
  for (const r of segData) {
    const key = `${r.segment_type}|${r.segment_key}`;
    if (!segGroups.has(key)) segGroups.set(key, []);
    segGroups.get(key)!.push(r);
  }

  let userContent = "Datos de segmentos vs promedio global:\n\n";
  for (const [key, rows] of segGroups) {
    const [segType, segKey] = key.split("|");
    userContent += `SEGMENTO: ${segKey} (${segType})\n`;
    for (const r of rows) {
      const dimName =
        (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code;
      const global = globalScores.get(r.dimension_code!) ?? 0;
      const diff = Number(r.avg_score) - global;
      userContent += `  ${dimName} (${r.dimension_code}): ${Number(r.avg_score).toFixed(2)} (global: ${global.toFixed(2)}, delta: ${diff > 0 ? "+" : ""}${diff.toFixed(2)})\n`;
    }
    userContent += "\n";
  }

  const result = await callAI(SEGMENTS_SYSTEM, userContent, { maxTokens: 6144 });
  if (!result.success) return result;

  const parsed = extractJSON<SegmentProfiles>(result.data);
  if (!parsed) return { success: false, error: "El modelo no devolvió perfiles válidos" };

  return { success: true, data: parsed };
}

// ---------------------------------------------------------------------------
// 6. generateTrendsNarrative — temporal trajectory analysis
// ---------------------------------------------------------------------------
export async function generateTrendsNarrative(
  organizationId: string
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

  for (const c of campaigns) {
    const { data: results } = await supabase
      .from("campaign_results")
      .select("dimension_code, avg_score, metadata")
      .eq("campaign_id", c.id)
      .eq("result_type", "dimension")
      .eq("segment_type", "global");

    userContent += `CAMPAÑA: ${c.name} (${c.ends_at ?? "sin fecha"})\n`;
    for (const r of results ?? []) {
      const dimName =
        (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code;
      userContent += `  ${dimName} (${r.dimension_code}): ${Number(r.avg_score).toFixed(2)}\n`;
    }
    userContent += "\n";
  }

  const result = await callAI(TRENDS_SYSTEM, userContent);
  if (!result.success) return result;

  const parsed = extractJSON<TrendsNarrative>(result.data);
  if (!parsed)
    return { success: false, error: "El modelo no devolvió narrativa de tendencias válida" };

  return { success: true, data: parsed };
}

// ---------------------------------------------------------------------------
// Orchestrator — generate all AI insights for a campaign
// ---------------------------------------------------------------------------
export async function generateAllInsights(campaignId: string): Promise<
  ActionResult<{
    comment_analysis: boolean;
    dashboard_narrative: boolean;
    driver_insights: boolean;
    alert_context: boolean;
    segment_profiles: boolean;
  }>
> {
  // Fail fast if no AI backend configured
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

  // Run all analyses in parallel
  const [comments, narrative, drivers, alerts, segments] = await Promise.all([
    analyzeComments(campaignId),
    generateNarrative(campaignId),
    interpretDrivers(campaignId),
    contextualizeAlerts(campaignId),
    profileSegments(campaignId),
  ]);

  // Store successful results in campaign_analytics
  const aiMetadata = getAiProviderMetadata();
  const inserts: CampaignAiInsightInsert[] = [];

  if (comments.success)
    inserts.push({
      campaign_id: campaignId,
      insight_type: "comment_analysis",
      provider: aiMetadata.provider,
      model: aiMetadata.model,
      data: comments.data,
    });
  if (narrative.success)
    inserts.push({
      campaign_id: campaignId,
      insight_type: "dashboard_narrative",
      provider: aiMetadata.provider,
      model: aiMetadata.model,
      data: narrative.data,
    });
  if (drivers.success)
    inserts.push({
      campaign_id: campaignId,
      insight_type: "driver_insights",
      provider: aiMetadata.provider,
      model: aiMetadata.model,
      data: drivers.data,
    });
  if (alerts.success)
    inserts.push({
      campaign_id: campaignId,
      insight_type: "alert_context",
      provider: aiMetadata.provider,
      model: aiMetadata.model,
      data: alerts.data,
    });
  if (segments.success)
    inserts.push({
      campaign_id: campaignId,
      insight_type: "segment_profiles",
      provider: aiMetadata.provider,
      model: aiMetadata.model,
      data: segments.data,
    });

  const aiTypes = [
    "comment_analysis",
    "dashboard_narrative",
    "driver_insights",
    "alert_context",
    "segment_profiles",
  ] as const;
  await replaceCampaignAiInsights(campaignId, [...aiTypes], inserts);

  // Also generate trends narrative if there are multiple campaigns
  const trendsResult = await generateTrendsNarrative(organizationId);
  if (trendsResult.success) {
    await replaceCampaignAiInsights(
      campaignId,
      ["trends_narrative"],
      [
        {
          campaign_id: campaignId,
          insight_type: "trends_narrative",
          provider: aiMetadata.provider,
          model: aiMetadata.model,
          data: trendsResult.data,
        },
      ]
    );
  }

  return {
    success: true,
    data: {
      comment_analysis: comments.success,
      dashboard_narrative: narrative.success,
      driver_insights: drivers.success,
      alert_context: alerts.success,
      segment_profiles: segments.success,
    },
  };
}

// ---------------------------------------------------------------------------
// Retrieval functions — fetch stored AI insights
// ---------------------------------------------------------------------------
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
