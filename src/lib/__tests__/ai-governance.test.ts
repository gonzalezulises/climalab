import { describe, expect, it } from "vitest";
import { summarizeAiGovernance } from "@/lib/ai/governance";

describe("summarizeAiGovernance", () => {
  it("aggregates insight coverage, statuses, and failures", () => {
    const summary = summarizeAiGovernance({
      insights: [
        {
          insight_type: "dashboard_narrative",
          status: "published",
          provider: "openai",
          model: "gpt-4o",
          prompt_version: "2026-03-30-v1",
          schema_version: "dashboard-v1",
          warnings: [],
          validation_errors: [],
        },
        {
          insight_type: "driver_insights",
          status: "draft",
          provider: "openai",
          model: "gpt-4o",
          prompt_version: "2026-03-30-v1",
          schema_version: "drivers-v1",
          warnings: ["repair_attempted"],
          validation_errors: [],
        },
      ],
      events: [
        {
          status: "generated",
          insight_type: "dashboard_narrative",
          provider: "openai",
          model: "gpt-4o",
        },
        { status: "failed", insight_type: "segment_profiles", provider: "openai", model: "gpt-4o" },
      ],
    });

    expect(summary.coverage.generated).toBe(2);
    expect(summary.coverage.expected).toBe(6);
    expect(summary.statusCounts.published).toBe(1);
    expect(summary.statusCounts.draft).toBe(1);
    expect(summary.failureCount).toBe(1);
    expect(summary.providers).toContain("openai");
    expect(summary.promptVersions).toContain("2026-03-30-v1");
  });
});
