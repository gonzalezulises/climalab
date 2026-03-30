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

function classifyDomain(domain: string, successRate: number, avgLatencyMs: number) {
  const latencyLimit =
    domain === "dispatch" ? 500 : domain === "batch" ? 5000 : domain === "ai" ? 8000 : 12000;

  const healthyTarget = domain === "dispatch" ? 95 : 99;

  if (successRate >= healthyTarget && avgLatencyMs <= latencyLimit) return "healthy";
  if (successRate >= 95 && avgLatencyMs <= latencyLimit * 1.5) return "watch";
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
