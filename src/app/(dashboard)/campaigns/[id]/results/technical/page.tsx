import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getReliabilityData } from "@/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TechnicalClient } from "./technical-client";

function alphaStatus(alpha: number | null) {
  if (alpha === null) return { label: "N/D", bg: "bg-gray-100 text-gray-600" };
  if (alpha >= 0.7) return { label: "Aceptable", bg: "bg-green-100 text-green-800" };
  if (alpha >= 0.6) return { label: "Marginal", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Bajo", bg: "bg-red-100 text-red-800" };
}

function rwgStatus(rwg: number | null) {
  if (rwg === null) return { label: "N/D", bg: "bg-gray-100 text-gray-600" };
  if (rwg >= 0.7) return { label: "Suficiente", bg: "bg-green-100 text-green-800" };
  if (rwg >= 0.5) return { label: "Moderado", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Bajo", bg: "bg-red-100 text-red-800" };
}

export default async function TechnicalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaignResult, resultsResult, reliabilityResult] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
    getReliabilityData(id),
  ]);

  if (!campaignResult.success) notFound();
  const campaign = campaignResult.data;
  const results = resultsResult.success ? resultsResult.data : [];
  const reliability = reliabilityResult.success ? reliabilityResult.data : [];

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
  const lowRwgDims = globalDimResults.filter((d) => d.rwg !== null && d.rwg < 0.5);
  const responseRate = Number(campaign.response_rate ?? 0);
  const sampleN = campaign.sample_n ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Ficha Técnica</h1>

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
                  {reliability.map((r) => {
                    const status = alphaStatus(r.alpha);
                    return (
                      <tr key={r.dimension_code} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span className="font-medium">{r.dimension_code}</span>
                          <span className="text-muted-foreground ml-2">{r.dimension_name}</span>
                        </td>
                        <td className="text-center px-3 py-2 font-mono">
                          {r.alpha !== null ? r.alpha.toFixed(3) : "—"}
                        </td>
                        <td className="text-center px-3 py-2">{r.item_count}</td>
                        <td className="text-center px-3 py-2">{r.respondent_count}</td>
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
