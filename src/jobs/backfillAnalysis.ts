import "server-only";

import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";
import {
  buildBackfillExecutionSummary,
  selectBackfillCandidates,
  type BackfillCandidate,
  type BackfillExecutionResult,
} from "@/lib/backfill-analysis";
import { classifyBackfillDriftFromComparison, summarizeBackfillDrift } from "@/lib/backfill-drift";
import { buildCampaignDataQuality } from "@/lib/data-quality";
import { buildBackfillAlertEvents } from "@/lib/pipeline-alerts";
import { dispatchPipelineNotifications } from "@/lib/pipeline-notifications";
import { summarizePerformanceDurations } from "@/lib/performance-metrics";
import { buildStatisticalHealthSummary } from "@/lib/statistical-health";
import { normalizeONAStatus } from "@/lib/ona-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateResults } from "@/actions/campaigns";
import {
  compareAnalysisSnapshots,
  type AnalysisRunSnapshot,
} from "@/lib/analysis-engine/snapshots";

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function loadCampaignQuality(
  admin: ReturnType<typeof createAdminClient>,
  campaignId: string
) {
  const latestRunResult = await admin
    .from("analysis_runs")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRunResult.error) {
    throw new Error(latestRunResult.error.message);
  }

  const [respondentsResult, ingestEventsResult, qualityResult] = await Promise.all([
    admin
      .from("respondents")
      .select("department, tenure, gender", { count: "exact" })
      .eq("campaign_id", campaignId),
    admin.from("ingest_events").select("status, error_message").eq("campaign_id", campaignId),
    latestRunResult.data?.id
      ? admin
          .from("analysis_run_respondent_quality")
          .select("quality_status")
          .eq("analysis_run_id", latestRunResult.data.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError = respondentsResult.error ?? ingestEventsResult.error ?? qualityResult.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const respondents = respondentsResult.data ?? [];
  const qualityRows = qualityResult.data ?? [];
  const ingestEvents = ingestEventsResult.data ?? [];

  return buildCampaignDataQuality({
    respondentsTotal: respondentsResult.count ?? respondents.length,
    validRespondents: qualityRows.filter((row) => row.quality_status === "valid").length,
    disqualifiedRespondents: qualityRows.filter((row) => row.quality_status === "disqualified")
      .length,
    duplicateIngestEvents: ingestEvents.filter((row) => row.error_message?.includes("duplicate"))
      .length,
    failedIngestEvents: ingestEvents.filter((row) => row.status === "failed").length,
    missingDepartment: respondents.filter((row) => !row.department).length,
    missingTenure: respondents.filter((row) => !row.tenure).length,
    missingGender: respondents.filter((row) => !row.gender).length,
  });
}

async function loadStatisticalHealth(
  admin: ReturnType<typeof createAdminClient>,
  campaignId: string,
  quality: ReturnType<typeof buildCampaignDataQuality>
) {
  const [reliabilityResult, rwgResult, onaResult] = await Promise.all([
    admin
      .from("campaign_analytics")
      .select("data")
      .eq("campaign_id", campaignId)
      .eq("analysis_type", "reliability")
      .maybeSingle(),
    admin
      .from("campaign_results")
      .select("dimension_code, metadata")
      .eq("campaign_id", campaignId)
      .eq("result_type", "dimension")
      .eq("segment_type", "global"),
    admin
      .from("campaign_ona_runs")
      .select("status, error_message")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const reliabilityRows = Array.isArray(reliabilityResult.data?.data)
    ? (reliabilityResult.data?.data as Array<{ dimension_code?: string; alpha?: number | null }>)
    : [];

  const rwgRows = (rwgResult.data ?? []).map((row) => ({
    dimensionCode: row.dimension_code ?? "unknown",
    rwg: ((row.metadata as { rwg?: number | null } | null)?.rwg ?? null) as number | null,
  }));

  return buildStatisticalHealthSummary({
    qualityLabel: quality.qualityLabel,
    validRespondentPct: quality.validRespondentPct,
    respondentCoveragePct: quality.respondentCoveragePct,
    duplicateIngestEvents: quality.duplicateIngestEvents,
    failedIngestEvents: quality.failedIngestEvents,
    reliability: reliabilityRows.map((row) => ({
      dimensionCode: row.dimension_code ?? "unknown",
      alpha: row.alpha ?? null,
    })),
    rwg: rwgRows,
    onaStatus: normalizeONAStatus(onaResult.data?.status, onaResult.data?.error_message),
  });
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
            qualityLabel: "low",
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
          qualityLabel: quality.qualityLabel,
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
          summary: await loadStatisticalHealth(
            admin,
            result.campaignId,
            await loadCampaignQuality(admin, result.campaignId)
          ),
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
