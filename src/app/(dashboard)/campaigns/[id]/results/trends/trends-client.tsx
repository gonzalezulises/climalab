"use client";

import { useState, useTransition } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { generateTrendsNarrative } from "@/actions/ai-insights";
import type { TrendsNarrative } from "@/actions/ai-insights";

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#eab308",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#059669",
  "#be123c",
  "#0284c7",
  "#65a30d",
  "#c026d3",
  "#f59e0b",
  "#6366f1",
  "#14b8a6",
  "#e11d48",
  "#8b5cf6",
];

type Props = {
  campaignId: string;
  organizationId: string;
  campaigns: Array<{ id: string; name: string; ends_at: string }>;
  series: Record<string, Array<{ campaign_id: string; avg_score: number }>>;
  initialNarrative: TrendsNarrative | null;
};

export function TrendsClient({
  campaignId,
  organizationId,
  campaigns,
  series,
  initialNarrative,
}: Props) {
  const allCodes = Object.keys(series);
  const [selected, setSelected] = useState<string[]>(["ENG"]);
  const [narrative, setNarrative] = useState<TrendsNarrative | null>(initialNarrative);
  const [isPending, startTransition] = useTransition();

  const toggleDim = (code: string) => {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  // Build chart data: one row per campaign
  const chartData = campaigns.map((c) => {
    const row: Record<string, string | number> = { name: c.name };
    for (const code of selected) {
      const point = series[code]?.find((p) => p.campaign_id === c.id);
      if (point) row[code] = point.avg_score;
    }
    return row;
  });

  // Comparison table
  const tableData = allCodes.map((code) => {
    const points = series[code] ?? [];
    const values = campaigns.map((c) => {
      const p = points.find((pt) => pt.campaign_id === c.id);
      return p?.avg_score ?? null;
    });
    return { code, values };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Tendencias Históricas</h1>

      {/* Dimension selector */}
      <div className="flex flex-wrap gap-2">
        {allCodes.map((code) => (
          <button
            key={code}
            onClick={() => toggleDim(code)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(code)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {code}
          </button>
        ))}
      </div>

      {/* Line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución por dimensión</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => Number(v).toFixed(2)} />
              <Legend />
              {selected.map((code, i) => (
                <Line
                  key={code}
                  type="monotone"
                  dataKey={code}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabla comparativa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4">Dimensión</th>
                  {campaigns.map((c) => (
                    <th key={c.id} className="text-center px-3 py-2">
                      {c.name}
                    </th>
                  ))}
                  {campaigns.length >= 2 && <th className="text-center px-3 py-2">Δ</th>}
                </tr>
              </thead>
              <tbody>
                {tableData.map(({ code, values }) => {
                  const delta =
                    values.length >= 2 &&
                    values[values.length - 1] != null &&
                    values[values.length - 2] != null
                      ? +(values[values.length - 1]! - values[values.length - 2]!).toFixed(2)
                      : null;
                  return (
                    <tr key={code} className="border-t">
                      <td className="py-2 pr-4 font-medium">{code}</td>
                      {values.map((v, i) => (
                        <td key={i} className="text-center px-3 py-2">
                          {v?.toFixed(2) ?? "—"}
                        </td>
                      ))}
                      {campaigns.length >= 2 && (
                        <td
                          className={`text-center px-3 py-2 font-bold ${
                            delta == null
                              ? ""
                              : delta > 0
                                ? "text-green-600"
                                : delta < 0
                                  ? "text-red-600"
                                  : "text-gray-500"
                          }`}
                        >
                          {delta != null ? `${delta > 0 ? "+" : ""}${delta}` : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Trends Narrative */}
      {narrative ? (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Análisis de tendencias IA
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  startTransition(async () => {
                    const result = await generateTrendsNarrative(organizationId);
                    if (result.success) setNarrative(result.data);
                  })
                }
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerar"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{narrative.trajectory}</p>
            <div className="grid gap-3 md:grid-cols-3">
              {narrative.improving.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Mejorando</p>
                  <ul className="space-y-1">
                    {narrative.improving.map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <span className="text-green-600">+</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {narrative.declining.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">En declive</p>
                  <ul className="space-y-1">
                    {narrative.declining.map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <span className="text-red-600">-</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {narrative.stable.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Estable</p>
                  <ul className="space-y-1">
                    {narrative.stable.map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <span className="text-gray-500">=</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {narrative.inflection_points.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-amber-700 mb-1">Puntos de inflexión</p>
                <ul className="space-y-1">
                  {narrative.inflection_points.map((item, i) => (
                    <li key={i} className="text-xs">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            startTransition(async () => {
              const result = await generateTrendsNarrative(organizationId);
              if (result.success) setNarrative(result.data);
            })
          }
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Analizar tendencias con IA
        </Button>
      )}
    </div>
  );
}
