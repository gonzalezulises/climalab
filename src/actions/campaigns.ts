"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  createCampaignSchema,
  updateCampaignStatusSchema,
  updateCampaignConfigSchema,
  generateLinksSchema,
  type CreateCampaignInput,
  type UpdateCampaignStatusInput,
  type UpdateCampaignConfigInput,
  type GenerateLinksInput,
} from "@/lib/validations/campaign";
import type { ActionResult, Campaign, CampaignResult, Respondent } from "@/types";
import type { Json } from "@/types/database";
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

// ---------------------------------------------------------------------------
// getCampaigns — list campaigns with basic stats
// ---------------------------------------------------------------------------
export async function getCampaigns(orgId?: string): Promise<ActionResult<Campaign[]>> {
  const supabase = await createClient();

  let query = supabase.from("campaigns").select("*").order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getCampaign — single campaign detail
// ---------------------------------------------------------------------------
export async function getCampaign(id: string): Promise<ActionResult<Campaign>> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// createCampaign
// ---------------------------------------------------------------------------
export async function createCampaign(input: CreateCampaignInput): Promise<ActionResult<Campaign>> {
  const parsed = createCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  // Validate module instruments exist and are type 'module'
  const moduleIds = parsed.data.module_instrument_ids;
  if (moduleIds && moduleIds.length > 0) {
    const { data: modules, error: modError } = await supabase
      .from("instruments")
      .select("id")
      .in("id", moduleIds)
      .eq("instrument_type", "module");

    if (modError) {
      return { success: false, error: modError.message };
    }
    if (!modules || modules.length !== moduleIds.length) {
      return { success: false, error: "Uno o más módulos seleccionados no son válidos" };
    }
  }

  const { data, error } = await supabase.from("campaigns").insert(parsed.data).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/campaigns");
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// updateCampaignConfig — edit campaign settings (only in draft)
// ---------------------------------------------------------------------------
export async function updateCampaignConfig(
  input: UpdateCampaignConfigInput
): Promise<ActionResult<Campaign>> {
  const parsed = updateCampaignConfigSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  // Verify campaign is in draft
  const { data: existing } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", parsed.data.id)
    .single();

  if (!existing) {
    return { success: false, error: "Campaña no encontrada" };
  }

  if (existing.status !== "draft") {
    return { success: false, error: "Solo se pueden editar campañas en borrador" };
  }

  const { id, ...updates } = parsed.data;

  // Remove undefined fields
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(cleanUpdates).length === 0) {
    return { success: false, error: "No hay cambios" };
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(cleanUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// updateCampaignStatus — draft->active, active->closed, etc.
// ---------------------------------------------------------------------------
export async function updateCampaignStatus(
  input: UpdateCampaignStatusInput
): Promise<ActionResult<Campaign>> {
  const parsed = updateCampaignStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${parsed.data.id}`);
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// generateRespondentLinks
// ---------------------------------------------------------------------------
export async function generateRespondentLinks(
  input: GenerateLinksInput
): Promise<ActionResult<Respondent[]>> {
  const parsed = generateLinksSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();

  const rows = Array.from({ length: parsed.data.count }, () => ({
    campaign_id: parsed.data.campaign_id,
  }));

  const { data, error } = await supabase.from("respondents").insert(rows).select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/campaigns/${parsed.data.campaign_id}`);
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getRespondents — list respondents for a campaign
// ---------------------------------------------------------------------------
export async function getRespondents(campaignId: string): Promise<ActionResult<Respondent[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("respondents")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getCampaignResults
// ---------------------------------------------------------------------------
export async function getCampaignResults(
  campaignId: string
): Promise<ActionResult<CampaignResult[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_results")
    .select("*")
    .eq("campaign_id", campaignId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// getOpenResponses — anonymous open comments for a campaign
// ---------------------------------------------------------------------------
export async function getOpenResponses(
  campaignId: string
): Promise<ActionResult<{ question_type: string; text: string }[]>> {
  const supabase = await createClient();

  const { data: respondents } = await supabase
    .from("respondents")
    .select("id")
    .eq("campaign_id", campaignId)
    .in("status", ["completed"]);

  if (!respondents || respondents.length === 0) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from("open_responses")
    .select("question_type, text")
    .in(
      "respondent_id",
      respondents.map((r) => r.id)
    )
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}

// ---------------------------------------------------------------------------
// compareCampaigns — wave-over-wave dimension comparison
// ---------------------------------------------------------------------------
export async function compareCampaigns(
  currentId: string,
  previousId: string
): Promise<
  ActionResult<{
    current: { code: string; name: string; avg: number; fav: number }[];
    previous: { code: string; name: string; avg: number; fav: number }[];
  }>
> {
  const supabase = await createClient();

  const [currentResults, previousResults] = await Promise.all([
    supabase
      .from("campaign_results")
      .select("*")
      .eq("campaign_id", currentId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
    supabase
      .from("campaign_results")
      .select("*")
      .eq("campaign_id", previousId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
  ]);

  if (currentResults.error || previousResults.error) {
    return { success: false, error: "Error obteniendo resultados" };
  }

  const mapResults = (data: typeof currentResults.data) =>
    (data ?? []).map((r) => ({
      code: r.dimension_code!,
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code!,
      avg: r.avg_score ?? 0,
      fav: r.favorability_pct ?? 0,
    }));

  return {
    success: true,
    data: {
      current: mapResults(currentResults.data),
      previous: mapResults(previousResults.data),
    },
  };
}

// ---------------------------------------------------------------------------
// calculateResults — the statistical calculation engine
// ---------------------------------------------------------------------------
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
    const rl = rateLimit(`calc:${user.id}`, { limit: 3, windowMs: 60_000 });
    if (!rl.success) {
      return { success: false, error: "Demasiadas solicitudes. Intente en un momento." };
    }
  }

  // Server-to-server callers (batch/jobs) have no authenticated session, so
  // we must bypass RLS for the calculation reads while keeping the regular
  // authenticated path unchanged for dashboard-triggered recalculations.
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

  // Non-blocking ONA analysis (Python-dependent, fails gracefully)
  try {
    const { exec } = await import("child_process");
    const script = `${process.cwd()}/scripts/ona-analysis.py`;
    // Try uv first (auto-resolves deps), fallback to python3
    const cmd = `uv run ${script} ${campaignId} 2>/dev/null || python3 ${script} ${campaignId}`;
    exec(cmd, { env: process.env }, (error: Error | null) => {
      if (error) console.warn("ONA deferred:", error.message);
    });
  } catch {
    /* Python not available */
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/results`);

  return { success: true, data: undefined };
}
