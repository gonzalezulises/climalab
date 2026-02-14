"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#eab308", "#7c3aed",
  "#0891b2", "#ea580c", "#4f46e5", "#059669", "#be123c",
  "#0284c7", "#65a30d", "#c026d3", "#f59e0b", "#6366f1",
  "#14b8a6", "#e11d48", "#8b5cf6",
];

type Props = {
  campaigns: Array<{ id: string; name: string; ends_at: string }>;
  series: Record<string, Array<{ campaign_id: string; avg_score: number }>>;
};

export function TrendsClient({ campaigns, series }: Props) {
  const allCodes = Object.keys(series);
  const [selected, setSelected] = useState<string[]>(["ENG"]);

  const toggleDim = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
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
        <CardHeader><CardTitle className="text-base">Evolución por dimensión</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => Number(v).toFixed(2)} />
              <Legend />
              {selected.map((code, i) => (
                <Line key={code} type="monotone" dataKey={code} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tabla comparativa</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4">Dimensión</th>
                  {campaigns.map((c) => (
                    <th key={c.id} className="text-center px-3 py-2">{c.name}</th>
                  ))}
                  {campaigns.length >= 2 && <th className="text-center px-3 py-2">Δ</th>}
                </tr>
              </thead>
              <tbody>
                {tableData.map(({ code, values }) => {
                  const delta = values.length >= 2 && values[values.length - 1] != null && values[values.length - 2] != null
                    ? +(values[values.length - 1]! - values[values.length - 2]!).toFixed(2)
                    : null;
                  return (
                    <tr key={code} className="border-t">
                      <td className="py-2 pr-4 font-medium">{code}</td>
                      {values.map((v, i) => (
                        <td key={i} className="text-center px-3 py-2">{v?.toFixed(2) ?? "—"}</td>
                      ))}
                      {campaigns.length >= 2 && (
                        <td className={`text-center px-3 py-2 font-bold ${
                          delta == null ? "" : delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-500"
                        }`}>
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
    </div>
  );
}
