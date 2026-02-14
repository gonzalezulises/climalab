"use server";

import ExcelJS from "exceljs";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getCampaign, getCampaignResults, getOpenResponses } from "@/actions/campaigns";
import {
  getCategoryScores,
  getEngagementDrivers,
  getAlerts,
  getReliabilityData,
  getHeatmapData,
  getBenchmarkData,
} from "@/actions/analytics";
import { getDashboardNarrative, getCommentAnalysis } from "@/actions/ai-insights";
import type { ActionResult } from "@/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import { PdfReport } from "@/components/reports/pdf-report";

// ---------------------------------------------------------------------------
// generateExcelReport — multi-sheet XLSX export
// ---------------------------------------------------------------------------
export async function generateExcelReport(
  campaignId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  // Fetch all data in parallel
  const [
    campaignRes,
    resultsRes,
    categoriesRes,
    driversRes,
    alertsRes,
    commentsRes,
    reliabilityRes,
    heatmapRes,
  ] = await Promise.all([
    getCampaign(campaignId),
    getCampaignResults(campaignId),
    getCategoryScores(campaignId),
    getEngagementDrivers(campaignId),
    getAlerts(campaignId),
    getOpenResponses(campaignId),
    getReliabilityData(campaignId),
    getHeatmapData(campaignId),
  ]);

  if (!campaignRes.success) {
    return { success: false, error: "Campaña no encontrada" };
  }

  const campaign = campaignRes.data;
  const results = resultsRes.success ? resultsRes.data : [];
  const categories = categoriesRes.success ? categoriesRes.data : [];
  const drivers = driversRes.success ? driversRes.data : [];
  const alerts = alertsRes.success ? alertsRes.data : [];
  const comments = commentsRes.success ? commentsRes.data : [];
  const reliability = reliabilityRes.success ? reliabilityRes.data : [];
  const heatmap = heatmapRes.success ? heatmapRes.data : [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ClimaLab";
  workbook.created = new Date();

  // --- Sheet 1: Resumen ---
  const summarySheet = workbook.addWorksheet("Resumen");
  const engResult = results.find((r) => r.result_type === "engagement");
  const enpsResult = results.find((r) => r.result_type === "enps");
  const dimResults = results.filter(
    (r) => r.result_type === "dimension" && r.segment_type === "global"
  );
  const globalFav =
    dimResults.length > 0
      ? Math.round(
          (dimResults.reduce((s, r) => s + Number(r.favorability_pct), 0) / dimResults.length) * 10
        ) / 10
      : 0;

  summarySheet.columns = [
    { header: "Campo", key: "field", width: 30 },
    { header: "Valor", key: "value", width: 40 },
  ];
  summarySheet.addRows([
    { field: "Campaña", value: campaign.name },
    { field: "Estado", value: campaign.status },
    { field: "Fecha inicio", value: campaign.starts_at ?? "" },
    { field: "Fecha fin", value: campaign.ends_at ?? "" },
    { field: "Población (N)", value: campaign.population_n ?? 0 },
    { field: "Muestra (n)", value: campaign.sample_n ?? 0 },
    { field: "Tasa de respuesta", value: `${campaign.response_rate ?? 0}%` },
    { field: "Margen de error", value: `±${campaign.margin_of_error ?? 0}%` },
    {
      field: "Engagement global",
      value: engResult ? Number(engResult.avg_score).toFixed(2) : "N/A",
    },
    { field: "eNPS", value: enpsResult ? Number(enpsResult.avg_score) : "N/A" },
    { field: "Favorabilidad global", value: `${globalFav}%` },
    { field: "", value: "" },
    { field: "CATEGORÍAS", value: "" },
  ]);
  for (const cat of categories) {
    summarySheet.addRow({
      field: CATEGORY_LABELS[cat.category] ?? cat.category,
      value: `${cat.avg_score.toFixed(2)} (${cat.favorability_pct}% favorable)`,
    });
  }
  styleHeaderRow(summarySheet);

  // --- Sheet 2: Dimensiones ---
  const dimSheet = workbook.addWorksheet("Dimensiones");
  dimSheet.columns = [
    { header: "Código", key: "code", width: 10 },
    { header: "Nombre", key: "name", width: 35 },
    { header: "Categoría", key: "category", width: 25 },
    { header: "Score", key: "score", width: 10 },
    { header: "Desv. Est.", key: "std", width: 12 },
    { header: "Fav %", key: "fav", width: 10 },
    { header: "n", key: "n", width: 8 },
    { header: "rwg", key: "rwg", width: 10 },
  ];
  for (const r of dimResults.sort((a, b) => Number(b.avg_score) - Number(a.avg_score))) {
    const meta = r.metadata as { dimension_name?: string; rwg?: number };
    dimSheet.addRow({
      code: r.dimension_code,
      name: meta?.dimension_name ?? r.dimension_code,
      category: "",
      score: Number(r.avg_score),
      std: Number(r.std_score),
      fav: Number(r.favorability_pct),
      n: r.respondent_count,
      rwg: meta?.rwg != null ? Number(meta.rwg.toFixed(3)) : "",
    });
  }
  styleHeaderRow(dimSheet);

  // --- Sheet 3: Ítems ---
  const itemSheet = workbook.addWorksheet("Ítems");
  itemSheet.columns = [
    { header: "Dimensión", key: "dimCode", width: 10 },
    { header: "Texto del ítem", key: "text", width: 60 },
    { header: "Score", key: "score", width: 10 },
    { header: "Fav %", key: "fav", width: 10 },
  ];
  const itemResults = results
    .filter((r) => r.result_type === "item" && r.segment_type === "global")
    .sort((a, b) => (a.dimension_code ?? "").localeCompare(b.dimension_code ?? ""));
  for (const r of itemResults) {
    const meta = r.metadata as { item_text?: string };
    itemSheet.addRow({
      dimCode: r.dimension_code,
      text: meta?.item_text ?? "",
      score: Number(r.avg_score),
      fav: Number(r.favorability_pct),
    });
  }
  styleHeaderRow(itemSheet);

  // --- Sheet 4: Segmentos ---
  const segSheet = workbook.addWorksheet("Segmentos");
  segSheet.columns = [
    { header: "Tipo", key: "segType", width: 15 },
    { header: "Segmento", key: "segKey", width: 20 },
    { header: "Dimensión", key: "dimCode", width: 10 },
    { header: "Score", key: "score", width: 10 },
    { header: "Fav %", key: "fav", width: 10 },
    { header: "n", key: "n", width: 8 },
    { header: "rwg", key: "rwg", width: 10 },
  ];
  for (const r of heatmap) {
    segSheet.addRow({
      segType: r.segment_type,
      segKey: r.segment_key,
      dimCode: r.dimension_code,
      score: r.avg_score,
      fav: r.favorability_pct,
      n: r.respondent_count,
      rwg: r.rwg != null ? Number(r.rwg.toFixed(3)) : "",
    });
  }
  styleHeaderRow(segSheet);

  // --- Sheet 5: Drivers ---
  const driverSheet = workbook.addWorksheet("Drivers");
  driverSheet.columns = [
    { header: "Código", key: "code", width: 10 },
    { header: "Nombre", key: "name", width: 35 },
    { header: "r", key: "r", width: 10 },
    { header: "p-value", key: "pValue", width: 12 },
    { header: "n", key: "n", width: 8 },
  ];
  for (const d of drivers) {
    driverSheet.addRow({
      code: d.code,
      name: d.name,
      r: Number(d.r.toFixed(3)),
      pValue: Number(d.pValue.toFixed(4)),
      n: d.n,
    });
  }
  styleHeaderRow(driverSheet);

  // --- Sheet 6: Alertas ---
  const alertSheet = workbook.addWorksheet("Alertas");
  alertSheet.columns = [
    { header: "Severidad", key: "severity", width: 15 },
    { header: "Tipo", key: "type", width: 20 },
    { header: "Dimensión", key: "dimCode", width: 10 },
    { header: "Mensaje", key: "message", width: 60 },
    { header: "Valor", key: "value", width: 10 },
    { header: "Umbral", key: "threshold", width: 10 },
  ];
  for (const a of alerts) {
    alertSheet.addRow({
      severity: a.severity,
      type: a.type,
      dimCode: a.dimension_code ?? "",
      message: a.message,
      value: a.value,
      threshold: a.threshold,
    });
  }
  styleHeaderRow(alertSheet);

  // --- Sheet 7: Comentarios ---
  const commentSheet = workbook.addWorksheet("Comentarios");
  commentSheet.columns = [
    { header: "Tipo", key: "type", width: 15 },
    { header: "Texto", key: "text", width: 80 },
  ];
  for (const c of comments) {
    commentSheet.addRow({ type: c.question_type, text: c.text });
  }
  styleHeaderRow(commentSheet);

  // --- Sheet 8: Ficha Técnica ---
  const techSheet = workbook.addWorksheet("Ficha Técnica");
  techSheet.columns = [
    { header: "Dimensión (código)", key: "code", width: 15 },
    { header: "Dimensión (nombre)", key: "name", width: 35 },
    { header: "Cronbach α", key: "alpha", width: 12 },
    { header: "Ítems", key: "items", width: 8 },
    { header: "n", key: "n", width: 8 },
  ];
  for (const r of reliability) {
    techSheet.addRow({
      code: r.dimension_code,
      name: r.dimension_name,
      alpha: r.alpha != null ? Number(r.alpha.toFixed(3)) : "N/A",
      items: r.item_count,
      n: r.respondent_count,
    });
  }
  styleHeaderRow(techSheet);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const filename = `${campaign.name.replace(/\s+/g, "_")}_resultados.xlsx`;

  return { success: true, data: { base64, filename } };
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
}

// ---------------------------------------------------------------------------
// generatePdfReport — structured PDF executive report
// ---------------------------------------------------------------------------
export async function generatePdfReport(
  campaignId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const [
    campaignRes,
    resultsRes,
    categoriesRes,
    driversRes,
    alertsRes,
    reliabilityRes,
    benchmarkRes,
    narrativeRes,
    commentRes,
  ] = await Promise.all([
    getCampaign(campaignId),
    getCampaignResults(campaignId),
    getCategoryScores(campaignId),
    getEngagementDrivers(campaignId),
    getAlerts(campaignId),
    getReliabilityData(campaignId),
    getBenchmarkData(campaignId),
    getDashboardNarrative(campaignId),
    getCommentAnalysis(campaignId),
  ]);

  if (!campaignRes.success) {
    return { success: false, error: "Campaña no encontrada" };
  }

  const campaign = campaignRes.data;
  const results = resultsRes.success ? resultsRes.data : [];
  const categories = categoriesRes.success ? categoriesRes.data : [];
  const drivers = driversRes.success ? driversRes.data : [];
  const alerts = alertsRes.success ? alertsRes.data : [];
  const reliability = reliabilityRes.success ? reliabilityRes.data : [];
  const benchmark = benchmarkRes.success ? benchmarkRes.data : null;
  const narrative = narrativeRes.success ? narrativeRes.data : null;
  const commentAnalysis = commentRes.success ? commentRes.data : null;

  // Extract dimension results (global)
  const dimResults = results.filter(
    (r) => r.result_type === "dimension" && r.segment_type === "global"
  );

  const dimensions = dimResults
    .map((r) => {
      const meta = r.metadata as { dimension_name?: string; rwg?: number };
      return {
        code: r.dimension_code!,
        name: meta?.dimension_name ?? r.dimension_code!,
        avg: Number(r.avg_score),
        fav: Number(r.favorability_pct),
        rwg: meta?.rwg ?? null,
      };
    })
    .sort((a, b) => b.avg - a.avg);

  const engResult = results.find((r) => r.result_type === "engagement");
  const enpsResult = results.find((r) => r.result_type === "enps");
  const globalFav =
    dimensions.length > 0
      ? Math.round((dimensions.reduce((s, d) => s + d.fav, 0) / dimensions.length) * 10) / 10
      : 0;

  const pdfElement = React.createElement(PdfReport, {
    campaignName: campaign.name,
    organizationName: campaign.organization_id,
    engagement: engResult ? Number(engResult.avg_score) : 0,
    favorability: globalFav,
    enps: enpsResult ? Number(enpsResult.avg_score) : 0,
    responseRate: Number(campaign.response_rate ?? 0),
    sampleN: campaign.sample_n ?? 0,
    populationN: campaign.population_n ?? 0,
    marginOfError: Number(campaign.margin_of_error ?? 0),
    categories,
    dimensions,
    departmentRanking: benchmark?.overallRanking ?? [],
    alerts: alerts.slice(0, 15),
    drivers: drivers.slice(0, 10),
    reliability,
    narrative,
    commentSummary: commentAnalysis?.summary ?? null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(pdfElement as any);
  const base64 = Buffer.from(pdfBuffer).toString("base64");
  const filename = `${campaign.name.replace(/\s+/g, "_")}_reporte_ejecutivo.pdf`;

  return { success: true, data: { base64, filename } };
}
