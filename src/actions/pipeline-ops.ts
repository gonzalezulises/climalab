"use server";

import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";
import { selectBackfillCandidates } from "@/lib/backfill-analysis";
import { createClient } from "@/lib/supabase/server";
import { INGEST_CONTRACT_VERSION } from "@/lib/ingest-contract";
import { summarizePipelineOps } from "@/lib/pipeline-ops";
import type { ActionResult } from "@/types";

export async function getPipelineOperationalSummary(
  campaignId: string
): Promise<ActionResult<ReturnType<typeof summarizePipelineOps>>> {
  const supabase = await createClient();

  const [dispatchResult, batchResult, analysisResult] = await Promise.all([
    supabase
      .from("pipeline_dispatch_events")
      .select("status, reason, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("batch_job_runs")
      .select("status, processed, succeeded, failed, created_at")
      .contains("campaign_ids", [campaignId])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("analysis_runs")
      .select("status, trigger_source, logic_version, started_at")
      .eq("campaign_id", campaignId)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const firstError = dispatchResult.error ?? batchResult.error ?? analysisResult.error;
  if (firstError) {
    return { success: false, error: firstError.message };
  }

  return {
    success: true,
    data: summarizePipelineOps({
      dispatchEvents: (dispatchResult.data ?? []).map((row) => ({
        status: row.status as "queued" | "delivered" | "failed" | "skipped",
        reason: row.reason,
        createdAt: row.created_at,
      })),
      batchRuns: (batchResult.data ?? []).map((row) => ({
        status: row.status as "running" | "completed" | "failed",
        processed: row.processed,
        succeeded: row.succeeded,
        failed: row.failed,
        createdAt: row.created_at,
      })),
      analysisRuns: (analysisResult.data ?? []).map((row) => ({
        status: row.status as "running" | "completed" | "failed",
        triggerSource: row.trigger_source,
        logicVersion: row.logic_version,
        startedAt: row.started_at,
      })),
    }),
  };
}

export async function getPlatformOperationsOverview(): Promise<
  ActionResult<{
    logicVersion: string;
    ingestContractVersion: string;
    latestBatchRuns: Array<{
      id: string;
      status: string;
      processed: number;
      succeeded: number;
      failed: number;
      createdAt: string;
      finishedAt: string | null;
      metadata: unknown;
    }>;
    latestNotifications: Array<{
      id: string;
      severity: string;
      channel: string;
      status: string;
      alertCode: string;
      createdAt: string;
      recipient: string | null;
    }>;
    backfillCandidates: Array<{
      campaignId: string;
      campaignName: string;
      reason: string;
      latestLogicVersion: string | null;
      hasSnapshot: boolean;
    }>;
  }>
> {
  const supabase = await createClient();

  const [
    { data: campaigns, error: campaignsError },
    { data: runs, error: runsError },
    { data: snapshots, error: snapshotsError },
    { data: batchRuns, error: batchRunsError },
    { data: notifications, error: notificationsError },
  ] = await Promise.all([
    supabase.from("campaigns").select("id, name, status").in("status", ["closed", "archived"]),
    supabase
      .from("analysis_runs")
      .select("campaign_id, logic_version, completed_at, status")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(200),
    supabase.from("analysis_run_snapshots").select("campaign_id, analysis_run_id").limit(200),
    supabase
      .from("batch_job_runs")
      .select("id, status, processed, succeeded, failed, created_at, finished_at, metadata")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("pipeline_notifications")
      .select("id, severity, channel, status, alert_code, created_at, recipient")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const firstError =
    campaignsError ?? runsError ?? snapshotsError ?? batchRunsError ?? notificationsError;
  if (firstError) {
    return { success: false, error: firstError.message };
  }

  const latestRunByCampaign = new Map<
    string,
    { logicVersion: string | null; completedAt: string | null }
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
  const backfillCandidates = selectBackfillCandidates(
    (campaigns ?? []).map((campaign) => ({
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignStatus: campaign.status,
      latestLogicVersion: latestRunByCampaign.get(campaign.id)?.logicVersion ?? null,
      latestCompletedAt: latestRunByCampaign.get(campaign.id)?.completedAt ?? null,
      hasSnapshot: snapshotCampaigns.has(campaign.id),
    })),
    { limit: 10, targetLogicVersion: ANALYSIS_LOGIC_VERSION }
  );

  return {
    success: true,
    data: {
      logicVersion: ANALYSIS_LOGIC_VERSION,
      ingestContractVersion: INGEST_CONTRACT_VERSION,
      latestBatchRuns: (batchRuns ?? []).map((run) => ({
        id: run.id,
        status: run.status,
        processed: run.processed,
        succeeded: run.succeeded,
        failed: run.failed,
        createdAt: run.created_at,
        finishedAt: run.finished_at,
        metadata: run.metadata,
      })),
      latestNotifications: (notifications ?? []).map((notification) => ({
        id: notification.id,
        severity: notification.severity,
        channel: notification.channel,
        status: notification.status,
        alertCode: notification.alert_code,
        createdAt: notification.created_at,
        recipient: notification.recipient,
      })),
      backfillCandidates: backfillCandidates.map((candidate) => ({
        campaignId: candidate.campaignId,
        campaignName: candidate.campaignName,
        reason: candidate.reason,
        latestLogicVersion: candidate.latestLogicVersion,
        hasSnapshot: candidate.hasSnapshot,
      })),
    },
  };
}
