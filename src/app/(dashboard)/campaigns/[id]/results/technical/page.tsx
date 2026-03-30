import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getReliabilityData } from "@/actions/analytics";
import { getPipelineOperationalSummary } from "@/actions/pipeline-ops";
import { getCampaignDataQuality } from "@/actions/data-quality";
import { getCampaignQualityReport } from "@/actions/quality";
import { getLatestAnalysisComparison } from "@/actions/analysis-comparison";
import { getSemanticResultFamilies } from "@/actions/semantic-results";
import { getONAStatus } from "@/actions/ona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlphaIndicator } from "@/components/results/AlphaIndicator";
import { TechnicalClient } from "./technical-client";

function rwgStatus(rwg: number | null) {
  if (rwg === null) return { label: "N/D", bg: "bg-gray-100 text-gray-600" };
  if (rwg >= 0.7) return { label: "Suficiente", bg: "bg-green-100 text-green-800" };
  if (rwg >= 0.5) return { label: "Moderado", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Bajo", bg: "bg-red-100 text-red-800" };
}

export default async function TechnicalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [
    campaignResult,
    resultsResult,
    reliabilityResult,
    pipelineResult,
    qualityResult,
    qualityReportResult,
    comparisonResult,
    semanticFamiliesResult,
    onaStatusResult,
  ] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
    getReliabilityData(id),
    getPipelineOperationalSummary(id),
    getCampaignDataQuality(id),
    getCampaignQualityReport(id),
    getLatestAnalysisComparison(id),
    getSemanticResultFamilies(id),
    getONAStatus(id),
  ]);

  if (!campaignResult.success) notFound();
  const campaign = campaignResult.data;
  const results = resultsResult.success ? resultsResult.data : [];
  const reliability = reliabilityResult.success ? reliabilityResult.data : [];
  const pipeline = pipelineResult.success ? pipelineResult.data : null;
  const quality = qualityResult.success ? qualityResult.data : null;
  const qualityReport = qualityReportResult.success ? qualityReportResult.data : null;
  const comparison = comparisonResult.success ? comparisonResult.data : null;
  const semanticFamilies = semanticFamiliesResult.success ? semanticFamiliesResult.data : [];
  const onaStatus = onaStatusResult.success ? onaStatusResult.data : null;

  // Top 5 / Bottom 5 items
  const itemResults = results
    .filter((r) => r.result_type === "item" && r.segment_type === "global")
    .map((r) => ({
      text: (r.metadata as { item_text?: string })?.item_text ?? "",
      dimension:
        (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code ?? "",
      avg: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    }))
    .sort((a, b) => b.avg - a.avg);

  const top5 = itemResults.slice(0, 5);
  const bottom5 = itemResults.slice(-5).reverse();

  // Demographics from segment results
  const segResults = results
    .filter((r) => r.result_type === "dimension" && r.segment_type !== "global")
    .map((r) => ({
      segment_key: r.segment_key!,
      segment_type: r.segment_type!,
      respondent_count: r.respondent_count ?? 0,
    }));

  const demoData: Record<string, Map<string, number>> = {};
  for (const r of segResults) {
    if (!demoData[r.segment_type]) demoData[r.segment_type] = new Map();
    const existing = demoData[r.segment_type].get(r.segment_key) ?? 0;
    if (r.respondent_count > existing) {
      demoData[r.segment_type].set(r.segment_key, r.respondent_count);
    }
  }

  const demographics = Object.entries(demoData).map(([type, map]) => ({
    type,
    segments: [...map.entries()].map(([key, count]) => ({ key, count })),
  }));

  // Extract global rwg values from dimension results
  const globalDimResults = results
    .filter((r) => r.result_type === "dimension" && r.segment_type === "global")
    .map((r) => ({
      code: r.dimension_code!,
      name: (r.metadata as { dimension_name?: string })?.dimension_name ?? r.dimension_code!,
      rwg: (r.metadata as { rwg?: number | null })?.rwg ?? null,
    }));

  // Auto-generated limitations
  const lowAlphaDims = reliability.filter((r) => r.alpha !== null && r.alpha < 0.6);
  const uncalculatedAlphaDims = reliability.filter((r) => r.alpha === null);
  const lowRwgDims = globalDimResults.filter((d) => d.rwg !== null && d.rwg < 0.5);
  const responseRate = Number(campaign.response_rate ?? 0);
  const sampleN = campaign.sample_n ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Ficha Técnica</h1>

      {qualityReport ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calidad del instrumento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado</span>
                <Badge
                  className={
                    qualityReport.instrumentQuality.overallStatus === "robusto"
                      ? "bg-green-100 text-green-800"
                      : qualityReport.instrumentQuality.overallStatus === "aceptable"
                        ? "bg-blue-100 text-blue-800"
                        : qualityReport.instrumentQuality.overallStatus === "precaucion"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                  }
                >
                  {qualityReport.instrumentQuality.overallStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Score</span>
                <span>{qualityReport.instrumentQuality.overallScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Alertas</span>
                <span>
                  {qualityReport.instrumentQuality.warnings.length +
                    qualityReport.instrumentQuality.dimensionWarnings.length}
                </span>
              </div>
              {qualityReport.statisticalBaseline ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Robustez longitudinal</span>
                  <span>{qualityReport.statisticalBaseline.robustnessScore}</span>
                </div>
              ) : null}
              <Link
                href={`/campaigns/${id}/results/quality`}
                className="inline-flex text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Ver reporte de calidad completo
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desempeño de IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Score metodológico</span>
                <Badge
                  className={
                    qualityReport.aiEvaluation.methodological.overallScore >= 85
                      ? "bg-green-100 text-green-800"
                      : qualityReport.aiEvaluation.methodological.overallScore >= 70
                        ? "bg-blue-100 text-blue-800"
                        : qualityReport.aiEvaluation.methodological.overallScore >= 55
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                  }
                >
                  {qualityReport.aiEvaluation.methodological.overallScore}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cobertura</span>
                <span>{qualityReport.aiEvaluation.operational.successRatePct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tipos generados</span>
                <span>{qualityReport.aiEvaluation.coverage.generatedInsightTypes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Claims con evidencia</span>
                <span>{qualityReport.aiEvidenceCoverage.claimCount}</span>
              </div>
              <Link
                href={`/campaigns/${id}/results/quality`}
                className="inline-flex text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Ver matriz de desempeño IA
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Statistical card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ficha técnica estadística</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Población (N)</p>
              <p className="text-2xl font-bold">{campaign.population_n ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Muestra válida (n)</p>
              <p className="text-2xl font-bold">{campaign.sample_n ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tasa de respuesta</p>
              <p className="text-2xl font-bold">{campaign.response_rate ?? "—"}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margen de error</p>
              <p className="text-2xl font-bold">±{campaign.margin_of_error ?? "—"}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nivel de confianza</p>
              <p className="text-2xl font-bold">{campaign.confidence_level ?? 95}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Salud del pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado general</span>
              <Badge
                className={
                  pipeline?.health === "healthy"
                    ? "bg-green-100 text-green-800"
                    : pipeline?.health === "warning"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {pipeline?.health ?? "N/D"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dispatch</span>
              <span>
                {pipeline?.dispatch.delivered ?? 0} entregados / {pipeline?.dispatch.failed ?? 0}{" "}
                fallidos
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Última lógica</span>
              <span className="font-mono text-xs">
                {pipeline?.analysis.latestLogicVersion ?? "—"}
              </span>
            </div>
            {pipeline && pipeline.warnings.length > 0 && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                {pipeline.warnings.join(" | ")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calidad de datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Etiqueta</span>
              <Badge
                className={
                  quality?.qualityLabel === "high"
                    ? "bg-green-100 text-green-800"
                    : quality?.qualityLabel === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {quality?.qualityLabel ?? "N/D"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Respondentes válidos</span>
              <span>{quality?.validRespondentPct ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duplicados de ingesta</span>
              <span>{quality?.duplicateIngestEvents ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completitud demográfica</span>
              <span>{quality?.demographicCompletenessPct.department ?? 0}% dept.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Salud estadística</span>
              <Badge
                className={
                  quality?.statisticalHealth.health === "healthy"
                    ? "bg-green-100 text-green-800"
                    : quality?.statisticalHealth.health === "watch"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {quality?.statisticalHealth.health ?? "N/D"}
              </Badge>
            </div>
            {quality?.statisticalHealth.warnings?.length ? (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                {quality.statisticalHealth.warnings.join(" | ")}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado ONA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge
                className={
                  onaStatus?.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : onaStatus?.status === "pending"
                      ? "bg-blue-100 text-blue-800"
                      : onaStatus?.status === "deferred"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                }
              >
                {onaStatus?.status ?? "N/D"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Backend</span>
              <span>{onaStatus?.backend ?? "—"}</span>
            </div>
            {onaStatus?.errorMessage && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                {onaStatus.errorMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(comparison || semanticFamilies.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativa de corridas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {comparison ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cambio en muestra</span>
                    <span>
                      {comparison.sampleDelta >= 0 ? "+" : ""}
                      {comparison.sampleDelta}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cambio en tasa de respuesta</span>
                    <span>
                      {comparison.responseRateDelta >= 0 ? "+" : ""}
                      {comparison.responseRateDelta}%
                    </span>
                  </div>
                  <div className="space-y-1 pt-2">
                    {comparison.dimensionChanges.slice(0, 5).map((change) => (
                      <div key={change.code} className="flex items-center justify-between text-xs">
                        <span>{change.code}</span>
                        <span>
                          {change.delta >= 0 ? "+" : ""}
                          {change.delta.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Aún no hay suficientes snapshots para comparar corridas.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Familias analíticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {semanticFamilies.map((family) => (
                <div key={family.family} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium capitalize">{family.family}</span>
                    <span>
                      {family.avgScore.toFixed(2)} / {family.favorabilityPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {family.dimensions.slice(0, 4).map((dimension) => (
                      <div
                        key={dimension.dimensionCode}
                        className="flex items-center justify-between"
                      >
                        <span>{dimension.dimensionCode}</span>
                        <span>{dimension.avgScore.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Demographics */}
      <TechnicalClient demographics={demographics} />

      {/* Reliability — Cronbach's alpha */}
      {reliability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confiabilidad del instrumento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              El coeficiente alfa de Cronbach indica la consistencia interna de cada dimensión.
              Valores ≥ 0.70 son considerados aceptables para investigación organizacional.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Dimensión</th>
                    <th className="text-center px-3 py-2">α Cronbach</th>
                    <th className="text-center px-3 py-2">Ítems</th>
                    <th className="text-center px-3 py-2">n</th>
                    <th className="text-center px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reliability.map((r) => (
                    <tr key={r.dimension_code} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{r.dimension_code}</span>
                        <span className="text-muted-foreground ml-2">{r.dimension_name}</span>
                      </td>
                      <td className="text-center px-3 py-2">
                        <AlphaIndicator
                          alpha={r.alpha}
                          status={
                            r.alphaStatus ?? (r.alpha !== null ? "calculated" : "insufficient_n")
                          }
                          n={r.respondent_count}
                          k={r.item_count}
                          compact
                        />
                      </td>
                      <td className="text-center px-3 py-2">{r.item_count}</td>
                      <td className="text-center px-3 py-2">{r.respondent_count}</td>
                      <td className="text-center px-3 py-2">
                        <AlphaIndicator
                          alpha={r.alpha}
                          status={
                            r.alphaStatus ?? (r.alpha !== null ? "calculated" : "insufficient_n")
                          }
                          n={r.respondent_count}
                          k={r.item_count}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* rwg global */}
      {globalDimResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acuerdo intergrupal (rwg global)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              El índice rwg indica el grado de acuerdo entre respondentes para cada dimensión.
              Valores ≥ 0.70 justifican la agregación de percepciones individuales a nivel de grupo.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Dimensión</th>
                    <th className="text-center px-3 py-2">rwg</th>
                    <th className="text-center px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {globalDimResults.map((d) => {
                    const status = rwgStatus(d.rwg);
                    return (
                      <tr key={d.code} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span className="font-medium">{d.code}</span>
                          <span className="text-muted-foreground ml-2">{d.name}</span>
                        </td>
                        <td className="text-center px-3 py-2 font-mono">
                          {d.rwg !== null ? d.rwg.toFixed(3) : "—"}
                        </td>
                        <td className="text-center px-3 py-2">
                          <Badge className={status.bg}>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limitaciones y alcance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Este instrumento mide percepciones individuales agregadas a nivel de grupo. Los
              resultados reflejan la experiencia subjetiva colectiva de los colaboradores, no una
              evaluación objetiva de las condiciones organizacionales.
            </p>
            {lowAlphaDims.length > 0 && (
              <p className="text-yellow-700">
                Las siguientes dimensiones presentaron consistencia interna baja (α &lt; 0.60):{" "}
                {lowAlphaDims.map((d) => d.dimension_code).join(", ")}. Los resultados de estas
                dimensiones deben interpretarse con cautela.
              </p>
            )}
            {uncalculatedAlphaDims.length > 0 && (
              <p className="text-muted-foreground">
                Confiabilidad no calculada en {uncalculatedAlphaDims.length} dimensión(es) con menos
                de 10 respondentes: {uncalculatedAlphaDims.map((d) => d.dimension_code).join(", ")}.
              </p>
            )}
            {lowRwgDims.length > 0 && (
              <p className="text-yellow-700">
                Las siguientes dimensiones presentaron bajo acuerdo entre respondentes (rwg &lt;
                0.50): {lowRwgDims.map((d) => d.code).join(", ")}. El promedio grupal puede no
                representar una percepción compartida.
              </p>
            )}
            {responseRate < 60 && (
              <p className="text-yellow-700">
                La tasa de respuesta ({responseRate}%) es inferior al 60% recomendado, lo que puede
                introducir sesgo de no respuesta.
              </p>
            )}
            {sampleN > 0 && sampleN < 30 && (
              <p className="text-yellow-700">
                La muestra válida (n={sampleN}) es inferior a 30, lo que limita la precisión de las
                estimaciones estadísticas.
              </p>
            )}
            <p>
              Las comparaciones entre organizaciones requieren evidencia de equivalencia de medición
              (invariancia factorial), la cual no ha sido establecida en esta versión.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 ítems (mayor score)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {top5.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold w-6 text-green-600">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.dimension}</p>
                </div>
                <span className="font-bold">{item.avg.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground w-14 text-right">{item.fav}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom 5 items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bottom 5 ítems (menor score)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bottom5.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold w-6 text-red-600">
                  #{itemResults.length - i}
                </span>
                <div className="flex-1">
                  <p className="text-sm">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.dimension}</p>
                </div>
                <span className="font-bold">{item.avg.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground w-14 text-right">{item.fav}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
