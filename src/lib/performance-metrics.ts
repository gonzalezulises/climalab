function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function summarizePerformanceDurations(durationsMs: number[]) {
  const totalMs = durationsMs.reduce((sum, value) => sum + value, 0);
  const avgMs = durationsMs.length > 0 ? totalMs / durationsMs.length : 0;
  const maxMs = durationsMs.length > 0 ? Math.max(...durationsMs) : 0;
  const outlierThresholdMs = Math.max(1000, avgMs * 2);
  const outlierCount = durationsMs.filter((value) => value >= outlierThresholdMs).length;

  return {
    totalMs,
    avgMs: round(avgMs),
    maxMs,
    outlierThresholdMs: round(outlierThresholdMs),
    outlierCount,
  };
}
