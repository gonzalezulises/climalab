"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WaveDataPoint {
  dimension: string
  current: number
  previous: number
  delta: number
}

interface WaveComparisonProps {
  data: WaveDataPoint[]
}

export function WaveComparison({ data }: WaveComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparación entre Oleadas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={data.length * 50 + 60}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 120, right: 30, top: 5, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 5]} tickCount={6} />
            <YAxis
              type="category"
              dataKey="dimension"
              width={110}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value).toFixed(2),
                String(name) === "previous" ? "Anterior" : "Actual",
              ]}
            />
            <Legend
              formatter={(value) =>
                String(value) === "previous" ? "Anterior" : "Actual"
              }
            />
            <Bar dataKey="previous" fill="#94a3b8" barSize={14} radius={[0, 4, 4, 0]} name="previous" />
            <Bar dataKey="current" barSize={14} radius={[0, 4, 4, 0]} name="current">
              {data.map((entry, index) => (
                <Cell key={index} fill="#2563eb" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {data.map((entry) => (
            <div
              key={entry.dimension}
              className="flex items-center justify-between rounded border px-2 py-1 text-xs"
            >
              <span className="truncate font-medium">{entry.dimension}</span>
              <span
                className={`ml-2 font-semibold ${
                  entry.delta >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {entry.delta >= 0 ? "+" : ""}
                {entry.delta.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
