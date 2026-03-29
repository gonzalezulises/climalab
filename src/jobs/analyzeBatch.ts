import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCampaignsWithRecentResponses,
  runBatchAnalysisForCampaign,
} from "@/lib/pipelineAnalysis";

type BatchTriggerSource = "cron" | "manual" | "response_hook";

export async function analyzeBatchCampaigns(
  hours = 24,
  triggerSource: BatchTriggerSource = "cron"
) {
  const admin = createAdminClient();
  const { error: refreshError } = await admin.rpc("refresh_pipeline_dispatch_events");
  if (refreshError) {
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
      },
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "No se pudo registrar la corrida batch");
  }

  try {
    const campaignIds = await getCampaignsWithRecentResponses(hours);
    const results = [];

    for (const campaignId of campaignIds) {
      try {
        results.push(await runBatchAnalysisForCampaign(campaignId, triggerSource));
      } catch (error) {
        results.push({
          campaignId,
          success: false,
          error: error instanceof Error ? error.message : "Fallo inesperado en campaña",
        });
      }
    }

    const summary = {
      processed: results.length,
      succeeded: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      results,
    };

    const finishedAt = new Date().toISOString();
    const { error: updateRunError } = await admin
      .from("batch_job_runs")
      .update({
        status: "completed",
        processed: summary.processed,
        succeeded: summary.succeeded,
        failed: summary.failed,
        campaign_ids: campaignIds,
        metadata: {
          dispatchEventsRefreshedAt: startedAt,
          finishedAt,
        },
        finished_at: finishedAt,
      })
      .eq("id", run.id);

    if (updateRunError) {
      throw new Error(updateRunError.message);
    }

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

    throw error;
  }
}
