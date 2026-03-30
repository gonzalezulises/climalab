import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Json = Database["public"]["Tables"]["campaign_ai_insights"]["Insert"]["data"];

export type CampaignAiInsightType =
  | "comment_analysis"
  | "dashboard_narrative"
  | "driver_insights"
  | "alert_context"
  | "segment_profiles"
  | "trends_narrative";

export type CampaignAiInsightInsert = {
  campaign_id: string;
  insight_type: CampaignAiInsightType;
  provider: string | null;
  model: string | null;
  data: Json;
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

export async function getCampaignAiInsight<T>(
  campaignId: string,
  insightType: CampaignAiInsightType
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_ai_insights")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("insight_type", insightType)
    .maybeSingle();

  if (error) return { success: false as const, error: error.message };
  if (!data) return { success: false as const, error: `No ${insightType} found` };

  return {
    success: true as const,
    data: data.data as T,
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
