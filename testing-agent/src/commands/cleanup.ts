import ora from "ora";
import chalk from "chalk";
import { getSupabase } from "../lib/supabase.js";

export async function cleanupCommand(opts: { orgId: string }) {
  const supabase = getSupabase();
  const spinner = ora("Cleaning up test data...").start();

  // Get all campaigns for this org
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("organization_id", opts.orgId);

  const campaignIds = campaigns?.map((c) => c.id) ?? [];

  if (campaignIds.length > 0) {
    // Delete in dependency order
    for (const cid of campaignIds) {
      // Get respondent IDs
      const { data: respondents } = await supabase
        .from("respondents")
        .select("id")
        .eq("campaign_id", cid);
      const rids = respondents?.map((r) => r.id) ?? [];

      if (rids.length > 0) {
        // Delete responses in batches
        for (let i = 0; i < rids.length; i += 50) {
          const batch = rids.slice(i, i + 50);
          await supabase.from("responses").delete().in("respondent_id", batch);
          await supabase.from("open_responses").delete().in("respondent_id", batch);
        }
      }

      // Delete ingest_events before respondents (FK: respondent_id)
      await supabase.from("ingest_events").delete().eq("campaign_id", cid);

      // Delete participants, respondents
      await supabase.from("participants").delete().eq("campaign_id", cid);
      await supabase.from("respondents").delete().eq("campaign_id", cid);

      // Delete analysis run lineage (before campaign_results which may reference analysis_run_id)
      await supabase.from("analysis_run_snapshots").delete().eq("campaign_id", cid);
      await supabase
        .from("analysis_run_respondent_quality")
        .delete()
        .in(
          "analysis_run_id",
          (await supabase.from("analysis_runs").select("id").eq("campaign_id", cid)).data?.map(
            (r) => r.id
          ) ?? []
        );
      await supabase.from("campaign_ona_runs").delete().eq("campaign_id", cid);
      await supabase.from("analysis_runs").delete().eq("campaign_id", cid);

      // Delete AI insights and evidence
      await supabase.from("campaign_ai_evidence").delete().eq("campaign_id", cid);
      await supabase.from("campaign_ai_generation_events").delete().eq("campaign_id", cid);
      await supabase.from("campaign_ai_insights").delete().eq("campaign_id", cid);
      await supabase.from("analysis_statistical_baselines").delete().eq("campaign_id", cid);

      // Delete results and analytics
      await supabase.from("campaign_results").delete().eq("campaign_id", cid);
      await supabase.from("campaign_analytics").delete().eq("campaign_id", cid);
      await supabase.from("business_indicators").delete().eq("campaign_id", cid);
    }

    // Delete campaigns
    await supabase.from("campaigns").delete().eq("organization_id", opts.orgId);
  }

  // Delete org
  await supabase.from("organizations").delete().eq("id", opts.orgId);

  spinner.succeed(
    `Cleaned up org ${chalk.bold(opts.orgId)}\n` +
      `  Deleted ${campaignIds.length} campaigns and all related data`
  );
}
