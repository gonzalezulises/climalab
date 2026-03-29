import { describe, expect, it } from "vitest";
import { buildStatisticalHealthSummary } from "@/lib/statistical-health";

describe("buildStatisticalHealthSummary", () => {
  it("marks campaigns with low quality and weak reliability as attention needed", () => {
    const summary = buildStatisticalHealthSummary({
      qualityLabel: "low",
      validRespondentPct: 54,
      respondentCoveragePct: 61,
      duplicateIngestEvents: 3,
      failedIngestEvents: 1,
      reliability: [
        { dimensionCode: "LID", alpha: 0.58 },
        { dimensionCode: "COM", alpha: 0.82 },
      ],
      rwg: [
        { dimensionCode: "LID", rwg: 0.42 },
        { dimensionCode: "COM", rwg: 0.73 },
      ],
      onaStatus: "deferred",
    });

    expect(summary.health).toBe("attention_needed");
    expect(summary.lowAlphaDimensions).toEqual(["LID"]);
    expect(summary.lowRwgDimensions).toEqual(["LID"]);
    expect(summary.warnings).toContain("quality_low");
    expect(summary.warnings).toContain("ona_deferred");
  });
});
