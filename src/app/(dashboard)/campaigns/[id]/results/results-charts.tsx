"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DimensionData = {
  code: string;
  name: string;
  avg: number;
  fav: number;
};

type ProfilesData = {
  ambassadors: number;
  committed: number;
  neutral: number;
  disengaged: number;
};

type HeatmapData = {
  departments: string[];
  dimensions: string[];
  values: (number | null)[][];
};

export function ResultsCharts({
  dimensionResults,
  profiles,
  heatmapData,
}: {
  dimensionResults: DimensionData[];
  profiles: ProfilesData | null;
  heatmapData: HeatmapData | null;
}) {
  // Radar chart data
  const radarData = dimensionResults.map((d) => ({
    dimension: d.name,
    score: d.avg,
    fullMark: 5,
  }));

  // Donut chart data
  const donutData = profiles
    ? [
        { name: "Embajadores", value: profiles.ambassadors, color: "#15803d" },
        { name: "Comprometidos", value: profiles.committed, color: "#2563eb" },
        { name: "Neutrales", value: profiles.neutral, color: "#eab308" },
        { name: "Desvinculados", value: profiles.disengaged, color: "#dc2626" },
      ]
    : [];

  // Heatmap color
  function heatColor(score: number | null): string {
    if (score === null) return "bg-gray-100";
    if (score >= 4.5) return "bg-green-700 text-white";
    if (score >= 4.2) return "bg-green-500 text-white";
    if (score >= 3.8) return "bg-yellow-400 text-black";
    if (score >= 3.5) return "bg-orange-400 text-white";
    return "bg-red-500 text-white";
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Radar de dimensiones</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.3}
              />
              <Tooltip formatter={(value) => [Number(value).toFixed(2), "Score"]} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Donut */}
      {profiles && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfiles de engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${value}%`}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, ""]} />
                <Legend formatter={(value) => <span className="text-sm">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      {heatmapData && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Heatmap: Departamento × Dimensión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4"></th>
                    {heatmapData.dimensions.map((dim) => (
                      <th key={dim} className="text-center px-2 py-2 text-xs">
                        {dim}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.departments.map((dept, deptIdx) => (
                    <tr key={dept}>
                      <td className="py-2 pr-4 font-medium text-xs">{dept}</td>
                      {heatmapData.values[deptIdx].map((score, dimIdx) => (
                        <td key={dimIdx} className="px-1 py-1">
                          <div
                            className={`text-center rounded px-2 py-1 text-xs font-medium ${heatColor(score)}`}
                          >
                            {score?.toFixed(2) ?? "—"}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
