import { ANALYSIS_LOGIC_VERSION } from "@/lib/analysis-engine/materialize";

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
