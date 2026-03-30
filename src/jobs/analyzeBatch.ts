import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildPipelineAlertEvents } from "@/lib/pipeline-alerts";
import { isMissingDispatchResponseStore } from "@/lib/pipeline-errors";
import { dispatchPipelineNotifications } from "@/lib/pipeline-notifications";
import { summarizePerformanceDurations } from "@/lib/performance-metrics";
import { buildPipelineSloScorecards } from "@/lib/excellence/slo-scorecards";
import { buildPerformanceBaseline } from "@/lib/excellence/performance-baselines";
import { insertPerformanceBaseline, insertPipelineSloSnapshots } from "@/lib/excellence/store";
import {
  getCampaignBatchPlans,
  refreshCampaignStats,
  runBatchAnalysisForCampaign,
} from "@/lib/pipelineAnalysis";
import { summarizePipelineOps } from "@/lib/pipeline-ops";

type BatchTriggerSource = "cron" | "manual" | "response_hook";

export async function analyzeBatchCampaigns(
  hours = 24,
  triggerSource: BatchTriggerSource = "cron"
) {
  const admin = createAdminClient();
  const runStartedMs = Date.now();
  const { error: refreshError } = await admin.rpc("refresh_pipeline_dispatch_events");
  const dispatchRefreshWarning = refreshError
    ? isMissingDispatchResponseStore(refreshError)
      ? refreshError.message
      : null
    : null;

  if (refreshError && !dispatchRefreshWarning) {
    throw new Error(refreshError.message);
  }

  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await admin
    .from("batch_job_runs")
    .insert({
      trigger_source: triggerSource,
      hours_window: hours,
      status: "running",
      metadata: {
        dispatchEventsRefreshedAt: startedAt,
        dispatchRefreshWarning,
      },
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "No se pudo registrar la corrida batch");
  }

  try {
    const plans = await getCampaignBatchPlans(hours);
    const results = [];

    for (const plan of plans) {
      try {
        if (plan.mode === "skip") {
          continue;
        }

        if (plan.mode === "incremental_stats_refresh") {
          const startedAt = Date.now();
          await refreshCampaignStats(plan.campaignId);
          results.push({
            campaignId: plan.campaignId,
            durationMs: Date.now() - startedAt,
            success: true,
            error: null,
            mode: plan.mode,
          });
          continue;
        }

        results.push({
          ...(await runBatchAnalysisForCampaign(plan.campaignId, triggerSource)),
          mode: plan.mode,
        });
      } catch (error) {
        results.push({
          campaignId: plan.campaignId,
          mode: plan.mode,
          success: false,
          error: error instanceof Error ? error.message : "Fallo inesperado en campaña",
        });
      }
    }

    const summary = {
      processed: results.length,
      succeeded: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      modes: {
        incremental: results.filter((result) => result.mode === "incremental_stats_refresh").length,
        full: results.filter((result) => result.mode === "full_recompute").length,
      },
      results,
    };
    const performance = summarizePerformanceDurations(
      results.map((result) => result.durationMs ?? 0).filter((value) => value > 0)
    );

    const pipelineSummary = summarizePipelineOps({
      dispatchEvents: dispatchRefreshWarning
        ? [
            {
              status: "skipped",
              reason: dispatchRefreshWarning,
              createdAt: startedAt,
            },
          ]
        : [],
      batchRuns: [
        {
          status: summary.failed > 0 ? "failed" : "completed",
          processed: summary.processed,
          succeeded: summary.succeeded,
          failed: summary.failed,
          createdAt: startedAt,
        },
      ],
      analysisRuns: [],
    });
    const sloScorecards = buildPipelineSloScorecards({
      dispatch: {
        total:
          pipelineSummary.dispatch.queued +
          pipelineSummary.dispatch.delivered +
          pipelineSummary.dispatch.failed +
          pipelineSummary.dispatch.skipped,
        success: pipelineSummary.dispatch.delivered,
        failed: pipelineSummary.dispatch.failed,
        avgLatencyMs: 120,
      },
      batch: {
        total: Math.max(1, summary.processed),
        success: summary.succeeded,
        failed: summary.failed,
        avgLatencyMs: performance.avgMs,
      },
      ai: {
        total: 0,
        success: 0,
        failed: 0,
        avgLatencyMs: 0,
      },
      ona: {
        total: 0,
        success: 0,
        failed: 0,
        avgLatencyMs: 0,
      },
    });
    const performanceBaseline = buildPerformanceBaseline({
      scope: "batch",
      metricKey: "campaign_duration_ms",
      values: results.map((result) => result.durationMs ?? 0).filter((value) => value > 0),
    });

    const finishedAt = new Date().toISOString();
    const { error: updateRunError } = await admin
      .from("batch_job_runs")
      .update({
        status: "completed",
        processed: summary.processed,
        succeeded: summary.succeeded,
        failed: summary.failed,
        campaign_ids: plans.map((plan) => plan.campaignId),
        metadata: {
          dispatchEventsRefreshedAt: startedAt,
          dispatchRefreshWarning,
          finishedAt,
          durationMs: Date.now() - runStartedMs,
          modes: summary.modes,
          performance,
          pipelineSummary,
          results,
        },
        finished_at: finishedAt,
      })
      .eq("id", run.id);

    if (updateRunError) {
      throw new Error(updateRunError.message);
    }

    await insertPipelineSloSnapshots(
      sloScorecards.domains.map((domain) => ({
        domain: domain.domain,
        slo_target: domain.sloTarget,
        observed_success_rate: domain.successRate,
        observed_latency_ms: domain.avgLatencyMs,
        error_budget_remaining: domain.errorBudgetRemaining,
        status: domain.status,
        summary: domain,
      }))
    );
    await insertPerformanceBaseline({
      scope: performanceBaseline.scope,
      metric_key: performanceBaseline.metricKey,
      baseline_version: performanceBaseline.baselineVersion,
      summary: performanceBaseline.summary,
    });

    const alerts = buildPipelineAlertEvents({
      summary: pipelineSummary,
      latestBatchDurationMs: Date.now() - runStartedMs,
    });

    await dispatchPipelineNotifications({
      batchJobRunId: run.id,
      alerts,
    });

    return {
      runId: run.id,
      ...summary,
    };
  } catch (error) {
    await admin
      .from("batch_job_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Fallo inesperado en batch",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    await dispatchPipelineNotifications({
      batchJobRunId: run.id,
      alerts: [
        {
          code: "batch_unhandled_failure",
          severity: "critical",
          message: error instanceof Error ? error.message : "Fallo inesperado en batch",
          metadata: {},
        },
      ],
    });

    throw error;
  }
}
