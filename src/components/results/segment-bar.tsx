"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SegmentDataPoint {
  segment: string;
  value: number;
  count: number;
}

interface SegmentBarProps {
  data: SegmentDataPoint[];
  globalAvg?: number;
}

export function SegmentBar({ data, globalAvg }: SegmentBarProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparación por Segmento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={sorted.length * 40 + 40}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ left: 120, right: 30, top: 5, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 5]} tickCount={6} />
            <YAxis type="category" dataKey="segment" width={110} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [Number(value).toFixed(2), "Promedio"]}
              labelFormatter={(label) => {
                const l = String(label);
                const item = sorted.find((d) => d.segment === l);
                return item ? `${l} (n=${item.count})` : l;
              }}
            />
            {globalAvg !== undefined && (
              <ReferenceLine
                x={globalAvg}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{
                  value: `Promedio: ${globalAvg.toFixed(2)}`,
                  position: "top",
                  fontSize: 11,
                  fill: "#dc2626",
                }}
              />
            )}
            <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
        {globalAvg !== undefined && (
          <p className="text-muted-foreground mt-2 text-xs">
            La linea roja punteada indica el promedio global ({globalAvg.toFixed(2)}).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
