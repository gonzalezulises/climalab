import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns";
import { getCampaignAiGovernance } from "@/actions/ai-governance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GovernanceStatusActions } from "./governance-client";

const insightLabels: Record<string, string> = {
  comment_analysis: "Comentarios",
  dashboard_narrative: "Narrativa ejecutiva",
  driver_insights: "Drivers",
  alert_context: "Alertas",
  segment_profiles: "Segmentos",
  trends_narrative: "Tendencias",
};

function scoreClass(value: number) {
  if (value >= 85) return "bg-green-100 text-green-800";
  if (value >= 65) return "bg-blue-100 text-blue-800";
  if (value >= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function statusClass(status: string | null) {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export default async function AiGovernancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, governanceResult] = await Promise.all([
    getCampaign(id),
    getCampaignAiGovernance(id),
  ]);

  if (!campaignResult.success) notFound();
  if (!governanceResult.success) throw new Error(governanceResult.error);

  const { summary, insights, events } = governanceResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">AI Governance</h1>
        <p className="text-sm text-muted-foreground">
          Estado editorial, contratos, versiones y trazabilidad de la IA por campaña.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cobertura</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {summary.coverage.generated} / {summary.coverage.expected}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={scoreClass(Math.max(0, 100 - summary.warningCount * 10))}>
              {summary.warningCount}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fallos</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={scoreClass(Math.max(0, 100 - summary.failureCount * 20))}>
              {summary.failureCount}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Versiones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Prompt: {summary.promptVersions.join(", ") || "N/D"}</p>
            <p>Schema: {summary.schemaVersions.join(", ") || "N/D"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insights gobernados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay insights persistidos para esta campaña.
            </p>
          ) : (
            insights.map((insight) => (
              <div key={insight.id} className="rounded-md border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {insightLabels[insight.insightType] ?? insight.insightType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insight.provider ?? "N/D"} · {insight.model ?? "N/D"} · prompt{" "}
                      {insight.promptVersion ?? "N/D"} · schema {insight.schemaVersion ?? "N/D"}
                    </p>
                  </div>
                  <Badge className={statusClass(insight.status)}>{insight.status ?? "draft"}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">{insight.summary ?? "Sin resumen"}</p>

                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Claims</p>
                    <p className="font-semibold">{insight.claimCount}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Warnings</p>
                    <p className="font-semibold">{insight.warnings.length}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Validation errors</p>
                    <p className="font-semibold">{insight.validationErrors.length}</p>
                  </div>
                </div>

                {insight.warnings.length > 0 ? (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium mb-1">Warnings</p>
                    <p>{insight.warnings.join(", ")}</p>
                  </div>
                ) : null}

                {insight.validationErrors.length > 0 ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                    <p className="font-medium mb-1">Errores de validación</p>
                    <p>{insight.validationErrors.join(", ")}</p>
                  </div>
                ) : null}

                <GovernanceStatusActions
                  campaignId={id}
                  insightType={insight.insightType}
                  currentStatus={insight.status}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos de generación</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay eventos registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2 pr-4">Latencia</th>
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-t">
                      <td className="py-2 pr-4">
                        {insightLabels[event.insightType] ?? event.insightType}
                      </td>
                      <td className="py-2 pr-4">{event.status}</td>
                      <td className="py-2 pr-4">
                        {event.provider ?? "N/D"} · {event.model ?? "N/D"}
                      </td>
                      <td className="py-2 pr-4">{event.latencyMs ?? "N/D"} ms</td>
                      <td className="py-2 pr-4">
                        {new Date(event.createdAt).toLocaleString("es-PA")}
                      </td>
                      <td className="py-2">{event.errorMessage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
