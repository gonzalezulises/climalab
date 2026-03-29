import "server-only";

import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";
import {
  buildBackfillExecutionSummary,
  selectBackfillCandidates,
  type BackfillCandidate,
  type BackfillExecutionResult,
} from "@/lib/backfill-analysis";
import { classifyBackfillDriftFromComparison, summarizeBackfillDrift } from "@/lib/backfill-drift";
import { buildBackfillAlertEvents } from "@/lib/pipeline-alerts";
import { dispatchPipelineNotifications } from "@/lib/pipeline-notifications";
import { summarizePerformanceDurations } from "@/lib/performance-metrics";
import { loadCampaignQuality, loadStatisticalHealth } from "@/lib/campaign-quality";
import { buildCampaignDataQuality } from "@/lib/data-quality";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateResults } from "@/actions/campaigns";
import {
  compareAnalysisSnapshots,
  type AnalysisRunSnapshot,
} from "@/lib/analysis-engine/snapshots";

const EMPTY_CAMPAIGN_QUALITY = buildCampaignDataQuality({
  respondentsTotal: 0,
  validRespondents: 0,
  disqualifiedRespondents: 0,
  duplicateIngestEvents: 0,
  failedIngestEvents: 0,
  missingDepartment: 0,
  missingTenure: 0,
  missingGender: 0,
});

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function loadLatestComparison(
  admin: ReturnType<typeof createAdminClient>,
  campaignId: string
) {
  const { data, error } = await admin
    .from("analysis_run_snapshots")
    .select("analysis_run_id, logic_version, data, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length < 2) {
    return null;
  }

  const [current, previous] = data as unknown as Array<{
    analysis_run_id: string;
    logic_version: string;
    data: AnalysisRunSnapshot;
  }>;

  return compareAnalysisSnapshots(
    {
      ...current.data,
      analysisRunId: current.analysis_run_id,
      logicVersion: current.logic_version,
    },
    {
      ...previous.data,
      analysisRunId: previous.analysis_run_id,
      logicVersion: previous.logic_version,
    }
  );
}

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
  batchSize?: number;
}) {
  const admin = createAdminClient();
  const batchSize = Math.max(1, Math.min(input.batchSize ?? 10, 50));
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
          limit: input.limit ?? 10_000,
          force: input.force,
          organizationId: input.organizationId,
        });

  const { data: runRow, error: runError } = await admin
    .from("backfill_run_metrics")
    .insert({
      trigger_source: "manual",
      target_logic_version: ANALYSIS_LOGIC_VERSION,
      batch_size: batchSize,
      status: "running",
      selected: selected.length,
    })
    .select("id")
    .single();

  if (runError) {
    throw new Error(runError.message);
  }

  const results: BackfillExecutionResult[] = [];

  try {
    for (const batch of chunkArray(selected, batchSize)) {
      for (const campaign of batch) {
        const startedAt = Date.now();
        const result = await calculateResults(campaign.campaignId, {
          triggerSource: "manual",
        });

        if (!result.success) {
          results.push({
            campaignId: campaign.campaignId,
            campaignName: campaign.campaignName,
            reason: campaign.reason,
            success: false,
            error: result.error,
            durationMs: Date.now() - startedAt,
            driftSeverity: "none",
            quality: EMPTY_CAMPAIGN_QUALITY,
          });
          continue;
        }

        const [comparison, quality] = await Promise.all([
          loadLatestComparison(admin, campaign.campaignId),
          loadCampaignQuality(admin, campaign.campaignId),
        ]);

        const drift = comparison
          ? classifyBackfillDriftFromComparison(comparison)
          : { severity: "none" as const, hasMaterialChange: false };

        results.push({
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          reason: campaign.reason,
          success: true,
          error: null,
          durationMs: Date.now() - startedAt,
          driftSeverity: drift.severity,
          quality,
        });
      }
    }

    const summary = buildBackfillExecutionSummary({
      targetLogicVersion: ANALYSIS_LOGIC_VERSION,
      selected,
      results,
    });
    const performance = summarizePerformanceDurations(results.map((result) => result.durationMs));
    const driftSummary = summarizeBackfillDrift(
      results.map((result) => ({
        campaignId: result.campaignId,
        severity: result.driftSeverity,
        hasMaterialChange: result.driftSeverity === "medium" || result.driftSeverity === "high",
      }))
    );

    const healthSummaries = await Promise.all(
      results
        .filter((result) => result.success)
        .map(async (result) => ({
          campaignId: result.campaignId,
          summary: await loadStatisticalHealth(admin, result.campaignId, result.quality),
        }))
    );

    const attentionNeededCampaigns = healthSummaries
      .filter((entry) => entry.summary.health === "attention_needed")
      .map((entry) => entry.campaignId);

    const persistedSummary = {
      ...summary,
      driftSummary,
      performance,
      attentionNeededCampaigns,
      results,
    };

    await admin
      .from("backfill_run_metrics")
      .update({
        status: "completed",
        processed: summary.processed,
        succeeded: summary.succeeded,
        failed: summary.failed,
        summary: persistedSummary,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    await dispatchPipelineNotifications({
      alerts: buildBackfillAlertEvents({
        processed: summary.processed,
        failed: summary.failed,
        driftCounts: summary.driftCounts,
        qualityCounts: summary.qualityCounts,
      }),
    });

    return {
      runId: runRow.id,
      targetLogicVersion: ANALYSIS_LOGIC_VERSION,
      selected,
      processed: selected.length,
      succeeded: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      results,
      summary: persistedSummary,
    };
  } catch (error) {
    await admin
      .from("backfill_run_metrics")
      .update({
        status: "failed",
        processed: results.length,
        succeeded: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length,
        summary: {
          targetLogicVersion: ANALYSIS_LOGIC_VERSION,
          selected: selected.length,
          results,
        },
        error_message: error instanceof Error ? error.message : "Fallo inesperado en backfill",
        finished_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    throw error;
  }
}
