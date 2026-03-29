"use server";

import { createClient } from "@/lib/supabase/server";
import {
  compareAnalysisSnapshots,
  type AnalysisRunSnapshot,
} from "@/lib/analysis-engine/snapshots";
import type { ActionResult } from "@/types";

export async function getLatestAnalysisComparison(
  campaignId: string
): Promise<ActionResult<ReturnType<typeof compareAnalysisSnapshots> | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analysis_run_snapshots")
    .select("analysis_run_id, logic_version, data, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length < 2) {
    return { success: true, data: null };
  }

  const [current, previous] = data as unknown as Array<{
    analysis_run_id: string;
    logic_version: string;
    data: AnalysisRunSnapshot;
  }>;

  return {
    success: true,
    data: compareAnalysisSnapshots(
      {
        ...current.data,
        analysisRunId: current.analysis_run_id,
        logicVersion: current.logic_version,
      },
      {
        ...previous.data,
        analysisRunId: previous.analysis_run_id,
        logicVersion: previous.logic_version,
      }
    ),
  };
}
