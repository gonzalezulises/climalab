import type { PipelineOperationalSummary } from "@/lib/pipeline-ops";

export type PipelineAlertEvent = {
  code: string;
  severity: "warning" | "critical";
  message: string;
  metadata: Record<string, unknown>;
};

export function buildPipelineAlertEvents(input: {
  summary: PipelineOperationalSummary;
  latestBatchDurationMs?: number | null;
  latestONAStatus?: "pending" | "completed" | "deferred" | "failed" | null;
}) {
  const alerts: PipelineAlertEvent[] = [];

  if (
    input.summary.dispatch.latestStatus === "skipped" &&
    input.summary.dispatch.latestReason === "missing_pipeline_secret"
  ) {
    alerts.push({
      code: "dispatch_missing_secret",
      severity: "critical",
      message: "El trigger asíncrono está omitiendo dispatch por secretos faltantes en Vault.",
      metadata: {
        latestReason: input.summary.dispatch.latestReason,
      },
    });
  }

  if (input.summary.dispatch.failed > 0) {
    alerts.push({
      code: "dispatch_failures_detected",
      severity: "critical",
      message: "Se detectaron fallas recientes en el dispatch asíncrono del pipeline.",
      metadata: {
        failedDispatches: input.summary.dispatch.failed,
      },
    });
  }

  if (input.summary.batch.latestStatus === "failed") {
    alerts.push({
      code: "batch_run_failed",
      severity: "critical",
      message: "La última corrida batch falló y requiere revisión.",
      metadata: {
        batchStatus: input.summary.batch.latestStatus,
      },
    });
  }

  if (
    input.summary.batch.successRate !== null &&
    input.summary.batch.successRate < 100 &&
    input.summary.batch.latestStatus !== "failed"
  ) {
    alerts.push({
      code: "batch_partial_success",
      severity: "warning",
      message: "La última corrida batch terminó con campañas fallidas o incompletas.",
      metadata: {
        successRate: input.summary.batch.successRate,
      },
    });
  }

  if (typeof input.latestBatchDurationMs === "number" && input.latestBatchDurationMs > 60_000) {
    alerts.push({
      code: "batch_slow_duration",
      severity: "warning",
      message: "La última corrida batch tardó más de 60 segundos.",
      metadata: {
        durationMs: input.latestBatchDurationMs,
      },
    });
  }

  if (input.latestONAStatus === "failed") {
    alerts.push({
      code: "ona_failed",
      severity: "critical",
      message: "El análisis ONA falló en la corrida más reciente.",
      metadata: {
        onaStatus: input.latestONAStatus,
      },
    });
  }

  if (input.latestONAStatus === "deferred") {
    alerts.push({
      code: "ona_deferred",
      severity: "warning",
      message: "El análisis ONA quedó diferido y no terminó en tiempo de corrida.",
      metadata: {
        onaStatus: input.latestONAStatus,
      },
    });
  }

  return dedupePipelineAlertEvents(alerts);
}

export function dedupePipelineAlertEvents(events: PipelineAlertEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.code}:${event.severity}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
