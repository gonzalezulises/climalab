"use server";

import { buildDocxReport } from "@/lib/export/docx";
import { buildExcelReport } from "@/lib/export/excel";
import { loadDocxExportData, loadExcelExportData } from "@/lib/export/loaders";
import type { ActionResult } from "@/types";

export async function generateExcelReport(
  campaignId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const exportData = await loadExcelExportData(campaignId);
  if (!exportData.success) return exportData;

  const report = await buildExcelReport(exportData.data);
  return {
    success: true,
    data: {
      base64: report.buffer.toString("base64"),
      filename: report.filename,
    },
  };
}

export async function generateDocxReport(
  campaignId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const exportData = await loadDocxExportData(campaignId);
  if (!exportData.success) return exportData;

  const report = await buildDocxReport(exportData.data);
  return {
    success: true,
    data: {
      base64: Buffer.from(report.buffer).toString("base64"),
      filename: report.filename,
    },
  };
}
