import { createClient } from "@/lib/supabase/server";
import {
  extractInsightContent,
  type CampaignAiInsightStatus,
  type CampaignAiInsightType,
} from "@/lib/ai/contracts";
import type { Database } from "@/types/database";

type Json = Database["public"]["Tables"]["campaign_ai_insights"]["Insert"]["data"];

export type CampaignAiInsightInsert = {
  campaign_id: string;
  insight_type: CampaignAiInsightType;
  provider: string | null;
  model: string | null;
  data: Json;
  status?: CampaignAiInsightStatus;
  prompt_version?: string | null;
  schema_version?: string | null;
  input_fingerprint?: string | null;
  warnings?: Json;
  validation_errors?: Json;
  generated_at?: string | null;
  published_at?: string | null;
};

export type CampaignAiGenerationEventInsert = {
  campaign_id: string;
  analysis_run_id?: string | null;
  insight_type: CampaignAiInsightType;
  provider: string | null;
  model: string | null;
  prompt_version?: string | null;
  schema_version?: string | null;
  status: string;
  error_message?: string | null;
  latency_ms?: number | null;
  raw_excerpt?: string | null;
  input_fingerprint?: string | null;
  warnings?: Json;
  validation_errors?: Json;
};

export async function replaceCampaignAiInsights(
  campaignId: string,
  insightTypes: CampaignAiInsightType[],
  inserts: CampaignAiInsightInsert[]
) {
  const supabase = await createClient();

  await supabase
    .from("campaign_ai_insights")
    .delete()
    .eq("campaign_id", campaignId)
    .in("insight_type", insightTypes);

  if (inserts.length > 0) {
    await supabase.from("campaign_ai_insights").insert(inserts);
  }
}

export async function insertCampaignAiGenerationEvent(event: CampaignAiGenerationEventInsert) {
  const supabase = await createClient();
  await supabase.from("campaign_ai_generation_events").insert(event);
}

export async function updateCampaignAiInsightStatus(
  campaignId: string,
  insightType: CampaignAiInsightType,
  status: CampaignAiInsightStatus
) {
  const supabase = await createClient();
  const patch: Database["public"]["Tables"]["campaign_ai_insights"]["Update"] = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "published") {
    patch.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("campaign_ai_insights")
    .update(patch)
    .eq("campaign_id", campaignId)
    .eq("insight_type", insightType);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listCampaignAiInsights(campaignId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_ai_insights")
    .select(
      "id, campaign_id, analysis_run_id, insight_type, provider, model, data, status, prompt_version, schema_version, input_fingerprint, warnings, validation_errors, generated_at, published_at, created_at, updated_at"
    )
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listCampaignAiGenerationEvents(campaignId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_ai_generation_events")
    .select(
      "id, campaign_id, analysis_run_id, insight_type, provider, model, prompt_version, schema_version, status, error_message, latency_ms, raw_excerpt, input_fingerprint, warnings, validation_errors, created_at"
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getCampaignAiInsight<T>(
  campaignId: string,
  insightType: CampaignAiInsightType
) {
  const supabase = await createClient();

  const publishedResult = await supabase
    .from("campaign_ai_insights")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("insight_type", insightType)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (publishedResult.error) {
    return { success: false as const, error: publishedResult.error.message };
  }

  if (publishedResult.data) {
    return {
      success: true as const,
      data: extractInsightContent<T>(publishedResult.data.data),
    };
  }

  const fallbackResult = await supabase
    .from("campaign_ai_insights")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("insight_type", insightType)
    .in("status", ["draft", "approved"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackResult.error) return { success: false as const, error: fallbackResult.error.message };
  if (!fallbackResult.data) return { success: false as const, error: `No ${insightType} found` };

  return {
    success: true as const,
    data: extractInsightContent<T>(fallbackResult.data.data),
  };
}

export async function getCampaignOrganizationId(campaignId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("organization_id")
    .eq("id", campaignId)
    .single();

  return data?.organization_id ?? null;
}
