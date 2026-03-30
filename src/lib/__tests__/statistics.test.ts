import {
  mean,
  stdDev,
  favorability,
  rwg,
  cronbachAlpha,
  pearson,
  welchTTest,
  bootstrapCI,
  cohensD,
  segmentSignificance,
} from "@/lib/statistics";

// ============================================================
// Helper functions replicating logic from campaigns.ts
// for formula verification (not exported from statistics.ts)
// ============================================================

/** Margin of error with FPC — as implemented in src/actions/campaigns.ts */
function marginOfErrorWithFPC(n: number, N: number): number {
  if (n <= 0 || N <= 1) return 0;
  const fpcCorrection = Math.sqrt((N - n) / (N - 1));
  return Math.round(1.96 * Math.sqrt(0.25 / n) * fpcCorrection * 100 * 100) / 100;
}

/** Margin of error without FPC (simple random sampling) */
function marginOfErrorWithoutFPC(n: number): number {
  if (n <= 0) return 0;
  return 1.96 * Math.sqrt(0.25 / n) * 100;
}

/** eNPS — as implemented in src/actions/campaigns.ts */
function calculateENPS(scores: number[]): number {
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

/** Engagement profile classification — as in src/actions/campaigns.ts */
function classifyEngagement(avgScore: number): string {
  if (avgScore >= 4.5) return "ambassador";
  if (avgScore >= 4.0) return "committed";
  if (avgScore >= 3.0) return "neutral";
  return "disengaged";
}

/** Anonymity threshold — as in src/actions/campaigns.ts */
function passesAnonymityThreshold(respondentCount: number): boolean {
  return respondentCount >= 5;
}

// ============================================================
// 1. mean
// ============================================================
describe("mean", () => {
  it("computes the arithmetic mean of a simple array", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("returns the value itself for a single-element array", () => {
    expect(mean([7])).toBe(7);
  });

  it("handles decimal values", () => {
    expect(mean([1.5, 2.5, 3.5])).toBeCloseTo(2.5, 10);
  });

  it("returns NaN for an empty array", () => {
    expect(mean([])).toBeNaN();
  });

  it("handles negative values", () => {
    expect(mean([-3, -1, 0, 1, 3])).toBe(0);
  });

  it("handles all identical values", () => {
    expect(mean([4, 4, 4, 4])).toBe(4);
  });
});

// ============================================================
// 2. stdDev (sample standard deviation, Bessel's correction)
// ============================================================
describe("stdDev", () => {
  it("computes sample standard deviation for [2, 4, 4, 4, 5, 5, 7, 9]", () => {
    // mean = 5, variance = sum((x-5)^2)/7 = (9+1+1+1+0+0+4+16)/7 = 32/7 = 4.5714
    // stdDev = sqrt(4.5714) = 2.1381
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.1381, 3);
  });

  it("returns 0 for a single-element array", () => {
    expect(stdDev([5])).toBe(0);
  });

  it("returns 0 for an empty array", () => {
    expect(stdDev([])).toBe(0);
  });

  it("returns 0 for all identical values", () => {
    expect(stdDev([3, 3, 3, 3])).toBe(0);
  });

  it("computes correctly for two elements", () => {
    // [1, 3]: mean=2, variance = ((1-2)^2 + (3-2)^2)/1 = 2, stdDev = sqrt(2) = 1.4142
    expect(stdDev([1, 3])).toBeCloseTo(Math.SQRT2, 10);
  });
});

// ============================================================
// 3. favorability
// ============================================================
describe("favorability", () => {
  it("computes favorability percentage for Likert scores", () => {
    // [1, 2, 3, 4, 5]: 2 out of 5 are >= 4 → 40%
    expect(favorability([1, 2, 3, 4, 5])).toBe(40);
  });

  it("returns 100 when all scores are favorable", () => {
    expect(favorability([4, 5, 4, 5])).toBe(100);
  });

  it("returns 0 when no scores are favorable", () => {
    expect(favorability([1, 2, 3, 3, 1])).toBe(0);
  });

  it("treats exactly 4 as favorable", () => {
    expect(favorability([4])).toBe(100);
  });

  it("treats 3.99 as unfavorable", () => {
    expect(favorability([3.99])).toBe(0);
  });

  it("returns NaN for empty array", () => {
    expect(favorability([])).toBeNaN();
  });

  it("computes correct percentage for mixed scores", () => {
    // [1, 2, 3, 4, 5, 4, 3, 2, 5, 1]: 3 favorable (4, 4, 5... wait)
    // favorable: 4, 5, 4, 5 → 4 out of 10 → 40%
    expect(favorability([1, 2, 3, 4, 5, 4, 3, 2, 5, 1])).toBe(40);
  });
});

// ============================================================
// 4. rwg (within-group agreement)
// ============================================================
describe("rwg", () => {
  it("computes rwg for reference dataset (12 scores, high agreement)", () => {
    // Scores: [4,4,4, 4,3,4, 4,4,3, 3,4,4]
    // mean = 45/12 = 3.75
    // popVar = 2.25/12 = 0.1875
    // rwg = 1 - 0.1875/2.0 = 0.90625 → rounded to 0.906
    expect(rwg([4, 4, 4, 4, 3, 4, 4, 4, 3, 3, 4, 4])).toBe(0.906);
  });

  it("returns 1.0 when all scores are identical (perfect agreement)", () => {
    expect(rwg([4, 4, 4, 4, 4])).toBe(1);
  });

  it("returns 0 for maximum dispersion [1,5,1,5,1,5]", () => {
    // mean = 3, popVar = 24/6 = 4.0, rwg = 1 - 4/2 = -1 → clamped to 0
    expect(rwg([1, 5, 1, 5, 1, 5])).toBe(0);
  });

  it("returns null when n < 3 (n=1)", () => {
    expect(rwg([4])).toBeNull();
  });

  it("returns null when n < 3 (n=2)", () => {
    expect(rwg([4, 3])).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(rwg([])).toBeNull();
  });

  it("returns exactly 3 decimal places", () => {
    const result = rwg([3, 4, 5, 3, 4]);
    expect(result).not.toBeNull();
    // Verify it has at most 3 decimal places
    const str = result!.toString();
    const decimals = str.includes(".") ? str.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(3);
  });

  it("handles scores at boundary (all 1s)", () => {
    expect(rwg([1, 1, 1, 1])).toBe(1);
  });

  it("handles scores at boundary (all 5s)", () => {
    expect(rwg([5, 5, 5, 5])).toBe(1);
  });
});

// ============================================================
// 5. cronbachAlpha
// ============================================================
describe("cronbachAlpha", () => {
  // 10-respondent × 5-item reference dataset
  const referenceMatrix = [
    [4, 3, 4, 3, 4], // R1
    [3, 3, 3, 3, 3], // R2
    [5, 4, 5, 4, 5], // R3
    [2, 2, 2, 2, 2], // R4
    [4, 4, 4, 4, 4], // R5
    [3, 3, 3, 3, 3], // R6
    [5, 5, 5, 5, 5], // R7
    [1, 1, 1, 2, 1], // R8
    [4, 3, 4, 3, 4], // R9
    [3, 4, 3, 4, 3], // R10
  ];

  it("computes alpha for 10x5 reference dataset", () => {
    const result = cronbachAlpha(referenceMatrix);
    expect(result.status).toBe("calculated");
    expect(result.value).toBe(0.977);
    expect(result.n).toBe(10);
    expect(result.k).toBe(5);
  });

  it("returns insufficient_n when n < 10 (6 respondents)", () => {
    const sixRows = referenceMatrix.slice(0, 6);
    const result = cronbachAlpha(sixRows);
    expect(result.status).toBe("insufficient_n");
    expect(result.value).toBeNull();
    expect(result.n).toBe(6);
    expect("threshold" in result && result.threshold).toBe(10);
  });

  it("returns insufficient_items when k < 2 (single-column matrix)", () => {
    const singleColumn = Array.from({ length: 10 }, (_, i) => [i + 1]);
    const result = cronbachAlpha(singleColumn);
    expect(result.status).toBe("insufficient_items");
    expect(result.value).toBeNull();
    expect(result.k).toBe(1);
  });

  it("returns zero_variance when all respondents have identical total scores", () => {
    const uniformMatrix = Array.from({ length: 10 }, () => [3, 3, 3, 3, 3]);
    const result = cronbachAlpha(uniformMatrix);
    expect(result.status).toBe("zero_variance");
    expect(result.value).toBeNull();
  });

  it("returns 1.0 for perfectly correlated items (all columns identical)", () => {
    const perfectMatrix = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map((v) => [v, v, v, v, v]);
    const result = cronbachAlpha(perfectMatrix);
    expect(result.status).toBe("calculated");
    expect(result.value).toBe(1);
  });

  it("returns insufficient_items for empty matrix", () => {
    const result = cronbachAlpha([]);
    expect(result.value).toBeNull();
  });

  it("returns insufficient_n when n = 9 (just below threshold)", () => {
    const nineRows = referenceMatrix.slice(0, 9);
    const result = cronbachAlpha(nineRows);
    expect(result.status).toBe("insufficient_n");
    expect(result.value).toBeNull();
    expect(result.n).toBe(9);
  });

  it("handles exactly n=10 (minimum valid)", () => {
    const result = cronbachAlpha(referenceMatrix);
    expect(result.status).toBe("calculated");
    expect(result.value).not.toBeNull();
  });
});

// ============================================================
// 6. pearson
// ============================================================
describe("pearson", () => {
  it("returns r=1 for perfect positive linear relationship", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]; // y = 2x
    const result = pearson(x, y);
    expect(result.r).toBe(1);
    expect(result.n).toBe(10);
  });

  it("returns r=-1 for perfect negative linear relationship", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2]; // y = 22 - 2x
    const result = pearson(x, y);
    expect(result.r).toBe(-1);
    expect(result.n).toBe(10);
  });

  it("returns r=0 and pValue=1 when n < 10", () => {
    const result = pearson([1, 2, 3], [4, 5, 6]);
    expect(result.r).toBe(0);
    expect(result.pValue).toBe(1);
    expect(result.n).toBe(3);
  });

  it("returns r=0 and pValue=1 when one array is constant", () => {
    const x = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = pearson(x, y);
    expect(result.r).toBe(0);
    expect(result.pValue).toBe(1);
    expect(result.n).toBe(10);
  });

  it("rounds r to 3 decimal places", () => {
    // Use data that produces a non-round correlation
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2, 3, 2, 5, 4, 7, 6, 9, 8, 10];
    const result = pearson(x, y);
    const rStr = result.r.toString();
    const decimals = rStr.includes(".") ? rStr.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(3);
  });

  it("rounds pValue to 4 decimal places", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2, 3, 2, 5, 4, 7, 6, 9, 8, 10];
    const result = pearson(x, y);
    const pStr = result.pValue.toString();
    const decimals = pStr.includes(".") ? pStr.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(4);
  });

  it("returns small pValue for strong correlation", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    const result = pearson(x, y);
    expect(result.pValue).toBeLessThan(0.01);
  });

  it("handles n=0 (empty arrays)", () => {
    const result = pearson([], []);
    expect(result.r).toBe(0);
    expect(result.pValue).toBe(1);
    expect(result.n).toBe(0);
  });
});

// ============================================================
// 7. Margin of Error with FPC (formula from campaigns.ts)
// ============================================================
describe("marginOfError (FPC formula verification)", () => {
  it("computes margin of error without FPC for n=50", () => {
    // ME% = 1.96 * sqrt(0.25/50) * 100 = 1.96 * 0.07071 * 100 = 13.86%
    expect(marginOfErrorWithoutFPC(50)).toBeCloseTo(13.86, 1);
  });

  it("computes margin of error with FPC for n=50, N=200", () => {
    // FPC = sqrt((200-50)/(200-1)) = sqrt(150/199) = 0.86820
    // ME% = 1.96 * sqrt(0.25/50) * 0.86820 * 100 = 12.03%
    // Rounded to 2 decimals: 12.03
    expect(marginOfErrorWithFPC(50, 200)).toBe(12.03);
  });

  it("FPC correction reduces margin of error", () => {
    const meWithout = marginOfErrorWithoutFPC(50);
    const meWith = marginOfErrorWithFPC(50, 200);
    expect(meWith).toBeLessThan(meWithout);
  });

  it("FPC approaches 1 when N >> n (census fraction is small)", () => {
    // n=50, N=100000 → FPC ≈ 1.0 → ME ≈ ME without FPC
    const meWithout = marginOfErrorWithoutFPC(50);
    const meWith = marginOfErrorWithFPC(50, 100000);
    expect(meWith).toBeCloseTo(meWithout, 0);
  });

  it("FPC approaches 0 when n ≈ N (census)", () => {
    // n=199, N=200 → FPC = sqrt(1/199) ≈ 0.0709 → ME very small
    const me = marginOfErrorWithFPC(199, 200);
    expect(me).toBeLessThan(1);
  });

  it("returns 0 for invalid inputs", () => {
    expect(marginOfErrorWithFPC(0, 200)).toBe(0);
    expect(marginOfErrorWithFPC(50, 1)).toBe(0);
    expect(marginOfErrorWithFPC(-1, 200)).toBe(0);
  });
});

// ============================================================
// 8. eNPS (formula from campaigns.ts)
// ============================================================
describe("eNPS (formula verification)", () => {
  it("computes eNPS for reference dataset", () => {
    // [10, 9, 8, 7, 6, 5, 9, 10, 3, 8]
    // Promoters (>=9): 10, 9, 9, 10 → 4
    // Detractors (<=6): 6, 5, 3 → 3
    // Passives (7-8): 8, 7, 8 → 3
    // eNPS = round(((4 - 3) / 10) * 100) = 10
    expect(calculateENPS([10, 9, 8, 7, 6, 5, 9, 10, 3, 8])).toBe(10);
  });

  it("returns 100 when all are promoters", () => {
    expect(calculateENPS([9, 10, 9, 10])).toBe(100);
  });

  it("returns -100 when all are detractors", () => {
    expect(calculateENPS([1, 2, 3, 6])).toBe(-100);
  });

  it("returns 0 when promoters equal detractors", () => {
    expect(calculateENPS([10, 1, 8, 7])).toBe(0);
  });

  it("classifies boundary score 9 as promoter", () => {
    // All passives except one promoter: [7, 7, 7, 9] → eNPS = (1-0)/4*100 = 25
    expect(calculateENPS([7, 7, 7, 9])).toBe(25);
  });

  it("classifies boundary score 6 as detractor", () => {
    // All passives except one detractor: [7, 7, 7, 6] → eNPS = (0-1)/4*100 = -25
    expect(calculateENPS([7, 7, 7, 6])).toBe(-25);
  });

  it("classifies scores 7 and 8 as passives (no impact on eNPS)", () => {
    expect(calculateENPS([7, 8, 7, 8])).toBe(0);
  });
});

// ============================================================
// 9. Engagement profiles (formula from campaigns.ts)
// ============================================================
describe("engagement profiles (formula verification)", () => {
  it("classifies >= 4.5 as ambassador", () => {
    expect(classifyEngagement(4.5)).toBe("ambassador");
    expect(classifyEngagement(5.0)).toBe("ambassador");
  });

  it("classifies 4.0-4.49 as committed", () => {
    expect(classifyEngagement(4.0)).toBe("committed");
    expect(classifyEngagement(4.49)).toBe("committed");
  });

  it("classifies 3.0-3.99 as neutral", () => {
    expect(classifyEngagement(3.0)).toBe("neutral");
    expect(classifyEngagement(3.99)).toBe("neutral");
  });

  it("classifies < 3.0 as disengaged", () => {
    expect(classifyEngagement(2.99)).toBe("disengaged");
    expect(classifyEngagement(1.0)).toBe("disengaged");
  });

  it("handles exact boundary at 4.5", () => {
    expect(classifyEngagement(4.5)).toBe("ambassador");
  });

  it("handles exact boundary at 4.0", () => {
    expect(classifyEngagement(4.0)).toBe("committed");
  });

  it("handles exact boundary at 3.0", () => {
    expect(classifyEngagement(3.0)).toBe("neutral");
  });
});

// ============================================================
// 10. Anonymity threshold (formula from campaigns.ts)
// ============================================================
describe("anonymity threshold (formula verification)", () => {
  it("rejects segments with fewer than 5 respondents", () => {
    expect(passesAnonymityThreshold(0)).toBe(false);
    expect(passesAnonymityThreshold(1)).toBe(false);
    expect(passesAnonymityThreshold(4)).toBe(false);
  });

  it("accepts segments with exactly 5 respondents", () => {
    expect(passesAnonymityThreshold(5)).toBe(true);
  });

  it("accepts segments with more than 5 respondents", () => {
    expect(passesAnonymityThreshold(6)).toBe(true);
    expect(passesAnonymityThreshold(100)).toBe(true);
  });
});

// ============================================================
// 11. welchTTest
// ============================================================
describe("welchTTest", () => {
  it("detects significant difference between two samples", () => {
    const group1 = [2.1, 2.3, 2.5, 2.2, 2.4, 2.6, 2.0, 2.3, 2.1, 2.5, 2.2, 2.4, 2.3, 2.5, 2.1];
    const group2 = [4.1, 4.3, 4.5, 4.2, 4.4, 4.6, 4.0, 4.3, 4.1, 4.5, 4.2, 4.4, 4.3, 4.5, 4.1];
    const result = welchTTest(group1, group2);
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(true);
    expect(result!.pValue).toBeLessThan(0.05);
    expect(result!.t).toBeLessThan(0);
    expect(result!.df).toBeGreaterThan(0);
  });

  it("returns non-significant for similar samples", () => {
    const group1 = [3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2];
    const group2 = [3.1, 3.0, 3.2, 3.1, 3.0, 3.2, 3.1, 3.0, 3.2, 3.1, 3.0, 3.2, 3.1, 3.0, 3.2];
    const result = welchTTest(group1, group2);
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(false);
    expect(result!.pValue).toBeGreaterThan(0.05);
  });

  it("returns null when n < 15 in either sample", () => {
    const small = [3.0, 3.1, 3.2, 3.0, 3.1];
    const large = [3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2];
    expect(welchTTest(small, large)).toBeNull();
    expect(welchTTest(large, small)).toBeNull();
  });

  it("handles identical samples", () => {
    const same = [3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2];
    const result = welchTTest(same, [...same]);
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(false);
    expect(result!.t).toBeCloseTo(0, 1);
  });
});

// ============================================================
// 12. bootstrapCI
// ============================================================
describe("bootstrapCI", () => {
  it("detects significant difference (CI excludes 0)", () => {
    const group1 = [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.0, 2.1, 2.2, 2.3];
    const group2 = [4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.0, 4.1, 4.2, 4.3];
    const result = bootstrapCI(group1, group2, { seed: 42 });
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(true);
    expect(result!.lower).toBeLessThan(0);
    expect(result!.upper).toBeLessThan(0);
  });

  it("returns non-significant when CI includes 0", () => {
    const group1 = [3.0, 3.1, 2.9, 3.2, 2.8, 3.0, 3.1, 2.9, 3.2, 2.8];
    const group2 = [3.1, 3.0, 3.2, 2.9, 3.1, 3.0, 3.1, 2.9, 3.2, 2.8];
    const result = bootstrapCI(group1, group2, { seed: 42 });
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(false);
  });

  it("returns null when n < 10 in either sample", () => {
    const small = [3.0, 3.1, 3.2];
    const large = [3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0];
    expect(bootstrapCI(small, large)).toBeNull();
  });

  it("is reproducible with same seed", () => {
    const a = [2.0, 2.5, 3.0, 3.5, 4.0, 2.0, 2.5, 3.0, 3.5, 4.0];
    const b = [3.0, 3.5, 4.0, 4.5, 5.0, 3.0, 3.5, 4.0, 4.5, 5.0];
    const r1 = bootstrapCI(a, b, { seed: 123 });
    const r2 = bootstrapCI(a, b, { seed: 123 });
    expect(r1!.lower).toBe(r2!.lower);
    expect(r1!.upper).toBe(r2!.upper);
  });
});

// ============================================================
// 13. cohensD
// ============================================================
describe("cohensD", () => {
  it("classifies negligible effect (d < 0.2)", () => {
    const result = cohensD(3.0, 3.05, 0.5, 0.5, 30, 30);
    expect(result.label).toBe("negligible");
    expect(Math.abs(result.d)).toBeLessThan(0.2);
  });

  it("classifies small effect (0.2 <= d < 0.5)", () => {
    const result = cohensD(3.0, 3.2, 0.5, 0.5, 30, 30);
    expect(result.label).toBe("small");
  });

  it("classifies medium effect (0.5 <= d < 0.8)", () => {
    const result = cohensD(3.0, 3.5, 0.7, 0.7, 30, 30);
    expect(result.label).toBe("medium");
  });

  it("classifies large effect (d >= 0.8)", () => {
    const result = cohensD(2.5, 4.0, 0.8, 0.8, 30, 30);
    expect(result.label).toBe("large");
  });

  it("returns 0 when pooled sd is 0", () => {
    const result = cohensD(3.0, 3.0, 0, 0, 30, 30);
    expect(result.d).toBe(0);
    expect(result.label).toBe("negligible");
  });
});

// ============================================================
// 14. segmentSignificance
// ============================================================
describe("segmentSignificance", () => {
  it("returns welch + effectSize for large samples, no bootstrap", () => {
    const a = Array.from({ length: 40 }, (_, i) => 2.0 + (i % 10) * 0.1);
    const b = Array.from({ length: 40 }, (_, i) => 4.0 + (i % 10) * 0.1);
    const result = segmentSignificance(a, b);
    expect(result).not.toBeNull();
    expect(result!.welch).not.toBeNull();
    expect(result!.effectSize).toBeDefined();
    expect(result!.bootstrap).toBeNull();
  });

  it("includes bootstrap when either sample n < 30", () => {
    const a = Array.from({ length: 20 }, (_, i) => 2.0 + (i % 10) * 0.1);
    const b = Array.from({ length: 20 }, (_, i) => 4.0 + (i % 10) * 0.1);
    const result = segmentSignificance(a, b);
    expect(result).not.toBeNull();
    expect(result!.welch).not.toBeNull();
    expect(result!.bootstrap).not.toBeNull();
  });

  it("returns null when either sample is too small", () => {
    const small = [3.0, 3.1, 3.2];
    const large = Array.from({ length: 30 }, () => 3.0);
    expect(segmentSignificance(small, large)).toBeNull();
  });
});
