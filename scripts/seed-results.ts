/**
 * Post-seed script: calcula resultados para todas las campañas demo.
 * Ejecutar después de `supabase db reset`:
 *   npm run seed:results
 */
import { createClient } from "@supabase/supabase-js";
import {
  createAnalysisRun,
  failAnalysisRun,
  loadCampaignAnalysisDataset,
  materializeAnalysisRun,
  persistRespondentQuality,
  scoreCampaignDataset,
} from "../src/lib/analysis-engine";
import { enrichResultsWithWaveComparison } from "../src/lib/analysis-engine/wave-comparison";
import type { Json } from "../src/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function processOneCampaign(supabase: ReturnType<typeof createClient>, campaignId: string) {
  console.log(`\n--- Processing campaign: ${campaignId} ---`);

  const dataset = await loadCampaignAnalysisDataset(supabase as never, campaignId);
  if (dataset.respondents.length === 0) {
    console.warn("No completed respondents");
    return;
  }

  const analysisRunId = await createAnalysisRun(supabase as never, {
    campaignId,
    triggerSource: "seed",
    inputSnapshot: {
      instrument_ids: dataset.campaignInstruments.map((entry) => entry.instrumentId),
      respondent_count: dataset.respondents.length,
      response_count: dataset.responses.length,
    } as Json,
  });

  try {
    const output = scoreCampaignDataset(dataset);

    // Wave comparison enrichment
    const { data: campaignForOrg } = await supabase
      .from("campaigns")
      .select("organization_id")
      .eq("id", campaignId)
      .single();

    if (campaignForOrg?.organization_id) {
      const countBefore = output.results.filter(
        (r) =>
          r.result_type === "dimension" &&
          r.segment_type === "global" &&
          (r.metadata as Record<string, unknown>)?.wave_comparison
      ).length;

      await enrichResultsWithWaveComparison(
        supabase as never,
        campaignId,
        campaignForOrg.organization_id,
        output.results
      );

      const countAfter = output.results.filter(
        (r) =>
          r.result_type === "dimension" &&
          r.segment_type === "global" &&
          (r.metadata as Record<string, unknown>)?.wave_comparison
      ).length;
      const enriched = countAfter - countBefore;
      if (enriched > 0) {
        console.log(`Wave comparison: enriched ${enriched} dimensions`);
      }
    }

    await persistRespondentQuality(supabase as never, analysisRunId, output.respondentQuality);
    await materializeAnalysisRun(supabase as never, {
      analysisRunId,
      campaignId,
      output,
    });
    console.log(
      `Materialized ${output.results.length} result rows and ${output.analytics.length} analytics rows`
    );
  } catch (error) {
    await failAnalysisRun(
      supabase as never,
      analysisRunId,
      error instanceof Error ? error.message : "Seed analysis failed"
    );
    throw error;
  }
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .in("status", ["closed", "archived"])
    .order("created_at");

  if (!campaigns?.length) {
    console.error("No closed campaigns found");
    process.exit(1);
  }

  console.log(`Found ${campaigns.length} campaigns to process`);

  for (const campaign of campaigns) {
    await processOneCampaign(supabase, campaign.id);
  }

  // ONA analysis runs via FastAPI service (stats.rizo.ma) when calculateResults is called
  console.log("\nONA/CFA/HLM: run via STATISTICAL_ENGINE_URL in production");

  console.log("\nAll done!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
