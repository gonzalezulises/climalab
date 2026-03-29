import { describe, expect, it } from "vitest";
import { isMissingDispatchResponseStore } from "@/lib/pipeline-errors";
import { selectBatchAnalysisMode } from "@/lib/pipeline-strategy";

describe("isMissingDispatchResponseStore", () => {
  it("returns true for missing pg_net response store errors", () => {
    expect(
      isMissingDispatchResponseStore({
        message: 'relation "net._http_response" does not exist',
      })
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isMissingDispatchResponseStore({
        message: "permission denied for table pipeline_dispatch_events",
      })
    ).toBe(false);
  });
});

describe("selectBatchAnalysisMode", () => {
  it("uses full recompute when logic version is stale", () => {
    expect(
      selectBatchAnalysisMode({
        campaignStatus: "closed",
        recentResponseCount: 4,
        latestLogicVersion: "older",
      })
    ).toBe("full_recompute");
  });

  it("uses incremental refresh for active campaigns with current logic", () => {
    expect(
      selectBatchAnalysisMode({
        campaignStatus: "active",
        recentResponseCount: 2,
        latestLogicVersion: "2026-03-29-lineage-v1",
      })
    ).toBe("incremental_stats_refresh");
  });

  it("skips campaigns without recent responses", () => {
    expect(
      selectBatchAnalysisMode({
        campaignStatus: "closed",
        recentResponseCount: 0,
        latestLogicVersion: "2026-03-29-lineage-v1",
      })
    ).toBe("skip");
  });
});
