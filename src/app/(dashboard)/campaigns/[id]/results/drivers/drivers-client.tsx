"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Driver = { code: string; name: string; r: number; pValue: number; n: number };

function corrColor(r: number): string {
  if (r > 0.7) return "bg-green-700 text-white";
  if (r > 0.4) return "bg-green-500 text-white";
  if (r > 0.2) return "bg-green-300 text-black";
  if (r > -0.2) return "bg-gray-100 text-black";
  if (r > -0.4) return "bg-red-300 text-black";
  return "bg-red-500 text-white";
}

export function DriversClient({
  drivers,
  matrix,
  dimensionCodes,
  dimScores,
}: {
  drivers: Driver[];
  matrix: Record<string, Record<string, { r: number; pValue: number }>>;
  dimensionCodes: string[];
  dimScores: Record<string, number>;
}) {
  // Build insight
  const topDriver = drivers[0];
  const actionable = drivers.find(
    (d) => Math.abs(d.r) > 0.3 && (dimScores[d.code] ?? 5) < 4.0
  );

  const barData = drivers.map((d) => ({
    name: d.code,
    r: d.r,
    fullName: d.name,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Engagement Drivers</h1>

      {/* Insight card */}
      {topDriver && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-sm">
              La dimensión con mayor impacto en engagement es <strong>{topDriver.name}</strong> (r={topDriver.r}).
              {actionable && actionable.code !== topDriver.code && (
                <> Para mejorar engagement, enfócate en <strong>{actionable.name}</strong> que tiene correlación fuerte (r={actionable.r}) pero score bajo ({dimScores[actionable.code]?.toFixed(2)}).</>
              )}
              {actionable && actionable.code === topDriver.code && (
                <> Este driver también tiene un score de {dimScores[topDriver.code]?.toFixed(2)}, lo que representa una oportunidad de alto impacto.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Driver bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Correlación con Engagement (ENG)</CardTitle>
          <CardDescription>Dimensiones ordenadas por impacto (|r|)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(300, drivers.length * 35)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[-1, 1]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                formatter={(v, name, props) => [
                  `r=${Number(v).toFixed(3)}`,
                  props.payload.fullName,
                ]}
              />
              <Bar dataKey="r" radius={[0, 4, 4, 0]}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={d.r >= 0 ? "#16a34a" : "#dc2626"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Correlation matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matriz de Correlaciones</CardTitle>
          <CardDescription>Correlación Pearson entre dimensiones (n ≥ 10)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="py-1 pr-2"></th>
                  {dimensionCodes.map((c) => (
                    <th key={c} className="px-1 py-1 text-center">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dimensionCodes.map((rowCode) => (
                  <tr key={rowCode}>
                    <td className="py-1 pr-2 font-medium">{rowCode}</td>
                    {dimensionCodes.map((colCode) => {
                      const val = matrix[rowCode]?.[colCode];
                      const r = val?.r ?? 0;
                      return (
                        <td key={colCode} className="px-0.5 py-0.5">
                          <div
                            className={`w-10 h-7 flex items-center justify-center rounded text-[10px] font-medium ${corrColor(r)}`}
                            title={val ? `r=${r}, p=${val.pValue}` : ""}
                          >
                            {rowCode === colCode ? "1.00" : r.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
