"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInsightJobStatus, retryFailedInsights } from "@/actions/ai-insights";
import type { InsightJobStatus, InsightBatchStatus } from "@/actions/ai-insights";

const INSIGHT_LABELS: Record<string, string> = {
  comment_analysis: "Análisis de comentarios",
  dashboard_narrative: "Resumen ejecutivo",
  driver_insights: "Drivers de engagement",
  alert_context: "Contextualización de alertas",
  segment_profiles: "Perfiles de segmentos",
  trends_narrative: "Análisis de tendencias",
};

function JobRow({ job }: { job: InsightJobStatus }) {
  const label = INSIGHT_LABELS[job.insight_type] ?? job.insight_type;

  const icon = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
  }[job.status];

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      {job.status === "failed" && job.error_message && (
        <span className="text-xs text-muted-foreground truncate max-w-48" title={job.error_message}>
          {job.error_message}
        </span>
      )}
    </div>
  );
}

type Props = {
  batchId: string;
  onDone: () => void;
};

export function AiInsightProgress({ batchId, onDone }: Props) {
  const [status, setStatus] = useState<InsightBatchStatus | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const poll = useCallback(async () => {
    const result = await getInsightJobStatus(batchId);
    if (result.success) {
      setStatus(result.data);
      return result.data.is_done;
    }
    return false;
  }, [batchId]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const start = async () => {
      const done = await poll();
      if (done) return;
      intervalId = setInterval(async () => {
        const done = await poll();
        if (done) clearInterval(intervalId);
      }, 4_000);
    };

    start();
    return () => clearInterval(intervalId);
  }, [poll]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await retryFailedInsights(batchId);
    // Give pg_net a moment to dispatch before resuming polling
    setTimeout(async () => {
      setIsRetrying(false);
      await poll();
    }, 1_000);
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Iniciando generación…
      </div>
    );
  }

  const hasFailed = status.failed > 0;
  const allFailed = status.failed === status.total;

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>
            Generando insights IA — {status.completed}/{status.total} completados
          </span>
          {status.is_done && (
            <Button size="sm" variant="outline" onClick={onDone}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Ver resultados
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {status.jobs.map((job) => (
          <JobRow key={job.insight_type} job={job} />
        ))}

        {hasFailed && status.is_done && !allFailed && (
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Reintentar fallidos ({status.failed})
            </Button>
          </div>
        )}

        {allFailed && status.is_done && (
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Reintentar todo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
