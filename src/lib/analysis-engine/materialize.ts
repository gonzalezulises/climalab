import type { Json } from "@/types/database";
import type { AnalysisRunTriggerSource, ScoredCampaignOutput } from "./types";
import { buildAnalysisRunSnapshot } from "./snapshots";

export const ANALYSIS_LOGIC_VERSION = "2026-03-29-lineage-v1";

type AdminClient = {
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
    upsert: (
      payload: Array<Record<string, unknown>>,
      options?: { onConflict?: string }
    ) => Promise<{ error: { message: string } | null }>;
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>;
};

export async function createAnalysisRun(
  admin: AdminClient,
  params: {
    campaignId: string;
    triggerSource: AnalysisRunTriggerSource;
    inputSnapshot: Json;
    logicVersion?: string;
  }
) {
  const { data, error } = await admin
    .from("analysis_runs")
    .insert({
      campaign_id: params.campaignId,
      trigger_source: params.triggerSource,
      logic_version: params.logicVersion ?? ANALYSIS_LOGIC_VERSION,
      status: "running",
      input_snapshot: params.inputSnapshot,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la corrida analítica");
  }

  return data.id;
}

export async function persistRespondentQuality(
  admin: AdminClient,
  analysisRunId: string,
  quality: ScoredCampaignOutput["respondentQuality"]
) {
  if (quality.length === 0) {
    return;
  }

  const { error } = await admin.from("analysis_run_respondent_quality").upsert(
    quality.map((record) => ({
      analysis_run_id: analysisRunId,
      respondent_id: record.respondentId,
      quality_status: record.status,
      reason: record.reason,
    })),
    {
      onConflict: "analysis_run_id,respondent_id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function materializeAnalysisRun(
  admin: AdminClient,
  params: {
    analysisRunId: string;
    campaignId: string;
    output: ScoredCampaignOutput;
  }
) {
  const enrichedResults = params.output.results.map((row) => ({
    ...row,
    analysis_run_id: params.analysisRunId,
  }));
  const enrichedAnalytics = params.output.analytics.map((row) => ({
    ...row,
    analysis_run_id: params.analysisRunId,
  }));

  const { error } = await admin.rpc("replace_campaign_materialization", {
    p_analysis_run_id: params.analysisRunId,
    p_campaign_id: params.campaignId,
    p_population_n: params.output.populationN,
    p_sample_n: params.output.sampleN,
    p_response_rate: params.output.responseRate,
    p_margin_of_error: params.output.marginOfError,
    p_results: enrichedResults as unknown as Json,
    p_analytics: enrichedAnalytics as unknown as Json,
  });

  if (error) {
    throw new Error(`Error materializando resultados: ${error.message}`);
  }

  const snapshot = buildAnalysisRunSnapshot({
    campaignId: params.campaignId,
    analysisRunId: params.analysisRunId,
    logicVersion: ANALYSIS_LOGIC_VERSION,
    output: params.output,
  });

  const { error: snapshotError } = await admin.from("analysis_run_snapshots").upsert(
    [
      {
        analysis_run_id: params.analysisRunId,
        campaign_id: params.campaignId,
        logic_version: ANALYSIS_LOGIC_VERSION,
        snapshot_type: "campaign_overview",
        data: snapshot as unknown as Json,
      },
    ],
    { onConflict: "analysis_run_id" }
  );

  if (snapshotError) {
    // Mark analysis run as failed instead of leaving it in "running" state
    await admin
      .from("analysis_runs")
      .update({ status: "failed", error_message: `Snapshot save failed: ${snapshotError.message}` })
      .eq("id", params.analysisRunId);
    throw new Error(`Snapshot materialization failed: ${snapshotError.message}`);
  }

  const { error: updateError } = await admin.rpc("finalize_analysis_run", {
    p_analysis_run_id: params.analysisRunId,
    p_status: "completed",
    p_error_message: null,
  });

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function failAnalysisRun(admin: AdminClient, analysisRunId: string, message: string) {
  const { error } = await admin.rpc("finalize_analysis_run", {
    p_analysis_run_id: analysisRunId,
    p_status: "failed",
    p_error_message: message,
  });

  if (error) {
    throw new Error(error.message);
  }
}
