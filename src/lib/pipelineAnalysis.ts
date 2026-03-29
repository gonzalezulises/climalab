import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateResults } from "@/actions/campaigns";
import type { AnalysisRunTriggerSource } from "@/lib/analysis-engine";

export async function getCampaignsWithRecentResponses(hours = 24) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("responses")
    .select("respondents!inner(campaign_id), answered_at")
    .gte("answered_at", since);

  if (error) {
    throw new Error(error.message);
  }

  const campaignIds = new Set<string>();
  for (const row of data ?? []) {
    const respondent = row.respondents as { campaign_id?: string } | null;
    if (respondent?.campaign_id) {
      campaignIds.add(respondent.campaign_id);
    }
  }

  return [...campaignIds];
}

export async function refreshCampaignStats(campaignId: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("refresh_campaign_stats", {
    p_campaign_id: campaignId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function runBatchAnalysisForCampaign(
  campaignId: string,
  triggerSource: AnalysisRunTriggerSource = "batch"
) {
  const result = await calculateResults(campaignId, { triggerSource });
  return {
    campaignId,
    success: result.success,
    error: result.success ? null : result.error,
  };
}
