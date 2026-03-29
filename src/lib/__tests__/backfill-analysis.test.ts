import { describe, expect, it } from "vitest";
import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";
import { selectBackfillCandidates } from "@/lib/backfill-analysis";

describe("selectBackfillCandidates", () => {
  const baseCandidate = {
    campaignStatus: "closed",
    latestCompletedAt: "2026-03-29T12:00:00Z",
  };

  it("prioritizes never analyzed campaigns", () => {
    const selected = selectBackfillCandidates([
      {
        ...baseCandidate,
        campaignId: "1",
        campaignName: "A",
        latestLogicVersion: null,
        hasSnapshot: false,
      },
      {
        ...baseCandidate,
        campaignId: "2",
        campaignName: "B",
        latestLogicVersion: ANALYSIS_LOGIC_VERSION,
        hasSnapshot: false,
      },
    ]);

    expect(selected[0]?.reason).toBe("never_analyzed");
    expect(selected[1]?.reason).toBe("missing_snapshot");
  });

  it("filters out already current campaigns when not forced", () => {
    const selected = selectBackfillCandidates([
      {
        ...baseCandidate,
        campaignId: "1",
        campaignName: "A",
        latestLogicVersion: ANALYSIS_LOGIC_VERSION,
        hasSnapshot: true,
      },
    ]);

    expect(selected).toEqual([]);
  });

  it("includes current campaigns when forced", () => {
    const selected = selectBackfillCandidates(
      [
        {
          ...baseCandidate,
          campaignId: "1",
          campaignName: "A",
          latestLogicVersion: ANALYSIS_LOGIC_VERSION,
          hasSnapshot: true,
        },
      ],
      { force: true }
    );

    expect(selected).toHaveLength(1);
  });
});
