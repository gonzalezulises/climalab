"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DimensionLollipopProps {
  data: Array<{ code: string; name: string; avg: number; fav: number }>
}

function getFavColor(fav: number): string {
  if (fav >= 90) return "#1dc47c"
  if (fav >= 80) return "#00B4D8"
  if (fav >= 70) return "#0052CC"
  if (fav >= 60) return "#F59E0B"
  return "#DC2626"
}

export function DimensionLollipop({ data }: DimensionLollipopProps) {
  const sorted = [...data].sort((a, b) => b.avg - a.avg)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dimensiones por Puntuación</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={sorted.length * 36 + 40}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" domain={[0, 5]} tickCount={6} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [Number(value).toFixed(2), "Promedio"]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={16}>
              {sorted.map((entry) => (
                <Cell key={entry.code} fill={getFavColor(entry.fav)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#1dc47c" }} />
            Excepcional (≥90%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#00B4D8" }} />
            Sólida (≥80%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#0052CC" }} />
            Aceptable (≥70%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />
            Atención (≥60%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#DC2626" }} />
            Crisis (&lt;60%)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
