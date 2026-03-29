import "server-only";

import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";
import { selectBackfillCandidates, type BackfillCandidate } from "@/lib/backfill-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateResults } from "@/actions/campaigns";

export async function getBackfillCandidates(input: {
  limit?: number;
  force?: boolean;
  organizationId?: string;
}) {
  const admin = createAdminClient();
  let campaignsQuery = admin
    .from("campaigns")
    .select("id, name, status, organization_id")
    .in("status", ["closed", "archived"]);

  if (input.organizationId) {
    campaignsQuery = campaignsQuery.eq("organization_id", input.organizationId);
  }

  const { data: campaigns, error: campaignsError } = await campaignsQuery.order("created_at", {
    ascending: false,
  });

  if (campaignsError) {
    throw new Error(campaignsError.message);
  }

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  if (campaignIds.length === 0) {
    return [];
  }

  const [{ data: runs, error: runsError }, { data: snapshots, error: snapshotsError }] =
    await Promise.all([
      admin
        .from("analysis_runs")
        .select("campaign_id, logic_version, completed_at, status")
        .in("campaign_id", campaignIds)
        .eq("status", "completed")
        .order("completed_at", { ascending: false }),
      admin
        .from("analysis_run_snapshots")
        .select("campaign_id, analysis_run_id")
        .in("campaign_id", campaignIds),
    ]);

  if (runsError || snapshotsError) {
    throw new Error(runsError?.message ?? snapshotsError?.message ?? "No se pudo cargar backfill");
  }

  const latestRunByCampaign = new Map<
    string,
    { logicVersion: string; completedAt: string | null }
  >();
  for (const run of runs ?? []) {
    if (!latestRunByCampaign.has(run.campaign_id)) {
      latestRunByCampaign.set(run.campaign_id, {
        logicVersion: run.logic_version,
        completedAt: run.completed_at,
      });
    }
  }

  const snapshotCampaigns = new Set((snapshots ?? []).map((snapshot) => snapshot.campaign_id));

  return selectBackfillCandidates(
    (campaigns ?? []).map<BackfillCandidate>((campaign) => ({
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignStatus: campaign.status,
      latestLogicVersion: latestRunByCampaign.get(campaign.id)?.logicVersion ?? null,
      latestCompletedAt: latestRunByCampaign.get(campaign.id)?.completedAt ?? null,
      hasSnapshot: snapshotCampaigns.has(campaign.id),
    })),
    {
      limit: input.limit,
      force: input.force,
      targetLogicVersion: ANALYSIS_LOGIC_VERSION,
    }
  );
}

export async function backfillCampaignAnalyses(input: {
  campaignIds?: string[];
  limit?: number;
  force?: boolean;
  organizationId?: string;
}) {
  const selected =
    input.campaignIds && input.campaignIds.length > 0
      ? input.campaignIds.map((campaignId) => ({
          campaignId,
          campaignName: campaignId,
          campaignStatus: "manual",
          latestLogicVersion: null,
          latestCompletedAt: null,
          hasSnapshot: false,
          reason: "never_analyzed" as const,
        }))
      : await getBackfillCandidates({
          limit: input.limit,
          force: input.force,
          organizationId: input.organizationId,
        });

  const results = [];
  for (const campaign of selected) {
    const result = await calculateResults(campaign.campaignId, {
      triggerSource: "manual",
    });

    results.push({
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      reason: campaign.reason,
      success: result.success,
      error: result.success ? null : result.error,
    });
  }

  return {
    targetLogicVersion: ANALYSIS_LOGIC_VERSION,
    selected,
    processed: selected.length,
    succeeded: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  };
}
