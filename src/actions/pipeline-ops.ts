"use server";

import { createClient } from "@/lib/supabase/server";
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
