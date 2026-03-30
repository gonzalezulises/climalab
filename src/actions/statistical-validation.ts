"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { ActionResult } from "@/types";

async function callStatisticalApi(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ActionResult<string>> {
  if (!env.STATISTICAL_ENGINE_URL) {
    return { success: false, error: "Motor estadístico no configurado (STATISTICAL_ENGINE_URL)" };
  }

  try {
    const response = await fetch(`${env.STATISTICAL_ENGINE_URL}${endpoint}`, {
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

    if (!response.ok) {
      const detail = await response.text();
      return { success: false, error: `Motor estadístico: ${detail}` };
    }

    const data = await response.json();
    return { success: true, data: data.status ?? "completed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error contactando motor estadístico",
    };
  }
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
