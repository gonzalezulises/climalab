"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, FileJson } from "lucide-react";

type Props = {
  campaignName: string;
  dimensionData: Array<{
    dimension_code: string | null;
    dimension_name: string | null;
    avg_score: number | null;
    std_score: number | null;
    favorability_pct: number | null;
    respondent_count: number | null;
  }>;
  allResults: Array<Record<string, unknown>>;
};

export function ExportClient({ campaignName, dimensionData, allResults }: Props) {
  function exportPDF() {
    window.print();
  }

  function exportCSV() {
    const headers = ["Dimensión (código)", "Dimensión (nombre)", "Score promedio", "Desv. estándar", "Favorabilidad %", "n"];
    const rows = dimensionData.map((d) =>
      [d.dimension_code, d.dimension_name, d.avg_score, d.std_score, d.favorability_pct, d.respondent_count].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, "_")}_resultados.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const json = JSON.stringify(allResults, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, "_")}_datos.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Centro de Exportación</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Printer className="h-5 w-5" /> Exportar PDF
            </CardTitle>
            <CardDescription>
              Genera un PDF con el dashboard completo de resultados usando la función de impresión del navegador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportPDF} className="w-full">
              <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="h-5 w-5" /> Exportar CSV
            </CardTitle>
            <CardDescription>
              Descarga los scores por dimensión en formato CSV, compatible con Excel y Google Sheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportCSV} variant="outline" className="w-full">
              <FileDown className="h-4 w-4 mr-2" /> Descargar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileJson className="h-5 w-5" /> Exportar JSON
            </CardTitle>
            <CardDescription>
              Dump completo de todos los datos analíticos en formato JSON para integración con otros sistemas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportJSON} variant="outline" className="w-full">
              <FileJson className="h-4 w-4 mr-2" /> Descargar JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview of data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vista previa de datos</CardTitle>
          <CardDescription>{dimensionData.length} dimensiones | {allResults.length} registros totales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2">Código</th>
                  <th className="text-left py-2">Dimensión</th>
                  <th className="text-right py-2">Score</th>
                  <th className="text-right py-2">σ</th>
                  <th className="text-right py-2">Fav %</th>
                  <th className="text-right py-2">n</th>
                </tr>
              </thead>
              <tbody>
                {dimensionData.map((d) => (
                  <tr key={d.dimension_code} className="border-t">
                    <td className="py-2 font-mono text-xs">{d.dimension_code}</td>
                    <td className="py-2">{d.dimension_name}</td>
                    <td className="py-2 text-right font-bold">{Number(d.avg_score).toFixed(2)}</td>
                    <td className="py-2 text-right">{Number(d.std_score).toFixed(2)}</td>
                    <td className="py-2 text-right">{d.favorability_pct}%</td>
                    <td className="py-2 text-right">{d.respondent_count}</td>
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
