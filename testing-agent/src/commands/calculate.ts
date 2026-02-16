import ora from "ora";
import chalk from "chalk";
import { getSupabase } from "../lib/supabase.js";
import { calculateResults } from "../lib/calculate-results.js";

export async function calculateCommand(opts: { campaignId: string }) {
  const supabase = getSupabase();
  const spinner = ora("Calculating results...").start();

  const result = await calculateResults(supabase, opts.campaignId);

  spinner.succeed(
    `Results calculated\n` +
      `  Valid: ${chalk.green(result.validCount)}, Disqualified: ${chalk.yellow(result.disqualifiedCount)}\n` +
      `  Results rows: ${result.totalResults}, Analytics records: ${result.totalAnalytics}`
  );

  return result;
}
