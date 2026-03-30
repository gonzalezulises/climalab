import { describe, expect, it } from "vitest";
import { buildPipelineSloScorecards } from "@/lib/excellence/slo-scorecards";

describe("buildPipelineSloScorecards", () => {
  it("derives domain health and error budget signals", () => {
    const scorecards = buildPipelineSloScorecards({
      dispatch: { total: 20, success: 19, failed: 1, avgLatencyMs: 120 },
      batch: { total: 10, success: 8, failed: 2, avgLatencyMs: 450 },
      ai: { total: 12, success: 10, failed: 2, avgLatencyMs: 2500 },
      ona: { total: 3, success: 2, failed: 1, avgLatencyMs: 8000 },
    });

    expect(scorecards.domains).toHaveLength(4);
    expect(scorecards.overallStatus).toBe("attention_needed");
    expect(scorecards.domains.find((domain) => domain.domain === "dispatch")?.status).toBe(
      "healthy"
    );
  });
});
