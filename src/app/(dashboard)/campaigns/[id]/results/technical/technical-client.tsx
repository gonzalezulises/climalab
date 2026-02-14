"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#eab308", "#7c3aed", "#0891b2", "#ea580c"];

const typeLabels: Record<string, string> = {
  department: "Departamento",
  tenure: "Antigüedad",
  gender: "Género",
};

export function TechnicalClient({
  demographics,
}: {
  demographics: Array<{
    type: string;
    segments: Array<{ key: string; count: number }>;
  }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {demographics.map((demo) => {
        const chartData = demo.segments.map((s) => ({
          name: s.key,
          value: s.count,
        }));
        const total = chartData.reduce((s, d) => s + d.value, 0);

        return (
          <Card key={demo.type}>
            <CardHeader>
              <CardTitle className="text-base">
                Distribución por {typeLabels[demo.type] ?? demo.type}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {demo.type === "department" ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-2 text-xs text-muted-foreground text-center">Total: {total} respondentes</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
