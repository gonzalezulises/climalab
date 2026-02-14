"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#e11d48",
  "#0891b2",
  "#ca8a04",
  "#6366f1",
];

type GapData = {
  code: string;
  name: string;
  gap: number;
  best: { dept: string; score: number };
  worst: { dept: string; score: number };
};

export function GapAnalysisChart({ gaps }: { gaps: GapData[] }) {
  const chartData = gaps.slice(0, 15).map((g) => ({
    name: g.code,
    fullName: g.name,
    gap: g.gap,
    worst: g.worst.score,
    spread: g.best.score - g.worst.score,
    bestDept: g.best.dept,
    worstDept: g.worst.dept,
    bestScore: g.best.score,
    worstScore: g.worst.score,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brecha entre Departamentos por Dimensión</CardTitle>
        <CardDescription>
          Diferencia entre el departamento con mejor y peor score. Mayor brecha = mayor desigualdad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 35)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 5]} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              formatter={(value, name, props) => {
                if (name === "worst") return [null, null];
                const d = props.payload;
                return [
                  `Brecha: ${Number(d.gap).toFixed(2)} (${d.worstDept}: ${Number(d.worstScore).toFixed(2)} → ${d.bestDept}: ${Number(d.bestScore).toFixed(2)})`,
                  d.fullName,
                ];
              }}
            />
            <Bar dataKey="worst" stackId="a" fill="transparent" />
            <Bar dataKey="spread" stackId="a" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={
                    chartData[i].gap >= 0.5
                      ? "#dc2626"
                      : chartData[i].gap >= 0.3
                        ? "#f59e0b"
                        : "#22c55e"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

type ComparisonProps = {
  departments: string[];
  dimensionCodes: string[];
  dimensionNames: Record<string, string>;
  heatmapData: Array<{
    segment_key: string;
    dimension_code: string;
    avg_score: number;
  }>;
};

export function DepartmentComparisonChart({
  departments,
  dimensionCodes,
  dimensionNames,
  heatmapData,
}: ComparisonProps) {
  const [selectedDepts, setSelectedDepts] = useState<string[]>(departments.slice(0, 4));
  const [selectedDims, setSelectedDims] = useState<string[]>(dimensionCodes.slice(0, 8));

  // Build lookup
  const lookup = new Map<string, number>();
  for (const d of heatmapData) {
    lookup.set(`${d.segment_key}|${d.dimension_code}`, d.avg_score);
  }

  const chartData = selectedDims.map((dim) => {
    const entry: Record<string, string | number> = {
      name: dim,
      fullName: dimensionNames[dim] ?? dim,
    };
    for (const dept of selectedDepts) {
      entry[dept] = lookup.get(`${dept}|${dim}`) ?? 0;
    }
    return entry;
  });

  function toggleDept(dept: string) {
    setSelectedDepts((prev) =>
      prev.includes(dept)
        ? prev.filter((d) => d !== dept)
        : prev.length < 6
          ? [...prev, dept]
          : prev
    );
  }

  function toggleDim(dim: string) {
    setSelectedDims((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : prev.length < 12 ? [...prev, dim] : prev
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparación entre Departamentos</CardTitle>
        <CardDescription>Selecciona departamentos y dimensiones para comparar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Department selector */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Departamentos</p>
          <div className="flex flex-wrap gap-1.5">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => toggleDept(dept)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  selectedDepts.includes(dept)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Dimension selector */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Dimensiones</p>
          <div className="flex flex-wrap gap-1.5">
            {dimensionCodes.map((dim) => (
              <button
                key={dim}
                onClick={() => toggleDim(dim)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  selectedDims.includes(dim)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {dim}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {selectedDepts.length > 0 && selectedDims.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.max(300, selectedDims.length * 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(value) => [Number(value).toFixed(2)]} />
              <Legend />
              {selectedDepts.map((dept, i) => (
                <Bar
                  key={dept}
                  dataKey={dept}
                  fill={COLORS[i % COLORS.length]}
                  radius={[0, 2, 2, 0]}
                  barSize={12}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
