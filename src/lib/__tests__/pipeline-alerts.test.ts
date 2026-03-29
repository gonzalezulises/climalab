import { describe, expect, it } from "vitest";
import { buildBackfillAlertEvents, buildPipelineAlertEvents } from "@/lib/pipeline-alerts";

describe("buildPipelineAlertEvents", () => {
  it("builds critical alerts for missing secrets and failed batch runs", () => {
    const alerts = buildPipelineAlertEvents({
      summary: {
        dispatch: {
          queued: 0,
          delivered: 0,
          failed: 1,
          skipped: 1,
          latestStatus: "skipped",
          latestReason: "missing_pipeline_secret",
        },
        batch: {
          latestStatus: "failed",
          successRate: 0,
          totalRuns: 1,
        },
        analysis: {
          latestStatus: "completed",
          latestTriggerSource: "manual",
          latestLogicVersion: "v1",
          totalRuns: 1,
        },
        health: "critical",
        warnings: [],
      },
      latestONAStatus: "deferred",
      latestBatchDurationMs: 65_000,
    });

    expect(alerts.map((alert) => alert.code)).toEqual([
      "dispatch_missing_secret",
      "dispatch_failures_detected",
      "batch_run_failed",
      "batch_slow_duration",
      "ona_deferred",
    ]);
  });

  it("does not duplicate alert codes", () => {
    const alerts = buildPipelineAlertEvents({
      summary: {
        dispatch: {
          queued: 0,
          delivered: 5,
          failed: 0,
          skipped: 0,
          latestStatus: "delivered",
          latestReason: null,
        },
        batch: {
          latestStatus: "completed",
          successRate: 100,
          totalRuns: 2,
        },
        analysis: {
          latestStatus: "completed",
          latestTriggerSource: "batch",
          latestLogicVersion: "v1",
          totalRuns: 2,
        },
        health: "healthy",
        warnings: [],
      },
      latestONAStatus: "completed",
      latestBatchDurationMs: 1000,
    });

    expect(alerts).toEqual([]);
  });

  it("builds backfill alerts for drift and low quality campaigns", () => {
    const alerts = buildBackfillAlertEvents({
      processed: 3,
      failed: 1,
      driftCounts: {
        none: 0,
        low: 1,
        medium: 1,
        high: 1,
      },
      qualityCounts: {
        high: 1,
        medium: 1,
        low: 1,
      },
    });

    expect(alerts.map((alert) => alert.code)).toEqual([
      "backfill_failures_detected",
      "backfill_high_drift_detected",
      "backfill_low_quality_detected",
    ]);
  });
});
