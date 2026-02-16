import { getSupabase } from "../lib/supabase.js";
import { runAllChecks } from "../verification/checks.js";
import { printReport } from "../verification/report.js";

export async function verifyCommand(opts: {
  campaignId: string;
  failRate?: number;
}): Promise<{ passed: number; failed: number }> {
  const supabase = getSupabase();
  console.log("\nRunning verification checks...");

  const checks = await runAllChecks(supabase, opts.campaignId, opts.failRate ?? 0.08);
  return printReport(checks);
}
