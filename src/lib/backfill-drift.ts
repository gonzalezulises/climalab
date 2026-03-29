export type BackfillDriftInput = {
  sampleDelta: number;
  responseRateDelta: number;
  topDimensionDeltaAbs: number;
  changedDimensionsOverThreshold: number;
};

export type BackfillDriftClassification = {
  severity: "none" | "low" | "medium" | "high";
  hasMaterialChange: boolean;
};

export function classifyBackfillDriftFromComparison(input: {
  sampleDelta: number;
  responseRateDelta: number;
  dimensionChanges: Array<{ delta: number }>;
}) {
  const topDimensionDeltaAbs =
    input.dimensionChanges.length > 0
      ? Math.max(...input.dimensionChanges.map((row) => Math.abs(row.delta)))
      : 0;
  const changedDimensionsOverThreshold = input.dimensionChanges.filter(
    (row) => Math.abs(row.delta) >= 0.2
  ).length;

  return classifyBackfillDrift({
    sampleDelta: input.sampleDelta,
    responseRateDelta: input.responseRateDelta,
    topDimensionDeltaAbs,
    changedDimensionsOverThreshold,
  });
}

export function classifyBackfillDrift(input: BackfillDriftInput): BackfillDriftClassification {
  const sampleDeltaAbs = Math.abs(input.sampleDelta);
  const responseRateDeltaAbs = Math.abs(input.responseRateDelta);
  const topDimensionDeltaAbs = Math.abs(input.topDimensionDeltaAbs);

  if (
    topDimensionDeltaAbs >= 0.6 ||
    responseRateDeltaAbs >= 8 ||
    input.changedDimensionsOverThreshold >= 4 ||
    sampleDeltaAbs >= 10
  ) {
    return { severity: "high", hasMaterialChange: true };
  }

  if (
    topDimensionDeltaAbs >= 0.35 ||
    responseRateDeltaAbs >= 4 ||
    input.changedDimensionsOverThreshold >= 2 ||
    sampleDeltaAbs >= 5
  ) {
    return { severity: "medium", hasMaterialChange: true };
  }

  if (
    topDimensionDeltaAbs >= 0.15 ||
    responseRateDeltaAbs >= 1.5 ||
    input.changedDimensionsOverThreshold >= 1 ||
    sampleDeltaAbs >= 1
  ) {
    return { severity: "low", hasMaterialChange: false };
  }

  return { severity: "none", hasMaterialChange: false };
}

export function summarizeBackfillDrift(
  input: Array<{
    campaignId: string;
    severity: "none" | "low" | "medium" | "high";
    hasMaterialChange: boolean;
  }>
) {
  const bySeverity = {
    none: 0,
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const row of input) {
    bySeverity[row.severity] += 1;
  }

  return {
    total: input.length,
    materialChanges: input.filter((row) => row.hasMaterialChange).length,
    bySeverity,
  };
}
