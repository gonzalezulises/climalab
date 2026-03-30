import { describe, expect, it } from "vitest";
import { buildPerformanceBaseline } from "@/lib/excellence/performance-baselines";

describe("buildPerformanceBaseline", () => {
  it("builds percentiles and outlier metadata from campaign durations", () => {
    const baseline = buildPerformanceBaseline({
      scope: "batch",
      metricKey: "campaign_duration_ms",
      values: [120, 130, 150, 170, 300, 900],
    });

    expect(baseline.summary.count).toBe(6);
    expect(baseline.summary.p95).toBeGreaterThanOrEqual(300);
    expect(baseline.summary.outlierCount).toBeGreaterThan(0);
  });
});
