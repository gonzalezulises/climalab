type DomainMetrics = {
  total: number;
  success: number;
  failed: number;
  avgLatencyMs: number;
};

type PipelineSloInput = {
  dispatch: DomainMetrics;
  batch: DomainMetrics;
  ai: DomainMetrics;
  ona: DomainMetrics;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percentage(success: number, total: number) {
  if (total <= 0) return 0;
  return round((success / total) * 100);
}

const SLO_TARGETS: Record<string, { latencyLimit: number; healthyTarget: number }> = {
  dispatch: { latencyLimit: 500, healthyTarget: 95 },
  batch: { latencyLimit: 5000, healthyTarget: 99 },
  ai: { latencyLimit: 8000, healthyTarget: 99 },
  ona: { latencyLimit: 12000, healthyTarget: 99 },
};
const WATCH_LATENCY_MULTIPLIER = 1.5;
const WATCH_MIN_SUCCESS_RATE = 95;

function classifyDomain(domain: string, successRate: number, avgLatencyMs: number) {
  const target = SLO_TARGETS[domain] ?? SLO_TARGETS.ona!;

  if (successRate >= target.healthyTarget && avgLatencyMs <= target.latencyLimit) return "healthy";
  if (
    successRate >= WATCH_MIN_SUCCESS_RATE &&
    avgLatencyMs <= target.latencyLimit * WATCH_LATENCY_MULTIPLIER
  )
    return "watch";
  return "critical";
}

export function buildPipelineSloScorecards(input: PipelineSloInput) {
  const domains = (Object.entries(input) as Array<[keyof PipelineSloInput, DomainMetrics]>).map(
    ([domain, metrics]) => {
      const successRate = percentage(metrics.success, metrics.total);
      const status = classifyDomain(domain, successRate, metrics.avgLatencyMs);
      const errorBudgetRemaining = round(Math.max(0, 99 - (100 - successRate)));

      return {
        domain,
        total: metrics.total,
        success: metrics.success,
        failed: metrics.failed,
        successRate,
        avgLatencyMs: round(metrics.avgLatencyMs),
        status,
        sloTarget: 99,
        errorBudgetRemaining,
      };
    }
  );

  const overallStatus = domains.some((domain) => domain.status === "critical")
    ? "attention_needed"
    : domains.some((domain) => domain.status === "watch")
      ? "watch"
      : "healthy";

  return {
    generatedAt: new Date().toISOString(),
    overallStatus,
    domains,
  };
}
