import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";

export type BatchAnalysisMode = "skip" | "incremental_stats_refresh" | "full_recompute";

export function selectBatchAnalysisMode(input: {
  campaignStatus: string | null;
  recentResponseCount: number;
  latestLogicVersion: string | null;
}) {
  if (input.recentResponseCount <= 0) {
    return "skip" as const;
  }

  if (input.latestLogicVersion !== ANALYSIS_LOGIC_VERSION) {
    return "full_recompute" as const;
  }

  if (input.campaignStatus === "active") {
    return "incremental_stats_refresh" as const;
  }

  return "full_recompute" as const;
}
