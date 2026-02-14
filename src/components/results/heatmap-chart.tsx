"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapDataPoint {
  segment_key: string;
  segment_type: string;
  dimension_code: string;
  avg_score: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  dimensionCodes: string[];
}

function getCellStyle(score: number): string {
  if (score >= 4.5) return "bg-green-700 text-white";
  if (score >= 4.2) return "bg-green-500 text-white";
  if (score >= 3.8) return "bg-yellow-400 text-black";
  if (score >= 3.5) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

export function HeatmapChart({ data, dimensionCodes }: HeatmapChartProps) {
  const segments = [...new Set(data.map((d) => d.segment_key))];

  const lookup = new Map<string, number>();
  data.forEach((d) => {
    lookup.set(`${d.segment_key}__${d.dimension_code}`, d.avg_score);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Calor por Segmentos</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-background p-2 text-left font-medium border-b">
                Segmento
              </th>
              {dimensionCodes.map((code) => (
                <th key={code} className="p-2 text-center font-medium border-b min-w-[60px]">
                  {code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {segments.map((segment) => (
              <tr key={segment}>
                <td className="sticky left-0 bg-background p-2 font-medium border-b whitespace-nowrap">
                  {segment}
                </td>
                {dimensionCodes.map((code) => {
                  const score = lookup.get(`${segment}__${code}`);
                  return (
                    <td
                      key={code}
                      className={`p-2 text-center border-b font-semibold ${
                        score !== undefined ? getCellStyle(score) : "bg-gray-50"
                      }`}
                      title={
                        score !== undefined
                          ? `${segment} / ${code}: ${score.toFixed(2)}`
                          : "Sin datos"
                      }
                    >
                      {score !== undefined ? score.toFixed(1) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-700" />
            ≥4.5
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
            ≥4.2
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
            ≥3.8
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-orange-400" />
            ≥3.5
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
            &lt;3.5
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
