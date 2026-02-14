"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DemographicDataPoint {
  segment_key: string;
  segment_type: string;
  dimension_code: string;
  avg_score: number;
  respondent_count: number;
}

interface DemographicChartsProps {
  data: DemographicDataPoint[];
}

const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
  "#65a30d",
  "#4338ca",
  "#b45309",
];

function aggregateBySegment(
  data: DemographicDataPoint[],
  segmentType: string
): Array<{ name: string; value: number; avgScore: number }> {
  const map = new Map<string, { count: number; totalScore: number; dimensions: number }>();

  data
    .filter((d) => d.segment_type === segmentType)
    .forEach((d) => {
      const existing = map.get(d.segment_key) ?? {
        count: d.respondent_count,
        totalScore: 0,
        dimensions: 0,
      };
      existing.totalScore += d.avg_score;
      existing.dimensions += 1;
      existing.count = d.respondent_count;
      map.set(d.segment_key, existing);
    });

  return Array.from(map.entries()).map(([name, stats]) => ({
    name,
    value: stats.count,
    avgScore: stats.dimensions > 0 ? stats.totalScore / stats.dimensions : 0,
  }));
}

export function DemographicCharts({ data }: DemographicChartsProps) {
  const departments = aggregateBySegment(data, "department");
  const tenures = aggregateBySegment(data, "tenure");
  const genders = aggregateBySegment(data, "gender");

  return (
    <div className="grid gap-6">
      {/* Departamentos - Gráfico de pastel */}
      {departments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={departments}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {departments.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} respondientes`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Antigüedad - Gráfico de barras */}
      {tenures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Puntuación Promedio por Antigüedad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tenures} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 5]} tickCount={6} />
                <Tooltip formatter={(value) => [Number(value).toFixed(2), "Promedio"]} />
                <Bar
                  dataKey="avgScore"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  name="Promedio"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Género - Gráfico de barras */}
      {genders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Puntuación Promedio por Género</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genders} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 5]} tickCount={6} />
                <Tooltip formatter={(value) => [Number(value).toFixed(2), "Promedio"]} />
                <Bar
                  dataKey="avgScore"
                  fill="#9333ea"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  name="Promedio"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
