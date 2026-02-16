/**
 * Pure statistical functions — copy of src/lib/statistics.ts (zero deps).
 */

export function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function favorability(arr: number[]): number {
  return (arr.filter((v) => v >= 4).length / arr.length) * 100;
}

export function rwg(scores: number[]): number | null {
  if (scores.length < 3) return null;
  const m = mean(scores);
  const popVariance = scores.reduce((s, v) => s + (v - m) ** 2, 0) / scores.length;
  const expectedVariance = 2.0;
  const value = 1 - popVariance / expectedVariance;
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

export function cronbachAlpha(itemMatrix: number[][]): number | null {
  const n = itemMatrix.length;
  const k = itemMatrix[0]?.length ?? 0;
  if (k < 2 || n < 10) return null;

  let sumItemVar = 0;
  for (let j = 0; j < k; j++) {
    const col = itemMatrix.map((row) => row[j]);
    const m = mean(col);
    const v = col.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1);
    sumItemVar += v;
  }

  const totals = itemMatrix.map((row) => row.reduce((s, v) => s + v, 0));
  const totalMean = mean(totals);
  const totalVar = totals.reduce((s, v) => s + (v - totalMean) ** 2, 0) / (n - 1);

  if (totalVar === 0) return null;
  const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar);
  return Math.round(alpha * 1000) / 1000;
}

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
  const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
  const df = n - 2;
  const pValue = df > 0 ? Math.exp(-0.717 * Math.abs(t) - (0.416 * (t * t)) / df) : 1;
  return { r: Math.round(r * 1000) / 1000, pValue: Math.round(pValue * 10000) / 10000, n };
}
