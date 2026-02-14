"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Campaign {
  id: string;
  name: string;
}

interface TrendLinesProps {
  campaigns: Campaign[];
  series: Record<string, Array<{ campaign_id: string; avg_score: number }>>;
  selectedDimensions?: string[];
}

const LINE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
  "#65a30d",
  "#4338ca",
  "#b45309",
  "#0d9488",
  "#7c3aed",
  "#c2410c",
  "#0369a1",
  "#a21caf",
  "#15803d",
  "#b91c1c",
  "#1d4ed8",
];

export function TrendLines({ campaigns, series, selectedDimensions }: TrendLinesProps) {
  const dimensionKeys = selectedDimensions ?? Object.keys(series);

  const chartData = campaigns.map((campaign) => {
    const point: Record<string, string | number> = { name: campaign.name };
    dimensionKeys.forEach((dim) => {
      const match = series[dim]?.find((s) => s.campaign_id === campaign.id);
      if (match) {
        point[dim] = match.avg_score;
      }
    });
    return point;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencias por Dimensión</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 5]} tickCount={6} />
            <Tooltip />
            <Legend />
            {dimensionKeys.map((dim, index) => (
              <Line
                key={dim}
                type="monotone"
                dataKey={dim}
                name={dim}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
