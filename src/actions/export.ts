"use server";

import { buildDocxReport } from "@/lib/export/docx";
import { buildExcelReport } from "@/lib/export/excel";
import { loadDocxExportData, loadExcelExportData } from "@/lib/export/loaders";
import { createAdminClient } from "@/lib/supabase/admin";
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

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function generateResponsesCsv(
  campaignId: string
): Promise<ActionResult<{ csv: string; filename: string }>> {
  const supabase = createAdminClient();

  // 1. Load campaign with instrument info
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id, name, instrument_id, module_instrument_ids")
    .eq("id", campaignId)
    .single();

  if (campErr || !campaign) {
    return { success: false, error: "Campaña no encontrada" };
  }

  // 2. Gather all instrument IDs (base + modules)
  const allInstrumentIds = [campaign.instrument_id, ...(campaign.module_instrument_ids ?? [])];

  // 3. Load dimensions for all instruments, ordered by instrument then sort_order
  const { data: dimensions, error: dimErr } = await supabase
    .from("dimensions")
    .select("id, code, instrument_id, sort_order")
    .in("instrument_id", allInstrumentIds)
    .order("instrument_id")
    .order("sort_order");

  if (dimErr || !dimensions) {
    return { success: false, error: "Error al cargar dimensiones" };
  }

  // 4. Load items for those dimensions, ordered by dimension then sort_order
  const dimensionIds = dimensions.map((d) => d.id);
  const { data: items, error: itemErr } = await supabase
    .from("items")
    .select("id, dimension_id, sort_order, is_attention_check")
    .in("dimension_id", dimensionIds)
    .order("dimension_id")
    .order("sort_order");

  if (itemErr || !items) {
    return { success: false, error: "Error al cargar ítems" };
  }

  // 5. Build dimension lookup and ordered item list
  const dimMap = new Map(dimensions.map((d) => [d.id, d]));

  // Sort items by dimension sort_order (via dimension), then item sort_order
  const dimensionSortKey = new Map(dimensions.map((d, idx) => [d.id, idx]));

  const sortedItems = [...items].sort((a, b) => {
    const dimOrderA = dimensionSortKey.get(a.dimension_id) ?? 0;
    const dimOrderB = dimensionSortKey.get(b.dimension_id) ?? 0;
    if (dimOrderA !== dimOrderB) return dimOrderA - dimOrderB;
    return a.sort_order - b.sort_order;
  });

  // Build item headers: DIM_CODE_position or ATT_N for attention checks
  let attentionIndex = 0;
  const itemHeaders: string[] = [];
  const itemIdOrder: string[] = [];
  const dimItemCounters = new Map<string, number>();

  for (const item of sortedItems) {
    const dim = dimMap.get(item.dimension_id);
    if (!dim) continue;

    if (item.is_attention_check) {
      attentionIndex++;
      itemHeaders.push(`ATT_${attentionIndex}`);
    } else {
      const count = (dimItemCounters.get(dim.code) ?? 0) + 1;
      dimItemCounters.set(dim.code, count);
      itemHeaders.push(`${dim.code}_${count}`);
    }
    itemIdOrder.push(item.id);
  }

  // 6. Load completed respondents
  const { data: respondents, error: respErr } = await supabase
    .from("respondents")
    .select("id, department, tenure, gender, status, enps_score, completed_at")
    .eq("campaign_id", campaignId)
    .eq("status", "completed")
    .order("completed_at");

  if (respErr || !respondents) {
    return { success: false, error: "Error al cargar respondentes" };
  }

  if (respondents.length === 0) {
    return { success: false, error: "No hay respondentes completados" };
  }

  // 7. Load all responses for these respondents
  const respondentIds = respondents.map((r) => r.id);
  // Supabase IN has a limit, batch if needed
  const BATCH_SIZE = 500;
  const allResponses: Array<{ respondent_id: string; item_id: string; score: number | null }> = [];

  for (let i = 0; i < respondentIds.length; i += BATCH_SIZE) {
    const batch = respondentIds.slice(i, i + BATCH_SIZE);
    const { data: batchResp, error: batchErr } = await supabase
      .from("responses")
      .select("respondent_id, item_id, score")
      .in("respondent_id", batch);

    if (batchErr) {
      return { success: false, error: "Error al cargar respuestas" };
    }
    if (batchResp) allResponses.push(...batchResp);
  }

  // 8. Build respondent → item → score lookup
  const scoreMap = new Map<string, Map<string, number | null>>();
  for (const r of allResponses) {
    if (!scoreMap.has(r.respondent_id)) {
      scoreMap.set(r.respondent_id, new Map());
    }
    scoreMap.get(r.respondent_id)!.set(r.item_id, r.score);
  }

  // 9. Build CSV
  const BOM = "\uFEFF";
  const headers = [
    "respondent_id",
    "department",
    "tenure",
    "gender",
    "status",
    "enps_score",
    "completed_at",
    ...itemHeaders,
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(",")];

  for (const resp of respondents) {
    const respScores = scoreMap.get(resp.id);
    const row = [
      escapeCsvField(resp.id),
      escapeCsvField(resp.department),
      escapeCsvField(resp.tenure),
      escapeCsvField(resp.gender),
      escapeCsvField(resp.status),
      escapeCsvField(resp.enps_score),
      escapeCsvField(resp.completed_at),
      ...itemIdOrder.map((itemId) => escapeCsvField(respScores?.get(itemId) ?? null)),
    ];
    rows.push(row.join(","));
  }

  const csv = BOM + rows.join("\n");
  const safeName = campaign.name.replace(/\s+/g, "_");
  const filename = `${safeName}_respuestas_individuales.csv`;

  return { success: true, data: { csv, filename } };
}
