/**
 * Post-seed script: calcula resultados para todas las campañas demo.
 * Ejecutar después de `supabase db reset`:
 *   npm run seed:results
 */
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import {
  createAnalysisRun,
  failAnalysisRun,
  loadCampaignAnalysisDataset,
  materializeAnalysisRun,
  persistRespondentQuality,
  scoreCampaignDataset,
} from "../src/lib/analysis-engine";
import { buildWaveComparisonFromStats } from "../src/lib/analysis-engine/wave-comparison";
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
      .select("organization_id, ends_at")
      .eq("id", campaignId)
      .single();

    if (campaignForOrg?.organization_id) {
      const { data: prevCampaign } = await supabase
        .from("campaigns")
        .select("id")
        .eq("organization_id", campaignForOrg.organization_id)
        .in("status", ["closed", "archived"])
        .neq("id", campaignId)
        .lt("ends_at", campaignForOrg.ends_at)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevCampaign) {
        const { data: prevResults } = await supabase
          .from("campaign_results")
          .select("dimension_code, avg_score, std_score, respondent_count")
          .eq("campaign_id", prevCampaign.id)
          .eq("result_type", "dimension")
          .eq("segment_type", "global");

        if (prevResults && prevResults.length > 0) {
          const prevByDim = new Map(
            prevResults
              .filter((r) => r.dimension_code != null)
              .map((r) => [r.dimension_code!, r] as const)
          );

          let enriched = 0;
          for (const row of output.results) {
            if (
              row.result_type === "dimension" &&
              row.segment_type === "global" &&
              row.dimension_code
            ) {
              const prev = prevByDim.get(row.dimension_code);
              if (prev && prev.avg_score != null && row.avg_score != null) {
                const wc = buildWaveComparisonFromStats({
                  currentAvg: row.avg_score,
                  currentStd: row.std_score ?? 0.5,
                  currentN: row.respondent_count ?? 0,
                  previousAvg: Number(prev.avg_score),
                  previousStd: Number(prev.std_score) || 0.5,
                  previousN: prev.respondent_count ?? 0,
                  previousCampaignId: prevCampaign.id,
                });
                if (wc) {
                  row.metadata = {
                    ...(row.metadata as Record<string, unknown>),
                    wave_comparison: wc,
                  } as Json;
                  enriched++;
                }
              }
            }
          }
          if (enriched > 0) {
            console.log(
              `Wave comparison: enriched ${enriched} dimensions vs campaign ${prevCampaign.id}`
            );
          }
        }
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

  try {
    console.log("\n--- Running ONA analysis ---");
    try {
      execSync("uv run scripts/ona-analysis.py", {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
      });
    } catch {
      execSync("python3 scripts/ona-analysis.py", {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
      });
    }
  } catch (error) {
    console.warn("ONA analysis skipped (non-blocking):", (error as Error).message);
  }

  console.log("\nAll done!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
