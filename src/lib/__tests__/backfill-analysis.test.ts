import { describe, expect, it } from "vitest";
import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";
import { buildBackfillExecutionSummary, selectBackfillCandidates } from "@/lib/backfill-analysis";

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

  it("builds an aggregate summary for full backfill runs", () => {
    const summary = buildBackfillExecutionSummary({
      targetLogicVersion: ANALYSIS_LOGIC_VERSION,
      selected: [
        {
          ...baseCandidate,
          campaignId: "1",
          campaignName: "Alpha",
          latestLogicVersion: null,
          hasSnapshot: false,
          reason: "never_analyzed",
        },
        {
          ...baseCandidate,
          campaignId: "2",
          campaignName: "Beta",
          latestLogicVersion: "legacy",
          hasSnapshot: true,
          reason: "stale_logic_version",
        },
      ],
      results: [
        {
          campaignId: "1",
          campaignName: "Alpha",
          reason: "never_analyzed",
          success: true,
          error: null,
          durationMs: 1200,
          driftSeverity: "high",
          qualityLabel: "medium",
        },
        {
          campaignId: "2",
          campaignName: "Beta",
          reason: "stale_logic_version",
          success: false,
          error: "boom",
          durationMs: 300,
          driftSeverity: "low",
          qualityLabel: "high",
        },
      ],
    });

    expect(summary.processed).toBe(2);
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.reasonCounts.never_analyzed).toBe(1);
    expect(summary.reasonCounts.stale_logic_version).toBe(1);
    expect(summary.driftCounts.high).toBe(1);
    expect(summary.qualityCounts.medium).toBe(1);
    expect(summary.duration.totalMs).toBe(1500);
    expect(summary.duration.maxMs).toBe(1200);
  });
});
