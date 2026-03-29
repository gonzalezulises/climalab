import {
  computeMarginOfError,
  computeResponseRate,
  roundPercentage,
  roundScore,
} from "./calculations";

describe("calculations helpers", () => {
  it("rounds scores to two decimals", () => {
    expect(roundScore(4.236)).toBe(4.24);
  });

  it("rounds percentages to one decimal", () => {
    expect(roundPercentage(66.66)).toBe(66.7);
  });

  it("computes response rate safely", () => {
    expect(computeResponseRate(25, 100)).toBe(25);
    expect(computeResponseRate(10, 0)).toBe(0);
  });

  it("computes margin of error with finite population correction", () => {
    expect(computeMarginOfError(50, 200)).toBeGreaterThan(0);
    expect(computeMarginOfError(0, 200)).toBe(0);
    expect(computeMarginOfError(50, 1)).toBe(0);
  });
});
