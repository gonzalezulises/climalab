#!/usr/bin/env node
/**
 * ClimaLab Testing Agent — CLI entry point.
 * Tests the full measurement pipeline end-to-end.
 */

import { Command } from "commander";
import { setCliOverrides } from "./lib/config.js";
import { resetClient } from "./lib/supabase.js";
import { runFullCommand } from "./commands/run-full.js";
import { createOrgCommand } from "./commands/create-org.js";
import { createCampaignCommand } from "./commands/create-campaign.js";
import { simulateSurveyCommand } from "./commands/simulate-survey.js";
import { calculateCommand } from "./commands/calculate.js";
import { verifyCommand } from "./commands/verify.js";
import { cleanupCommand } from "./commands/cleanup.js";

const program = new Command()
  .name("climalab-test")
  .description("ClimaLab Testing Agent — end-to-end pipeline testing")
  .version("1.0.0")
  .option("--supabase-url <url>", "Supabase project URL (overrides env)")
  .option("--supabase-key <key>", "Supabase service_role key (overrides env)")
  .hook("preAction", (thisCommand) => {
    const globalOpts = thisCommand.opts();
    if (globalOpts.supabaseUrl || globalOpts.supabaseKey) {
      setCliOverrides({ url: globalOpts.supabaseUrl, key: globalOpts.supabaseKey });
      resetClient();
    }
  });

// run-full
program
  .command("run-full")
  .description("Run the full testing pipeline: create → simulate → calculate → verify → cleanup")
  .option("--respondents <n>", "Number of respondents", "75")
  .option("--modules <modules>", "Optional modules (comma-separated: CAM,CLI,DIG)")
  .option("--climate <level>", "Climate preset: excellent|good|mixed|poor", "mixed")
  .option("--fail-rate <n>", "Attention check fail rate", "0.08")
  .option("--seed <n>", "Fixed seed for reproducibility")
  .option("--skip-verify", "Skip verification", false)
  .option("--skip-cleanup", "Keep test data after run", false)
  .option("--user-email <email>", "Link test org to this user (must have logged in first)")
  .action(async (opts) => {
    await runFullCommand({
      respondents: parseInt(opts.respondents),
      modules: opts.modules?.split(",").map((m: string) => m.trim()),
      climate: opts.climate,
      failRate: parseFloat(opts.failRate),
      seed: opts.seed ? parseInt(opts.seed) : undefined,
      skipVerify: opts.skipVerify,
      skipCleanup: opts.skipCleanup,
      userEmail: opts.userEmail,
    });
  });

// create-org
program
  .command("create-org")
  .description("Create a test organization")
  .option("--name <name>", "Organization name")
  .option("--employees <n>", "Employee count", "100")
  .option("--departments <n>", "Number of departments", "6")
  .option("--user-email <email>", "Link org to this user")
  .action(async (opts) => {
    const result = await createOrgCommand({
      name: opts.name,
      employees: parseInt(opts.employees),
      departments: parseInt(opts.departments),
      userEmail: opts.userEmail,
    });
    console.log(`\nOrg ID: ${result.orgId}`);
  });

// create-campaign
program
  .command("create-campaign")
  .description("Create a campaign for an existing organization")
  .requiredOption("--org-id <uuid>", "Organization ID")
  .option("--modules <modules>", "Optional modules (comma-separated: CAM,CLI,DIG)")
  .action(async (opts) => {
    const result = await createCampaignCommand({
      orgId: opts.orgId,
      modules: opts.modules?.split(",").map((m: string) => m.trim()),
    });
    console.log(`\nCampaign ID: ${result.campaignId}`);
  });

// simulate-survey
program
  .command("simulate-survey")
  .description("Simulate survey responses for an existing campaign")
  .requiredOption("--campaign-id <uuid>", "Campaign ID")
  .option("--respondents <n>", "Number of respondents", "75")
  .option("--climate <level>", "Climate preset: excellent|good|mixed|poor", "mixed")
  .option("--fail-rate <n>", "Attention check fail rate", "0.08")
  .action(async (opts) => {
    // Need to fetch org departments for this campaign
    const { getSupabase } = await import("./lib/supabase.js");
    const supabase = getSupabase();
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("organizations(departments)")
      .eq("id", opts.campaignId)
      .single();
    const departments = (campaign?.organizations as any)?.departments ?? [
      { name: "Default", headcount: parseInt(opts.respondents) },
    ];
    await simulateSurveyCommand({
      campaignId: opts.campaignId,
      respondents: parseInt(opts.respondents),
      climate: opts.climate,
      failRate: parseFloat(opts.failRate),
      departments,
    });
  });

// calculate
program
  .command("calculate")
  .description("Calculate results for an existing campaign")
  .requiredOption("--campaign-id <uuid>", "Campaign ID")
  .action(async (opts) => {
    await calculateCommand({ campaignId: opts.campaignId });
  });

// verify
program
  .command("verify")
  .description("Verify results correctness for an existing campaign")
  .requiredOption("--campaign-id <uuid>", "Campaign ID")
  .option("--fail-rate <n>", "Expected attention check fail rate", "0.08")
  .action(async (opts) => {
    const result = await verifyCommand({
      campaignId: opts.campaignId,
      failRate: parseFloat(opts.failRate),
    });
    process.exit(result.failed > 0 ? 1 : 0);
  });

// cleanup
program
  .command("cleanup")
  .description("Delete an organization and all its test data")
  .requiredOption("--org-id <uuid>", "Organization ID to delete")
  .action(async (opts) => {
    await cleanupCommand({ orgId: opts.orgId });
  });

program.parse();
