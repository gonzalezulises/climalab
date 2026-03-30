type ComparisonScope = "latest" | "historical" | "cross_campaign";

type ComparisonMetricChange = {
  metric: string;
  current: number;
  previous: number;
  delta: number;
};

type BuildStatisticalBaselineInput = {
  campaignId: string;
  analysisRunId: string | null;
  comparisonScope: ComparisonScope;
  warnings: string[];
  comparison: {
    logicVersionChanged: boolean;
    sampleNDelta: number;
    metricChanges: ComparisonMetricChange[];
  };
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function classifyDrift(delta: number) {
  const absolute = Math.abs(delta);
  if (absolute >= 0.25) return "material";
  if (absolute >= 0.1) return "moderate";
  return "minor";
}

export function buildStatisticalBaseline(input: BuildStatisticalBaselineInput) {
  const driftCounts = input.comparison.metricChanges.reduce(
    (acc, change) => {
      const severity = classifyDrift(change.delta);
      acc.total += 1;
      acc[severity] += 1;
      return acc;
    },
    { total: 0, material: 0, moderate: 0, minor: 0 }
  );

  const materialChangeRatio = driftCounts.total > 0 ? driftCounts.material / driftCounts.total : 0;
  const moderatePenalty = driftCounts.moderate * 8;
  const materialPenalty = driftCounts.material * 20;
  const warningPenalty = input.warnings.length * 8;
  const samplePenalty = Math.abs(input.comparison.sampleNDelta) >= 25 ? 10 : 0;
  const logicPenalty = input.comparison.logicVersionChanged ? 15 : 0;

  const robustnessScore = Math.max(
    0,
    round(100 - moderatePenalty - materialPenalty - warningPenalty - samplePenalty - logicPenalty)
  );

  const interpretationWarnings = [
    ...input.warnings,
    ...(input.comparison.logicVersionChanged ? ["logic_version_changed"] : []),
    ...(materialChangeRatio > 0.3 ? ["high_material_drift"] : []),
    ...(Math.abs(input.comparison.sampleNDelta) >= 25 ? ["sample_shift_detected"] : []),
  ];

  let interpretationStatus: "robust" | "attention_needed" | "non_interpretable" = "robust";
  if (robustnessScore < 50 || driftCounts.material >= 3) {
    interpretationStatus = "non_interpretable";
  } else if (robustnessScore < 80 || interpretationWarnings.length > 0) {
    interpretationStatus = "attention_needed";
  }

  return {
    campaignId: input.campaignId,
    analysisRunId: input.analysisRunId,
    comparisonScope: input.comparisonScope,
    baselineVersion: "2026-03-30-v1",
    robustnessScore,
    interpretationStatus,
    interpretationWarnings,
    driftSummary: {
      totalChanges: driftCounts.total,
      materialChanges: driftCounts.material,
      moderateChanges: driftCounts.moderate,
      minorChanges: driftCounts.minor,
      sampleNDelta: input.comparison.sampleNDelta,
      largestDelta:
        input.comparison.metricChanges.length > 0
          ? round(
              Math.max(...input.comparison.metricChanges.map((change) => Math.abs(change.delta)))
            )
          : 0,
    },
  };
}
