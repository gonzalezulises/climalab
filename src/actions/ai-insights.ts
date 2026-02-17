"use server";

import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS } from "@/lib/constants";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";
import type { Database } from "@/types/database";

type Json = Database["public"]["Tables"]["campaign_analytics"]["Insert"]["data"];

// ---------------------------------------------------------------------------
// AI helper — supports Anthropic API, OpenAI-compatible endpoint (DGX), and legacy Ollama
// Priority: ANTHROPIC_API_KEY → AI_LOCAL_ENDPOINT (OpenAI-compatible) → OLLAMA_BASE_URL (native)
// ---------------------------------------------------------------------------
async function callAI(
  systemPrompt: string,
  userContent: string,
  opts?: { maxTokens?: number; temperature?: number; timeout?: number }
): Promise<ActionResult<string>> {
  const anthropicKey = env.ANTHROPIC_API_KEY;
  const localEndpoint = env.AI_LOCAL_ENDPOINT;
  const ollamaUrl = env.OLLAMA_BASE_URL;

  if (anthropicKey) {
    return callAnthropic(anthropicKey, env.ANTHROPIC_MODEL, systemPrompt, userContent, opts);
  }

  if (localEndpoint) {
    return callOpenAICompatible(
      localEndpoint,
      env.AI_LOCAL_MODEL,
      env.AI_LOCAL_API_KEY ?? "",
      systemPrompt,
      userContent,
      opts
    );
  }

  if (ollamaUrl) {
    return callOllamaNative(ollamaUrl, env.OLLAMA_MODEL, systemPrompt, userContent, opts);
  }

  return {
    success: false,
    error:
      "Motor de IA no configurado. Configure ANTHROPIC_API_KEY, AI_LOCAL_ENDPOINT o OLLAMA_BASE_URL.",
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  opts?: { maxTokens?: number; temperature?: number; timeout?: number }
): Promise<ActionResult<string>> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts?.maxTokens ?? 4096,
        temperature: opts?.temperature ?? 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
      signal: AbortSignal.timeout(opts?.timeout ?? 60_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        success: false,
        error: `Error de Anthropic (${response.status}): ${body.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const content: string = data?.content?.[0]?.text ?? "";
    return { success: true, data: content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión con Anthropic";
    return { success: false, error: message };
  }
}

async function callOpenAICompatible(
  endpoint: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  opts?: { maxTokens?: number; temperature?: number; timeout?: number }
): Promise<ActionResult<string>> {
  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 4096,
      }),
      signal: AbortSignal.timeout(opts?.timeout ?? 120_000),
    });

    if (!response.ok) {
      return { success: false, error: `Error del modelo (${response.status})` };
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return { success: true, data: content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión con el modelo";
    return { success: false, error: message };
  }
}

async function callOllamaNative(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  opts?: { maxTokens?: number; temperature?: number; timeout?: number }
): Promise<ActionResult<string>> {
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        stream: false,
        options: {
          temperature: opts?.temperature ?? 0.3,
          num_predict: opts?.maxTokens ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(opts?.timeout ?? 120_000),
    });

    if (!response.ok) {
      return { success: false, error: `Error del modelo (${response.status})` };
    }

    const data = await response.json();
    const content: string = data?.message?.content ?? "";
    return { success: true, data: content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión con el modelo";
    return { success: false, error: message };
  }
}

function extractJSON<T>(text: string): T | null {
  // Try to find JSON object or array
  const objMatch = text.match(/\{[\s\S]*\}/);
  const arrMatch = text.match(/\[[\s\S]*\]/);
  const match =
    objMatch && arrMatch
      ? objMatch.index! <= arrMatch.index!
        ? objMatch
        : arrMatch
      : (objMatch ?? arrMatch);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

async function checkAiRateLimit(
  limitPerMin: number
): Promise<{ success: false; error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rl = rateLimit(`ai:${user?.id ?? "anon"}`, { limit: limitPerMin, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: "Demasiadas solicitudes. Intente en un momento." };
  }
  return null;
}

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
const COMMENTS_SYSTEM = `Eres un psicólogo organizacional experto en clima laboral LATAM.
Analiza los comentarios abiertos de una encuesta de clima organizacional.

Responde ÚNICAMENTE con JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "themes": [{"theme": "nombre del tema", "count": N, "sentiment": "positive|negative|neutral", "examples": ["ejemplo1"]}],
  "summary": {"strengths": "resumen de fortalezas en 2-3 oraciones", "improvements": "resumen de áreas de mejora en 2-3 oraciones", "general": "resumen general en 2-3 oraciones"},
  "sentiment_distribution": {"positive": N, "negative": N, "neutral": N}
}

Reglas:
- Identifica 3-8 temas principales agrupando comentarios similares
- El conteo indica cuántos comentarios mencionan ese tema
- Los ejemplos deben ser citas textuales (max 2 por tema)
- El resumen debe ser accionable y específico, no genérico
- Usa español latinoamericano profesional
- Los números de sentiment_distribution deben sumar el total de comentarios`;

export async function analyzeComments(campaignId: string): Promise<ActionResult<CommentAnalysis>> {
  const blocked = await checkAiRateLimit(5);
  if (blocked) return blocked;

  const supabase = await createClient();

  const { data: comments } = await supabase
    .from("open_responses")
    .select("question_type, text, respondent_id")
    .eq("campaign_id", campaignId)
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
const NARRATIVE_SYSTEM = `Eres un consultor senior de clima organizacional especializado en LATAM.
Genera un resumen ejecutivo basado en los resultados de una encuesta de clima.

Responde ÚNICAMENTE con JSON válido (sin markdown):
{
  "executive_summary": "Párrafo de 3-5 oraciones con el diagnóstico general",
  "highlights": ["logro o fortaleza 1", "logro 2", "logro 3"],
  "concerns": ["preocupación 1", "preocupación 2"],
  "recommendation": "Recomendación principal de acción en 2-3 oraciones"
}

Reglas:
- Sé específico con datos (menciona dimensiones, scores, porcentajes)
- No uses lenguaje técnico-estadístico, usa lenguaje ejecutivo
- Las recomendaciones deben ser accionables y priorizadas
- Usa español latinoamericano profesional`;

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
const DRIVERS_SYSTEM = `Eres un psicólogo organizacional experto en engagement y correlaciones.
Interpreta los drivers de engagement de una encuesta de clima organizacional.

Responde ÚNICAMENTE con JSON válido (sin markdown):
{
  "narrative": "Párrafo de 3-5 oraciones interpretando los drivers principales y sus implicaciones",
  "paradoxes": ["paradoja o hallazgo inesperado 1", "paradoja 2"],
  "quick_wins": [{"dimension": "código", "action": "acción concreta", "impact": "impacto esperado"}]
}

Reglas:
- Un quick win es una dimensión con alta correlación con engagement PERO score bajo (< 4.0) — mejorarla tendría mayor impacto
- Las paradojas son patrones inesperados (alta correlación pero alto score, baja correlación pero bajo score, etc.)
- La narrativa debe explicar la estructura causal sin tecnicismos excesivos
- Máximo 3 quick wins, máximo 3 paradojas
- Usa español latinoamericano profesional`;

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
const ALERTS_SYSTEM = `Eres un consultor de clima organizacional que analiza alertas automáticas.
Para cada alerta, genera una hipótesis de causa raíz y una recomendación de acción.

Responde ÚNICAMENTE con JSON array válido (sin markdown):
[{"alert_index": 0, "root_cause": "hipótesis en 1-2 oraciones", "recommendation": "acción concreta en 1-2 oraciones"}]

Reglas:
- Las hipótesis deben ser plausibles y específicas al contexto LATAM
- Las recomendaciones deben ser accionables para un gerente de RRHH de PYME
- No repitas la alerta, solo agrega contexto
- Usa español latinoamericano profesional`;

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
const SEGMENTS_SYSTEM = `Eres un psicólogo organizacional experto en análisis de segmentos demográficos.
Genera perfiles narrativos para cada segmento demográfico basado en sus scores.

Responde ÚNICAMENTE con JSON array válido (sin markdown):
[{"segment": "nombre", "segment_type": "department|tenure|gender", "narrative": "perfil en 2-3 oraciones", "strengths": ["fortaleza1"], "risks": ["riesgo1"]}]

Reglas:
- Cada perfil debe ser único y específico a ese segmento
- Identifica brechas respecto al promedio global
- Las fortalezas son dimensiones donde el segmento supera al global, los riesgos donde está debajo
- Máximo 3 fortalezas y 3 riesgos por segmento
- Usa español latinoamericano profesional`;

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
const TRENDS_SYSTEM = `Eres un consultor de clima organizacional experto en análisis longitudinal.
Analiza la evolución temporal de dimensiones de clima entre mediciones.

Responde ÚNICAMENTE con JSON válido (sin markdown):
{
  "trajectory": "Párrafo de 3-5 oraciones describiendo la trayectoria general",
  "improving": ["dimensión1 mejoró de X a Y"],
  "declining": ["dimensión2 bajó de X a Y"],
  "stable": ["dimensión3 se mantuvo estable en ~X"],
  "inflection_points": ["observación sobre cambio significativo"]
}

Reglas:
- Solo reporta cambios significativos (> 0.15 puntos)
- Identifica si la tendencia general es de mejora, estancamiento o deterioro
- Los puntos de inflexión son cambios notables entre waves
- Usa español latinoamericano profesional`;

export async function generateTrendsNarrative(
  organizationId: string
): Promise<ActionResult<TrendsNarrative>> {
  if (!env.ANTHROPIC_API_KEY && !env.AI_LOCAL_ENDPOINT && !env.OLLAMA_BASE_URL) {
    return {
      success: false,
      error:
        "Motor de IA no configurado. Configure ANTHROPIC_API_KEY, AI_LOCAL_ENDPOINT o OLLAMA_BASE_URL.",
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
  if (!env.ANTHROPIC_API_KEY && !env.AI_LOCAL_ENDPOINT && !env.OLLAMA_BASE_URL) {
    return {
      success: false,
      error:
        "Motor de IA no configurado. Configure ANTHROPIC_API_KEY, AI_LOCAL_ENDPOINT o OLLAMA_BASE_URL en las variables de entorno.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rl = rateLimit(`ai-all:${user?.id ?? "anon"}`, { limit: 2, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: "Demasiadas solicitudes. Intente en un momento." };
  }

  // Get campaign org for trends
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("organization_id")
    .eq("id", campaignId)
    .single();

  if (!campaign) return { success: false, error: "Campaña no encontrada" };

  // Run all analyses in parallel
  const [comments, narrative, drivers, alerts, segments] = await Promise.all([
    analyzeComments(campaignId),
    generateNarrative(campaignId),
    interpretDrivers(campaignId),
    contextualizeAlerts(campaignId),
    profileSegments(campaignId),
  ]);

  // Store successful results in campaign_analytics
  const inserts: Array<{ campaign_id: string; analysis_type: string; data: Json }> = [];

  if (comments.success)
    inserts.push({
      campaign_id: campaignId,
      analysis_type: "comment_analysis",
      data: comments.data as unknown as Json,
    });
  if (narrative.success)
    inserts.push({
      campaign_id: campaignId,
      analysis_type: "dashboard_narrative",
      data: narrative.data as unknown as Json,
    });
  if (drivers.success)
    inserts.push({
      campaign_id: campaignId,
      analysis_type: "driver_insights",
      data: drivers.data as unknown as Json,
    });
  if (alerts.success)
    inserts.push({
      campaign_id: campaignId,
      analysis_type: "alert_context",
      data: alerts.data as unknown as Json,
    });
  if (segments.success)
    inserts.push({
      campaign_id: campaignId,
      analysis_type: "segment_profiles",
      data: segments.data as unknown as Json,
    });

  // Delete previous AI insights before inserting new ones
  const aiTypes = [
    "comment_analysis",
    "dashboard_narrative",
    "driver_insights",
    "alert_context",
    "segment_profiles",
  ];
  await supabase
    .from("campaign_analytics")
    .delete()
    .eq("campaign_id", campaignId)
    .in("analysis_type", aiTypes);

  if (inserts.length > 0) {
    await supabase.from("campaign_analytics").insert(inserts);
  }

  // Also generate trends narrative if there are multiple campaigns
  const trendsResult = await generateTrendsNarrative(campaign.organization_id);
  if (trendsResult.success) {
    await supabase
      .from("campaign_analytics")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "trends_narrative");
    await supabase.from("campaign_analytics").insert({
      campaign_id: campaignId,
      analysis_type: "trends_narrative",
      data: trendsResult.data as unknown as Json,
    });
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "comment_analysis")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No comment analysis found" };
  return { success: true, data: data.data as CommentAnalysis };
}

export async function getDashboardNarrative(
  campaignId: string
): Promise<ActionResult<DashboardNarrative>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "dashboard_narrative")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No dashboard narrative found" };
  return { success: true, data: data.data as DashboardNarrative };
}

export async function getDriverInsights(campaignId: string): Promise<ActionResult<DriverInsights>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "driver_insights")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No driver insights found" };
  return { success: true, data: data.data as DriverInsights };
}

export async function getAlertContext(campaignId: string): Promise<ActionResult<AlertContext>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "alert_context")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No alert context found" };
  return { success: true, data: data.data as AlertContext };
}

export async function getSegmentProfiles(
  campaignId: string
): Promise<ActionResult<SegmentProfiles>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "segment_profiles")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No segment profiles found" };
  return { success: true, data: data.data as SegmentProfiles };
}

export async function getTrendsNarrative(
  campaignId: string
): Promise<ActionResult<TrendsNarrative>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "trends_narrative")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No trends narrative found" };
  return { success: true, data: data.data as TrendsNarrative };
}
