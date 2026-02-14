import { describe, it, expect } from "vitest";
import { mean, stdDev, favorability, rwg, cronbachAlpha, pearson } from "./statistics";

describe("mean", () => {
  it("returns the single value for a single-element array", () => {
    expect(mean([5])).toBe(5);
  });

  it("returns correct mean for an even distribution", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("returns the value when all elements are identical", () => {
    expect(mean([3, 3, 3, 3])).toBe(3);
  });
});

describe("stdDev", () => {
  it("returns 0 for a single value", () => {
    expect(stdDev([5])).toBe(0);
  });

  it("returns 0 when there is no variation", () => {
    expect(stdDev([4, 4, 4, 4])).toBe(0);
  });

  it("returns correct sample std dev for a known case", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, sample variance=32/7≈4.571, stddev≈2.138
    const result = stdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.138, 2);
  });
});

describe("favorability", () => {
  it("returns 100 when all scores are favorable (>=4)", () => {
    expect(favorability([4, 5, 4, 5])).toBe(100);
  });

  it("returns 0 when no scores are favorable", () => {
    expect(favorability([1, 2, 3, 3])).toBe(0);
  });

  it("treats score of 4 as favorable (boundary)", () => {
    expect(favorability([3, 4])).toBe(50);
  });
});

describe("rwg", () => {
  it("returns null if fewer than 3 scores", () => {
    expect(rwg([4, 4])).toBeNull();
  });

  it("returns 1.0 for perfect agreement", () => {
    expect(rwg([4, 4, 4, 4, 4])).toBe(1);
  });

  it("clamps to 0 for maximum disagreement", () => {
    // scores [1, 5, 1, 5, 1, 5] → high variance
    const result = rwg([1, 5, 1, 5, 1, 5]);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("rounds to 3 decimal places", () => {
    const result = rwg([3, 3, 4, 3, 4, 3, 4]);
    expect(result).not.toBeNull();
    const str = result!.toString();
    const decimals = str.includes(".") ? str.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(3);
  });
});

describe("cronbachAlpha", () => {
  it("returns null if k < 2", () => {
    const matrix = Array.from({ length: 10 }, () => [3]);
    expect(cronbachAlpha(matrix)).toBeNull();
  });

  it("returns null if n < 10", () => {
    const matrix = Array.from({ length: 9 }, () => [3, 4]);
    expect(cronbachAlpha(matrix)).toBeNull();
  });

  it("returns null if totalVar is 0", () => {
    // All identical rows → total variance = 0
    const matrix = Array.from({ length: 10 }, () => [3, 4, 5]);
    expect(cronbachAlpha(matrix)).toBeNull();
  });

  it("returns high alpha for a reliable matrix", () => {
    // Build a matrix where items correlate well (simulate reliable scale)
    const matrix: number[][] = [];
    for (let i = 0; i < 20; i++) {
      const base = 2 + (i % 4); // varies 2-5
      matrix.push([base, base, base + (i % 2 === 0 ? 0 : 1)]);
    }
    const alpha = cronbachAlpha(matrix);
    expect(alpha).not.toBeNull();
    expect(alpha!).toBeGreaterThan(0.6);
  });

  it("rounds to 3 decimal places", () => {
    const matrix: number[][] = [];
    for (let i = 0; i < 20; i++) {
      const base = 1 + (i % 5);
      matrix.push([base, base + (i % 3), base + (i % 2)]);
    }
    const alpha = cronbachAlpha(matrix);
    if (alpha !== null) {
      const str = alpha.toString();
      const decimals = str.includes(".") ? str.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(3);
    }
  });
});

describe("pearson", () => {
  it("returns r=0 and pValue=1 if n < 10", () => {
    const result = pearson([1, 2, 3], [1, 2, 3]);
    expect(result.r).toBe(0);
    expect(result.pValue).toBe(1);
    expect(result.n).toBe(3);
  });

  it("returns r close to 1 for perfect positive correlation", () => {
    const x = Array.from({ length: 20 }, (_, i) => i + 1);
    const y = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = pearson(x, y);
    expect(result.r).toBe(1);
  });

  it("returns r close to -1 for perfect negative correlation", () => {
    const x = Array.from({ length: 20 }, (_, i) => i + 1);
    const y = Array.from({ length: 20 }, (_, i) => 20 - i);
    const result = pearson(x, y);
    expect(result.r).toBe(-1);
  });

  it("returns r=0 and pValue=1 for zero denominator", () => {
    // All same values → zero variance → zero denominator
    const x = Array.from({ length: 20 }, () => 3);
    const y = Array.from({ length: 20 }, (_, i) => i);
    const result = pearson(x, y);
    expect(result.r).toBe(0);
    expect(result.pValue).toBe(1);
  });
});
