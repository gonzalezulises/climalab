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
import { buildWaveComparisonFromStats } from "@/lib/analysis-engine/wave-comparison";
import type { ActionResult, Campaign, CampaignResult, Respondent } from "@/types";
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
      const { data: prevCampaign } = await admin
        .from("campaigns")
        .select("id")
        .eq("organization_id", campaignForOrg.organization_id)
        .in("status", ["closed", "archived"])
        .neq("id", campaignId)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevCampaign) {
        const { data: prevResults } = await admin
          .from("campaign_results")
          .select("dimension_code, avg_score, std_score, respondent_count")
          .eq("campaign_id", prevCampaign.id)
          .eq("result_type", "dimension")
          .eq("segment_type", "global");

        if (prevResults && prevResults.length > 0) {
          const prevByDim = new Map(
            prevResults
              .filter((r) => r.dimension_code != null)
              .map((r) => [r.dimension_code!, r] as const)
          );

          for (const row of output.results) {
            if (
              row.result_type === "dimension" &&
              row.segment_type === "global" &&
              row.dimension_code
            ) {
              const prev = prevByDim.get(row.dimension_code);
              if (prev && prev.avg_score != null && row.avg_score != null) {
                const wc = buildWaveComparisonFromStats({
                  currentAvg: row.avg_score,
                  currentStd: row.std_score ?? 0.5,
                  currentN: row.respondent_count ?? 0,
                  previousAvg: Number(prev.avg_score),
                  previousStd: Number(prev.std_score) || 0.5,
                  previousN: prev.respondent_count ?? 0,
                  previousCampaignId: prevCampaign.id,
                });
                if (wc) {
                  row.metadata = {
                    ...(row.metadata as Record<string, unknown>),
                    wave_comparison: wc,
                  } as Json;
                }
              }
            }
          }
        }
      }
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

  try {
    const { execFile } = await import("child_process");
    const insertedRun = await admin
      .from("campaign_ona_runs")
      .insert({
        campaign_id: campaignId,
        analysis_run_id: analysisRunId,
        status: "pending",
        backend: "uv/python3",
        details: {
          trigger_source: options?.triggerSource ?? (user ? "manual" : "batch"),
        },
      })
      .select("id")
      .single();

    const onaRunId = insertedRun.data?.id as string | undefined;
    const script = `${process.cwd()}/scripts/ona-analysis.py`;

    const updateOnaRunStatus = (nextStatus: string, errorMsg: string | null) => {
      if (onaRunId) {
        admin
          .from("campaign_ona_runs")
          .update({
            status: nextStatus,
            error_message: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", onaRunId)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error(`Failed to update ONA run ${onaRunId} status:`, updateError.message);
            }
          });
      }
    };

    // Try uv first, fall back to python3
    execFile("uv", ["run", script, campaignId], (uvError) => {
      if (uvError) {
        execFile("python3", [script, campaignId], (pyError) => {
          const nextStatus = pyError ? "deferred" : "completed";
          if (pyError) console.warn("ONA deferred:", pyError.message);
          updateOnaRunStatus(nextStatus, pyError?.message ?? null);
        });
      } else {
        updateOnaRunStatus("completed", null);
      }
    });
  } catch {
    await admin.from("campaign_ona_runs").insert({
      campaign_id: campaignId,
      analysis_run_id: analysisRunId,
      status: "deferred",
      backend: "unavailable",
      error_message: "python_runtime_unavailable",
    });
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/results`);

  return { success: true, data: undefined };
}
