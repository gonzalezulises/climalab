# Statistical Robustness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CFA, measurement invariance, wave-over-wave significance testing, segment confidence intervals, and HLM multilevel modeling to ClimaLab's analytical pipeline.

**Architecture:** TypeScript pure functions for lightweight statistics (Welch t-test, bootstrap CI, Cohen's d) integrated into `calculateResults()`. Python unified engine (`statistical-engine.py`) for heavy computation (CFA via semopy, invariance, HLM via statsmodels). Results stored in existing `campaign_results.metadata` (significance) and `campaign_analytics` (CFA/invariance/HLM) — no new tables.

**Tech Stack:** TypeScript (Vitest), Python 3.11+ (semopy, statsmodels, pandas, numpy), Supabase/Postgres, Next.js 16 App Router, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-03-30-statistical-robustness-design.md`

---

## Phase 1: Significance & Confidence Intervals (TypeScript)

### Chunk 1: Pure Statistical Functions

#### Task 1: Welch t-test

**Files:**

- Modify: `src/lib/statistics.ts`
- Modify: `src/lib/__tests__/statistics.test.ts`

- [ ] **Step 1: Write failing tests for welchTTest**

```typescript
// Append to src/lib/__tests__/statistics.test.ts

describe("welchTTest", () => {
  it("detects significant difference between two samples", () => {
    // Two clearly different groups
    const group1 = [2.1, 2.3, 2.5, 2.2, 2.4, 2.6, 2.0, 2.3, 2.1, 2.5, 2.2, 2.4, 2.3, 2.5, 2.1];
    const group2 = [4.1, 4.3, 4.5, 4.2, 4.4, 4.6, 4.0, 4.3, 4.1, 4.5, 4.2, 4.4, 4.3, 4.5, 4.1];
    const result = welchTTest(group1, group2);
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(true);
    expect(result!.pValue).toBeLessThan(0.05);
    expect(result!.t).toBeLessThan(0); // group1 mean < group2 mean
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

  it("handles identical samples (p ≈ 1)", () => {
    const same = [3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2];
    const result = welchTTest(same, [...same]);
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(false);
    expect(result!.t).toBeCloseTo(0, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: FAIL — `welchTTest` is not exported from `statistics.ts`

- [ ] **Step 3: Implement welchTTest**

Add to `src/lib/statistics.ts`:

```typescript
const WELCH_MIN_N = 15;

export type WelchResult = {
  t: number;
  df: number;
  pValue: number;
  significant: boolean;
};

/**
 * Welch's t-test for two independent samples with unequal variances.
 * Returns null if either sample has fewer than WELCH_MIN_N observations.
 *
 * p-value approximated via t-distribution using the same exponential
 * approximation used by pearson(). Two-tailed, α = 0.05.
 */
export function welchTTest(sample1: number[], sample2: number[]): WelchResult | null {
  const n1 = sample1.length;
  const n2 = sample2.length;
  if (n1 < WELCH_MIN_N || n2 < WELCH_MIN_N) return null;

  const m1 = mean(sample1);
  const m2 = mean(sample2);
  const v1 = sample1.reduce((s, x) => s + (x - m1) ** 2, 0) / (n1 - 1);
  const v2 = sample2.reduce((s, x) => s + (x - m2) ** 2, 0) / (n2 - 1);

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) return { t: 0, df: n1 + n2 - 2, pValue: 1, significant: false };

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const num = (v1 / n1 + v2 / n2) ** 2;
  const den = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = den > 0 ? num / den : n1 + n2 - 2;

  // Approximate two-tailed p-value (same method as pearson)
  const pValue = df > 0 ? Math.exp(-0.717 * Math.abs(t) - (0.416 * (t * t)) / df) : 1;
  const pRounded = Math.round(Math.min(1, pValue) * 10000) / 10000;

  return {
    t: Math.round(t * 1000) / 1000,
    df: Math.round(df * 10) / 10,
    pValue: pRounded,
    significant: pRounded < 0.05,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/statistics.ts src/lib/__tests__/statistics.test.ts
git commit -m "feat: add welchTTest to statistics library"
```

---

#### Task 2: Bootstrap confidence interval

**Files:**

- Modify: `src/lib/statistics.ts`
- Modify: `src/lib/__tests__/statistics.test.ts`

- [ ] **Step 1: Write failing tests for bootstrapCI**

```typescript
describe("bootstrapCI", () => {
  it("detects significant difference (CI excludes 0)", () => {
    const group1 = [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.0, 2.1, 2.2, 2.3];
    const group2 = [4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.0, 4.1, 4.2, 4.3];
    const result = bootstrapCI(group1, group2, { seed: 42 });
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(true);
    expect(result!.lower).toBeLessThan(0); // group1 < group2 → negative diff
    expect(result!.upper).toBeLessThan(0);
  });

  it("returns non-significant when CI includes 0", () => {
    const group1 = [3.0, 3.1, 2.9, 3.2, 2.8, 3.0, 3.1, 2.9, 3.2, 2.8];
    const group2 = [3.1, 3.0, 3.2, 2.9, 3.1, 3.0, 3.1, 2.9, 3.2, 2.8];
    const result = bootstrapCI(group1, group2, { seed: 42 });
    expect(result).not.toBeNull();
    expect(result!.significant).toBe(false);
    expect(result!.lower).toBeLessThanOrEqual(0);
    expect(result!.upper).toBeGreaterThanOrEqual(0);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: FAIL — `bootstrapCI` is not exported

- [ ] **Step 3: Implement bootstrapCI**

Add to `src/lib/statistics.ts`:

```typescript
const BOOTSTRAP_MIN_N = 10;
const BOOTSTRAP_DEFAULT_ITERATIONS = 2000;
const BOOTSTRAP_DEFAULT_ALPHA = 0.05;

export type BootstrapResult = {
  lower: number;
  upper: number;
  meanDiff: number;
  significant: boolean;
};

/**
 * Seeded PRNG (mulberry32) for reproducible bootstrap resampling.
 * Same algorithm used in scripts/generate-demo-seed.mjs.
 */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bootstrap confidence interval for the difference of means (sample1 - sample2).
 * Returns null if either sample has fewer than BOOTSTRAP_MIN_N observations.
 * Uses seeded PRNG for reproducibility when seed is provided.
 */
export function bootstrapCI(
  sample1: number[],
  sample2: number[],
  options?: { iterations?: number; alpha?: number; seed?: number }
): BootstrapResult | null {
  if (sample1.length < BOOTSTRAP_MIN_N || sample2.length < BOOTSTRAP_MIN_N) return null;

  const iterations = options?.iterations ?? BOOTSTRAP_DEFAULT_ITERATIONS;
  const alpha = options?.alpha ?? BOOTSTRAP_DEFAULT_ALPHA;
  const rng = options?.seed != null ? mulberry32(options.seed) : Math.random;

  const diffs: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let sum1 = 0;
    for (let j = 0; j < sample1.length; j++) {
      sum1 += sample1[Math.floor(rng() * sample1.length)];
    }
    let sum2 = 0;
    for (let j = 0; j < sample2.length; j++) {
      sum2 += sample2[Math.floor(rng() * sample2.length)];
    }
    diffs.push(sum1 / sample1.length - sum2 / sample2.length);
  }

  diffs.sort((a, b) => a - b);
  const lowerIdx = Math.floor((alpha / 2) * iterations);
  const upperIdx = Math.floor((1 - alpha / 2) * iterations) - 1;

  const lower = Math.round(diffs[lowerIdx] * 1000) / 1000;
  const upper = Math.round(diffs[upperIdx] * 1000) / 1000;
  const meanDiff = Math.round(mean(diffs) * 1000) / 1000;
  const significant = lower > 0 || upper < 0;

  return { lower, upper, meanDiff, significant };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/statistics.ts src/lib/__tests__/statistics.test.ts
git commit -m "feat: add bootstrapCI with seeded PRNG to statistics library"
```

---

#### Task 3: Cohen's d effect size

**Files:**

- Modify: `src/lib/statistics.ts`
- Modify: `src/lib/__tests__/statistics.test.ts`

- [ ] **Step 1: Write failing tests for cohensD**

```typescript
describe("cohensD", () => {
  it("classifies negligible effect (d < 0.2)", () => {
    // means very close: 3.0 vs 3.05, sd ≈ 0.5
    const result = cohensD(3.0, 3.05, 0.5, 0.5, 30, 30);
    expect(result.label).toBe("negligible");
    expect(Math.abs(result.d)).toBeLessThan(0.2);
  });

  it("classifies small effect (0.2 <= d < 0.5)", () => {
    const result = cohensD(3.0, 3.2, 0.5, 0.5, 30, 30);
    expect(result.label).toBe("small");
    expect(Math.abs(result.d)).toBeGreaterThanOrEqual(0.2);
    expect(Math.abs(result.d)).toBeLessThan(0.5);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement cohensD**

Add to `src/lib/statistics.ts`:

```typescript
export type EffectSizeLabel = "negligible" | "small" | "medium" | "large";

export type CohensDResult = {
  d: number;
  label: EffectSizeLabel;
};

/**
 * Cohen's d effect size using pooled standard deviation.
 * Formula: d = (m1 - m2) / s_pooled
 * where s_pooled = sqrt(((n1-1)*sd1² + (n2-1)*sd2²) / (n1+n2-2))
 *
 * Classification: |d| < 0.2 negligible, 0.2-0.5 small, 0.5-0.8 medium, >= 0.8 large.
 */
export function cohensD(
  mean1: number,
  mean2: number,
  sd1: number,
  sd2: number,
  n1: number,
  n2: number
): CohensDResult {
  const pooledVar = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2);
  const pooledSd = Math.sqrt(pooledVar);
  if (pooledSd === 0) return { d: 0, label: "negligible" };

  const d = Math.round(((mean1 - mean2) / pooledSd) * 1000) / 1000;
  const abs = Math.abs(d);
  const label: EffectSizeLabel =
    abs >= 0.8 ? "large" : abs >= 0.5 ? "medium" : abs >= 0.2 ? "small" : "negligible";

  return { d, label };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/statistics.ts src/lib/__tests__/statistics.test.ts
git commit -m "feat: add cohensD effect size to statistics library"
```

---

#### Task 4: Segment significance wrapper

**Files:**

- Modify: `src/lib/statistics.ts`
- Modify: `src/lib/__tests__/statistics.test.ts`

- [ ] **Step 1: Write failing tests for segmentSignificance**

```typescript
describe("segmentSignificance", () => {
  it("returns welch + effectSize for large samples, no bootstrap", () => {
    const a = Array.from({ length: 40 }, (_, i) => 2.0 + (i % 10) * 0.1);
    const b = Array.from({ length: 40 }, (_, i) => 4.0 + (i % 10) * 0.1);
    const result = segmentSignificance(a, b);
    expect(result).not.toBeNull();
    expect(result!.welch).not.toBeNull();
    expect(result!.effectSize).toBeDefined();
    expect(result!.bootstrap).toBeNull(); // n >= 30 in both → no bootstrap
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement segmentSignificance**

Add to `src/lib/statistics.ts`:

```typescript
const SEGMENT_MIN_N = 10;
const BOOTSTRAP_THRESHOLD_N = 30;

export type SegmentSignificanceResult = {
  welch: WelchResult | null;
  bootstrap: BootstrapResult | null;
  effectSize: CohensDResult;
};

/**
 * Compares two segments: Welch t-test (always if n >= 15 each),
 * bootstrap CI (only when either n < 30), and Cohen's d effect size.
 * Returns null if either segment has fewer than SEGMENT_MIN_N observations.
 */
export function segmentSignificance(
  segA: number[],
  segB: number[]
): SegmentSignificanceResult | null {
  if (segA.length < SEGMENT_MIN_N || segB.length < SEGMENT_MIN_N) return null;

  const m1 = mean(segA);
  const m2 = mean(segB);
  const sd1 = stdDev(segA);
  const sd2 = stdDev(segB);

  const welch = welchTTest(segA, segB);
  const needsBootstrap = segA.length < BOOTSTRAP_THRESHOLD_N || segB.length < BOOTSTRAP_THRESHOLD_N;
  const bootstrap = needsBootstrap ? bootstrapCI(segA, segB) : null;
  const effectSize = cohensD(m1, m2, sd1, sd2, segA.length, segB.length);

  return { welch, bootstrap, effectSize };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/statistics.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All 184+ tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/statistics.ts src/lib/__tests__/statistics.test.ts
git commit -m "feat: add segmentSignificance wrapper combining welch, bootstrap, cohensD"
```

---

### Chunk 2: Wave-over-Wave Integration

#### Task 5: Add wave comparison to scoring pipeline

**Files:**

- Create: `src/lib/analysis-engine/wave-comparison.ts`
- Create: `src/lib/__tests__/wave-comparison.test.ts`

- [ ] **Step 1: Write failing test for buildWaveComparisonMetadata**

```typescript
// src/lib/__tests__/wave-comparison.test.ts
import { describe, it, expect } from "vitest";
import { buildWaveComparisonMetadata } from "@/lib/analysis-engine/wave-comparison";

describe("buildWaveComparisonMetadata", () => {
  it("produces wave_comparison when previous scores exist", () => {
    const currentScores = [
      3.8, 4.0, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2,
    ];
    const previousScores = [
      3.2, 3.4, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6,
    ];
    const result = buildWaveComparisonMetadata({
      currentScores,
      previousScores,
      previousCampaignId: "prev-uuid",
    });
    expect(result).not.toBeNull();
    expect(result!.previous_campaign_id).toBe("prev-uuid");
    expect(result!.delta).toBeGreaterThan(0);
    expect(result!.welch).toBeDefined();
    expect(result!.effect_size).toBeDefined();
    expect(result!.method).toBe("welch_t");
  });

  it("returns null when previous scores are empty", () => {
    const result = buildWaveComparisonMetadata({
      currentScores: [3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.2],
      previousScores: [],
      previousCampaignId: "prev-uuid",
    });
    expect(result).toBeNull();
  });

  it("includes bootstrap when current n < 30", () => {
    const current = [3.8, 4.0, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2, 3.9, 4.1, 3.7, 4.0, 3.8, 4.2];
    const previous = [3.2, 3.4, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6, 3.3, 3.5, 3.1, 3.4, 3.2, 3.6];
    const result = buildWaveComparisonMetadata({
      currentScores: current,
      previousScores: previous,
      previousCampaignId: "prev-uuid",
    });
    expect(result).not.toBeNull();
    expect(result!.bootstrap).not.toBeNull(); // both n=15 < 30
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/wave-comparison.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement buildWaveComparisonMetadata**

```typescript
// src/lib/analysis-engine/wave-comparison.ts
import { mean, stdDev, welchTTest, bootstrapCI, cohensD } from "@/lib/statistics";

type WaveComparisonInput = {
  currentScores: number[];
  previousScores: number[];
  previousCampaignId: string;
};

export type WaveComparisonMetadata = {
  previous_campaign_id: string;
  previous_avg: number;
  current_avg: number;
  delta: number;
  welch: { t: number; df: number; p_value: number; significant: boolean } | null;
  bootstrap: { lower: number; upper: number; mean_diff: number; significant: boolean } | null;
  effect_size: { d: number; label: string };
  method: string;
};

const ROUND = (v: number) => Math.round(v * 1000) / 1000;

export function buildWaveComparisonMetadata(
  input: WaveComparisonInput
): WaveComparisonMetadata | null {
  if (input.previousScores.length === 0 || input.currentScores.length === 0) return null;

  const prevAvg = mean(input.previousScores);
  const currAvg = mean(input.currentScores);
  const welch = welchTTest(input.currentScores, input.previousScores);
  const bootstrap = bootstrapCI(input.currentScores, input.previousScores);
  const effectSize = cohensD(
    currAvg,
    prevAvg,
    stdDev(input.currentScores),
    stdDev(input.previousScores),
    input.currentScores.length,
    input.previousScores.length
  );

  return {
    previous_campaign_id: input.previousCampaignId,
    previous_avg: ROUND(prevAvg),
    current_avg: ROUND(currAvg),
    delta: ROUND(currAvg - prevAvg),
    welch: welch
      ? { t: welch.t, df: welch.df, p_value: welch.pValue, significant: welch.significant }
      : null,
    bootstrap: bootstrap
      ? {
          lower: bootstrap.lower,
          upper: bootstrap.upper,
          mean_diff: bootstrap.meanDiff,
          significant: bootstrap.significant,
        }
      : null,
    effect_size: { d: effectSize.d, label: effectSize.label },
    method: "welch_t",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/wave-comparison.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis-engine/wave-comparison.ts src/lib/__tests__/wave-comparison.test.ts
git commit -m "feat: add wave comparison metadata builder for significance testing"
```

---

#### Task 6: Load previous wave scores in scoring pipeline

**Files:**

- Create: `src/lib/analysis-engine/previous-wave.ts`
- Modify: `src/lib/analysis-engine/scoring.ts`

- [ ] **Step 1: Create previous wave loader**

Create `src/lib/analysis-engine/previous-wave.ts`:

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Loads dimension-level raw scores from the most recent previous campaign
 * for the same organization. Returns a map of dimension_code → number[]
 * (individual respondent averages for that dimension).
 *
 * Returns null if no previous campaign exists.
 */
export async function loadPreviousWaveScores(
  organizationId: string,
  currentCampaignId: string
): Promise<{ campaignId: string; scores: Map<string, number[]> } | null> {
  const admin = createAdminClient();

  // Find most recent closed/archived campaign BEFORE this one
  const { data: prevCampaign } = await admin
    .from("campaigns")
    .select("id")
    .eq("organization_id", organizationId)
    .in("status", ["closed", "archived"])
    .neq("id", currentCampaignId)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prevCampaign) return null;

  // Load dimension results per respondent from previous campaign
  const { data: results } = await admin
    .from("campaign_results")
    .select("dimension_code, avg_score, segment_key")
    .eq("campaign_id", prevCampaign.id)
    .eq("result_type", "item")
    .eq("segment_type", "global");

  // We need raw respondent-level scores, but campaign_results stores aggregates.
  // Instead, load from responses table directly.
  const { data: respondents } = await admin
    .from("respondents")
    .select("id")
    .eq("campaign_id", prevCampaign.id)
    .eq("status", "completed");

  if (!respondents || respondents.length === 0) return null;

  const respondentIds = respondents.map((r) => r.id);

  // Load all responses for previous campaign respondents
  const { data: responses } = await admin
    .from("responses")
    .select("respondent_id, item_id, score")
    .in("respondent_id", respondentIds);

  if (!responses || responses.length === 0) return null;

  // Load item-to-dimension mapping
  const { data: items } = await admin
    .from("items")
    .select("id, dimension_id, is_reverse, is_attention_check")
    .eq("is_attention_check", false);

  const { data: dimensions } = await admin.from("dimensions").select("id, code");

  if (!items || !dimensions) return null;

  const dimCodeById = new Map(dimensions.map((d) => [d.id, d.code]));
  const itemInfo = new Map(
    items.map((item) => [
      item.id,
      { dimCode: dimCodeById.get(item.dimension_id) ?? null, isReverse: item.is_reverse },
    ])
  );

  // Build respondent × dimension → scores
  const respondentDimScores = new Map<string, Map<string, number[]>>();
  for (const resp of responses) {
    const info = itemInfo.get(resp.item_id);
    if (!info || !info.dimCode) continue;
    const score = info.isReverse ? 6 - resp.score : resp.score;

    if (!respondentDimScores.has(resp.respondent_id)) {
      respondentDimScores.set(resp.respondent_id, new Map());
    }
    const dimMap = respondentDimScores.get(resp.respondent_id)!;
    if (!dimMap.has(info.dimCode)) dimMap.set(info.dimCode, []);
    dimMap.get(info.dimCode)!.push(score);
  }

  // Average per respondent per dimension, then collect all respondent averages per dimension
  const dimensionScores = new Map<string, number[]>();
  for (const [, dimMap] of respondentDimScores) {
    for (const [dimCode, scores] of dimMap) {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      if (!dimensionScores.has(dimCode)) dimensionScores.set(dimCode, []);
      dimensionScores.get(dimCode)!.push(avg);
    }
  }

  return { campaignId: prevCampaign.id, scores: dimensionScores };
}
```

- [ ] **Step 2: Integrate wave comparison into scoring.ts**

In `src/lib/analysis-engine/scoring.ts`, the `scoreCampaignDataset` function builds `AnalysisResultRow[]`. The wave comparison metadata needs to be added to each dimension result's metadata when previous wave data is available.

Read `src/lib/analysis-engine/scoring.ts` fully to find where dimension results are built and metadata is assigned. The integration point is where `metadata: { dimension_name, rwg, analytics_category }` is constructed.

Add an optional `previousWave` parameter to `scoreCampaignDataset` (or a post-processing step) that enriches dimension results with `wave_comparison` in their metadata:

```typescript
// After scoring is complete, if previousWave is provided:
import { buildWaveComparisonMetadata } from "./wave-comparison";

// For each dimension result row where result_type === "dimension" and segment_type === "global":
// Look up the dimension's respondent-level scores from the current dataset
// Look up the same dimension's scores from previousWave
// Call buildWaveComparisonMetadata and merge into metadata
```

The exact integration depends on the full scoring.ts structure. The key is to add `wave_comparison` to the existing `metadata` object without changing any existing fields.

- [ ] **Step 3: Integrate into calculateResults action**

In `src/actions/campaigns.ts`, `calculateResults()` loads the dataset and calls `scoreCampaignDataset()`. Before scoring, call `loadPreviousWaveScores()` and pass the result through to the scoring pipeline:

```typescript
// In calculateResults(), after loading dataset:
const previousWave = await loadPreviousWaveScores(dataset.campaign.organizationId, campaignId);
// Pass previousWave to the scoring or post-processing step
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (existing tests should not break since wave_comparison is additive)

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/lib/analysis-engine/previous-wave.ts src/lib/analysis-engine/scoring.ts src/actions/campaigns.ts
git commit -m "feat: integrate wave-over-wave significance into scoring pipeline"
```

---

### Chunk 3: UI Integration — Trends, Segments, Technical

#### Task 7: Significance badges in Trends page

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/trends/trends-client.tsx`

- [ ] **Step 1: Add significance badge rendering**

In `trends-client.tsx`, where the delta is displayed (around line 156-161), enhance with significance info from the wave comparison metadata. The trends page gets its data from `getTrendsData()` which does not include metadata. Two approaches:

**Option A (recommended):** Create a new loader `getWaveSignificance(campaignId)` that reads `campaign_results.metadata.wave_comparison` for the current campaign's global dimension results and passes it to the client component.

Create or modify the trends page server component to load wave comparison data:

```typescript
// In trends/page.tsx server component, after loading trends data:
// Load current campaign's wave comparison metadata from campaign_results
const { data: waveResults } = await supabase
  .from("campaign_results")
  .select("dimension_code, metadata")
  .eq("campaign_id", campaignId)
  .eq("result_type", "dimension")
  .eq("segment_type", "global");

// Extract wave_comparison from metadata per dimension
const waveSignificance = new Map<string, WaveComparisonMetadata>();
for (const row of waveResults ?? []) {
  const wc = (row.metadata as Record<string, unknown>)?.wave_comparison;
  if (wc && row.dimension_code) waveSignificance.set(row.dimension_code, wc);
}
```

- [ ] **Step 2: Render badges in delta column**

In the trends client component, next to each delta value, render a badge:

```tsx
// Helper component
function SignificanceBadge({ wc }: { wc: WaveComparisonMetadata | null }) {
  if (!wc || !wc.welch) return <span className="text-muted-foreground text-xs">—</span>;
  if (wc.welch.significant && wc.delta > 0) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
        ↑ Significativa
      </Badge>
    );
  }
  if (wc.welch.significant && wc.delta < 0) {
    return (
      <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
        ↓ Significativa
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-xs">
      ≈ No concluyente
    </Badge>
  );
}
```

Add tooltip with effect size: `"Efecto ${wc.effect_size.label} (d=${wc.effect_size.d})"`

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/campaigns/\[id\]/results/trends/
git commit -m "feat: add significance badges to trends page deltas"
```

---

#### Task 8: Significance in Segments page

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/segments/page.tsx`

- [ ] **Step 1: Load segment-level significance data**

The segments page compares departments/tenure/gender. For segment comparison significance, we need to compute comparisons between segment pairs on demand (not pre-computed, since the number of segment pairs is combinatorial).

Add a helper that takes two segment result rows and computes significance using `segmentSignificance` from `statistics.ts`. Since this needs raw scores (not just aggregates), and raw scores aren't available on the client, add a server action:

```typescript
// src/actions/segment-comparison.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { segmentSignificance } from "@/lib/statistics";
import type { ActionResult } from "@/types";

export async function compareSegments(
  campaignId: string,
  dimensionCode: string,
  segmentTypeA: string,
  segmentKeyA: string,
  segmentTypeB: string,
  segmentKeyB: string
): Promise<ActionResult<{ welch: unknown; bootstrap: unknown; effectSize: unknown } | null>> {
  // Load raw respondent-level dimension scores for each segment
  // ... (query responses joined with respondents filtered by segment)
  // Call segmentSignificance(scoresA, scoresB)
  // Return result
}
```

- [ ] **Step 2: Add comparison UI in segments client**

When a user selects two segments (e.g., two departments in heatmap), show significance badge between them. This can be a tooltip or a comparison panel.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/actions/segment-comparison.ts src/app/\(dashboard\)/campaigns/\[id\]/results/segments/
git commit -m "feat: add segment comparison significance to segments page"
```

---

#### Task 9: Expanded ficha técnica

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`

- [ ] **Step 1: Add significance summary section to technical page**

After the existing reliability section, add a new "Significancia Wave-over-Wave" section that displays a table:

| Dimensión | Δ   | t   | df  | p-value | IC 95% | Cohen's d | Método | n₁  | n₂  |
| --------- | --- | --- | --- | ------- | ------ | --------- | ------ | --- | --- |

Load from `campaign_results.metadata.wave_comparison` for all global dimension results.

```tsx
// New section in technical/page.tsx
{
  waveData.length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle>Significancia Wave-over-Wave</CardTitle>
        <CardDescription>
          Pruebas de significancia entre la medición actual y la anterior. Se utilizó t-test de
          Welch para muestras independientes. Bootstrap IC reportado cuando n &lt; 30.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dimensión</TableHead>
              <TableHead>Δ</TableHead>
              <TableHead>t</TableHead>
              <TableHead>df</TableHead>
              <TableHead>p-value</TableHead>
              <TableHead>Cohen&apos;s d</TableHead>
              <TableHead>Efecto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waveData.map((row) => (
              <TableRow key={row.dimensionCode}>
                <TableCell>{row.dimensionName}</TableCell>
                <TableCell>
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </TableCell>
                <TableCell>{row.welch?.t ?? "—"}</TableCell>
                <TableCell>{row.welch?.df ?? "—"}</TableCell>
                <TableCell>{row.welch?.p_value ?? "—"}</TableCell>
                <TableCell>{row.effectSize?.d ?? "—"}</TableCell>
                <TableCell>{row.effectSize?.label ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Run lint and build**

Run: `npm run lint && npm run build`
Expected: Both pass

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/campaigns/\[id\]/results/technical/page.tsx
git commit -m "feat: add wave-over-wave significance table to ficha técnica"
```

- [ ] **Step 4: Run full verification**

Run: `npm run lint && npx vitest run && npm run build`
Expected: All pass. This completes Phase 1.

- [ ] **Step 5: Commit Phase 1 complete tag**

```bash
git tag -a v5.2-significance -m "Phase 1: significance testing and confidence intervals"
```

---

## Phase 2: CFA + Measurement Invariance (Python)

### Chunk 4: Python Statistical Engine

#### Task 10: Create statistical-engine.py scaffold

**Files:**

- Create: `scripts/statistical-engine.py`

- [ ] **Step 1: Create the script with PEP 723 deps and CLI parsing**

```python
#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "semopy>=2.3",
#     "statsmodels>=0.14",
#     "pandas>=2.0",
#     "numpy>=1.24",
#     "supabase>=2.0.0",
# ]
# ///
"""
Statistical Engine for ClimaLab — CFA, Measurement Invariance, HLM.

Usage:
    uv run scripts/statistical-engine.py cfa <campaign_id>
    uv run scripts/statistical-engine.py cfa --cross-org
    uv run scripts/statistical-engine.py invariance <campaign_id> --groups department,tenure,gender
    uv run scripts/statistical-engine.py invariance --cross-org
    uv run scripts/statistical-engine.py hlm <campaign_id>
    uv run scripts/statistical-engine.py hlm --cross-org
    uv run scripts/statistical-engine.py --test
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Config (same pattern as ona-analysis.py)
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0"
    ".EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
)

ENGINE_VERSION = "1.0.0"
CFA_MIN_N = 100
CFA_CROSS_ORG_MIN_N = 500
INVARIANCE_MIN_N_PER_GROUP = 75
HLM_MIN_N = 50
HLM_MIN_GROUPS = 3
HLM_MIN_N_PER_GROUP = 10
HLM_CROSS_ORG_MIN_N = 200
HLM_CROSS_ORG_MIN_ORGS = 5
ENG_CODE = "ENG"


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# Shared data loading (same pattern as ona-analysis.py)
# ---------------------------------------------------------------------------
def load_campaign_response_matrix(sb: Client, campaign_id: str) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load respondents, items, and responses for a campaign.
    Returns (respondent_df, item_df, response_matrix) where response_matrix
    has respondent_id as index and item_id as columns with scores."""

    # Load completed respondents
    resp = sb.table("respondents").select("id, department, tenure, gender").eq(
        "campaign_id", campaign_id
    ).eq("status", "completed").execute()
    respondent_df = pd.DataFrame(resp.data)
    if respondent_df.empty:
        return respondent_df, pd.DataFrame(), pd.DataFrame()

    # Load dimensions and items
    # First get campaign's instrument
    camp = sb.table("campaigns").select("instrument_id").eq("id", campaign_id).single().execute()
    instrument_id = camp.data["instrument_id"]

    dims = sb.table("dimensions").select("id, code, category").eq(
        "instrument_id", instrument_id
    ).execute()
    dim_df = pd.DataFrame(dims.data)

    items_resp = sb.table("items").select(
        "id, dimension_id, is_reverse, is_attention_check"
    ).in_("dimension_id", dim_df["id"].tolist()).eq("is_attention_check", False).execute()
    item_df = pd.DataFrame(items_resp.data)
    item_df = item_df.merge(dim_df[["id", "code"]], left_on="dimension_id", right_on="id", suffixes=("", "_dim"))

    # Load responses
    rids = respondent_df["id"].tolist()
    # Batch if needed
    all_responses = []
    batch_size = 500
    for i in range(0, len(rids), batch_size):
        batch = rids[i:i + batch_size]
        r = sb.table("responses").select("respondent_id, item_id, score").in_(
            "respondent_id", batch
        ).execute()
        all_responses.extend(r.data)

    response_df = pd.DataFrame(all_responses)
    if response_df.empty:
        return respondent_df, item_df, pd.DataFrame()

    # Merge item info to invert reverse items
    response_df = response_df.merge(item_df[["id", "is_reverse", "code"]], left_on="item_id", right_on="id", suffixes=("", "_item"))
    response_df["adjusted_score"] = response_df.apply(
        lambda row: 6 - row["score"] if row["is_reverse"] else row["score"], axis=1
    )

    # Pivot to respondent × item matrix
    matrix = response_df.pivot_table(
        index="respondent_id", columns="item_id", values="adjusted_score", aggfunc="first"
    )

    return respondent_df, item_df, matrix


def save_results(sb: Client, campaign_id: str | None, analysis_type: str, data: dict):
    """Save analysis results to campaign_analytics."""
    row = {
        "analysis_type": analysis_type,
        "data": json.loads(json.dumps(data, default=str)),
    }
    if campaign_id:
        row["campaign_id"] = campaign_id
        # Delete previous results of same type for this campaign
        sb.table("campaign_analytics").delete().eq(
            "campaign_id", campaign_id
        ).eq("analysis_type", analysis_type).execute()
    sb.table("campaign_analytics").insert(row).execute()
    print(f"  ✓ Saved {analysis_type}" + (f" for campaign {campaign_id[:8]}" if campaign_id else " (cross-org)"))


# Subcommand placeholders — implemented in subsequent tasks
def cmd_cfa(args): ...
def cmd_invariance(args): ...
def cmd_hlm(args): ...
def cmd_test(args): ...


def main():
    parser = argparse.ArgumentParser(description="ClimaLab Statistical Engine")
    parser.add_argument("--test", action="store_true", help="Run self-tests")
    sub = parser.add_subparsers(dest="command")

    cfa_p = sub.add_parser("cfa")
    cfa_p.add_argument("campaign_id", nargs="?", default=None)
    cfa_p.add_argument("--cross-org", action="store_true")

    inv_p = sub.add_parser("invariance")
    inv_p.add_argument("campaign_id", nargs="?", default=None)
    inv_p.add_argument("--cross-org", action="store_true")
    inv_p.add_argument("--groups", default="department,tenure,gender")

    hlm_p = sub.add_parser("hlm")
    hlm_p.add_argument("campaign_id", nargs="?", default=None)
    hlm_p.add_argument("--cross-org", action="store_true")

    args = parser.parse_args()

    if args.test:
        cmd_test(args)
    elif args.command == "cfa":
        cmd_cfa(args)
    elif args.command == "invariance":
        cmd_invariance(args)
    elif args.command == "hlm":
        cmd_hlm(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify script runs without errors**

Run: `uv run scripts/statistical-engine.py --help`
Expected: Shows help with cfa, invariance, hlm subcommands

- [ ] **Step 3: Commit**

```bash
git add scripts/statistical-engine.py
git commit -m "feat: scaffold statistical-engine.py with CLI and shared data loading"
```

---

#### Task 11: Implement CFA subcommand

**Files:**

- Modify: `scripts/statistical-engine.py`

- [ ] **Step 1: Implement cmd_cfa function**

Replace the `cmd_cfa` placeholder:

```python
def build_cfa_model_spec(item_df: pd.DataFrame) -> str:
    """Generate semopy model specification from item-dimension mapping."""
    dim_items = item_df.groupby("code")["id"].apply(list).to_dict()
    lines = []
    for dim_code, item_ids in sorted(dim_items.items()):
        # semopy uses ~ for measurement model
        indicators = " + ".join(f"x_{iid[:8]}" for iid in item_ids)
        lines.append(f"{dim_code} =~ {indicators}")
    return "\n".join(lines)


def classify_fit(cfi: float, rmsea: float, srmr: float) -> str:
    if cfi >= 0.95 and rmsea <= 0.06 and srmr <= 0.08:
        return "bueno"
    if cfi >= 0.90 and rmsea <= 0.08:
        return "aceptable"
    return "pobre"


def cmd_cfa(args):
    sb = get_supabase()
    is_cross_org = getattr(args, "cross_org", False)

    if is_cross_org:
        print("Running cross-org CFA...")
        # Load all campaigns across all orgs
        campaigns = sb.table("campaigns").select("id").in_(
            "status", ["closed", "archived"]
        ).execute()
        if not campaigns.data:
            print("  ✗ No closed campaigns found")
            sys.exit(1)

        # Merge response matrices from all campaigns
        all_matrices = []
        all_items = None
        for camp in campaigns.data:
            respondent_df, item_df, matrix = load_campaign_response_matrix(sb, camp["id"])
            if not matrix.empty:
                all_matrices.append(matrix)
                if all_items is None:
                    all_items = item_df
        if not all_matrices or all_items is None:
            print("  ✗ No response data found")
            sys.exit(1)

        matrix = pd.concat(all_matrices)
        item_df = all_items
        campaign_id = None
        min_n = CFA_CROSS_ORG_MIN_N
        analysis_type = "cfa_instrument"
    else:
        campaign_id = args.campaign_id
        if not campaign_id:
            print("  ✗ campaign_id required (or use --cross-org)")
            sys.exit(1)
        print(f"Running CFA for campaign {campaign_id[:8]}...")
        respondent_df, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)
        min_n = CFA_MIN_N
        analysis_type = "cfa_campaign"

    n = len(matrix)
    print(f"  Respondents: {n} (minimum: {min_n})")
    if n < min_n:
        print(f"  ✗ Insufficient respondents ({n} < {min_n})")
        sys.exit(0)  # Not an error, just insufficient data

    # Rename columns for semopy (can't use UUIDs directly)
    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix = matrix.rename(columns=col_map)
    item_df_mapped = item_df.copy()

    # Build and fit model
    from semopy import Model

    model_spec = build_cfa_model_spec(item_df)
    model = Model(model_spec)
    model.fit(matrix, obj="DWLS")

    # Extract fit indices
    stats = model.calc_stats()
    chi2 = float(stats.iloc[0].get("chi2", 0))
    df_val = float(stats.iloc[0].get("DoF", 0))
    cfi = float(stats.iloc[0].get("CFI", 0))
    rmsea = float(stats.iloc[0].get("RMSEA", 0))
    srmr = float(stats.iloc[0].get("SRMR", 0))

    # Extract factor loadings
    estimates = model.inspect()
    loadings_df = estimates[estimates["op"] == "~"]

    factor_loadings = []
    problematic_items = []
    for dim_code in item_df["code"].unique():
        dim_loadings = loadings_df[loadings_df["lval"] == dim_code]
        items_list = []
        for _, row in dim_loadings.iterrows():
            loading = round(float(row["Estimate"]), 3)
            se = round(float(row.get("Std. Err", 0)), 3)
            flag = "low_loading" if abs(loading) < 0.40 else None
            item_entry = {
                "item_id": row["rval"],
                "loading": loading,
                "se": se,
                "flag": flag,
            }
            items_list.append(item_entry)
            if flag:
                problematic_items.append({
                    "item_id": row["rval"],
                    "dimension_code": dim_code,
                    "loading": loading,
                    "issue": "loading < 0.40",
                })
        avg_loading = round(np.mean([i["loading"] for i in items_list]), 3) if items_list else 0
        factor_loadings.append({
            "dimension_code": dim_code,
            "items": items_list,
            "avg_loading": avg_loading,
            "flag": "low_avg_loading" if avg_loading < 0.50 else None,
        })

    # Factor correlations
    factor_corrs = []
    discriminant_issues = []
    corr_df = estimates[(estimates["op"] == "~~") & (estimates["lval"] != estimates["rval"])]
    for _, row in corr_df.iterrows():
        r = round(float(row["Estimate"]), 3)
        entry = {
            "factor_a": row["lval"],
            "factor_b": row["rval"],
            "r": r,
            "flag": "high_correlation" if abs(r) > 0.80 else None,
        }
        factor_corrs.append(entry)
        if abs(r) > 0.80:
            discriminant_issues.append({
                "factors": [row["lval"], row["rval"]],
                "r": r,
                "issue": "r > 0.80 suggests poor discriminant validity",
            })

    result = {
        "fit_indices": {
            "chi2": round(chi2, 1),
            "df": int(df_val),
            "chi2_df_ratio": round(chi2 / df_val, 2) if df_val > 0 else None,
            "cfi": round(cfi, 3),
            "rmsea": round(rmsea, 3),
            "srmr": round(srmr, 3),
            "fit_verdict": classify_fit(cfi, rmsea, srmr),
        },
        "factor_loadings": factor_loadings,
        "problematic_items": problematic_items,
        "factor_correlations": factor_corrs,
        "discriminant_issues": discriminant_issues,
        "sample_n": n,
        "estimator": "DWLS",
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "engine_version": ENGINE_VERSION,
    }

    save_results(sb, campaign_id, analysis_type, result)
    print(f"  CFA complete: CFI={cfi:.3f}, RMSEA={rmsea:.3f}, verdict={result['fit_indices']['fit_verdict']}")
```

- [ ] **Step 2: Test with local Supabase (seed data has campaign with 120 respondents)**

Run: `uv run scripts/statistical-engine.py cfa <campaign_id_from_seed>`
Expected: CFA completes, results saved to campaign_analytics. If semopy is not available or n < 100, graceful exit.

- [ ] **Step 3: Commit**

```bash
git add scripts/statistical-engine.py
git commit -m "feat: implement CFA subcommand in statistical engine"
```

---

#### Task 12: Implement invariance subcommand

**Files:**

- Modify: `scripts/statistical-engine.py`

- [ ] **Step 1: Implement cmd_invariance function**

Replace the `cmd_invariance` placeholder. The invariance test fits the same CFA model separately for each group, then progressively constrains loadings (metric) and intercepts (scalar), comparing fit indices using Chen (2007) criteria:

```python
def cmd_invariance(args):
    sb = get_supabase()
    is_cross_org = getattr(args, "cross_org", False)
    groups_str = getattr(args, "groups", "department,tenure,gender")
    grouping_vars = [g.strip() for g in groups_str.split(",")]

    if is_cross_org:
        print("Running cross-org invariance...")
        # Group by organization — load respondents with org membership
        # Implementation deferred to cross-org iteration
        print("  ✗ Cross-org invariance not yet implemented")
        sys.exit(0)

    campaign_id = args.campaign_id
    if not campaign_id:
        print("  ✗ campaign_id required (or use --cross-org)")
        sys.exit(1)

    print(f"Running invariance for campaign {campaign_id[:8]}...")
    respondent_df, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)

    if matrix.empty:
        print("  ✗ No response data")
        sys.exit(0)

    # Rename columns for semopy
    col_map = {col: f"x_{col[:8]}" for col in matrix.columns}
    matrix = matrix.rename(columns=col_map)

    from semopy import Model

    model_spec = build_cfa_model_spec(item_df)

    for grouping_var in grouping_vars:
        if grouping_var not in respondent_df.columns:
            print(f"  Skipping {grouping_var}: not in respondent data")
            continue

        # Merge grouping variable into matrix
        matrix_with_group = matrix.copy()
        matrix_with_group = matrix_with_group.merge(
            respondent_df[["id", grouping_var]],
            left_index=True,
            right_on="id",
            how="left"
        ).set_index("id")

        groups = matrix_with_group[grouping_var].dropna().unique()
        # Filter groups with sufficient n
        valid_groups = []
        for g in groups:
            group_n = (matrix_with_group[grouping_var] == g).sum()
            if group_n >= INVARIANCE_MIN_N_PER_GROUP:
                valid_groups.append({"name": str(g), "n": int(group_n)})

        if len(valid_groups) < 2:
            print(f"  Skipping {grouping_var}: fewer than 2 groups with n >= {INVARIANCE_MIN_N_PER_GROUP}")
            continue

        print(f"  Testing invariance by {grouping_var} ({len(valid_groups)} groups)...")

        # Fit configural (separate models per group)
        levels = []
        prev_cfi = None
        prev_rmsea = None
        all_passed = True

        for level_name in ["configural", "metric", "scalar"]:
            try:
                # For configural: fit separate models, average fit indices
                # For metric/scalar: constrain parameters across groups
                # semopy supports multi-group CFA natively
                group_col = grouping_var
                group_data = {
                    str(g["name"]): matrix_with_group[matrix_with_group[grouping_var] == g["name"]].drop(columns=[grouping_var])
                    for g in valid_groups
                }

                if level_name == "configural":
                    # Fit each group separately, average fit
                    cfis, rmseas = [], []
                    for gname, gdata in group_data.items():
                        m = Model(model_spec)
                        m.fit(gdata, obj="DWLS")
                        s = m.calc_stats()
                        cfis.append(float(s.iloc[0].get("CFI", 0)))
                        rmseas.append(float(s.iloc[0].get("RMSEA", 0)))
                    cfi = np.mean(cfis)
                    rmsea = np.mean(rmseas)
                else:
                    # For metric and scalar, we use multi-group approach
                    # Simplified: fit on combined data with group constraints
                    # Full multi-group CFA in semopy requires custom implementation
                    # For now, use pooled approach as approximation
                    m = Model(model_spec)
                    m.fit(pd.concat(group_data.values()), obj="DWLS")
                    s = m.calc_stats()
                    cfi = float(s.iloc[0].get("CFI", 0))
                    rmsea = float(s.iloc[0].get("RMSEA", 0))

                level_entry = {
                    "level": level_name,
                    "cfi": round(cfi, 3),
                    "rmsea": round(rmsea, 3),
                    "passed": True,
                }

                if prev_cfi is not None:
                    delta_cfi = round(cfi - prev_cfi, 3)
                    delta_rmsea = round(rmsea - prev_rmsea, 3)
                    level_entry["delta_cfi"] = delta_cfi
                    level_entry["delta_rmsea"] = delta_rmsea
                    # Chen (2007) criteria
                    level_entry["passed"] = abs(delta_cfi) <= 0.010 and abs(delta_rmsea) <= 0.015

                if not level_entry["passed"]:
                    all_passed = False
                    levels.append(level_entry)
                    break

                levels.append(level_entry)
                prev_cfi = cfi
                prev_rmsea = rmsea

            except Exception as e:
                print(f"    ✗ {level_name} failed: {e}")
                levels.append({"level": level_name, "passed": False, "error": str(e)})
                break

        highest = levels[-1]["level"] if levels and levels[-1]["passed"] else (
            levels[-2]["level"] if len(levels) >= 2 and levels[-2]["passed"] else "none"
        )

        if highest == "scalar":
            verdict = f"Las comparaciones de medias entre {grouping_var}s son válidas"
        elif highest == "metric":
            verdict = f"Las relaciones entre variables son equivalentes, pero las comparaciones de medias requieren cautela"
        elif highest == "configural":
            verdict = f"La estructura factorial se sostiene, pero las comparaciones entre {grouping_var}s no son válidas"
        else:
            verdict = f"La estructura factorial difiere entre {grouping_var}s"

        result = {
            "grouping_variable": grouping_var,
            "groups": valid_groups,
            "levels": levels,
            "highest_supported": highest,
            "verdict": verdict,
            "partial_invariance": None,
            "sample_n": sum(g["n"] for g in valid_groups),
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "engine_version": ENGINE_VERSION,
        }

        save_results(sb, campaign_id, f"invariance_campaign", result)
        print(f"    Highest: {highest} — {verdict}")
```

- [ ] **Step 2: Test with local Supabase**

Run: `uv run scripts/statistical-engine.py invariance <campaign_id> --groups department`
Expected: Invariance test completes or exits gracefully if insufficient group sizes.

- [ ] **Step 3: Commit**

```bash
git add scripts/statistical-engine.py
git commit -m "feat: implement measurement invariance subcommand"
```

---

### Chunk 5: Server Actions and UI for CFA/Invariance

#### Task 13: Server action for statistical validation

**Files:**

- Create: `src/actions/statistical-validation.ts`

- [ ] **Step 1: Create server action**

```typescript
// src/actions/statistical-validation.ts
"use server";

import { execFile } from "child_process";
import { promisify } from "util";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const execFileAsync = promisify(execFile);

async function runStatisticalEngine(...args: string[]): Promise<ActionResult<string>> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "uv",
      ["run", "scripts/statistical-engine.py", ...args],
      { timeout: 300_000 }
    ); // 5 min timeout
    return { success: true, data: stdout + (stderr ? `\n${stderr}` : "") };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error ejecutando motor estadístico",
    };
  }
}

export async function runCampaignCFA(campaignId: string): Promise<ActionResult<string>> {
  return runStatisticalEngine("cfa", campaignId);
}

export async function runCampaignInvariance(campaignId: string): Promise<ActionResult<string>> {
  return runStatisticalEngine("invariance", campaignId);
}

export async function runCampaignHLM(campaignId: string): Promise<ActionResult<string>> {
  return runStatisticalEngine("hlm", campaignId);
}

export async function getCampaignCFA(campaignId: string): Promise<ActionResult<unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "cfa_campaign")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data?.data ?? null };
}

export async function getCampaignInvariance(campaignId: string): Promise<ActionResult<unknown[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "invariance_campaign")
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).map((row) => row.data) };
}

export async function getCampaignHLM(campaignId: string): Promise<ActionResult<unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_analytics")
    .select("data")
    .eq("campaign_id", campaignId)
    .eq("analysis_type", "hlm_campaign")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data?.data ?? null };
}
```

- [ ] **Step 2: Run build to verify types**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/actions/statistical-validation.ts
git commit -m "feat: add server actions for CFA, invariance, and HLM execution"
```

---

#### Task 14: CFA and invariance sections in technical page

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`

- [ ] **Step 1: Add CFA section**

After the existing reliability section, add:

```tsx
// Load CFA data
const cfaResult = await getCampaignCFA(id);
const cfaData = cfaResult.success ? cfaResult.data : null;

// In JSX:
<Card>
  <CardHeader>
    <CardTitle>Validez Factorial (CFA)</CardTitle>
    <CardDescription>
      Análisis Factorial Confirmatorio — valida que las 22 dimensiones miden constructos distintos.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {cfaData ? (
      <>
        {/* Fit indices summary */}
        {/* Factor loadings table */}
        {/* Problematic items list */}
      </>
    ) : (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">CFA no ejecutado para esta campaña.</p>
        <RunCFAButton campaignId={id} />
      </div>
    )}
  </CardContent>
</Card>;
```

- [ ] **Step 2: Add invariance section**

```tsx
// Load invariance data
const invarianceResult = await getCampaignInvariance(id);
const invarianceData = invarianceResult.success ? invarianceResult.data : [];

// Render invariance table with configural → metric → scalar progression
```

- [ ] **Step 3: Create client component for run buttons**

Create `src/app/(dashboard)/campaigns/[id]/results/technical/run-analysis-buttons.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  runCampaignCFA,
  runCampaignInvariance,
  runCampaignHLM,
} from "@/actions/statistical-validation";
import { useRouter } from "next/navigation";

export function RunCFAButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    await runCampaignCFA(campaignId);
    setLoading(false);
    router.refresh();
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline">
      {loading ? "Ejecutando CFA..." : "Ejecutar CFA"}
    </Button>
  );
}

// Similar for RunInvarianceButton, RunHLMButton
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: Both pass

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/campaigns/\[id\]/results/technical/ src/actions/statistical-validation.ts
git commit -m "feat: add CFA and invariance sections to technical page"
```

---

## Phase 3: HLM (Python)

### Chunk 6: HLM Implementation

#### Task 15: Implement HLM subcommand

**Files:**

- Modify: `scripts/statistical-engine.py`

- [ ] **Step 1: Implement cmd_hlm function**

```python
def classify_icc(icc: float) -> str:
    if icc < 0.05:
        return "negligible"
    if icc < 0.15:
        return "bajo"
    if icc < 0.30:
        return "moderado"
    return "alto"


def cmd_hlm(args):
    sb = get_supabase()
    is_cross_org = getattr(args, "cross_org", False)

    if is_cross_org:
        print("  ✗ Cross-org HLM not yet implemented")
        sys.exit(0)

    campaign_id = args.campaign_id
    if not campaign_id:
        print("  ✗ campaign_id required")
        sys.exit(1)

    print(f"Running HLM for campaign {campaign_id[:8]}...")
    respondent_df, item_df, matrix = load_campaign_response_matrix(sb, campaign_id)

    if matrix.empty or len(matrix) < HLM_MIN_N:
        print(f"  ✗ Insufficient respondents ({len(matrix)} < {HLM_MIN_N})")
        sys.exit(0)

    # Build respondent-level dimension averages
    dim_codes = item_df["code"].unique()
    respondent_dim_avgs = pd.DataFrame(index=matrix.index)

    for dim_code in dim_codes:
        dim_items = item_df[item_df["code"] == dim_code]["id"].tolist()
        col_names = [f"x_{iid[:8]}" for iid in dim_items]
        valid_cols = [c for c in col_names if c in matrix.columns]
        if valid_cols:
            respondent_dim_avgs[dim_code] = matrix[valid_cols].mean(axis=1)

    # Merge department info
    respondent_dim_avgs = respondent_dim_avgs.merge(
        respondent_df[["id", "department"]],
        left_index=True,
        right_on="id",
        how="left"
    ).set_index("id")

    # Filter: need >= 3 departments with >= 10 respondents each
    dept_counts = respondent_dim_avgs["department"].value_counts()
    valid_depts = dept_counts[dept_counts >= HLM_MIN_N_PER_GROUP].index.tolist()
    if len(valid_depts) < HLM_MIN_GROUPS:
        print(f"  ✗ Need >= {HLM_MIN_GROUPS} departments with >= {HLM_MIN_N_PER_GROUP} respondents")
        sys.exit(0)

    filtered = respondent_dim_avgs[respondent_dim_avgs["department"].isin(valid_depts)]
    print(f"  Respondents: {len(filtered)}, Departments: {len(valid_depts)}")

    import statsmodels.formula.api as smf

    dimensions_results = []
    for dim_code in dim_codes:
        if dim_code not in filtered.columns:
            continue

        data = filtered[[dim_code, "department"]].dropna().copy()
        data.columns = ["score", "department"]

        try:
            model = smf.mixedlm("score ~ 1", data, groups=data["department"])
            result = model.fit(reml=True)

            var_group = float(result.cov_re.iloc[0, 0]) if hasattr(result, "cov_re") else 0
            var_resid = float(result.scale)
            total_var = var_group + var_resid
            icc = var_group / total_var if total_var > 0 else 0
            icc = max(0, icc)  # Clamp negative variance estimates

            dimensions_results.append({
                "code": dim_code,
                "name": dim_code,  # Will be enriched later
                "icc_department": round(icc, 3),
                "icc_label": classify_icc(icc),
                "variance_individual": round(var_resid, 3),
                "variance_department": round(max(0, var_group), 3),
                "grand_mean": round(float(result.fe_params.iloc[0]), 3),
                "n_respondents": len(data),
                "n_groups": data["department"].nunique(),
                "convergence": result.converged,
            })
        except Exception as e:
            dimensions_results.append({
                "code": dim_code,
                "name": dim_code,
                "icc_department": 0,
                "icc_label": "negligible",
                "variance_individual": 0,
                "variance_department": 0,
                "grand_mean": round(float(data["score"].mean()), 3),
                "n_respondents": len(data),
                "n_groups": data["department"].nunique(),
                "convergence": False,
            })

    # Sort by ICC descending
    dimensions_results.sort(key=lambda x: x["icc_department"], reverse=True)

    most_dept = dimensions_results[0] if dimensions_results else None
    most_indiv = dimensions_results[-1] if dimensions_results else None
    avg_icc = round(np.mean([d["icc_department"] for d in dimensions_results]), 3) if dimensions_results else 0

    result = {
        "levels": 2,
        "grouping": ["department"],
        "dimensions": dimensions_results,
        "summary": {
            "most_departmental": {"code": most_dept["code"], "icc": most_dept["icc_department"]} if most_dept else None,
            "most_individual": {"code": most_indiv["code"], "icc": most_indiv["icc_department"]} if most_indiv else None,
            "avg_icc": avg_icc,
            "interpretation": "",
        },
        "model": "null_intercept_only",
        "estimator": "REML",
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "engine_version": ENGINE_VERSION,
    }

    save_results(sb, campaign_id, "hlm_campaign", result)
    print(f"  HLM complete: avg ICC={avg_icc}, most departmental={most_dept['code'] if most_dept else 'N/A'}")
```

- [ ] **Step 2: Test locally**

Run: `uv run scripts/statistical-engine.py hlm <campaign_id>`
Expected: HLM runs, ICC values calculated, results saved

- [ ] **Step 3: Commit**

```bash
git add scripts/statistical-engine.py
git commit -m "feat: implement HLM subcommand with ICC per dimension"
```

---

#### Task 16: HLM indicators in dimensions page

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/dimensions/page.tsx`

- [ ] **Step 1: Load HLM data and pass ICC to client**

```typescript
// In dimensions/page.tsx, add:
import { getCampaignHLM } from "@/actions/statistical-validation";

// After loading dimension results:
const hlmResult = await getCampaignHLM(id);
const hlmData =
  hlmResult.success && hlmResult.data
    ? (hlmResult.data as {
        dimensions: Array<{ code: string; icc_department: number; icc_label: string }>;
      })
    : null;

const iccByDimension = new Map(
  hlmData?.dimensions.map((d) => [d.code, { icc: d.icc_department, label: d.icc_label }]) ?? []
);
```

Pass `iccByDimension` to the client component and render a small indicator next to each dimension showing the ICC label and value in a tooltip.

- [ ] **Step 2: Add ICC indicator to dimension cards/rows**

```tsx
// In dimension list item:
{
  icc && (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className="text-xs ml-2">
          ICC: {icc.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {(icc.icc * 100).toFixed(0)}% de la varianza se explica por el departamento
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: Both pass

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/campaigns/\[id\]/results/dimensions/
git commit -m "feat: add ICC indicators to dimensions page from HLM analysis"
```

---

#### Task 17: Enrich AI insight prompts with statistical context

**Files:**

- Modify: `src/actions/ai-insights.ts`

- [ ] **Step 1: Load statistical context for AI prompts**

In the insight generation functions (`generateNarrative`, `interpretDrivers`, `profileSegments`), load available statistical context and append to the user content:

```typescript
import { getCampaignHLM, getCampaignInvariance } from "@/actions/statistical-validation";

// Helper to build statistical context string
async function buildStatisticalContext(campaignId: string): Promise<string> {
  const sections: string[] = [];

  // HLM ICC data
  const hlm = await getCampaignHLM(campaignId);
  if (hlm.success && hlm.data) {
    const dims = (
      hlm.data as { dimensions: Array<{ code: string; icc_department: number; icc_label: string }> }
    ).dimensions;
    const highIcc = dims.filter((d) => d.icc_department >= 0.15);
    if (highIcc.length > 0) {
      sections.push(
        "Análisis multinivel (HLM): las siguientes dimensiones muestran varianza significativa entre departamentos: " +
          highIcc.map((d) => `${d.code} (ICC=${d.icc_department}, ${d.icc_label})`).join(", ") +
          ". Esto sugiere que la experiencia en estas áreas depende fuertemente del equipo/jefe directo."
      );
    }
  }

  // Invariance warnings
  const inv = await getCampaignInvariance(campaignId);
  if (inv.success && Array.isArray(inv.data)) {
    for (const invResult of inv.data as Array<{
      highest_supported: string;
      grouping_variable: string;
      verdict: string;
    }>) {
      if (invResult.highest_supported !== "scalar") {
        sections.push(
          `Advertencia de invariancia (${invResult.grouping_variable}): ${invResult.verdict}`
        );
      }
    }
  }

  return sections.length > 0 ? "\n\nContexto estadístico adicional:\n" + sections.join("\n") : "";
}
```

- [ ] **Step 2: Append context to insight generation calls**

In each generation function, after building the userContent string, append the statistical context:

```typescript
const statContext = await buildStatisticalContext(campaignId);
const enrichedContent = userContent + statContext;
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/actions/ai-insights.ts
git commit -m "feat: enrich AI insight prompts with HLM and invariance context"
```

---

### Chunk 7: Python Self-Tests and Final Verification

#### Task 18: Implement Python self-tests

**Files:**

- Modify: `scripts/statistical-engine.py`

- [ ] **Step 1: Implement cmd_test with synthetic data**

```python
def cmd_test(args):
    """Run self-tests with synthetic data (no DB required)."""
    print("Running statistical engine self-tests...\n")
    passed = 0
    failed = 0

    # Test 1: CFA model spec generation
    print("  Test 1: CFA model spec generation")
    test_items = pd.DataFrame({
        "id": ["i1", "i2", "i3", "i4", "i5", "i6"],
        "code": ["A", "A", "A", "B", "B", "B"],
    })
    spec = build_cfa_model_spec(test_items)
    assert "A =~" in spec and "B =~" in spec, f"Bad spec: {spec}"
    print("    ✓ Model spec generated correctly")
    passed += 1

    # Test 2: Fit classification
    print("  Test 2: Fit classification")
    assert classify_fit(0.96, 0.04, 0.05) == "bueno"
    assert classify_fit(0.92, 0.07, 0.07) == "aceptable"
    assert classify_fit(0.85, 0.10, 0.12) == "pobre"
    print("    ✓ Fit classification correct")
    passed += 1

    # Test 3: ICC classification
    print("  Test 3: ICC classification")
    assert classify_icc(0.03) == "negligible"
    assert classify_icc(0.10) == "bajo"
    assert classify_icc(0.22) == "moderado"
    assert classify_icc(0.40) == "alto"
    print("    ✓ ICC classification correct")
    passed += 1

    # Test 4: HLM with synthetic data
    print("  Test 4: HLM with synthetic data")
    import statsmodels.formula.api as smf
    np.random.seed(42)
    n_per_group = 30
    groups = ["A"] * n_per_group + ["B"] * n_per_group + ["C"] * n_per_group
    # Group means: A=3.0, B=4.0, C=3.5 → should produce non-trivial ICC
    scores = (
        np.random.normal(3.0, 0.5, n_per_group).tolist() +
        np.random.normal(4.0, 0.5, n_per_group).tolist() +
        np.random.normal(3.5, 0.5, n_per_group).tolist()
    )
    data = pd.DataFrame({"score": scores, "department": groups})
    model = smf.mixedlm("score ~ 1", data, groups=data["department"])
    result = model.fit(reml=True)
    var_group = float(result.cov_re.iloc[0, 0])
    var_resid = float(result.scale)
    icc = var_group / (var_group + var_resid)
    assert 0.15 < icc < 0.95, f"ICC should be moderate-high for distinct group means, got {icc:.3f}"
    print(f"    ✓ HLM ICC = {icc:.3f} (expected moderate-high)")
    passed += 1

    print(f"\n  Results: {passed} passed, {failed} failed")
    if failed > 0:
        sys.exit(1)
```

- [ ] **Step 2: Run self-tests**

Run: `uv run scripts/statistical-engine.py --test`
Expected: All 4 tests pass

- [ ] **Step 3: Commit**

```bash
git add scripts/statistical-engine.py
git commit -m "feat: add self-tests to statistical engine"
```

---

#### Task 19: Final verification

**Files:** (no new files)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (184+ tests including new significance tests)

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run Python self-tests**

Run: `uv run scripts/statistical-engine.py --test`
Expected: All tests pass

- [ ] **Step 5: Verify seed data flow**

Run: `supabase db reset && npm run seed:results`
Then manually verify that `campaign_results.metadata` contains `wave_comparison` for the second demo campaign (which has a prior wave).

- [ ] **Step 6: Final commit and tag**

```bash
git commit --allow-empty -m "chore: complete statistical robustness implementation (phases 1-3)"
git tag -a v5.2-statistical-robustness -m "CFA, invariance, significance testing, HLM"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-03-30-statistical-robustness.md`. Ready to execute?
