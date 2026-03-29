import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateResults } from "@/actions/campaigns";
import type { AnalysisRunTriggerSource } from "@/lib/analysis-engine";
import { selectBatchAnalysisMode } from "@/lib/pipeline-strategy";

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

export async function getCampaignBatchPlans(hours = 24) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data: responseRows, error: responseError } = await admin
    .from("responses")
    .select("answered_at, respondents!inner(campaign_id)")
    .gte("answered_at", since);

  if (responseError) {
    throw new Error(responseError.message);
  }

  const responseCounts = new Map<string, number>();
  for (const row of responseRows ?? []) {
    const respondent = row.respondents as { campaign_id?: string } | null;
    if (!respondent?.campaign_id) {
      continue;
    }

    responseCounts.set(
      respondent.campaign_id,
      (responseCounts.get(respondent.campaign_id) ?? 0) + 1
    );
  }

  const campaignIds = [...responseCounts.keys()];
  if (campaignIds.length === 0) {
    return [];
  }

  const [{ data: campaigns, error: campaignsError }, { data: analysisRuns, error: runsError }] =
    await Promise.all([
      admin.from("campaigns").select("id, status").in("id", campaignIds),
      admin
        .from("analysis_runs")
        .select("campaign_id, logic_version, completed_at, status")
        .in("campaign_id", campaignIds)
        .eq("status", "completed")
        .order("completed_at", { ascending: false }),
    ]);

  if (campaignsError || runsError) {
    throw new Error(
      campaignsError?.message ?? runsError?.message ?? "No se pudieron planificar campañas"
    );
  }

  const latestRunByCampaign = new Map<string, { logicVersion: string | null }>();
  for (const run of analysisRuns ?? []) {
    if (!latestRunByCampaign.has(run.campaign_id)) {
      latestRunByCampaign.set(run.campaign_id, {
        logicVersion: run.logic_version,
      });
    }
  }

  return (campaigns ?? []).map((campaign) => ({
    campaignId: campaign.id,
    recentResponseCount: responseCounts.get(campaign.id) ?? 0,
    mode: selectBatchAnalysisMode({
      campaignStatus: campaign.status,
      recentResponseCount: responseCounts.get(campaign.id) ?? 0,
      latestLogicVersion: latestRunByCampaign.get(campaign.id)?.logicVersion ?? null,
    }),
    latestLogicVersion: latestRunByCampaign.get(campaign.id)?.logicVersion ?? null,
    campaignStatus: campaign.status,
  }));
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
  const startedAt = Date.now();
  const result = await calculateResults(campaignId, { triggerSource });
  return {
    campaignId,
    durationMs: Date.now() - startedAt,
    success: result.success,
    error: result.success ? null : result.error,
  };
}
