"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileDown, FileJson, Sparkles, Loader2, FileText } from "lucide-react";
import {
  generateAllInsights,
  getDashboardNarrative,
  getCommentAnalysis,
  getDriverInsights,
} from "@/actions/ai-insights";
import { generateExcelReport, generatePdfReport } from "@/actions/export";
import type { DashboardNarrative, CommentAnalysis, DriverInsights } from "@/actions/ai-insights";

type Props = {
  campaignId: string;
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
  initialNarrative: DashboardNarrative | null;
  initialCommentAnalysis: CommentAnalysis | null;
  initialDriverInsights: DriverInsights | null;
};

export function ExportClient({
  campaignId,
  campaignName,
  dimensionData,
  allResults,
  initialNarrative,
  initialCommentAnalysis,
  initialDriverInsights,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [xlsxPending, startXlsxTransition] = useTransition();
  const [pdfPending, startPdfTransition] = useTransition();

  function downloadXlsx() {
    startXlsxTransition(async () => {
      const result = await generateExcelReport(campaignId);
      if (!result.success) return;

      const { base64, filename } = result.data;
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function downloadPdf() {
    startPdfTransition(async () => {
      const result = await generatePdfReport(campaignId);
      if (!result.success) return;

      const { base64, filename } = result.data;
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function exportCSV() {
    const headers = [
      "Dimensión (código)",
      "Dimensión (nombre)",
      "Score promedio",
      "Desv. estándar",
      "Favorabilidad %",
      "n",
    ];
    const rows = dimensionData.map((d) =>
      [
        d.dimension_code,
        d.dimension_name,
        d.avg_score,
        d.std_score,
        d.favorability_pct,
        d.respondent_count,
      ].join(",")
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" /> PDF Ejecutivo
            </CardTitle>
            <CardDescription>
              Reporte ejecutivo estructurado con KPIs, dimensiones, alertas, drivers y ficha
              técnica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadPdf} className="w-full" disabled={pdfPending}>
              {pdfPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Descargar PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Excel (XLSX)
            </CardTitle>
            <CardDescription>
              Libro Excel con 8 hojas: resumen, dimensiones, ítems, segmentos, drivers, alertas,
              comentarios y ficha técnica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadXlsx} className="w-full" disabled={xlsxPending}>
              {xlsxPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Descargar Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="h-5 w-5" /> Exportar CSV
            </CardTitle>
            <CardDescription>
              Descarga los scores por dimensión en formato CSV, compatible con Excel y Google
              Sheets.
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
              Dump completo de todos los datos analíticos en formato JSON para integración con otros
              sistemas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportJSON} variant="outline" className="w-full">
              <FileJson className="h-4 w-4 mr-2" /> Descargar JSON
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Reporte Ejecutivo IA
            </CardTitle>
            <CardDescription>
              Genera un informe ejecutivo con resumen, análisis de comentarios, drivers y
              recomendaciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                startTransition(async () => {
                  // Try to use existing insights, or generate new ones
                  let narr = initialNarrative;
                  let comm = initialCommentAnalysis;
                  let driv = initialDriverInsights;

                  if (!narr || !comm || !driv) {
                    await generateAllInsights(campaignId);
                    const [nRes, cRes, dRes] = await Promise.all([
                      getDashboardNarrative(campaignId),
                      getCommentAnalysis(campaignId),
                      getDriverInsights(campaignId),
                    ]);
                    narr = nRes.success ? nRes.data : narr;
                    comm = cRes.success ? cRes.data : comm;
                    driv = dRes.success ? dRes.data : driv;
                  }

                  // Build text report
                  let text = `REPORTE EJECUTIVO DE CLIMA ORGANIZACIONAL\n`;
                  text += `Campaña: ${campaignName}\n`;
                  text += `Fecha de generación: ${new Date().toLocaleDateString("es-MX")}\n`;
                  text += `${"=".repeat(60)}\n\n`;

                  text += `DATOS POR DIMENSIÓN\n${"-".repeat(40)}\n`;
                  for (const d of dimensionData) {
                    text += `${d.dimension_code} — ${d.dimension_name}: ${Number(d.avg_score).toFixed(2)} (Fav: ${d.favorability_pct}%, n=${d.respondent_count})\n`;
                  }

                  if (narr) {
                    text += `\n\nRESUMEN EJECUTIVO\n${"-".repeat(40)}\n`;
                    text += `${narr.executive_summary}\n\n`;
                    text += `Destacados:\n${narr.highlights.map((h) => `  + ${h}`).join("\n")}\n\n`;
                    text += `Preocupaciones:\n${narr.concerns.map((c) => `  ! ${c}`).join("\n")}\n\n`;
                    text += `Recomendación:\n${narr.recommendation}\n`;
                  }

                  if (driv) {
                    text += `\n\nANÁLISIS DE DRIVERS\n${"-".repeat(40)}\n`;
                    text += `${driv.narrative}\n\n`;
                    if (driv.quick_wins.length > 0) {
                      text += `Quick wins:\n`;
                      for (const qw of driv.quick_wins) {
                        text += `  - ${qw.dimension}: ${qw.action} → ${qw.impact}\n`;
                      }
                    }
                  }

                  if (comm) {
                    text += `\n\nANÁLISIS DE COMENTARIOS\n${"-".repeat(40)}\n`;
                    text += `Sentimiento: ${comm.sentiment_distribution.positive} positivos, ${comm.sentiment_distribution.negative} negativos, ${comm.sentiment_distribution.neutral} neutrales\n\n`;
                    text += `Fortalezas: ${comm.summary.strengths}\n\n`;
                    text += `Áreas de mejora: ${comm.summary.improvements}\n\n`;
                    if (comm.themes.length > 0) {
                      text += `Temas identificados:\n`;
                      for (const t of comm.themes) {
                        text += `  - ${t.theme} (${t.count} menciones, ${t.sentiment})\n`;
                      }
                    }
                  }

                  text += `\n\n${"=".repeat(60)}\n`;
                  text += `Generado por ClimaLab con asistencia de IA\n`;

                  // Download
                  const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${campaignName.replace(/\s+/g, "_")}_reporte_ejecutivo.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                });
              }}
              variant="outline"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generar reporte IA
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview of data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vista previa de datos</CardTitle>
          <CardDescription>
            {dimensionData.length} dimensiones | {allResults.length} registros totales
          </CardDescription>
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
