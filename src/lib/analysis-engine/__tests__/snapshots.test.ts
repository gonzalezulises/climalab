import { describe, expect, it } from "vitest";
import {
  buildAnalysisRunSnapshot,
  compareAnalysisSnapshots,
} from "@/lib/analysis-engine/snapshots";

describe("analysis snapshots", () => {
  it("builds snapshots from scored output", () => {
    const snapshot = buildAnalysisRunSnapshot({
      campaignId: "c1",
      analysisRunId: "run-1",
      logicVersion: "v1",
      output: {
        populationN: 100,
        sampleN: 80,
        responseRate: 80,
        marginOfError: 4.2,
        validRespondentIds: [],
        respondentQuality: [],
        results: [
          {
            campaign_id: "c1",
            result_type: "dimension",
            instrument_id: "i1",
            instrument_type: "base",
            dimension_id: "d1",
            dimension_code: "ENG",
            segment_key: "global",
            segment_type: "global",
            avg_score: 4.2,
            std_score: 0.5,
            favorability_pct: 80,
            response_count: 80,
            respondent_count: 80,
            metadata: {},
          },
        ],
        analytics: [{ campaign_id: "c1", analysis_type: "categories", data: [] }],
      },
    });

    expect(snapshot.analysisRunId).toBe("run-1");
    expect(snapshot.dimensionScores[0]?.code).toBe("ENG");
  });

  it("compares snapshots by dimension delta", () => {
    const comparison = compareAnalysisSnapshots(
      {
        campaignId: "c1",
        analysisRunId: "run-2",
        logicVersion: "v1",
        sampleN: 82,
        responseRate: 82,
        dimensionScores: [
          { code: "ENG", instrumentType: "base", avgScore: 4.4, favorabilityPct: 84 },
        ],
        categoryScores: [],
      },
      {
        campaignId: "c1",
        analysisRunId: "run-1",
        logicVersion: "v1",
        sampleN: 80,
        responseRate: 80,
        dimensionScores: [
          { code: "ENG", instrumentType: "base", avgScore: 4.1, favorabilityPct: 78 },
        ],
        categoryScores: [],
      }
    );

    expect(comparison.sampleDelta).toBe(2);
    expect(comparison.dimensionChanges[0]?.delta).toBe(0.3);
  });
});
