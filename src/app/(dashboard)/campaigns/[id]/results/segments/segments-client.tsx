"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type HeatmapRow = {
  segment_key: string;
  segment_type: string;
  dimension_code: string;
  avg_score: number;
  favorability_pct: number;
  respondent_count: number;
};

function heatColor(score: number): string {
  if (score >= 4.5) return "bg-green-700 text-white";
  if (score >= 4.2) return "bg-green-500 text-white";
  if (score >= 3.8) return "bg-yellow-400 text-black";
  if (score >= 3.5) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

export function SegmentsClient({
  heatmapData,
  dimensionCodes,
  globalEngScore,
}: {
  heatmapData: HeatmapRow[];
  dimensionCodes: string[];
  globalEngScore: number;
}) {
  const segmentTypes = ["department", "tenure", "gender"];
  const segLabels: Record<string, string> = {
    department: "Departamento",
    tenure: "Antigüedad",
    gender: "Género",
  };

  function renderHeatmap(segType: string) {
    const filtered = heatmapData.filter((d) => d.segment_type === segType);
    const segments = [...new Set(filtered.map((d) => d.segment_key))];
    const dims = dimensionCodes;

    if (segments.length === 0) {
      return <p className="text-sm text-muted-foreground">No hay datos suficientes (mínimo 5 respondentes por segmento).</p>;
    }

    // Build lookup
    const lookup = new Map<string, number>();
    for (const d of filtered) {
      lookup.set(`${d.segment_key}|${d.dimension_code}`, d.avg_score);
    }

    // ENG scores per segment for risk groups
    const engBySegment = new Map<string, number>();
    for (const d of filtered) {
      if (d.dimension_code === "ENG") engBySegment.set(d.segment_key, d.avg_score);
    }

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 sticky left-0 bg-background">{segLabels[segType]}</th>
                {dims.map((dim) => (
                  <th key={dim} className="text-center px-1 py-2 text-xs">{dim}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments.map((seg) => (
                <tr key={seg}>
                  <td className="py-1 pr-4 font-medium text-xs sticky left-0 bg-background">{seg}</td>
                  {dims.map((dim) => {
                    const score = lookup.get(`${seg}|${dim}`);
                    return (
                      <td key={dim} className="px-0.5 py-0.5">
                        {score != null ? (
                          <div className={`text-center rounded px-1 py-0.5 text-xs font-medium ${heatColor(score)}`}>
                            {score.toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-center text-xs text-gray-300">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk groups */}
        {[...engBySegment.entries()].filter(([, v]) => v < 3.5).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-600">Grupos de riesgo (Engagement &lt; 3.5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[...engBySegment.entries()]
                  .filter(([, v]) => v < 3.5)
                  .map(([seg, v]) => (
                    <Badge key={seg} variant="destructive">{seg}: {v.toFixed(2)}</Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Segmentación Demográfica</h1>
        <p className="text-sm text-muted-foreground">Engagement global: {globalEngScore.toFixed(2)}</p>
      </div>
      <p className="text-xs text-muted-foreground">Nota: Segmentos con menos de 5 respondentes no se muestran para proteger el anonimato.</p>

      <Tabs defaultValue="department">
        <TabsList>
          {segmentTypes.map((st) => (
            <TabsTrigger key={st} value={st}>{segLabels[st]}</TabsTrigger>
          ))}
        </TabsList>
        {segmentTypes.map((st) => (
          <TabsContent key={st} value={st} className="mt-4">
            {renderHeatmap(st)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
