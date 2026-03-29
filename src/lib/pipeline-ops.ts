export type PipelineDispatchEventSummary = {
  status: "queued" | "delivered" | "failed" | "skipped";
  reason: string | null;
  createdAt: string;
};

export type BatchJobRunSummary = {
  status: "running" | "completed" | "failed";
  processed: number;
  succeeded: number;
  failed: number;
  createdAt: string;
};

export type AnalysisRunSummary = {
  status: "running" | "completed" | "failed";
  triggerSource: string;
  logicVersion: string;
  startedAt: string;
};

export type PipelineOperationalSummary = {
  dispatch: {
    queued: number;
    delivered: number;
    failed: number;
    skipped: number;
    latestStatus: PipelineDispatchEventSummary["status"] | null;
    latestReason: string | null;
  };
  batch: {
    latestStatus: BatchJobRunSummary["status"] | null;
    successRate: number | null;
    totalRuns: number;
  };
  analysis: {
    latestStatus: AnalysisRunSummary["status"] | null;
    latestTriggerSource: string | null;
    latestLogicVersion: string | null;
    totalRuns: number;
  };
  health: "healthy" | "warning" | "critical";
  warnings: string[];
};

function roundRate(value: number) {
  return Math.round(value * 100) / 100;
}

export function summarizePipelineOps(input: {
  dispatchEvents: PipelineDispatchEventSummary[];
  batchRuns: BatchJobRunSummary[];
  analysisRuns: AnalysisRunSummary[];
}): PipelineOperationalSummary {
  const dispatchCounts = {
    queued: 0,
    delivered: 0,
    failed: 0,
    skipped: 0,
  };
  const warnings: string[] = [];

  for (const event of input.dispatchEvents) {
    dispatchCounts[event.status]++;
  }

  const latestDispatch = input.dispatchEvents[0] ?? null;
  if (latestDispatch?.status === "skipped" && latestDispatch.reason) {
    warnings.push(`Dispatch skipped: ${latestDispatch.reason}`);
  }
  if (dispatchCounts.failed > 0) {
    warnings.push("Dispatch failures detected");
  }

  const latestBatch = input.batchRuns[0] ?? null;
  const batchSuccessRate =
    latestBatch && latestBatch.processed > 0
      ? roundRate((latestBatch.succeeded / latestBatch.processed) * 100)
      : latestBatch
        ? 100
        : null;

  if (latestBatch?.status === "failed") {
    warnings.push("Latest batch run failed");
  }

  const latestAnalysis = input.analysisRuns[0] ?? null;
  if (latestAnalysis?.status === "failed") {
    warnings.push("Latest analysis run failed");
  }

  const health = warnings.some((warning) => /failed/i.test(warning))
    ? "critical"
    : warnings.length > 0
      ? "warning"
      : "healthy";

  return {
    dispatch: {
      ...dispatchCounts,
      latestStatus: latestDispatch?.status ?? null,
      latestReason: latestDispatch?.reason ?? null,
    },
    batch: {
      latestStatus: latestBatch?.status ?? null,
      successRate: batchSuccessRate,
      totalRuns: input.batchRuns.length,
    },
    analysis: {
      latestStatus: latestAnalysis?.status ?? null,
      latestTriggerSource: latestAnalysis?.triggerSource ?? null,
      latestLogicVersion: latestAnalysis?.logicVersion ?? null,
      totalRuns: input.analysisRuns.length,
    },
    health,
    warnings,
  };
}
