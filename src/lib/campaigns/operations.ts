import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCampaignSchema,
  generateLinksSchema,
  updateCampaignConfigSchema,
  updateCampaignStatusSchema,
  type CreateCampaignInput,
  type GenerateLinksInput,
  type UpdateCampaignConfigInput,
  type UpdateCampaignStatusInput,
} from "@/lib/validations/campaign";
import type { ActionResult, Campaign, CampaignResult, Respondent } from "@/types";

export async function getCampaignsOperation(orgId?: string): Promise<ActionResult<Campaign[]>> {
  const supabase = await createClient();
  let query = supabase.from("campaigns").select("*").order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getCampaignOperation(id: string): Promise<ActionResult<Campaign>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createCampaignOperation(
  input: CreateCampaignInput
): Promise<ActionResult<Campaign>> {
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const supabase = await createClient();
  const moduleIds = parsed.data.module_instrument_ids;

  if (moduleIds && moduleIds.length > 0) {
    const { data: modules, error } = await supabase
      .from("instruments")
      .select("id")
      .in("id", moduleIds)
      .eq("instrument_type", "module");

    if (error) return { success: false, error: error.message };
    if (!modules || modules.length !== moduleIds.length) {
      return { success: false, error: "Uno o más módulos seleccionados no son válidos" };
    }
  }

  const { data, error } = await supabase.from("campaigns").insert(parsed.data).select().single();
  if (error) return { success: false, error: error.message };

  revalidatePath("/campaigns");
  return { success: true, data };
}

export async function updateCampaignConfigOperation(
  input: UpdateCampaignConfigInput
): Promise<ActionResult<Campaign>> {
  const parsed = updateCampaignConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const supabase = await createClient();
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
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
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

  if (error) return { success: false, error: error.message };

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { success: true, data };
}

export async function updateCampaignStatusOperation(
  input: UpdateCampaignStatusInput
): Promise<ActionResult<Campaign>> {
  const parsed = updateCampaignStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${parsed.data.id}`);
  return { success: true, data };
}

export async function generateRespondentLinksOperation(
  input: GenerateLinksInput
): Promise<ActionResult<Respondent[]>> {
  const parsed = generateLinksSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const supabase = await createClient();
  const rows = Array.from({ length: parsed.data.count }, () => ({
    campaign_id: parsed.data.campaign_id,
  }));

  const { data, error } = await supabase.from("respondents").insert(rows).select();
  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${parsed.data.campaign_id}`);
  return { success: true, data };
}

export async function getRespondentsOperation(
  campaignId: string
): Promise<ActionResult<Respondent[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("respondents")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getCampaignResultsOperation(
  campaignId: string
): Promise<ActionResult<CampaignResult[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_results")
    .select("*")
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getOpenResponsesOperation(
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
      respondents.map((respondent) => respondent.id)
    )
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function compareCampaignsOperation(
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
    (data ?? []).map((row) => ({
      code: row.dimension_code!,
      name: (row.metadata as { dimension_name?: string })?.dimension_name ?? row.dimension_code!,
      avg: row.avg_score ?? 0,
      fav: row.favorability_pct ?? 0,
    }));

  return {
    success: true,
    data: {
      current: mapResults(currentResults.data),
      previous: mapResults(previousResults.data),
    },
  };
}
