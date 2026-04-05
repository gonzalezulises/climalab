"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { ActionResult } from "@/types";

const RETRY_DELAYS_MS = [0, 1_500, 4_500] as const;
const CIRCUIT_KEY = "circuit:statistical-api";
const CIRCUIT_THRESHOLD = 3; // failures in window before opening
const CIRCUIT_WINDOW_MS = 300_000; // 5 min

async function sendTelegramAlert(message: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ALERT_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ALERT_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Alerting must never crash the caller
  }
}

async function isCircuitOpen(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.rpc(
      "is_circuit_open" as never,
      {
        p_key: CIRCUIT_KEY,
        p_threshold: CIRCUIT_THRESHOLD,
        p_window_ms: CIRCUIT_WINDOW_MS,
      } as never
    );
    return data === true;
  } catch {
    return false; // fail open if check errors
  }
}

async function recordCircuitFailure(): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.rpc(
      "record_circuit_failure" as never,
      {
        p_key: CIRCUIT_KEY,
        p_window_ms: CIRCUIT_WINDOW_MS,
      } as never
    );
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}

async function callStatisticalApi(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ActionResult<string>> {
  if (!env.STATISTICAL_ENGINE_URL) {
    return { success: false, error: "Motor estadístico no configurado (STATISTICAL_ENGINE_URL)" };
  }

  if (await isCircuitOpen()) {
    return {
      success: false,
      error:
        "Motor estadístico temporalmente no disponible (circuit breaker abierto). Se reintentará en 5 minutos.",
    };
  }

  const url = `${env.STATISTICAL_ENGINE_URL}${endpoint}`;
  let lastError = "Error desconocido";

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.STATISTICAL_API_SECRET
            ? { Authorization: `Bearer ${env.STATISTICAL_API_SECRET}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300_000),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data.status ?? "completed" };
      }

      // 4xx — not retriable
      if (response.status >= 400 && response.status < 500) {
        return { success: false, error: `Motor estadístico: error ${response.status}` };
      }

      // Log detail internally, never propagate raw body to caller or alerts
      const detail = (await response.text()).slice(0, 200);
      console.error(
        JSON.stringify({
          level: "error",
          service: "statistical-api",
          endpoint,
          status: response.status,
          detail,
          ts: new Date().toISOString(),
        })
      );
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Error de red";
    }

    console.error(
      JSON.stringify({
        level: "error",
        service: "statistical-api",
        endpoint,
        attempt: attempt + 1,
        maxAttempts: RETRY_DELAYS_MS.length,
        error: lastError,
        campaignId: body.campaign_id ?? null,
        ts: new Date().toISOString(),
      })
    );
  }

  // All retries exhausted — open the circuit and alert
  const failureCount = await recordCircuitFailure();

  const criticalLog = {
    level: "critical",
    service: "statistical-api",
    endpoint,
    error: `Todos los intentos fallaron. Último: ${lastError}`,
    failureCount,
    circuitOpen: failureCount >= CIRCUIT_THRESHOLD,
    campaignId: body.campaign_id ?? null,
    ts: new Date().toISOString(),
  };

  console.error(JSON.stringify(criticalLog));

  if (failureCount >= CIRCUIT_THRESHOLD) {
    await sendTelegramAlert(
      `🔴 <b>ClimaLab — Statistical API caída</b>\n\n` +
        `Endpoint: <code>${endpoint}</code>\n` +
        `Fallos en ventana: <b>${failureCount}</b>\n` +
        `Último error: <code>${lastError}</code>\n` +
        `Circuit breaker <b>ABIERTO</b> por 5 min.\n` +
        `Campaña: <code>${body.campaign_id ?? "—"}</code>`
    );
  }

  return {
    success: false,
    error: `Motor estadístico no disponible tras ${RETRY_DELAYS_MS.length} intentos. Último error: ${lastError}`,
  };
}

async function verifyAccess(campaignId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("campaigns").select("id").eq("id", campaignId).maybeSingle();
  return !!data;
}

export async function runCampaignCFA(campaignId: string): Promise<ActionResult<string>> {
  if (!(await verifyAccess(campaignId))) return { success: false, error: "Campaña no encontrada" };
  return callStatisticalApi("/cfa", { campaign_id: campaignId });
}

export async function runCampaignInvariance(campaignId: string): Promise<ActionResult<string>> {
  if (!(await verifyAccess(campaignId))) return { success: false, error: "Campaña no encontrada" };
  return callStatisticalApi("/invariance", { campaign_id: campaignId });
}

export async function runCampaignHLM(campaignId: string): Promise<ActionResult<string>> {
  if (!(await verifyAccess(campaignId))) return { success: false, error: "Campaña no encontrada" };
  return callStatisticalApi("/hlm", { campaign_id: campaignId });
}

export async function getCampaignCFA(campaignId: string): Promise<ActionResult<unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "cfa_campaign")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data?.data ?? null };
}

export async function getCampaignInvariance(campaignId: string): Promise<ActionResult<unknown[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "invariance_campaign")
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).map((row) => row.data) };
}

export async function getCampaignHLM(campaignId: string): Promise<ActionResult<unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "hlm_campaign")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data?.data ?? null };
}
