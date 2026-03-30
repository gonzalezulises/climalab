import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns";
import { getCampaignQualityReport } from "@/actions/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusBadgeClass(status: string) {
  switch (status) {
    case "robusto":
      return "bg-green-100 text-green-800";
    case "aceptable":
      return "bg-blue-100 text-blue-800";
    case "precaucion":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-red-100 text-red-800";
  }
}

function scoreBadgeClass(score: number) {
  if (score >= 85) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-blue-100 text-blue-800";
  if (score >= 55) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

const insightLabels: Record<string, string> = {
  comment_analysis: "Comentarios",
  dashboard_narrative: "Narrativa ejecutiva",
  driver_insights: "Drivers",
  alert_context: "Alertas",
  segment_profiles: "Segmentos",
  trends_narrative: "Tendencias",
};

export default async function QualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, reportResult] = await Promise.all([
    getCampaign(id),
    getCampaignQualityReport(id),
  ]);

  if (!campaignResult.success) notFound();
  if (!reportResult.success) {
    throw new Error(reportResult.error);
  }

  const { instrumentQuality, aiEvaluation } = reportResult.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Calidad</h1>
          <p className="text-sm text-muted-foreground">
            Calidad del instrumento y matriz de desempeño de IA para la campaña.
          </p>
        </div>
        <Link
          href={`/campaigns/${id}/results/technical`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Ver ficha técnica
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado del instrumento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge className={statusBadgeClass(instrumentQuality.overallStatus)}>
              {instrumentQuality.overallStatus}
            </Badge>
            <p className="text-2xl font-bold">{instrumentQuality.overallScore}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Matriz metodológica IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge className={scoreBadgeClass(aiEvaluation.methodological.overallScore)}>
              {aiEvaluation.methodological.overallScore}
            </Badge>
            <p className="text-xs text-muted-foreground">Score global metodológico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cobertura IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{aiEvaluation.operational.successRatePct}%</p>
            <p className="text-xs text-muted-foreground">
              {aiEvaluation.coverage.generatedInsightTypes} /{" "}
              {aiEvaluation.coverage.expectedInsightTypes} tipos generados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Muestra válida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{instrumentQuality.sample.sampleN}</p>
            <p className="text-xs text-muted-foreground">
              tasa de respuesta {instrumentQuality.sample.responseRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validaciones del instrumento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {instrumentQuality.warnings.length === 0 &&
            instrumentQuality.dimensionWarnings.length === 0 ? (
              <p className="text-muted-foreground">Sin alertas críticas de interpretación.</p>
            ) : (
              <>
                {instrumentQuality.warnings.map((warning) => (
                  <div key={warning} className="rounded-md border p-3">
                    {warning}
                  </div>
                ))}
                {instrumentQuality.dimensionWarnings.map((warning) => (
                  <div key={warning} className="rounded-md border p-3">
                    {warning}
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matriz de desempeño de IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {aiEvaluation.warnings.length === 0 ? (
              <p className="text-muted-foreground">Sin alertas relevantes de IA.</p>
            ) : (
              aiEvaluation.warnings.map((warning) => (
                <div key={warning} className="rounded-md border p-3">
                  {warning}
                </div>
              ))
            )}
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              Proveedores: {aiEvaluation.operational.providers.join(", ") || "N/D"} · Modelos:{" "}
              {aiEvaluation.operational.models.join(", ") || "N/D"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dimensiones e interpretabilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {instrumentQuality.dimensions.map((dimension) => (
            <div key={dimension.code} className="rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {dimension.name} ({dimension.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    alpha {dimension.alpha ?? "N/D"} · rwg {dimension.rwg ?? "N/D"} · n{" "}
                    {dimension.respondentCount}
                  </p>
                </div>
                <Badge className={statusBadgeClass(dimension.interpretability)}>
                  {dimension.interpretability}
                </Badge>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2">Item</th>
                      <th className="pb-2">Media</th>
                      <th className="pb-2">Missing</th>
                      <th className="pb-2">r item-total</th>
                      <th className="pb-2">Alpha si se elimina</th>
                      <th className="pb-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dimension.itemDiagnostics.map((item) => (
                      <tr key={item.itemId} className="border-t align-top">
                        <td className="py-2 pr-4">{item.itemText}</td>
                        <td className="py-2 pr-4">{item.meanScore ?? "N/D"}</td>
                        <td className="py-2 pr-4">{item.missingnessPct}%</td>
                        <td className="py-2 pr-4">{item.correctedItemTotal ?? "N/D"}</td>
                        <td className="py-2 pr-4">{item.alphaIfDeleted ?? "N/D"}</td>
                        <td className="py-2">
                          {item.flags.length > 0 ? item.flags.join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matriz por tipo de insight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiEvaluation.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay insights IA generados para esta campaña.
            </p>
          ) : (
            aiEvaluation.rows.map((row) => (
              <div key={row.insightType} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {insightLabels[row.insightType] ?? row.insightType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.provider ?? "N/D"} · {row.model ?? "N/D"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      estado {row.status ?? "draft"} · prompt {row.promptVersion ?? "N/D"} · schema{" "}
                      {row.schemaVersion ?? "N/D"}
                    </p>
                  </div>
                  <Badge className={scoreBadgeClass(row.methodological.overallScore)}>
                    {row.methodological.overallScore}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4 text-sm">
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Fidelidad</p>
                    <p className="font-semibold">{row.methodological.dataFidelityScore}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Cobertura</p>
                    <p className="font-semibold">{row.methodological.coverageScore}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Calibración</p>
                    <p className="font-semibold">{row.methodological.calibrationScore}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Accionabilidad</p>
                    <p className="font-semibold">{row.methodological.actionabilityScore}</p>
                  </div>
                </div>
                {row.warnings.length > 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">{row.warnings.join(" | ")}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
