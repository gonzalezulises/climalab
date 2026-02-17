"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { CsvDownloadButton } from "@/components/results/csv-download-button";
import { contextualizeAlerts } from "@/actions/ai-insights";
import type { AlertContext } from "@/actions/ai-insights";

type Alert = {
  severity: string;
  type: string;
  dimension_code?: string;
  item_id?: string;
  item_text?: string;
  segment_key?: string;
  value: number;
  threshold: number;
  message: string;
};

const sevConfig: Record<string, { label: string; bg: string; border: string }> = {
  crisis: { label: "Crisis", bg: "bg-red-600 text-white", border: "border-l-red-600" },
  attention: { label: "Atención", bg: "bg-yellow-500 text-white", border: "border-l-yellow-500" },
  risk_group: {
    label: "Grupo de riesgo",
    bg: "bg-orange-500 text-white",
    border: "border-l-orange-500",
  },
  decline: { label: "Declive", bg: "bg-purple-500 text-white", border: "border-l-purple-500" },
};

export function AlertsClient({
  campaignId,
  alerts,
  initialContext,
}: {
  campaignId: string;
  alerts: Alert[];
  initialContext: AlertContext | null;
}) {
  const [context, setContext] = useState<AlertContext | null>(initialContext);
  const [isPending, startTransition] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  const crisisCount = alerts.filter((a) => a.severity === "crisis").length;
  const attentionCount = alerts.filter((a) => a.severity === "attention").length;
  const riskCount = alerts.filter((a) => a.severity === "risk_group").length;

  // Build context lookup
  const ctxMap = new Map<number, { root_cause: string; recommendation: string }>();
  if (context) {
    for (const c of context) {
      ctxMap.set(c.alert_index, c);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alertas y Áreas de Riesgo</h1>
        <div className="flex items-center gap-2">
          <CsvDownloadButton
            data={alerts.map((a) => ({
              severity: a.severity,
              type: a.type,
              dimension_code: a.dimension_code ?? "",
              message: a.message,
              value: a.value,
              threshold: a.threshold,
            }))}
            filename="alertas"
            columns={{
              severity: "Severidad",
              type: "Tipo",
              dimension_code: "Dimensión",
              message: "Mensaje",
              value: "Valor",
              threshold: "Umbral",
            }}
          />
          {alerts.length > 0 && (
            <Button
              size="sm"
              variant={context ? "outline" : "default"}
              onClick={() => {
                setAiError(null);
                startTransition(async () => {
                  try {
                    const result = await contextualizeAlerts(campaignId);
                    if (result.success) setContext(result.data);
                    else setAiError(result.error);
                  } catch {
                    setAiError("Error de conexión. Intente nuevamente.");
                  }
                });
              }}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {context ? "Regenerar contexto" : "Contextualizar con IA"}
            </Button>
          )}
        </div>
      </div>

      {aiError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {aiError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">{alerts.length}</p>
            <p className="text-xs text-muted-foreground">Total alertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-red-600">{crisisCount}</p>
            <p className="text-xs text-muted-foreground">Crisis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-yellow-600">{attentionCount}</p>
            <p className="text-xs text-muted-foreground">Atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-orange-600">{riskCount}</p>
            <p className="text-xs text-muted-foreground">Grupos de riesgo</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <p className="text-muted-foreground">
          No se detectaron alertas. Todas las métricas están dentro de los umbrales aceptables.
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const sev = sevConfig[alert.severity] ?? sevConfig.attention;
            const ctx = ctxMap.get(i);
            return (
              <Card key={i} className={`border-l-4 ${sev.border}`}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Badge className={sev.bg}>{sev.label}</Badge>
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      {alert.item_text && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          &quot;{alert.item_text}&quot;
                        </p>
                      )}
                      {ctx && (
                        <div className="mt-2 rounded-md border border-purple-200 bg-purple-50/50 p-2 space-y-1">
                          <p className="text-xs">
                            <span className="font-medium text-purple-700">Posible causa:</span>{" "}
                            {ctx.root_cause}
                          </p>
                          <p className="text-xs">
                            <span className="font-medium text-blue-700">Recomendación:</span>{" "}
                            {ctx.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {typeof alert.value === "number" ? alert.value.toFixed(1) : alert.value}%
                      </p>
                      <p className="text-xs text-muted-foreground">Umbral: {alert.threshold}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
