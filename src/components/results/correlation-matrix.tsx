"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CorrelationEntry {
  r: number
  pValue: number
}

interface CorrelationMatrixProps {
  matrix: Record<string, Record<string, CorrelationEntry>>
  dimensionCodes: string[]
}

function getCellStyle(r: number): string {
  if (r > 0.7) return "bg-green-700 text-white"
  if (r > 0.4) return "bg-green-500 text-white"
  if (r > 0.2) return "bg-green-300 text-black"
  if (r > -0.2) return "bg-gray-100 text-black"
  if (r > -0.4) return "bg-red-300 text-black"
  return "bg-red-500 text-white"
}

export function CorrelationMatrix({ matrix, dimensionCodes }: CorrelationMatrixProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Correlaciones</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-background p-2 text-left font-medium border-b" />
              {dimensionCodes.map((code) => (
                <th
                  key={code}
                  className="p-2 text-center font-medium border-b min-w-[55px]"
                >
                  {code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dimensionCodes.map((rowCode) => (
              <tr key={rowCode}>
                <td className="sticky left-0 bg-background p-2 font-medium border-b whitespace-nowrap">
                  {rowCode}
                </td>
                {dimensionCodes.map((colCode) => {
                  const entry = matrix[rowCode]?.[colCode]
                  if (!entry) {
                    return (
                      <td
                        key={colCode}
                        className="p-2 text-center border-b bg-gray-50"
                      >
                        —
                      </td>
                    )
                  }

                  const isSignificant = entry.pValue < 0.05

                  return (
                    <td
                      key={colCode}
                      className={`p-2 text-center border-b font-mono font-semibold ${getCellStyle(entry.r)}`}
                      title={`r=${entry.r.toFixed(3)}, p=${entry.pValue.toFixed(4)}${
                        isSignificant ? " *" : ""
                      }`}
                    >
                      {entry.r.toFixed(2)}
                      {isSignificant && <span className="text-[10px]">*</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-700" />
            r &gt; 0.7
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
            r &gt; 0.4
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-300" />
            r &gt; 0.2
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-gray-100 border" />
            |r| ≤ 0.2
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-300" />
            r &lt; -0.2
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
            r ≤ -0.4
          </span>
          <span className="text-muted-foreground">* p &lt; 0.05</span>
        </div>
      </CardContent>
    </Card>
  )
}
