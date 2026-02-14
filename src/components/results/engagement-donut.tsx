"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EngagementProfile {
  count: number;
  pct: number;
}

interface EngagementDonutProps {
  profiles: {
    ambassadors: EngagementProfile;
    committed: EngagementProfile;
    neutral: EngagementProfile;
    disengaged: EngagementProfile;
  };
}

const PROFILE_CONFIG = [
  { key: "ambassadors", label: "Embajadores", color: "#15803d" },
  { key: "committed", label: "Comprometidos", color: "#2563eb" },
  { key: "neutral", label: "Neutrales", color: "#eab308" },
  { key: "disengaged", label: "Desvinculados", color: "#dc2626" },
] as const;

export function EngagementDonut({ profiles }: EngagementDonutProps) {
  const chartData = PROFILE_CONFIG.map((config) => ({
    name: config.label,
    value: profiles[config.key].count,
    pct: profiles[config.key].pct,
    color: config.color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfiles de Compromiso</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const item = chartData.find((d) => d.name === String(name));
                return [`${value} (${item?.pct.toFixed(1)}%)`, String(name)];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
