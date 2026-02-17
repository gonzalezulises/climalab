"use server";

import ExcelJS from "exceljs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  ImageRun,
  PageBreak,
} from "docx";
import { getCampaign, getCampaignResults, getOpenResponses } from "@/actions/campaigns";
import {
  getCategoryScores,
  getEngagementDrivers,
  getAlerts,
  getReliabilityData,
  getHeatmapData,
  getBenchmarkData,
} from "@/actions/analytics";
import {
  getDashboardNarrative,
  getCommentAnalysis,
  getDriverInsights,
  getAlertContext,
  getSegmentProfiles,
  getTrendsNarrative,
} from "@/actions/ai-insights";
import { getBusinessIndicators } from "@/actions/business-indicators";
import { getONAResults } from "@/actions/ona";
import { getOrganization } from "@/actions/organizations";
import type { ActionResult, BrandConfig } from "@/types";
import { CATEGORY_LABELS, DEFAULT_BRAND_CONFIG } from "@/lib/constants";

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
// DOCX helpers
// ---------------------------------------------------------------------------
const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
} as const;

const BORDER_LIGHT = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
} as const;

function sectionTitle(text: string, color: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, color, bold: true, size: 28, font: "Calibri" })],
  });
}

function subTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Calibri" })],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 20, font: "Calibri" })],
  });
}

function bulletItem(text: string, prefix = "-"): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text: `${prefix} ${text}`, size: 20, font: "Calibri" })],
  });
}

function kpiParagraph(label: string, value: string, color: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, size: 20, font: "Calibri" }),
      new TextRun({ text: value, bold: true, size: 22, color, font: "Calibri" }),
    ],
  });
}

function makeHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: "E2E8F0" },
    borders: BORDER_LIGHT,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, font: "Calibri" })],
      }),
    ],
  });
}

function makeCell(text: string): TableCell {
  return new TableCell({
    borders: BORDER_LIGHT,
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18, font: "Calibri" })],
      }),
    ],
  });
}

function makeTable(headers: string[], rows: string[][], colWidths?: number[]): Table {
  const widths = colWidths ?? headers.map(() => Math.floor(9000 / headers.length));
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (h, i) =>
            new TableCell({
              width: { size: widths[i], type: WidthType.DXA },
              shading: { type: ShadingType.SOLID, color: "E2E8F0" },
              borders: BORDER_LIGHT,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true, size: 18, font: "Calibri" })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (cells) =>
          new TableRow({
            children: cells.map(
              (c, i) =>
                new TableCell({
                  width: { size: widths[i], type: WidthType.DXA },
                  borders: BORDER_LIGHT,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: c, size: 18, font: "Calibri" })],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// generateDocxReport — structured DOCX executive report
// ---------------------------------------------------------------------------
export async function generateDocxReport(
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
    driverInsightsRes,
    alertContextRes,
    segmentProfilesRes,
    trendsNarrativeRes,
    businessIndicatorsRes,
    onaRes,
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
    getDriverInsights(campaignId),
    getAlertContext(campaignId),
    getSegmentProfiles(campaignId),
    getTrendsNarrative(campaignId),
    getBusinessIndicators(campaignId),
    getONAResults(campaignId),
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
  const driverInsights = driverInsightsRes.success ? driverInsightsRes.data : null;
  const alertContext = alertContextRes.success ? alertContextRes.data : null;
  const segmentProfiles = segmentProfilesRes.success ? segmentProfilesRes.data : null;
  const trendsNarrative = trendsNarrativeRes.success ? trendsNarrativeRes.data : null;
  const businessIndicators = businessIndicatorsRes.success ? businessIndicatorsRes.data : [];
  const onaData = onaRes.success ? onaRes.data : null;

  // Fetch org branding
  const orgRes = await getOrganization(campaign.organization_id);
  const orgLogoUrl = orgRes.success ? orgRes.data.logo_url : null;
  const orgBrandConfig = orgRes.success
    ? ((orgRes.data.brand_config ?? {}) as Partial<BrandConfig>)
    : {};
  const orgName = orgRes.success ? orgRes.data.name : campaign.organization_id;

  const brand = { ...DEFAULT_BRAND_CONFIG, ...orgBrandConfig };
  const pc = brand.primary_color.replace("#", "");

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
  const engagement = engResult ? Number(engResult.avg_score) : 0;
  const enps = enpsResult ? Number(enpsResult.avg_score) : 0;
  const responseRate = Number(campaign.response_rate ?? 0);
  const sampleN = campaign.sample_n ?? 0;
  const populationN = campaign.population_n ?? 0;
  const marginOfError = Number(campaign.margin_of_error ?? 0);
  const departmentRanking = benchmark?.overallRanking ?? [];
  const commentSummary = commentAnalysis?.summary ?? null;
  const onaSummary = onaData
    ? {
        communities: onaData.summary.communities,
        modularity: onaData.summary.modularity,
        topDiscriminants: onaData.discriminants.slice(0, 5).map((d) => d.code),
        narrative: onaData.narrative ?? "",
      }
    : null;

  const date = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const footerText = brand.show_powered_by ? "Generado por ClimaLab" : `Generado para ${orgName}`;

  // Fetch logo if available
  let logoBuffer: Buffer | null = null;
  if (orgLogoUrl) {
    logoBuffer = await fetchImageBuffer(orgLogoUrl);
  }

  // Build sections array
  const children: Paragraph[] | (Paragraph | Table)[] = [];
  const content: (Paragraph | Table)[] = children as (Paragraph | Table)[];

  // ── Cover page ──
  content.push(new Paragraph({ spacing: { before: 3000 } }));
  if (logoBuffer) {
    content.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 200, height: 60 },
            type: "png",
          }),
        ],
      })
    );
    content.push(new Paragraph({ spacing: { before: 200 } }));
  }
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "REPORTE EJECUTIVO",
          bold: true,
          size: 40,
          color: pc,
          font: "Calibri",
        }),
      ],
    })
  );
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "DE CLIMA ORGANIZACIONAL",
          bold: true,
          size: 36,
          color: pc,
          font: "Calibri",
        }),
      ],
    })
  );
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: campaign.name, size: 28, color: "555555", font: "Calibri" })],
    })
  );
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: orgName, size: 28, color: "555555", font: "Calibri" })],
    })
  );
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: date, size: 22, color: "888888", font: "Calibri" })],
    })
  );
  content.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // ── 1. Resumen Ejecutivo ──
  if (narrative) {
    content.push(sectionTitle("1. Resumen Ejecutivo", pc));
    content.push(bodyText(narrative.executive_summary));
    if (narrative.highlights.length > 0) {
      content.push(subTitle("Destacados"));
      for (const h of narrative.highlights) content.push(bulletItem(h, "+"));
    }
    if (narrative.concerns.length > 0) {
      content.push(subTitle("Preocupaciones"));
      for (const c of narrative.concerns) content.push(bulletItem(c, "!"));
    }
    content.push(subTitle("Recomendación"));
    content.push(bodyText(narrative.recommendation));
  }

  // ── 2. Indicadores Clave ──
  content.push(sectionTitle("2. Indicadores Clave", pc));
  content.push(kpiParagraph("Engagement (de 5.0)", engagement.toFixed(2), pc));
  content.push(kpiParagraph("Favorabilidad", `${globalFav}%`, pc));
  content.push(kpiParagraph("eNPS", String(enps), pc));
  content.push(kpiParagraph("Tasa de respuesta", `${responseRate}%`, pc));

  // ── 3. Scores por Categoría ──
  content.push(sectionTitle("3. Scores por Categoría", pc));
  content.push(
    makeTable(
      ["Categoría", "Score", "Favorabilidad"],
      categories.map((c) => [
        CATEGORY_LABELS[c.category] ?? c.category,
        c.avg_score.toFixed(2),
        `${c.favorability_pct}%`,
      ]),
      [4000, 2500, 2500]
    )
  );

  // ── 4. Ranking de Dimensiones ──
  content.push(sectionTitle("4. Ranking de Dimensiones", pc));
  content.push(
    makeTable(
      ["Cód", "Dimensión", "Score", "Fav %", "rwg"],
      dimensions.map((d) => [
        d.code,
        d.name,
        d.avg.toFixed(2),
        `${d.fav}%`,
        d.rwg != null ? d.rwg.toFixed(3) : "-",
      ]),
      [1000, 3500, 1500, 1500, 1500]
    )
  );

  // ── 5. Resumen por Departamento ──
  if (departmentRanking.length > 0) {
    content.push(sectionTitle("5. Resumen por Departamento", pc));
    content.push(
      makeTable(
        ["Departamento", "Score", "Fav %", "n"],
        departmentRanking.map((d) => [
          d.department,
          d.avgScore.toFixed(2),
          `${d.avgFav}%`,
          String(d.n),
        ]),
        [3500, 2000, 2000, 1500]
      )
    );
  }

  // ── 6. Alertas ──
  if (alerts.length > 0) {
    content.push(sectionTitle("6. Alertas Principales", pc));
    content.push(
      makeTable(
        ["Severidad", "Mensaje", "Valor", "Umbral"],
        alerts
          .slice(0, 15)
          .map((a) => [
            a.severity,
            a.message,
            typeof a.value === "number" ? a.value.toFixed(1) : String(a.value),
            String(a.threshold),
          ]),
        [1500, 4500, 1500, 1500]
      )
    );
    if (alertContext && alertContext.length > 0) {
      content.push(subTitle("Análisis IA por alerta"));
      for (const ctx of alertContext) {
        const alertMsg = alerts[ctx.alert_index]?.message ?? `Alerta ${ctx.alert_index + 1}`;
        content.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [new TextRun({ text: alertMsg, bold: true, size: 20, font: "Calibri" })],
          })
        );
        content.push(bulletItem(`Causa probable: ${ctx.root_cause}`));
        content.push(bulletItem(`Recomendación: ${ctx.recommendation}`));
      }
    }
  }

  // ── 7. Drivers ──
  if (drivers.length > 0) {
    content.push(sectionTitle("7. Top Drivers de Engagement", pc));
    content.push(
      makeTable(
        ["Código", "Dimensión", "r (correlación)"],
        drivers.slice(0, 10).map((d) => [d.code, d.name, d.r.toFixed(3)]),
        [1500, 5000, 2500]
      )
    );
    if (driverInsights) {
      content.push(subTitle("Interpretación IA"));
      content.push(bodyText(driverInsights.narrative));
      if (driverInsights.quick_wins.length > 0) {
        content.push(subTitle("Quick Wins"));
        for (const qw of driverInsights.quick_wins) {
          content.push(bulletItem(`${qw.dimension}: ${qw.action} (Impacto: ${qw.impact})`));
        }
      }
      if (driverInsights.paradoxes.length > 0) {
        content.push(subTitle("Paradojas detectadas"));
        for (const p of driverInsights.paradoxes) content.push(bulletItem(p, "?"));
      }
    }
  }

  // ── 8. Resumen de Comentarios ──
  if (commentSummary) {
    content.push(sectionTitle("8. Resumen de Comentarios", pc));
    content.push(subTitle("Fortalezas"));
    content.push(bodyText(commentSummary.strengths));
    content.push(subTitle("Áreas de mejora"));
    content.push(bodyText(commentSummary.improvements));
    if (commentSummary.general) {
      content.push(subTitle("General"));
      content.push(bodyText(commentSummary.general));
    }
  }

  // ── 9. Perfiles de Segmento ──
  if (segmentProfiles && segmentProfiles.length > 0) {
    content.push(sectionTitle("9. Perfiles de Segmento", pc));
    for (const p of segmentProfiles) {
      content.push(subTitle(`${p.segment} (${p.segment_type})`));
      content.push(bodyText(p.narrative));
      if (p.strengths.length > 0) {
        content.push(bodyText(`Fortalezas: ${p.strengths.join(", ")}`));
      }
      if (p.risks.length > 0) {
        content.push(bodyText(`Riesgos: ${p.risks.join(", ")}`));
      }
    }
  }

  // ── 10. Análisis de Tendencias ──
  if (trendsNarrative) {
    content.push(sectionTitle("10. Análisis de Tendencias", pc));
    content.push(bodyText(trendsNarrative.trajectory));
    if (trendsNarrative.improving.length > 0) {
      content.push(subTitle("Mejorando"));
      for (const item of trendsNarrative.improving) content.push(bulletItem(item, "+"));
    }
    if (trendsNarrative.declining.length > 0) {
      content.push(subTitle("En declive"));
      for (const item of trendsNarrative.declining) content.push(bulletItem(item, "-"));
    }
    if (trendsNarrative.inflection_points.length > 0) {
      content.push(subTitle("Puntos de inflexión"));
      for (const item of trendsNarrative.inflection_points) content.push(bulletItem(item));
    }
  }

  // ── 11. Indicadores de Negocio ──
  if (businessIndicators.length > 0) {
    content.push(sectionTitle("11. Indicadores de Negocio", pc));
    content.push(
      makeTable(
        ["Indicador", "Valor", "Unidad"],
        businessIndicators.map((bi) => [
          bi.indicator_name,
          String(Number(bi.indicator_value)),
          bi.indicator_unit ?? "-",
        ]),
        [4500, 2500, 2000]
      )
    );
  }

  // ── 12. Red Perceptual ONA ──
  if (onaSummary) {
    content.push(sectionTitle("12. Red Perceptual (ONA)", pc));
    content.push(kpiParagraph("Comunidades", String(onaSummary.communities), pc));
    content.push(kpiParagraph("Modularidad", onaSummary.modularity.toFixed(3), pc));
    if (onaSummary.topDiscriminants.length > 0) {
      content.push(
        bodyText(`Dimensiones discriminantes: ${onaSummary.topDiscriminants.join(", ")}`)
      );
    }
    if (onaSummary.narrative) content.push(bodyText(onaSummary.narrative));
  }

  // ── 13. Ficha Técnica ──
  content.push(sectionTitle("13. Ficha Técnica", pc));
  content.push(kpiParagraph("Población (N)", String(populationN), pc));
  content.push(kpiParagraph("Muestra (n)", String(sampleN), pc));
  content.push(kpiParagraph("Tasa de respuesta", `${responseRate}%`, pc));
  content.push(kpiParagraph("Margen de error", `±${marginOfError}%`, pc));

  if (reliability.length > 0) {
    content.push(subTitle("Confiabilidad (Cronbach α)"));
    content.push(
      makeTable(
        ["Cód", "Dimensión", "α", "Ítems", "n"],
        reliability.map((r) => [
          r.dimension_code,
          r.dimension_name,
          r.alpha != null ? r.alpha.toFixed(3) : "N/A",
          String(r.item_count),
          String(r.respondent_count),
        ]),
        [1000, 3500, 1500, 1500, 1500]
      )
    );
  }

  // Footer
  content.push(
    new Paragraph({
      spacing: { before: 600 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: footerText, size: 16, color: "AAAAAA", font: "Calibri" })],
    })
  );

  // Build document
  const doc = new Document({
    creator: "ClimaLab",
    title: `Reporte Ejecutivo - ${campaign.name}`,
    sections: [{ children: content }],
  });

  const buffer = await Packer.toBuffer(doc);
  const base64 = Buffer.from(buffer).toString("base64");
  const filename = `${campaign.name.replace(/\s+/g, "_")}_reporte_ejecutivo.docx`;

  return { success: true, data: { base64, filename } };
}
