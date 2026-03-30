"use server";

import { execFile } from "child_process";
import { promisify } from "util";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const execFileAsync = promisify(execFile);

async function runStatisticalEngine(
  subcommand: string,
  campaignId: string
): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "uv",
      ["run", "scripts/statistical-engine.py", subcommand, campaignId],
      { timeout: 300_000 }
    );
    return { success: true, data: stdout + (stderr ? `\n${stderr}` : "") };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error ejecutando motor estadístico",
    };
  }
}

export async function runCampaignCFA(campaignId: string): Promise<ActionResult<string>> {
  return runStatisticalEngine("cfa", campaignId);
}

export async function runCampaignInvariance(campaignId: string): Promise<ActionResult<string>> {
  return runStatisticalEngine("invariance", campaignId);
}

export async function runCampaignHLM(campaignId: string): Promise<ActionResult<string>> {
  return runStatisticalEngine("hlm", campaignId);
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
