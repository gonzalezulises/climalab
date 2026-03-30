"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  createAnalysisRun,
  failAnalysisRun,
  loadCampaignAnalysisDataset,
  materializeAnalysisRun,
  persistRespondentQuality,
  scoreCampaignDataset,
  type AnalysisRunTriggerSource,
} from "@/lib/analysis-engine";
import {
  compareCampaignsOperation,
  createCampaignOperation,
  generateRespondentLinksOperation,
  getCampaignOperation,
  getCampaignResultsOperation,
  getCampaignsOperation,
  getOpenResponsesOperation,
  getRespondentsOperation,
  updateCampaignConfigOperation,
  updateCampaignStatusOperation,
} from "@/lib/campaigns/operations";
import { enrichResultsWithWaveComparison } from "@/lib/analysis-engine/wave-comparison";
import type { ActionResult, Campaign, CampaignResult, Respondent } from "@/types";
import { env } from "@/lib/env";
import type { Json } from "@/types/database";
import type {
  CreateCampaignInput,
  GenerateLinksInput,
  UpdateCampaignConfigInput,
  UpdateCampaignStatusInput,
} from "@/lib/validations/campaign";

export async function getCampaigns(orgId?: string): Promise<ActionResult<Campaign[]>> {
  return getCampaignsOperation(orgId);
}

export async function getCampaign(id: string): Promise<ActionResult<Campaign>> {
  return getCampaignOperation(id);
}

export async function createCampaign(input: CreateCampaignInput): Promise<ActionResult<Campaign>> {
  return createCampaignOperation(input);
}

export async function updateCampaignConfig(
  input: UpdateCampaignConfigInput
): Promise<ActionResult<Campaign>> {
  return updateCampaignConfigOperation(input);
}

export async function updateCampaignStatus(
  input: UpdateCampaignStatusInput
): Promise<ActionResult<Campaign>> {
  return updateCampaignStatusOperation(input);
}

export async function generateRespondentLinks(
  input: GenerateLinksInput
): Promise<ActionResult<Respondent[]>> {
  return generateRespondentLinksOperation(input);
}

export async function getRespondents(campaignId: string): Promise<ActionResult<Respondent[]>> {
  return getRespondentsOperation(campaignId);
}

export async function getCampaignResults(
  campaignId: string
): Promise<ActionResult<CampaignResult[]>> {
  return getCampaignResultsOperation(campaignId);
}

export async function getOpenResponses(
  campaignId: string
): Promise<ActionResult<{ question_type: string; text: string }[]>> {
  return getOpenResponsesOperation(campaignId);
}

export async function compareCampaigns(
  currentId: string,
  previousId: string
): Promise<
  ActionResult<{
    current: { code: string; name: string; avg: number; fav: number }[];
    previous: { code: string; name: string; avg: number; fav: number }[];
  }>
> {
  return compareCampaignsOperation(currentId, previousId);
}

export async function calculateResults(
  campaignId: string,
  options?: { triggerSource?: AnalysisRunTriggerSource }
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const rateLimitResult = rateLimit(`calc:${user.id}`, { limit: 3, windowMs: 60_000 });
    if (!rateLimitResult.success) {
      return { success: false, error: "Demasiadas solicitudes. Intente en un momento." };
    }
  }

  // Check for concurrent analysis
  const { data: runningAnalysis } = await admin
    .from("analysis_runs")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "running")
    .maybeSingle();

  if (runningAnalysis) {
    return { success: false, error: "Ya hay un análisis en progreso para esta campaña" };
  }

  const reader = user ? supabase : admin;
  let analysisRunId: string | null = null;

  try {
    const dataset = await loadCampaignAnalysisDataset(reader as never, campaignId);

    if (dataset.respondents.length === 0) {
      return { success: false, error: "No hay respuestas completadas" };
    }

    analysisRunId = await createAnalysisRun(admin as never, {
      campaignId,
      triggerSource: options?.triggerSource ?? (user ? "manual" : "batch"),
      inputSnapshot: {
        instrument_ids: dataset.campaignInstruments.map((entry) => entry.instrumentId),
        respondent_count: dataset.respondents.length,
        response_count: dataset.responses.length,
      } as Json,
    });

    const output = scoreCampaignDataset(dataset);

    // Wave comparison enrichment
    const { data: campaignForOrg } = await admin
      .from("campaigns")
      .select("organization_id")
      .eq("id", campaignId)
      .single();

    if (campaignForOrg?.organization_id) {
      await enrichResultsWithWaveComparison(
        admin as never,
        campaignId,
        campaignForOrg.organization_id,
        output.results
      );
    }

    await persistRespondentQuality(admin as never, analysisRunId, output.respondentQuality);
    await materializeAnalysisRun(admin as never, {
      analysisRunId,
      campaignId,
      output,
    });
  } catch (error) {
    if (analysisRunId) {
      await failAnalysisRun(
        admin as never,
        analysisRunId,
        error instanceof Error ? error.message : "Fallo inesperado en análisis"
      );
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudieron calcular los resultados",
    };
  }

  const statisticalUrl = env.STATISTICAL_ENGINE_URL;

  if (statisticalUrl) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.STATISTICAL_API_SECRET) {
      headers["Authorization"] = `Bearer ${env.STATISTICAL_API_SECRET}`;
    }
    const body = JSON.stringify({ campaign_id: campaignId });

    // ONA — fire and forget
    const onaRun = await admin
      .from("campaign_ona_runs")
      .insert({
        campaign_id: campaignId,
        analysis_run_id: analysisRunId,
        status: "pending",
        backend: "statistical-api",
        details: { trigger_source: options?.triggerSource ?? (user ? "manual" : "batch") },
      })
      .select("id")
      .single();
    const onaRunId = onaRun.data?.id as string | undefined;

    fetch(`${statisticalUrl}/ona`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(300_000),
    })
      .then(async (res) => {
        const status = res.ok ? "completed" : "deferred";
        const errorMsg = res.ok ? null : await res.text();
        if (onaRunId) {
          await admin
            .from("campaign_ona_runs")
            .update({ status, error_message: errorMsg, updated_at: new Date().toISOString() })
            .eq("id", onaRunId);
        }
      })
      .catch((err) => {
        if (onaRunId) {
          admin
            .from("campaign_ona_runs")
            .update({
              status: "deferred",
              error_message: err.message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", onaRunId)
            .then(({ error }) => {
              if (error) console.error("ONA status update failed:", error.message);
            });
        }
      });

    // Auto-trigger CFA + HLM if thresholds met (fire and forget)
    const { data: sampleRow } = await admin
      .from("campaign_results")
      .select("respondent_count")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global")
      .limit(1)
      .maybeSingle();
    const respondentCount = sampleRow?.respondent_count ?? 0;

    if (respondentCount >= 100) {
      fetch(`${statisticalUrl}/cfa`, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(300_000),
      }).catch((err) => console.warn("CFA auto-trigger failed:", err.message));
    }
    if (respondentCount >= 50) {
      fetch(`${statisticalUrl}/hlm`, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(300_000),
      }).catch((err) => console.warn("HLM auto-trigger failed:", err.message));
    }
  } else {
    // No statistical API configured — mark ONA as deferred
    await admin.from("campaign_ona_runs").insert({
      campaign_id: campaignId,
      analysis_run_id: analysisRunId,
      status: "deferred",
      backend: "unavailable",
      error_message: "STATISTICAL_ENGINE_URL not configured",
    });
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/results`);

  return { success: true, data: undefined };
}
