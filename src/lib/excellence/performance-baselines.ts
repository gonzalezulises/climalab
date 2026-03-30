function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)
  );
  return sortedValues[index] ?? 0;
}

export function buildPerformanceBaseline(input: {
  scope: string;
  metricKey: string;
  values: number[];
}) {
  const sorted = [...input.values].sort((a, b) => a - b);
  const count = sorted.length;
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const avg = count > 0 ? total / count : 0;
  const p95 = percentile(sorted, 0.95);
  const p99 = percentile(sorted, 0.99);
  const max = count > 0 ? sorted[count - 1]! : 0;
  const OUTLIER_THRESHOLD_MULTIPLIER = 1.75;
  const OUTLIER_MIN_THRESHOLD_MS = 500;
  const outlierThreshold = Math.max(OUTLIER_MIN_THRESHOLD_MS, avg * OUTLIER_THRESHOLD_MULTIPLIER);
  const outlierCount = sorted.filter((value) => value >= outlierThreshold).length;

  return {
    scope: input.scope,
    metricKey: input.metricKey,
    baselineVersion: "2026-03-30-v1",
    summary: {
      count,
      total: round(total),
      avg: round(avg),
      p95: round(p95),
      p99: round(p99),
      max: round(max),
      outlierThreshold: round(outlierThreshold),
      outlierCount,
    },
  };
}
