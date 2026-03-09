/**
 * Pure statistical functions used by calculateResults and seed-results.
 * Extracted for testability and single-source-of-truth.
 */

/**
 * @description Arithmetic mean of a numeric array. Sum of all values divided by the count.
 * No guard for empty arrays — will return NaN for []. This is by design; all callers
 * guarantee non-empty input.
 * @param arr - Array of numeric values. Must be non-empty for a meaningful result.
 * @returns The arithmetic mean of the array elements. Returns NaN if the array is empty.
 * @edge empty array: returns NaN (0 / 0). Callers are responsible for ensuring non-empty input.
 */
export function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * @description Sample standard deviation using Bessel's correction (divides by n-1).
 * Measures the dispersion of values around the mean. Returns 0 for arrays with fewer
 * than 2 elements, since variance is undefined for a single observation.
 * @param arr - Array of numeric values. Valid for any length >= 0.
 * @returns The sample standard deviation (>= 0). Returns 0 if arr.length < 2.
 * @edge arr.length === 0: returns 0 (short-circuit before mean calculation).
 * @edge arr.length === 1: returns 0 (cannot compute variance with one value).
 * @edge all identical values: returns 0 (no dispersion).
 */
export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * @description Favorability percentage — the proportion of scores >= 4 on a 5-point Likert scale,
 * expressed as a percentage. Used as the primary reporting metric across ClimaLab results.
 * No guard for empty arrays — will return NaN for []. Callers guarantee non-empty input.
 * @param arr - Array of Likert scores (expected range 1-5). Must be non-empty for a meaningful result.
 * @returns Percentage of favorable responses (scores >= 4). Range: [0, 100]. Returns NaN if the array is empty.
 * @edge empty array: returns NaN (0 / 0). Callers are responsible for ensuring non-empty input.
 * @edge all scores < 4: returns 0.
 * @edge all scores >= 4: returns 100.
 */
export function favorability(arr: number[]): number {
  return (arr.filter((v) => v >= 4).length / arr.length) * 100;
}

/**
 * @description rwg(j) — within-group agreement index (James, Demaree & Wolf, 1984).
 * Computes interrater agreement by comparing observed population variance to the expected
 * variance under a uniform (null) distribution. Uses population variance (divides by N,
 * not n-1) as specified by the original James et al. formulation.
 *
 * Formula: rwg = 1 - (S²observed / S²EU)
 * where S²EU = (A² - 1) / 12 = (25 - 1) / 12 = 2.0 for a 5-point Likert scale (A = 5).
 *
 * The minimum threshold of n >= 3 is stricter than the formula minimum (n >= 2) as a
 * conservative guard for meaningful agreement assessment.
 *
 * Result is clamped to [0, 1] via Math.max/min and rounded to 3 decimal places.
 *
 * Thresholds: >= 0.70 sufficient, 0.50-0.69 moderate, < 0.50 low.
 *
 * @param scores - Array of Likert scores (expected range 1-5). Must have length >= 3 for a non-null result.
 * @returns The rwg agreement index in [0, 1] rounded to 3 decimal places, or null if fewer than 3 scores.
 * @edge n === 1: returns null (below minimum threshold of 3).
 * @edge n === 2: returns null (below minimum threshold of 3).
 * @edge all identical scores: popVariance = 0, returns 1.000 (perfect agreement).
 * @edge maximum disagreement (uniform spread): popVariance approaches 2.0, returns ~0.000.
 */
export function rwg(scores: number[]): number | null {
  if (scores.length < 3) return null;
  const m = mean(scores);
  const popVariance = scores.reduce((s, v) => s + (v - m) ** 2, 0) / scores.length;
  const expectedVariance = 2.0; // (A² - 1) / 12 = (25 - 1) / 12
  const value = 1 - popVariance / expectedVariance;
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

/**
 * @description Cronbach's alpha — internal consistency reliability coefficient (Cronbach, 1951).
 * Measures how closely related a set of items are as a group. Uses sample variance
 * (divides by n-1, Bessel's correction) for both individual item variances and the
 * total score variance.
 *
 * Formula: alpha = (k / (k - 1)) * (1 - sum(sigma_i^2) / sigma_t^2)
 * where k = number of items, sigma_i^2 = variance of item i, sigma_t^2 = variance of total scores.
 *
 * The minimum threshold of n >= 10 is stricter than the formula minimum (n >= 2) as a
 * conservative guard for meaningful reliability estimation.
 *
 * Rounded to 3 decimal places.
 *
 * Thresholds: >= 0.70 acceptable, 0.60-0.69 marginal, < 0.60 low.
 *
 * @param itemMatrix - 2D array where rows = respondents and columns = items. Each cell is a Likert score.
 * @returns Cronbach's alpha rounded to 3 decimal places, or null if k < 2, n < 10, or totalVar === 0.
 * @edge n < 10: returns null (insufficient respondents for reliable estimation).
 * @edge k < 2: returns null (alpha is undefined for a single item).
 * @edge totalVar === 0: returns null (all respondents have identical total scores; division by zero guarded).
 * @edge all items identical across respondents: sumItemVar/totalVar approaches 1/k, alpha approaches 0.
 */
export type CronbachResult =
  | { value: number; status: "calculated"; n: number; k: number }
  | { value: null; status: "insufficient_n"; n: number; k: number; threshold: number }
  | { value: null; status: "insufficient_items"; n: number; k: number }
  | { value: null; status: "zero_variance"; n: number; k: number };

export function cronbachAlpha(itemMatrix: number[][]): CronbachResult {
  const n = itemMatrix.length;
  const k = itemMatrix[0]?.length ?? 0;
  if (k < 2) return { value: null, status: "insufficient_items", n, k };
  if (n < 10) return { value: null, status: "insufficient_n", n, k, threshold: 10 };

  // Variance of each item (column)
  let sumItemVar = 0;
  for (let j = 0; j < k; j++) {
    const col = itemMatrix.map((row) => row[j]);
    const m = mean(col);
    const v = col.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1);
    sumItemVar += v;
  }

  // Variance of total scores (row sums)
  const totals = itemMatrix.map((row) => row.reduce((s, v) => s + v, 0));
  const totalMean = mean(totals);
  const totalVar = totals.reduce((s, v) => s + (v - totalMean) ** 2, 0) / (n - 1);

  if (totalVar === 0) return { value: null, status: "zero_variance", n, k };
  const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar);
  return { value: Math.round(alpha * 1000) / 1000, status: "calculated", n, k };
}

/**
 * @description Pearson product-moment correlation coefficient with approximate two-tailed p-value.
 * Measures the linear association between two numeric arrays of equal length.
 *
 * Formula: r = sum((xi - mx)(yi - my)) / sqrt(sum((xi - mx)^2) * sum((yi - my)^2))
 *
 * Significance is assessed via a t-test: t = r * sqrt((n - 2) / (1 - r^2 + 1e-10)),
 * with an approximate p-value computed using an exponential approximation of the
 * t-distribution (not an exact CDF). The 1e-10 epsilon prevents division by zero when |r| = 1.
 *
 * The minimum threshold of n >= 10 is a conservative guard for meaningful correlation.
 *
 * r is rounded to 3 decimal places; pValue is rounded to 4 decimal places.
 *
 * @param xArr - First array of numeric values. Must have the same length as yArr.
 * @param yArr - Second array of numeric values. Must have the same length as xArr.
 * @returns Object with r (correlation in [-1, 1]), pValue (approximate two-tailed significance), and n (sample size).
 * @edge n < 10: returns { r: 0, pValue: 1, n } without computation.
 * @edge constant array (all same value in xArr or yArr): denom = 0, returns { r: 0, pValue: 1, n }.
 * @edge perfect correlation (|r| = 1): epsilon 1e-10 prevents division by zero in t-test calculation.
 */
export function pearson(xArr: number[], yArr: number[]): { r: number; pValue: number; n: number } {
  const n = xArr.length;
  if (n < 10) return { r: 0, pValue: 1, n };
  const mx = mean(xArr);
  const my = mean(yArr);
  let sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - mx;
    const dy = yArr[i] - my;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom === 0) return { r: 0, pValue: 1, n };
  const r = sumXY / denom;
  // t-test for significance
  const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
  // Approximate p-value using t-distribution (two-tailed, rough)
  const df = n - 2;
  const pValue = df > 0 ? Math.exp(-0.717 * Math.abs(t) - (0.416 * (t * t)) / df) : 1;
  return { r: Math.round(r * 1000) / 1000, pValue: Math.round(pValue * 10000) / 10000, n };
}
