/**
 * verify-stats — Standalone statistical motor verification.
 * Tests pure statistical functions with known inputs and expected outputs.
 * Independent of Supabase and the full pipeline. Runs in < 5 seconds.
 */

// Import directly from the main project's statistics module
// The main project lacks "type": "module" in package.json, so tsx treats
// statistics.ts as CJS when resolved outside the testing-agent scope.
// We use dynamic import to handle the CJS→ESM interop correctly.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const statsPath = resolve(__dirname, "../../../src/lib/statistics.ts");

let mean: (arr: number[]) => number;
let stdDev: (arr: number[]) => number;
let favorability: (arr: number[]) => number;
let rwg: (scores: number[]) => number | null;
let cronbachAlpha: (itemMatrix: number[][]) => {
  value: number | null;
  status: string;
  n: number;
  k: number;
};
let pearson: (xArr: number[], yArr: number[]) => { r: number; pValue: number; n: number };

async function loadStats() {
  const mod = await import(statsPath);
  const stats = mod.default ?? mod;
  mean = stats.mean;
  stdDev = stats.stdDev;
  favorability = stats.favorability;
  rwg = stats.rwg;
  cronbachAlpha = stats.cronbachAlpha;
  pearson = stats.pearson;
}

interface Assertion {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export async function verifyStatsCommand(): Promise<void> {
  await loadStats();

  const assertions: Assertion[] = [];
  let failed = 0;

  function assert(name: string, actual: unknown, expected: unknown, tolerance?: number) {
    let passed: boolean;
    if (tolerance !== undefined && typeof actual === "number" && typeof expected === "number") {
      passed = Math.abs(actual - expected) <= tolerance;
    } else if (actual === null && expected === null) {
      passed = true;
    } else {
      passed = actual === expected;
    }
    if (!passed) failed++;
    assertions.push({
      name,
      passed,
      expected: String(expected),
      actual: String(actual),
    });
  }

  console.log("\n=== Statistical Motor Verification ===\n");

  // --- mean ---
  assert("mean([1,2,3,4,5])", mean([1, 2, 3, 4, 5]), 3.0, 0.001);
  assert("mean([4,4,4,4])", mean([4, 4, 4, 4]), 4.0, 0.001);

  // --- stdDev ---
  assert("stdDev([2,4,4,4,5,5,7,9]) ≈ 2.138", stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2.138, 0.001);
  assert("stdDev([5]) = 0", stdDev([5]), 0, 0.001);
  assert("stdDev([]) = 0", stdDev([]), 0, 0.001);

  // --- favorability ---
  assert("favorability([1,2,3,4,5]) = 40%", favorability([1, 2, 3, 4, 5]), 40.0, 0.001);
  assert("favorability([4,4,5,5]) = 100%", favorability([4, 4, 5, 5]), 100.0, 0.001);
  assert("favorability([1,1,2,3]) = 0%", favorability([1, 1, 2, 3]), 0.0, 0.001);

  // --- rwg ---
  assert("rwg([4,4,4,4,4]) = 1.0 (perfect agreement)", rwg([4, 4, 4, 4, 4]), 1.0, 0.001);
  assert("rwg([1,5,1,5,1,5]) = 0.0 (max dispersion)", rwg([1, 5, 1, 5, 1, 5]), 0.0, 0.001);
  assert(
    "rwg([4,4,4,4,3,4,4,4,3,3,4,4]) ≈ 0.906",
    rwg([4, 4, 4, 4, 3, 4, 4, 4, 3, 3, 4, 4]),
    0.906,
    0.002
  );
  assert("rwg([4]) = null (n < 3)", rwg([4]), null);
  assert("rwg([4,3]) = null (n < 3)", rwg([4, 3]), null);

  // --- cronbachAlpha ---
  const alphaMatrix = [
    [4, 3, 4, 3, 4],
    [3, 3, 3, 3, 3],
    [5, 4, 5, 4, 5],
    [2, 2, 2, 2, 2],
    [4, 4, 4, 4, 4],
    [3, 3, 3, 3, 3],
    [5, 5, 5, 5, 5],
    [1, 1, 1, 2, 1],
    [4, 3, 4, 3, 4],
    [3, 4, 3, 4, 3],
  ];
  const alphaResult = cronbachAlpha(alphaMatrix);
  assert("cronbachAlpha(10×5 reference) status = calculated", alphaResult.status, "calculated");
  assert("cronbachAlpha(10×5 reference) ≈ 0.977", alphaResult.value, 0.977, 0.002);

  // Identical items per respondent → alpha = 1.0
  const perfectMatrix = Array.from({ length: 10 }, (_, i) => {
    const v = (i % 5) + 1;
    return [v, v, v, v, v];
  });
  assert("cronbachAlpha(identical items) = 1.0", cronbachAlpha(perfectMatrix).value, 1.0, 0.001);

  // n < 10 → insufficient_n
  const smallResult = cronbachAlpha(alphaMatrix.slice(0, 6));
  assert("cronbachAlpha(6 rows) status = insufficient_n", smallResult.status, "insufficient_n");
  assert("cronbachAlpha(6 rows) value = null", smallResult.value, null);

  // totalVar = 0 → zero_variance
  const uniformMatrix = Array.from({ length: 10 }, () => [3, 3, 3, 3, 3]);
  assert(
    "cronbachAlpha(uniform rows) status = zero_variance",
    cronbachAlpha(uniformMatrix).status,
    "zero_variance"
  );

  // --- pearson ---
  const x10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const y10 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  assert("pearson(perfect positive) r = 1.0", pearson(x10, y10).r, 1.0, 0.001);
  const y10neg = y10.map((v) => -v);
  assert("pearson(perfect negative) r = -1.0", pearson(x10, y10neg).r, -1.0, 0.001);
  assert("pearson(n < 10) r = 0", pearson([1, 2, 3], [4, 5, 6]).r, 0);

  // --- Print report ---
  console.log("Results:");
  console.log("\u2500".repeat(70));
  for (const a of assertions) {
    const status = a.passed ? "\u2713 PASS" : "\u2717 FAIL";
    const line = `  ${status}  ${a.name}`;
    if (!a.passed) {
      console.log(`${line}\n         expected: ${a.expected}, got: ${a.actual}`);
    } else {
      console.log(line);
    }
  }
  console.log("\u2500".repeat(70));
  console.log(
    `\n  Total: ${assertions.length} | Passed: ${assertions.length - failed} | Failed: ${failed}\n`
  );

  if (failed > 0) {
    process.exit(1);
  }
}
