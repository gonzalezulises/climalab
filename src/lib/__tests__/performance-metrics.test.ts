import { describe, expect, it } from "vitest";
import { summarizePerformanceDurations } from "@/lib/performance-metrics";

describe("summarizePerformanceDurations", () => {
  it("detects slow outliers and aggregates totals", () => {
    const summary = summarizePerformanceDurations([120, 180, 2500, 240]);

    expect(summary.totalMs).toBe(3040);
    expect(summary.maxMs).toBe(2500);
    expect(summary.outlierCount).toBe(1);
    expect(summary.outlierThresholdMs).toBeGreaterThan(0);
  });
});
