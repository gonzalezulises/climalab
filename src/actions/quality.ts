"use server";

import { loadCampaignQualityReport } from "@/lib/quality/quality-store";
import type { ActionResult } from "@/types";

export async function getCampaignQualityReport(
  campaignId: string
): Promise<ActionResult<Awaited<ReturnType<typeof loadCampaignQualityReport>>>> {
  try {
    return {
      success: true,
      data: await loadCampaignQualityReport(campaignId),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el reporte de calidad de campaña",
    };
  }
}
