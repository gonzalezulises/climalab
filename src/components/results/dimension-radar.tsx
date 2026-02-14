"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DimensionRadarProps {
  data: Array<{ code: string; name: string; avg: number }>
}

export function DimensionRadar({ data }: DimensionRadarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar de Dimensiones</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid />
            <PolarAngleAxis
              dataKey="code"
              tick={{ fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[0, 5]}
              tickCount={6}
              tick={{ fontSize: 10 }}
            />
            <Radar
              name="Promedio"
              dataKey="avg"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.3}
            />
            <Tooltip
              formatter={(value) => [Number(value).toFixed(2), "Promedio"]}
              labelFormatter={(label) => {
                const item = data.find((d) => d.code === String(label))
                return item ? item.name : String(label)
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
