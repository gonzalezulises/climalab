import { AlignmentType, Document, ImageRun, Packer, PageBreak, Paragraph, TextRun } from "docx";
import type { DocxExportData } from "@/lib/export/loaders";
import {
  bodyText,
  bulletItem,
  CENTER_PARAGRAPH,
  fetchImageBuffer,
  formatExportFilename,
  formatReportDate,
  kpiParagraph,
  makeFooterText,
  makeTable,
  sectionTitle,
  subTitle,
} from "@/lib/export/shared";
import { CATEGORY_LABELS } from "@/lib/constants";

type DocxContent = Array<Paragraph | ReturnType<typeof makeTable>>;

export async function buildDocxReport(data: DocxExportData) {
  const { campaign, results, categories, drivers, alerts, reliability } = data;
  const brand = data.organization.brand;
  const primaryColor = brand.primary_color.replace("#", "");

  const dimensionResults = results.filter(
    (row) => row.result_type === "dimension" && row.segment_type === "global"
  );
  const dimensions = dimensionResults
    .map((row) => {
      const metadata = row.metadata as { dimension_name?: string; rwg?: number };
      return {
        code: row.dimension_code!,
        name: metadata?.dimension_name ?? row.dimension_code!,
        avg: Number(row.avg_score),
        fav: Number(row.favorability_pct),
        rwg: metadata?.rwg ?? null,
      };
    })
    .sort((left, right) => right.avg - left.avg);

  const engagement = Number(
    results.find((row) => row.result_type === "engagement")?.avg_score ?? 0
  );
  const enps = Number(results.find((row) => row.result_type === "enps")?.avg_score ?? 0);
  const globalFavorability =
    dimensions.length > 0
      ? Math.round(
          (dimensions.reduce((sum, dimension) => sum + dimension.fav, 0) / dimensions.length) * 10
        ) / 10
      : 0;
  const responseRate = Number(campaign.response_rate ?? 0);
  const sampleSize = campaign.sample_n ?? 0;
  const populationSize = campaign.population_n ?? 0;
  const marginOfError = Number(campaign.margin_of_error ?? 0);
  const departmentRanking = data.benchmark?.overallRanking ?? [];
  const commentSummary = data.commentAnalysis?.summary ?? null;
  const onaSummary = data.onaData
    ? {
        communities: data.onaData.summary.communities,
        modularity: data.onaData.summary.modularity,
        topDiscriminants: data.onaData.discriminants.slice(0, 5).map((row) => row.code),
        narrative: data.onaData.narrative ?? "",
      }
    : null;

  const footerText = makeFooterText(brand.show_powered_by, data.organization.name);
  const reportDate = formatReportDate();
  const logoBuffer = data.organization.logoUrl
    ? await fetchImageBuffer(data.organization.logoUrl)
    : null;

  const content: DocxContent = [];
  buildCover(content, {
    campaignName: campaign.name,
    organizationName: data.organization.name,
    primaryColor,
    reportDate,
    logoBuffer,
  });

  if (data.narrative) {
    content.push(sectionTitle("1. Resumen Ejecutivo", primaryColor));
    content.push(bodyText(data.narrative.executive_summary));
    if (data.narrative.highlights.length > 0) {
      content.push(subTitle("Destacados"));
      for (const highlight of data.narrative.highlights) content.push(bulletItem(highlight, "+"));
    }
    if (data.narrative.concerns.length > 0) {
      content.push(subTitle("Preocupaciones"));
      for (const concern of data.narrative.concerns) content.push(bulletItem(concern, "!"));
    }
    content.push(subTitle("Recomendación"));
    content.push(bodyText(data.narrative.recommendation));
  }

  content.push(sectionTitle("2. Indicadores Clave", primaryColor));
  content.push(kpiParagraph("Engagement (de 5.0)", engagement.toFixed(2), primaryColor));
  content.push(kpiParagraph("Favorabilidad", `${globalFavorability}%`, primaryColor));
  content.push(kpiParagraph("eNPS", String(enps), primaryColor));
  content.push(kpiParagraph("Tasa de respuesta", `${responseRate}%`, primaryColor));

  content.push(sectionTitle("3. Scores por Categoría", primaryColor));
  content.push(
    makeTable(
      ["Categoría", "Score", "Favorabilidad"],
      categories.map((category) => [
        CATEGORY_LABELS[category.category] ?? category.category,
        category.avg_score.toFixed(2),
        `${category.favorability_pct}%`,
      ]),
      [4000, 2500, 2500]
    )
  );

  content.push(sectionTitle("4. Ranking de Dimensiones", primaryColor));
  content.push(
    makeTable(
      ["Cód", "Dimensión", "Score", "Fav %", "rwg"],
      dimensions.map((dimension) => [
        dimension.code,
        dimension.name,
        dimension.avg.toFixed(2),
        `${dimension.fav}%`,
        dimension.rwg != null ? dimension.rwg.toFixed(3) : "-",
      ]),
      [1000, 3500, 1500, 1500, 1500]
    )
  );

  if (departmentRanking.length > 0) {
    content.push(sectionTitle("5. Resumen por Departamento", primaryColor));
    content.push(
      makeTable(
        ["Departamento", "Score", "Fav %", "n"],
        departmentRanking.map((department) => [
          department.department,
          department.avgScore.toFixed(2),
          `${department.avgFav}%`,
          String(department.n),
        ]),
        [3500, 2000, 2000, 1500]
      )
    );
  }

  if (alerts.length > 0) {
    content.push(sectionTitle("6. Alertas Principales", primaryColor));
    content.push(
      makeTable(
        ["Severidad", "Mensaje", "Valor", "Umbral"],
        alerts
          .slice(0, 15)
          .map((alert) => [
            alert.severity,
            alert.message,
            typeof alert.value === "number" ? alert.value.toFixed(1) : String(alert.value),
            String(alert.threshold),
          ]),
        [1500, 4500, 1500, 1500]
      )
    );
    if (data.alertContext && data.alertContext.length > 0) {
      content.push(subTitle("Análisis IA por alerta"));
      for (const context of data.alertContext) {
        const alertMessage =
          alerts[context.alert_index]?.message ?? `Alerta ${context.alert_index + 1}`;
        content.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [new TextRun({ text: alertMessage, bold: true, size: 20, font: "Calibri" })],
          })
        );
        content.push(bulletItem(`Causa probable: ${context.root_cause}`));
        content.push(bulletItem(`Recomendación: ${context.recommendation}`));
      }
    }
  }

  if (drivers.length > 0) {
    content.push(sectionTitle("7. Top Drivers de Engagement", primaryColor));
    content.push(
      makeTable(
        ["Código", "Dimensión", "r (correlación)"],
        drivers.slice(0, 10).map((driver) => [driver.code, driver.name, driver.r.toFixed(3)]),
        [1500, 5000, 2500]
      )
    );
    if (data.driverInsights) {
      content.push(subTitle("Interpretación IA"));
      content.push(bodyText(data.driverInsights.narrative));
      if (data.driverInsights.quick_wins.length > 0) {
        content.push(subTitle("Quick Wins"));
        for (const quickWin of data.driverInsights.quick_wins) {
          content.push(
            bulletItem(`${quickWin.dimension}: ${quickWin.action} (Impacto: ${quickWin.impact})`)
          );
        }
      }
      if (data.driverInsights.paradoxes.length > 0) {
        content.push(subTitle("Paradojas detectadas"));
        for (const paradox of data.driverInsights.paradoxes) {
          content.push(bulletItem(paradox, "?"));
        }
      }
    }
  }

  if (commentSummary) {
    content.push(sectionTitle("8. Resumen de Comentarios", primaryColor));
    content.push(subTitle("Fortalezas"));
    content.push(bodyText(commentSummary.strengths));
    content.push(subTitle("Áreas de mejora"));
    content.push(bodyText(commentSummary.improvements));
    if (commentSummary.general) {
      content.push(subTitle("General"));
      content.push(bodyText(commentSummary.general));
    }
  }

  if (data.segmentProfiles && data.segmentProfiles.length > 0) {
    content.push(sectionTitle("9. Perfiles de Segmento", primaryColor));
    for (const profile of data.segmentProfiles) {
      content.push(subTitle(`${profile.segment} (${profile.segment_type})`));
      content.push(bodyText(profile.narrative));
      if (profile.strengths.length > 0) {
        content.push(bodyText(`Fortalezas: ${profile.strengths.join(", ")}`));
      }
      if (profile.risks.length > 0) {
        content.push(bodyText(`Riesgos: ${profile.risks.join(", ")}`));
      }
    }
  }

  if (data.trendsNarrative) {
    content.push(sectionTitle("10. Análisis de Tendencias", primaryColor));
    content.push(bodyText(data.trendsNarrative.trajectory));
    if (data.trendsNarrative.improving.length > 0) {
      content.push(subTitle("Mejorando"));
      for (const item of data.trendsNarrative.improving) content.push(bulletItem(item, "+"));
    }
    if (data.trendsNarrative.declining.length > 0) {
      content.push(subTitle("En declive"));
      for (const item of data.trendsNarrative.declining) content.push(bulletItem(item, "-"));
    }
    if (data.trendsNarrative.inflection_points.length > 0) {
      content.push(subTitle("Puntos de inflexión"));
      for (const item of data.trendsNarrative.inflection_points) content.push(bulletItem(item));
    }
  }

  if (data.businessIndicators.length > 0) {
    content.push(sectionTitle("11. Indicadores de Negocio", primaryColor));
    content.push(
      makeTable(
        ["Indicador", "Valor", "Unidad"],
        data.businessIndicators.map((indicator) => [
          indicator.indicator_name,
          String(Number(indicator.indicator_value)),
          indicator.indicator_unit ?? "-",
        ]),
        [4500, 2500, 2000]
      )
    );
  }

  if (onaSummary) {
    content.push(sectionTitle("12. Red Perceptual (ONA)", primaryColor));
    content.push(kpiParagraph("Comunidades", String(onaSummary.communities), primaryColor));
    content.push(kpiParagraph("Modularidad", onaSummary.modularity.toFixed(3), primaryColor));
    if (onaSummary.topDiscriminants.length > 0) {
      content.push(
        bodyText(`Dimensiones discriminantes: ${onaSummary.topDiscriminants.join(", ")}`)
      );
    }
    if (onaSummary.narrative) content.push(bodyText(onaSummary.narrative));
  }

  content.push(sectionTitle("13. Ficha Técnica", primaryColor));
  content.push(kpiParagraph("Población (N)", String(populationSize), primaryColor));
  content.push(kpiParagraph("Muestra (n)", String(sampleSize), primaryColor));
  content.push(kpiParagraph("Tasa de respuesta", `${responseRate}%`, primaryColor));
  content.push(kpiParagraph("Margen de error", `±${marginOfError}%`, primaryColor));

  if (reliability.length > 0) {
    const hasUncalculated = reliability.some((row) => row.alpha == null);
    content.push(subTitle("Confiabilidad (Cronbach α)"));
    content.push(
      makeTable(
        ["Cód", "Dimensión", "α", "Ítems", "n"],
        reliability.map((row) => [
          row.dimension_code,
          row.dimension_name,
          row.alpha != null ? row.alpha.toFixed(3) : `n/d (n=${row.respondent_count})`,
          String(row.item_count),
          String(row.respondent_count),
        ]),
        [1000, 3500, 1500, 1500, 1500]
      )
    );
    if (hasUncalculated) {
      content.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: "(*) Confiabilidad no calculada en dimensiones con menos de 10 respondentes.",
              size: 18,
              italics: true,
              color: "888888",
              font: "Calibri",
            }),
          ],
        })
      );
    }
  }

  content.push(
    new Paragraph({
      spacing: { before: 600 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: footerText, size: 16, color: "AAAAAA", font: "Calibri" })],
    })
  );
  content.push(
    new Paragraph({
      spacing: { before: 200 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text: "Aviso: Los resultados e insights generados por ClimaLab, incluyendo análisis estadísticos e interpretaciones de IA, son de carácter informativo y no constituyen asesoría profesional, legal ni psicológica. Las decisiones organizacionales deben complementarse con juicio profesional calificado.",
          size: 14,
          color: "AAAAAA",
          font: "Calibri",
          italics: true,
        }),
      ],
    })
  );

  const document = new Document({
    creator: "ClimaLab",
    title: `Reporte Ejecutivo - ${campaign.name}`,
    sections: [{ children: content }],
  });

  const buffer = await Packer.toBuffer(document);
  return {
    buffer,
    filename: formatExportFilename(campaign.name, "reporte_ejecutivo.docx"),
  };
}

function buildCover(
  content: DocxContent,
  options: {
    campaignName: string;
    organizationName: string;
    primaryColor: string;
    reportDate: string;
    logoBuffer: Buffer | null;
  }
) {
  content.push(new Paragraph({ spacing: { before: 3000 } }));
  if (options.logoBuffer) {
    content.push(
      new Paragraph({
        alignment: CENTER_PARAGRAPH,
        children: [
          new ImageRun({
            data: options.logoBuffer,
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
      alignment: CENTER_PARAGRAPH,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "REPORTE EJECUTIVO",
          bold: true,
          size: 40,
          color: options.primaryColor,
          font: "Calibri",
        }),
      ],
    })
  );
  content.push(
    new Paragraph({
      alignment: CENTER_PARAGRAPH,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "DE CLIMA ORGANIZACIONAL",
          bold: true,
          size: 36,
          color: options.primaryColor,
          font: "Calibri",
        }),
      ],
    })
  );
  content.push(
    new Paragraph({
      alignment: CENTER_PARAGRAPH,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: options.campaignName, size: 28, color: "555555", font: "Calibri" }),
      ],
    })
  );
  content.push(
    new Paragraph({
      alignment: CENTER_PARAGRAPH,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: options.organizationName,
          size: 28,
          color: "555555",
          font: "Calibri",
        }),
      ],
    })
  );
  content.push(
    new Paragraph({
      alignment: CENTER_PARAGRAPH,
      spacing: { after: 400 },
      children: [
        new TextRun({ text: options.reportDate, size: 22, color: "888888", font: "Calibri" }),
      ],
    })
  );
  content.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );
}
