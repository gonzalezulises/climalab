/**
 * Terminal report formatter for verification results.
 */

import chalk from "chalk";
import type { CheckResult } from "./checks.js";

export function printReport(checks: CheckResult[]): { passed: number; failed: number } {
  const categories = ["structural", "statistical", "consistency", "recalculation"] as const;

  console.log("\n" + chalk.bold.underline("Verification Report"));
  console.log("=".repeat(80));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const cat of categories) {
    const catChecks = checks.filter((c) => c.category === cat);
    if (catChecks.length === 0) continue;

    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
    console.log("\n" + chalk.bold.cyan(`[${catLabel}]`));

    for (const check of catChecks) {
      const icon = check.passed ? chalk.green("PASS") : chalk.red("FAIL");
      const name = check.passed ? check.name : chalk.red(check.name);
      console.log(`  ${icon}  ${name}`);
      if (check.detail) {
        console.log(`         ${chalk.dim(check.detail)}`);
      }
      if (check.passed) totalPassed++;
      else totalFailed++;
    }
  }

  console.log("\n" + "=".repeat(80));
  const total = totalPassed + totalFailed;
  const summary =
    totalFailed === 0
      ? chalk.green.bold(`${totalPassed}/${total} PASSED`)
      : chalk.red.bold(`${totalPassed}/${total} PASSED, ${totalFailed} FAILED`);
  console.log(`Result: ${summary}\n`);

  return { passed: totalPassed, failed: totalFailed };
}
