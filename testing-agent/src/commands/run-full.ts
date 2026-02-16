import chalk from "chalk";
import { faker } from "@faker-js/faker/locale/es";
import { getSupabase } from "../lib/supabase.js";
import { createOrgCommand } from "./create-org.js";
import { createCampaignCommand } from "./create-campaign.js";
import { simulateSurveyCommand } from "./simulate-survey.js";
import { calculateCommand } from "./calculate.js";
import { verifyCommand } from "./verify.js";
import { cleanupCommand } from "./cleanup.js";

export interface RunFullOptions {
  respondents: number;
  modules?: string[];
  climate: string;
  failRate: number;
  seed?: number;
  skipVerify: boolean;
  skipCleanup: boolean;
}

export async function runFullCommand(opts: RunFullOptions) {
  const startTime = Date.now();

  console.log(chalk.bold.blue("\n  ClimaLab Testing Agent — Full Pipeline\n"));
  console.log(
    `  Respondents: ${opts.respondents}, Climate: ${opts.climate}, ` +
      `Fail rate: ${opts.failRate}, Modules: ${opts.modules?.join(",") || "none"}`
  );
  if (opts.seed != null) {
    console.log(`  Seed: ${opts.seed}`);
    faker.seed(opts.seed);
  }
  console.log("");

  // Verify connection
  const supabase = getSupabase();
  const { error: connError } = await supabase.from("organizations").select("id").limit(1);
  if (connError) {
    console.error(chalk.red(`Connection failed: ${connError.message}`));
    console.error(chalk.dim("Make sure Supabase is running: supabase start"));
    process.exit(1);
  }

  let orgId: string | null = null;

  try {
    // Step 1: Create org
    console.log(chalk.bold("\n[1/6] Create Organization"));
    const orgResult = await createOrgCommand({
      employees: Math.max(opts.respondents, 50),
    });
    orgId = orgResult.orgId;

    // Step 2: Create campaign
    console.log(chalk.bold("\n[2/6] Create Campaign"));
    const campaignResult = await createCampaignCommand({
      orgId: orgResult.orgId,
      modules: opts.modules,
    });

    // Step 3: Activate campaign
    console.log(chalk.bold("\n[3/6] Activate Campaign"));
    await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignResult.campaignId);
    console.log(`  Campaign activated: ${campaignResult.campaignId}`);

    // Step 4: Simulate surveys
    console.log(chalk.bold("\n[4/6] Simulate Survey Responses"));
    await simulateSurveyCommand({
      campaignId: campaignResult.campaignId,
      respondents: opts.respondents,
      climate: opts.climate,
      failRate: opts.failRate,
      departments: orgResult.org.departments,
    });

    // Close campaign
    await supabase
      .from("campaigns")
      .update({ status: "closed" })
      .eq("id", campaignResult.campaignId);
    console.log(`  Campaign closed`);

    // Step 5: Calculate results
    console.log(chalk.bold("\n[5/6] Calculate Results"));
    await calculateCommand({ campaignId: campaignResult.campaignId });

    // Step 6: Verify
    let verifyResult = { passed: 0, failed: 0 };
    if (!opts.skipVerify) {
      console.log(chalk.bold("\n[6/6] Verify Results"));
      verifyResult = await verifyCommand({
        campaignId: campaignResult.campaignId,
        failRate: opts.failRate,
      });
    } else {
      console.log(chalk.bold("\n[6/6] Verify Results — SKIPPED"));
    }

    // Cleanup
    if (!opts.skipCleanup && orgId) {
      console.log(chalk.bold("\nCleanup"));
      await cleanupCommand({ orgId });
    } else if (opts.skipCleanup) {
      console.log(chalk.dim(`\n  Skipping cleanup. Org ID: ${orgId}`));
      console.log(chalk.dim(`  Campaign ID: ${campaignResult.campaignId}`));
      console.log(chalk.dim(`  To clean up later: npx tsx src/index.ts cleanup --org-id ${orgId}`));
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.bold.blue(`\n  Pipeline completed in ${elapsed}s`));
    if (!opts.skipVerify) {
      if (verifyResult.failed === 0) {
        console.log(chalk.green.bold(`  All ${verifyResult.passed} checks passed!\n`));
      } else {
        console.log(
          chalk.red.bold(
            `  ${verifyResult.failed} checks failed out of ${verifyResult.passed + verifyResult.failed}\n`
          )
        );
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(chalk.red(`\n  Pipeline failed: ${(err as Error).message}`));
    // Cleanup on failure if we created an org
    if (orgId && !opts.skipCleanup) {
      console.log(chalk.dim("  Cleaning up after failure..."));
      try {
        await cleanupCommand({ orgId });
      } catch {
        console.error(chalk.dim(`  Cleanup also failed. Manual cleanup needed for org: ${orgId}`));
      }
    }
    process.exit(1);
  }
}
