import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";
import type { CampaignDataQualitySummary } from "@/lib/data-quality";

export type BackfillCandidate = {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  latestLogicVersion: string | null;
  latestCompletedAt: string | null;
  hasSnapshot: boolean;
};

export type BackfillSelection = BackfillCandidate & {
  reason: "never_analyzed" | "missing_snapshot" | "stale_logic_version";
};

export type BackfillExecutionResult = {
  campaignId: string;
  campaignName: string;
  reason: BackfillSelection["reason"];
  success: boolean;
  error: string | null;
  durationMs: number;
  driftSeverity: "none" | "low" | "medium" | "high";
  quality: CampaignDataQualitySummary;
};

export function buildBackfillExecutionSummary(input: {
  targetLogicVersion: string;
  selected: BackfillSelection[];
  results: BackfillExecutionResult[];
}) {
  const reasonCounts = {
    never_analyzed: 0,
    missing_snapshot: 0,
    stale_logic_version: 0,
  };
  const driftCounts = {
    none: 0,
    low: 0,
    medium: 0,
    high: 0,
  };
  const qualityCounts = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const candidate of input.selected) {
    reasonCounts[candidate.reason] += 1;
  }

  for (const result of input.results) {
    driftCounts[result.driftSeverity] += 1;
    qualityCounts[result.quality.qualityLabel] += 1;
  }

  const durations = input.results.map((result) => result.durationMs);

  return {
    targetLogicVersion: input.targetLogicVersion,
    selected: input.selected.length,
    processed: input.results.length,
    succeeded: input.results.filter((result) => result.success).length,
    failed: input.results.filter((result) => !result.success).length,
    reasonCounts,
    driftCounts,
    qualityCounts,
    duration: {
      totalMs: durations.reduce((sum, value) => sum + value, 0),
      maxMs: durations.length > 0 ? Math.max(...durations) : 0,
      avgMs:
        durations.length > 0
          ? Math.round(
              (durations.reduce((sum, value) => sum + value, 0) / durations.length) * 100
            ) / 100
          : 0,
    },
  };
}

export function selectBackfillCandidates(
  candidates: BackfillCandidate[],
  input: {
    limit?: number;
    force?: boolean;
    targetLogicVersion?: string;
  } = {}
) {
  const limit = input.limit ?? 25;
  const targetLogicVersion = input.targetLogicVersion ?? ANALYSIS_LOGIC_VERSION;

  const selected = candidates
    .flatMap<BackfillSelection>((candidate) => {
      if (input.force) {
        return [
          {
            ...candidate,
            reason:
              candidate.latestLogicVersion === null
                ? "never_analyzed"
                : candidate.hasSnapshot
                  ? "stale_logic_version"
                  : "missing_snapshot",
          },
        ];
      }

      if (candidate.latestLogicVersion === null) {
        return [{ ...candidate, reason: "never_analyzed" }];
      }

      if (!candidate.hasSnapshot) {
        return [{ ...candidate, reason: "missing_snapshot" }];
      }

      if (candidate.latestLogicVersion !== targetLogicVersion) {
        return [{ ...candidate, reason: "stale_logic_version" }];
      }

      return [];
    })
    .sort((left, right) => {
      const priority = {
        never_analyzed: 0,
        missing_snapshot: 1,
        stale_logic_version: 2,
      };

      const byReason = priority[left.reason] - priority[right.reason];
      if (byReason !== 0) {
        return byReason;
      }

      return (left.latestCompletedAt ?? "").localeCompare(right.latestCompletedAt ?? "");
    });

  return selected.slice(0, limit);
}
