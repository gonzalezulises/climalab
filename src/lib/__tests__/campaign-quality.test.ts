import { describe, expect, it } from "vitest";
import { buildCampaignStatisticalHealthFromArtifacts } from "@/lib/campaign-quality";

describe("buildCampaignStatisticalHealthFromArtifacts", () => {
  it("builds a statistical health summary from analytics artifacts", () => {
    const summary = buildCampaignStatisticalHealthFromArtifacts({
      quality: {
        qualityLabel: "medium",
        respondentCoveragePct: 88,
        validRespondentPct: 81,
        duplicateIngestEvents: 1,
        failedIngestEvents: 0,
        demographicCompletenessPct: {
          department: 90,
          tenure: 88,
          gender: 86,
        },
      },
      reliabilityRows: [
        { dimension_code: "LID", alpha: 0.58 },
        { dimension_code: "COM", alpha: 0.82 },
      ],
      rwgRows: [
        { dimension_code: "LID", metadata: { rwg: 0.42 } },
        { dimension_code: "COM", metadata: { rwg: 0.72 } },
      ],
      onaStatus: "deferred",
      onaErrorMessage: null,
    });

    expect(summary.health).toBe("attention_needed");
    expect(summary.lowAlphaDimensions).toEqual(["LID"]);
    expect(summary.lowRwgDimensions).toEqual(["LID"]);
    expect(summary.warnings).toContain("duplicate_ingest_detected");
    expect(summary.warnings).toContain("ona_deferred");
  });
});
