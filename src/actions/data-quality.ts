"use server";

import { createClient } from "@/lib/supabase/server";
import { loadCampaignQuality, loadStatisticalHealth } from "@/lib/campaign-quality";
import type { ActionResult } from "@/types";

export async function getCampaignDataQuality(campaignId: string): Promise<
  ActionResult<
    Awaited<ReturnType<typeof loadCampaignQuality>> & {
      statisticalHealth: Awaited<ReturnType<typeof loadStatisticalHealth>>;
    }
  >
> {
  const supabase = await createClient();

  try {
    const quality = await loadCampaignQuality(supabase, campaignId);

    return {
      success: true,
      data: {
        ...quality,
        statisticalHealth: await loadStatisticalHealth(supabase, campaignId, quality),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo cargar la calidad de datos",
    };
  }
}
