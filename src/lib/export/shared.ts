import ExcelJS from "exceljs";
import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

export const BORDER_LIGHT = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
} as const;

export function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
}

export function sectionTitle(text: string, color: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, color, bold: true, size: 28, font: "Calibri" })],
  });
}

export function subTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Calibri" })],
  });
}

export function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 20, font: "Calibri" })],
  });
}

export function bulletItem(text: string, prefix = "-"): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text: `${prefix} ${text}`, size: 20, font: "Calibri" })],
  });
}

export function kpiParagraph(label: string, value: string, color: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, size: 20, font: "Calibri" }),
      new TextRun({ text: value, bold: true, size: 22, color, font: "Calibri" }),
    ],
  });
}

export function makeTable(headers: string[], rows: string[][], colWidths?: number[]): Table {
  const widths = colWidths ?? headers.map(() => Math.floor(9000 / headers.length));
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (header, index) =>
            new TableCell({
              width: { size: widths[index], type: WidthType.DXA },
              shading: { type: ShadingType.SOLID, color: "E2E8F0" },
              borders: BORDER_LIGHT,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true, size: 18, font: "Calibri" })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (cells) =>
          new TableRow({
            children: cells.map(
              (cell, index) =>
                new TableCell({
                  width: { size: widths[index], type: WidthType.DXA },
                  borders: BORDER_LIGHT,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: cell, size: 18, font: "Calibri" })],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });
}

export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export function makeFooterText(showPoweredBy: boolean, organizationName: string) {
  return showPoweredBy
    ? "Generado por ClimaLab · © 2026 Rizo.ma — Marca propiedad de Prozess Group S.A."
    : `Generado para ${organizationName} · © 2026 Rizo.ma — Marca propiedad de Prozess Group S.A.`;
}

export function formatExportFilename(name: string, suffix: string) {
  return `${name.replace(/\s+/g, "_")}_${suffix}`;
}

export function formatReportDate(date = new Date()) {
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const CENTER_PARAGRAPH = AlignmentType.CENTER;
