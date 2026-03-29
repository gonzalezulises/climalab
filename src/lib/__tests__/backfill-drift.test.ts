import { describe, expect, it } from "vitest";
import { classifyBackfillDrift, summarizeBackfillDrift } from "@/lib/backfill-drift";

describe("backfill drift", () => {
  it("classifies material drift as high when multiple indicators move strongly", () => {
    const classification = classifyBackfillDrift({
      sampleDelta: 12,
      responseRateDelta: 8.4,
      topDimensionDeltaAbs: 0.72,
      changedDimensionsOverThreshold: 4,
    });

    expect(classification.severity).toBe("high");
    expect(classification.hasMaterialChange).toBe(true);
  });

  it("summarizes drift across multiple campaigns", () => {
    const summary = summarizeBackfillDrift([
      { campaignId: "1", severity: "high", hasMaterialChange: true },
      { campaignId: "2", severity: "medium", hasMaterialChange: true },
      { campaignId: "3", severity: "low", hasMaterialChange: false },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.materialChanges).toBe(2);
    expect(summary.bySeverity.high).toBe(1);
    expect(summary.bySeverity.medium).toBe(1);
    expect(summary.bySeverity.low).toBe(1);
  });
});
