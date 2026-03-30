import ExcelJS from "exceljs";
import type { ExcelExportData } from "@/lib/export/loaders";
import { formatExportFilename, styleHeaderRow } from "@/lib/export/shared";
import { CATEGORY_LABELS } from "@/lib/constants";

export async function buildExcelReport(data: ExcelExportData) {
  const { campaign, results, categories, drivers, alerts, comments, reliability, heatmap } = data;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ClimaLab";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Resumen");
  const engagement = results.find((row) => row.result_type === "engagement");
  const enps = results.find((row) => row.result_type === "enps");
  const dimensionResults = results.filter(
    (row) => row.result_type === "dimension" && row.segment_type === "global"
  );
  const globalFavorability =
    dimensionResults.length > 0
      ? Math.round(
          (dimensionResults.reduce((sum, row) => sum + Number(row.favorability_pct), 0) /
            dimensionResults.length) *
            10
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
    { field: "Versión lógica", value: data.pipeline?.analysis.latestLogicVersion ?? "N/A" },
    { field: "Salud del pipeline", value: data.pipeline?.health ?? "N/A" },
    { field: "Calidad de datos", value: data.quality?.qualityLabel ?? "N/A" },
    {
      field: "Engagement global",
      value: engagement ? Number(engagement.avg_score).toFixed(2) : "N/A",
    },
    { field: "eNPS", value: enps ? Number(enps.avg_score) : "N/A" },
    { field: "Favorabilidad global", value: `${globalFavorability}%` },
    { field: "", value: "" },
    { field: "CATEGORÍAS", value: "" },
  ]);
  for (const category of categories) {
    summarySheet.addRow({
      field: CATEGORY_LABELS[category.category] ?? category.category,
      value: `${category.avg_score.toFixed(2)} (${category.favorability_pct}% favorable)`,
    });
  }
  for (const family of data.semanticFamilies) {
    summarySheet.addRow({
      field: `Familia ${family.family}`,
      value: `${family.avgScore.toFixed(2)} (${family.favorabilityPct}% favorable)`,
    });
  }
  styleHeaderRow(summarySheet);

  const dimensionSheet = workbook.addWorksheet("Dimensiones");
  dimensionSheet.columns = [
    { header: "Código", key: "code", width: 10 },
    { header: "Nombre", key: "name", width: 35 },
    { header: "Categoría", key: "category", width: 25 },
    { header: "Score", key: "score", width: 10 },
    { header: "Desv. Est.", key: "std", width: 12 },
    { header: "Fav %", key: "fav", width: 10 },
    { header: "n", key: "n", width: 8 },
    { header: "rwg", key: "rwg", width: 10 },
  ];
  for (const row of dimensionResults.sort(
    (left, right) => Number(right.avg_score) - Number(left.avg_score)
  )) {
    const metadata = row.metadata as { dimension_name?: string; rwg?: number };
    dimensionSheet.addRow({
      code: row.dimension_code,
      name: metadata?.dimension_name ?? row.dimension_code,
      category: "",
      score: Number(row.avg_score),
      std: Number(row.std_score),
      fav: Number(row.favorability_pct),
      n: row.respondent_count,
      rwg: metadata?.rwg != null ? Number(metadata.rwg.toFixed(3)) : "",
    });
  }
  styleHeaderRow(dimensionSheet);

  const itemSheet = workbook.addWorksheet("Ítems");
  itemSheet.columns = [
    { header: "Dimensión", key: "dimCode", width: 10 },
    { header: "Texto del ítem", key: "text", width: 60 },
    { header: "Score", key: "score", width: 10 },
    { header: "Fav %", key: "fav", width: 10 },
  ];
  const itemResults = results
    .filter((row) => row.result_type === "item" && row.segment_type === "global")
    .sort((left, right) => (left.dimension_code ?? "").localeCompare(right.dimension_code ?? ""));
  for (const row of itemResults) {
    const metadata = row.metadata as { item_text?: string };
    itemSheet.addRow({
      dimCode: row.dimension_code,
      text: metadata?.item_text ?? "",
      score: Number(row.avg_score),
      fav: Number(row.favorability_pct),
    });
  }
  styleHeaderRow(itemSheet);

  const segmentSheet = workbook.addWorksheet("Segmentos");
  segmentSheet.columns = [
    { header: "Tipo", key: "segType", width: 15 },
    { header: "Segmento", key: "segKey", width: 20 },
    { header: "Dimensión", key: "dimCode", width: 10 },
    { header: "Score", key: "score", width: 10 },
    { header: "Fav %", key: "fav", width: 10 },
    { header: "n", key: "n", width: 8 },
    { header: "rwg", key: "rwg", width: 10 },
  ];
  for (const row of heatmap) {
    segmentSheet.addRow({
      segType: row.segment_type,
      segKey: row.segment_key,
      dimCode: row.dimension_code,
      score: row.avg_score,
      fav: row.favorability_pct,
      n: row.respondent_count,
      rwg: row.rwg != null ? Number(row.rwg.toFixed(3)) : "",
    });
  }
  styleHeaderRow(segmentSheet);

  const driverSheet = workbook.addWorksheet("Drivers");
  driverSheet.columns = [
    { header: "Código", key: "code", width: 10 },
    { header: "Nombre", key: "name", width: 35 },
    { header: "r", key: "r", width: 10 },
    { header: "p-value", key: "pValue", width: 12 },
    { header: "n", key: "n", width: 8 },
  ];
  for (const driver of drivers) {
    driverSheet.addRow({
      code: driver.code,
      name: driver.name,
      r: Number(driver.r.toFixed(3)),
      pValue: Number(driver.pValue.toFixed(4)),
      n: driver.n,
    });
  }
  styleHeaderRow(driverSheet);

  const alertSheet = workbook.addWorksheet("Alertas");
  alertSheet.columns = [
    { header: "Severidad", key: "severity", width: 15 },
    { header: "Tipo", key: "type", width: 20 },
    { header: "Dimensión", key: "dimCode", width: 10 },
    { header: "Mensaje", key: "message", width: 60 },
    { header: "Valor", key: "value", width: 10 },
    { header: "Umbral", key: "threshold", width: 10 },
  ];
  for (const alert of alerts) {
    alertSheet.addRow({
      severity: alert.severity,
      type: alert.type,
      dimCode: alert.dimension_code ?? "",
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
    });
  }
  styleHeaderRow(alertSheet);

  const commentSheet = workbook.addWorksheet("Comentarios");
  commentSheet.columns = [
    { header: "Tipo", key: "type", width: 15 },
    { header: "Texto", key: "text", width: 80 },
  ];
  for (const comment of comments) {
    commentSheet.addRow({ type: comment.question_type, text: comment.text });
  }
  styleHeaderRow(commentSheet);

  const technicalSheet = workbook.addWorksheet("Ficha Técnica");
  technicalSheet.columns = [
    { header: "Dimensión (código)", key: "code", width: 15 },
    { header: "Dimensión (nombre)", key: "name", width: 35 },
    { header: "Cronbach α", key: "alpha", width: 12 },
    { header: "Ítems", key: "items", width: 8 },
    { header: "n", key: "n", width: 8 },
  ];
  for (const row of reliability) {
    technicalSheet.addRow({
      code: row.dimension_code,
      name: row.dimension_name,
      alpha: row.alpha != null ? Number(row.alpha.toFixed(3)) : `n/d (n=${row.respondent_count})`,
      items: row.item_count,
      n: row.respondent_count,
    });
  }
  styleHeaderRow(technicalSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: formatExportFilename(campaign.name, "resultados.xlsx"),
  };
}
