"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Driver {
  code: string
  name: string
  r: number
  pValue: number
}

interface DriverBarsProps {
  drivers: Driver[]
}

export function DriverBars({ drivers }: DriverBarsProps) {
  const sorted = [...drivers].sort((a, b) => Math.abs(b.r) - Math.abs(a.r))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impulsores de Compromiso</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={sorted.length * 40 + 40}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ left: 120, right: 30, top: 5, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[-1, 1]}
              tickCount={5}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [Number(value).toFixed(3), "Correlación (r)"]}
              labelFormatter={(label) => String(label)}
            />
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Bar dataKey="r" radius={[0, 4, 4, 0]} barSize={18} label={{ position: "right", fontSize: 11, formatter: (v: unknown) => Number(v).toFixed(2) }}>
              {sorted.map((entry) => (
                <Cell
                  key={entry.code}
                  fill={entry.r >= 0 ? "#16a34a" : "#dc2626"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-muted-foreground mt-2 text-xs">
          Valores positivos indican una relación directa con el compromiso. Valores negativos indican una relación inversa.
        </p>
      </CardContent>
    </Card>
  )
}
