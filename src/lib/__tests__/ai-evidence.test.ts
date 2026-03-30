import { describe, expect, it } from "vitest";
import { buildAiEvidenceRows, summarizeAiEvidenceCoverage } from "@/lib/ai/evidence";

describe("AI evidence helpers", () => {
  it("converts governed claims into evidence rows and computes coverage", () => {
    const rows = buildAiEvidenceRows({
      campaignId: "campaign-1",
      analysisRunId: "run-1",
      insightType: "dashboard_narrative",
      governance: {
        claims: [
          {
            key: "engagement_strength",
            statement: "ENG es una fortaleza",
            evidence: ["ENG avg_score 4.4", "ENG favorability 84%"],
            dimensionCodes: ["ENG"],
            metricRefs: ["avg_score", "favorability_pct"],
            confidenceLabel: "high",
            warnings: [],
          },
          {
            key: "leadership_watch",
            statement: "LID requiere atención",
            evidence: ["LID avg_score 3.8"],
            dimensionCodes: ["LID"],
            metricRefs: ["avg_score"],
            confidenceLabel: "medium",
            warnings: ["low_support"],
          },
        ],
      },
    });

    const coverage = summarizeAiEvidenceCoverage(rows);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.claim_key).toBe("engagement_strength");
    expect(coverage.claimCount).toBe(2);
    expect(coverage.coveragePct).toBe(100);
    expect(coverage.warningCount).toBe(1);
  });
});
