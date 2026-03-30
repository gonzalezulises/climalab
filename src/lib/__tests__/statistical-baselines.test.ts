import { describe, expect, it } from "vitest";
import { buildStatisticalBaseline } from "@/lib/excellence/statistical-baselines";

describe("buildStatisticalBaseline", () => {
  it("builds a robustness score and interpretation from campaign comparison", () => {
    const baseline = buildStatisticalBaseline({
      campaignId: "campaign-1",
      analysisRunId: "run-1",
      comparisonScope: "latest",
      warnings: ["low_alpha_detected"],
      comparison: {
        logicVersionChanged: false,
        sampleNDelta: 12,
        metricChanges: [
          { metric: "ENG", current: 4.4, previous: 4.1, delta: 0.3 },
          { metric: "LID", current: 4.1, previous: 4.05, delta: 0.05 },
        ],
      },
    });

    expect(baseline.robustnessScore).toBeGreaterThan(0);
    expect(baseline.interpretationStatus).toBe("attention_needed");
    expect(baseline.driftSummary.materialChanges).toBe(1);
  });
});
