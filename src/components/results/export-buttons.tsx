"use client"

import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, FileDown, FileJson } from "lucide-react"

interface ExportButtonsProps {
  campaignId: string
  results: Record<string, unknown>[]
}

export function ExportButtons({ campaignId, results }: ExportButtonsProps) {
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleCSV = useCallback(() => {
    if (results.length === 0) return

    const headers = Object.keys(results[0])
    const csvRows = [
      headers.join(","),
      ...results.map((row) =>
        headers
          .map((h) => {
            const val = row[h]
            const str = val === null || val === undefined ? "" : String(val)
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str
          })
          .join(",")
      ),
    ]

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `resultados-${campaignId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [campaignId, results])

  const handleJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `resultados-${campaignId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [campaignId, results])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar Resultados</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handlePrint}>
          <Printer />
          Exportar PDF
        </Button>
        <Button variant="outline" onClick={handleCSV}>
          <FileDown />
          Exportar CSV
        </Button>
        <Button variant="outline" onClick={handleJSON}>
          <FileJson />
          Exportar JSON
        </Button>
      </CardContent>
    </Card>
  )
}
