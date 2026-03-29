import { describe, expect, it } from "vitest";
import { summarizePipelineOps } from "@/lib/pipeline-ops";

describe("summarizePipelineOps", () => {
  it("marks the pipeline healthy when runs and dispatches are clean", () => {
    const summary = summarizePipelineOps({
      dispatchEvents: [{ status: "delivered", reason: null, createdAt: "2026-03-29T00:00:00Z" }],
      batchRuns: [
        {
          status: "completed",
          processed: 2,
          succeeded: 2,
          failed: 0,
          createdAt: "2026-03-29T00:00:00Z",
        },
      ],
      analysisRuns: [
        {
          status: "completed",
          triggerSource: "manual",
          logicVersion: "v1",
          startedAt: "2026-03-29T00:00:00Z",
        },
      ],
    });

    expect(summary.health).toBe("healthy");
    expect(summary.batch.successRate).toBe(100);
  });

  it("surfaces warnings and critical failures", () => {
    const summary = summarizePipelineOps({
      dispatchEvents: [
        { status: "skipped", reason: "missing_pipeline_secret", createdAt: "2026-03-29T00:00:00Z" },
      ],
      batchRuns: [
        {
          status: "failed",
          processed: 1,
          succeeded: 0,
          failed: 1,
          createdAt: "2026-03-29T00:00:00Z",
        },
      ],
      analysisRuns: [],
    });

    expect(summary.health).toBe("critical");
    expect(summary.warnings).toContain("Dispatch skipped: missing_pipeline_secret");
    expect(summary.warnings).toContain("Latest batch run failed");
  });
});
