import { notFound } from "next/navigation";
import { getCampaign, getCampaignResults } from "@/actions/campaigns";
import { getOrganization } from "@/actions/organizations";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ResultsCharts } from "./results-charts";

function classifyScore(score: number) {
  if (score >= 4.5)
    return { label: "Fortaleza Excepcional", color: "bg-green-800 text-white" };
  if (score >= 4.2) return { label: "Fortaleza", color: "bg-green-600 text-white" };
  if (score >= 3.8) return { label: "Aceptable", color: "bg-yellow-500 text-white" };
  if (score >= 3.5)
    return { label: "Requiere Atención", color: "bg-orange-500 text-white" };
  return { label: "Crítico", color: "bg-red-600 text-white" };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaignResult, resultsResult] = await Promise.all([
    getCampaign(id),
    getCampaignResults(id),
  ]);

  if (!campaignResult.success) {
    notFound();
  }

  const campaign = campaignResult.data;
  const results = resultsResult.success ? resultsResult.data : [];

  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Resultados</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay resultados calculados para esta campaña.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orgResult = await getOrganization(campaign.organization_id);
  const orgName = orgResult.success ? orgResult.data.name : "—";

  // Parse results
  const dimensionResults = results.filter(
    (r) => r.result_type === "dimension" && r.segment_type === "global"
  );
  const itemResults = results.filter((r) => r.result_type === "item");
  const engagementResult = results.find(
    (r) => r.result_type === "engagement" && r.segment_type === "global"
  );
  const segmentResults = results.filter(
    (r) => r.result_type === "dimension" && r.segment_type !== "global"
  );
  const enpsResult = results.find((r) => r.result_type === "enps");

  // Sort dimensions by score
  const sortedDimensions = [...dimensionResults].sort(
    (a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0)
  );

  // Global average
  const globalAvg =
    dimensionResults.length > 0
      ? dimensionResults.reduce((sum, d) => sum + (d.avg_score ?? 0), 0) /
        dimensionResults.length
      : 0;

  const globalFav =
    dimensionResults.length > 0
      ? dimensionResults.reduce(
          (sum, d) => sum + (d.favorability_pct ?? 0),
          0
        ) / dimensionResults.length
      : 0;

  // Top/Bottom items
  const sortedItems = [...itemResults].sort(
    (a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0)
  );
  const topItems = sortedItems.slice(0, 5);
  const bottomItems = sortedItems.slice(-5).reverse();

  // Engagement profiles
  const profiles = (
    engagementResult?.metadata as {
      profiles?: {
        ambassadors?: { count: number; pct: number };
        committed?: { count: number; pct: number };
        neutral?: { count: number; pct: number };
        disengaged?: { count: number; pct: number };
      };
    }
  )?.profiles;

  // Heatmap data: department × dimension
  const deptResults = segmentResults.filter(
    (r) => r.segment_type === "department"
  );
  const departments = [...new Set(deptResults.map((r) => r.segment_key!))];
  const dimCodes = dimensionResults.map((r) => r.dimension_code!);

  const showHeatmap = departments.length >= 3;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Resultados: {campaign.name}
        </h1>
        <p className="text-muted-foreground">{orgName}</p>
      </div>

      {/* KPIs Header */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Engagement</CardDescription>
            <CardTitle className="text-3xl">
              {engagementResult?.avg_score?.toFixed(2) ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Favorabilidad global</CardDescription>
            <CardTitle className="text-3xl">
              {globalFav.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>eNPS</CardDescription>
            <CardTitle className="text-3xl">
              {enpsResult
                ? `${(enpsResult.avg_score ?? 0) > 0 ? "+" : ""}${enpsResult.avg_score}`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasa de respuesta</CardDescription>
            <CardTitle className="text-3xl">
              {campaign.response_rate ?? "—"}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Ficha técnica */}
      {campaign.population_n !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ficha técnica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Población (N): </span>
                <strong>{campaign.population_n}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Muestra (n): </span>
                <strong>{campaign.sample_n}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Tasa respuesta: </span>
                <strong>{campaign.response_rate}%</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Margen error: </span>
                <strong>±{campaign.margin_of_error}%</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Confianza: </span>
                <strong>{campaign.confidence_level}%</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts (client component) */}
      <ResultsCharts
        dimensionResults={dimensionResults.map((d) => ({
          code: d.dimension_code!,
          avg: d.avg_score ?? 0,
          fav: d.favorability_pct ?? 0,
        }))}
        profiles={
          profiles
            ? {
                ambassadors: profiles.ambassadors?.pct ?? 0,
                committed: profiles.committed?.pct ?? 0,
                neutral: profiles.neutral?.pct ?? 0,
                disengaged: profiles.disengaged?.pct ?? 0,
              }
            : null
        }
        heatmapData={
          showHeatmap
            ? {
                departments,
                dimensions: dimCodes,
                values: departments.map((dept) =>
                  dimCodes.map((code) => {
                    const r = deptResults.find(
                      (dr) =>
                        dr.segment_key === dept && dr.dimension_code === code
                    );
                    return r?.avg_score ?? null;
                  })
                ),
              }
            : null
        }
      />

      {/* Dimension Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de dimensiones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedDimensions.map((dim) => {
            const classification = classifyScore(dim.avg_score ?? 0);
            const pct = ((dim.avg_score ?? 0) / 5) * 100;
            return (
              <div key={dim.dimension_code} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{dim.dimension_code}</span>
                  <div className="flex items-center gap-2">
                    <span>{dim.avg_score?.toFixed(2)}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${classification.color}`}
                    >
                      {classification.label}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Engagement Profiles */}
      {profiles && (
        <Card>
          <CardHeader>
            <CardTitle>Perfiles de engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {profiles.ambassadors?.pct ?? 0}%
                </p>
                <p className="text-sm text-green-600">Embajadores</p>
                <p className="text-xs text-muted-foreground">
                  {profiles.ambassadors?.count ?? 0} personas
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {profiles.committed?.pct ?? 0}%
                </p>
                <p className="text-sm text-blue-600">Comprometidos</p>
                <p className="text-xs text-muted-foreground">
                  {profiles.committed?.count ?? 0} personas
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">
                  {profiles.neutral?.pct ?? 0}%
                </p>
                <p className="text-sm text-yellow-600">Neutrales</p>
                <p className="text-xs text-muted-foreground">
                  {profiles.neutral?.count ?? 0} personas
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">
                  {profiles.disengaged?.pct ?? 0}%
                </p>
                <p className="text-sm text-red-600">Desvinculados</p>
                <p className="text-xs text-muted-foreground">
                  {profiles.disengaged?.count ?? 0} personas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top/Bottom Items */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 ítems</CardTitle>
            <CardDescription>Ítems con mayor puntuación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topItems.map((item, idx) => {
              const text = (item.metadata as { item_text?: string })
                ?.item_text ?? "—";
              return (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <span className="font-bold text-green-600 shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <p>{text}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.dimension_code} · Score: {item.avg_score?.toFixed(2)} ·
                      Fav: {item.favorability_pct?.toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bottom 5 ítems</CardTitle>
            <CardDescription>Ítems con menor puntuación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bottomItems.map((item, idx) => {
              const text = (item.metadata as { item_text?: string })
                ?.item_text ?? "—";
              return (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <span className="font-bold text-red-600 shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <p>{text}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.dimension_code} · Score: {item.avg_score?.toFixed(2)} ·
                      Fav: {item.favorability_pct?.toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Demographic Segments */}
      {segmentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="department">
              <TabsList>
                {departments.length > 0 && (
                  <TabsTrigger value="department">Departamento</TabsTrigger>
                )}
                {segmentResults.some(
                  (r) => r.segment_type === "tenure"
                ) && <TabsTrigger value="tenure">Antigüedad</TabsTrigger>}
                {segmentResults.some(
                  (r) => r.segment_type === "gender"
                ) && <TabsTrigger value="gender">Género</TabsTrigger>}
              </TabsList>

              {["department", "tenure", "gender"].map((segType) => {
                const segs = segmentResults.filter(
                  (r) => r.segment_type === segType
                );
                if (segs.length === 0) return null;

                const segKeys = [...new Set(segs.map((r) => r.segment_key!))];

                return (
                  <TabsContent key={segType} value={segType}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4">Segmento</th>
                            {dimCodes.map((code) => (
                              <th key={code} className="text-center px-2 py-2">
                                {code}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {segKeys.map((key) => (
                            <tr key={key} className="border-b">
                              <td className="py-2 pr-4 font-medium">{key}</td>
                              {dimCodes.map((code) => {
                                const r = segs.find(
                                  (s) =>
                                    s.segment_key === key &&
                                    s.dimension_code === code
                                );
                                return (
                                  <td
                                    key={code}
                                    className="text-center px-2 py-2"
                                  >
                                    {r?.avg_score?.toFixed(2) ?? "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
