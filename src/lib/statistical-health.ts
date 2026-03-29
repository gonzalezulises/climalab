import type { ONAExecutionStatus } from "@/lib/ona-status";

export type StatisticalHealthInput = {
  qualityLabel: "high" | "medium" | "low";
  validRespondentPct: number;
  respondentCoveragePct: number;
  duplicateIngestEvents: number;
  failedIngestEvents: number;
  reliability: Array<{ dimensionCode: string; alpha: number | null }>;
  rwg: Array<{ dimensionCode: string; rwg: number | null }>;
  onaStatus: ONAExecutionStatus | null;
};

export function buildStatisticalHealthSummary(input: StatisticalHealthInput) {
  const lowAlphaDimensions = input.reliability
    .filter((row) => row.alpha !== null && row.alpha < 0.6)
    .map((row) => row.dimensionCode);
  const lowRwgDimensions = input.rwg
    .filter((row) => row.rwg !== null && row.rwg < 0.5)
    .map((row) => row.dimensionCode);

  const warnings: string[] = [];

  if (input.qualityLabel === "low") warnings.push("quality_low");
  if (input.validRespondentPct < 60) warnings.push("valid_respondents_low");
  if (input.respondentCoveragePct < 70) warnings.push("coverage_low");
  if (input.duplicateIngestEvents > 0) warnings.push("duplicate_ingest_detected");
  if (input.failedIngestEvents > 0) warnings.push("failed_ingest_detected");
  if (lowAlphaDimensions.length > 0) warnings.push("low_alpha_detected");
  if (lowRwgDimensions.length > 0) warnings.push("low_rwg_detected");
  if (input.onaStatus === "deferred") warnings.push("ona_deferred");
  if (input.onaStatus === "failed") warnings.push("ona_failed");

  const health =
    input.qualityLabel === "low" ||
    lowAlphaDimensions.length > 0 ||
    lowRwgDimensions.length > 0 ||
    input.failedIngestEvents > 0
      ? "attention_needed"
      : warnings.length > 0
        ? "watch"
        : "healthy";

  return {
    health,
    lowAlphaDimensions,
    lowRwgDimensions,
    warnings,
  };
}
