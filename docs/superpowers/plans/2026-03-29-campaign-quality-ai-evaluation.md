# Campaign Quality And AI Evaluation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated per-campaign quality page plus technical-page summaries for instrument quality and AI evaluation without changing core scoring behavior.

**Architecture:** Build additive analytics builders that derive campaign quality and AI evaluation artifacts from existing stored results, analytics, respondent-quality records, and AI insights. Surface them through new server-side loaders and a new `quality` results page, while extending the technical page with compact summary cards.

**Tech Stack:** Next.js 16 App Router, Server Components, Supabase, TypeScript, Zod, Vitest, existing ClimaLab analytics and result navigation.

---

## File Map

### New files

- `src/lib/quality/instrument-quality.ts`
- `src/lib/quality/ai-evaluation.ts`
- `src/lib/quality/quality-store.ts`
- `src/lib/__tests__/instrument-quality.test.ts`
- `src/lib/__tests__/ai-evaluation.test.ts`
- `src/app/(dashboard)/campaigns/[id]/results/quality/page.tsx`
- `src/app/(dashboard)/campaigns/[id]/results/quality/quality-client.tsx`

### Modified files

- `src/actions/analytics.ts`
- `src/lib/analytics/analysis-store.ts`
- `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`
- `src/app/(dashboard)/campaigns/[id]/results/layout.tsx` or whichever file defines results navigation
- `src/lib/export/loaders.ts` if quality summaries are reused in exports
- `src/types/database.ts` only if generated types need additive support for new analytics payload usage

### Optional migration

- `supabase/migrations/<next>_quality_analysis_types.sql`

Use only if we need a formal additive persistence helper or seed metadata for analysis types. If not required, keep persistence inside existing `campaign_analytics` rows.

## Chunk 1: Instrument Quality Builder

### Task 1: Write failing tests for instrument quality rules

**Files:**

- Create: `src/lib/__tests__/instrument-quality.test.ts`
- Create: `src/lib/quality/instrument-quality.ts`

- [ ] **Step 1: Write failing tests for quality report aggregation**

Cover:

- corrected item-total correlations
- alpha-if-item-deleted derivation
- missingness aggregation
- interpretability label selection
- empty/low-data fallback

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npx vitest run src/lib/__tests__/instrument-quality.test.ts`

- [ ] **Step 3: Implement minimal pure builder**

Build a pure function that accepts campaign-level result artifacts and returns:

- overall score
- interpretability label
- dimension diagnostics
- item diagnostics
- warning list

- [ ] **Step 4: Re-run targeted test**

Run: `npx vitest run src/lib/__tests__/instrument-quality.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/quality/instrument-quality.ts src/lib/__tests__/instrument-quality.test.ts
git commit -m "feat: add instrument quality builder"
```

## Chunk 2: AI Evaluation Builder

### Task 2: Write failing tests for AI evaluation heuristics

**Files:**

- Create: `src/lib/__tests__/ai-evaluation.test.ts`
- Create: `src/lib/quality/ai-evaluation.ts`

- [ ] **Step 1: Write failing tests for AI matrix scoring**

Cover:

- fidelity to available dimension evidence
- contradiction detection
- low-evidence caution scoring
- expected insight coverage
- operational aggregate scoring

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npx vitest run src/lib/__tests__/ai-evaluation.test.ts`

- [ ] **Step 3: Implement deterministic AI evaluation builder**

Return:

- campaign-level overall score
- methodological score
- operational score
- per-insight-type rows
- warnings

- [ ] **Step 4: Re-run targeted test**

Run: `npx vitest run src/lib/__tests__/ai-evaluation.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/quality/ai-evaluation.ts src/lib/__tests__/ai-evaluation.test.ts
git commit -m "feat: add AI evaluation matrix builder"
```

## Chunk 3: Data Loaders And Store Integration

### Task 3: Add quality store/loaders

**Files:**

- Create: `src/lib/quality/quality-store.ts`
- Modify: `src/actions/analytics.ts`
- Modify: `src/lib/analytics/analysis-store.ts`

- [ ] **Step 1: Write failing loader tests or contract-style tests where practical**

At minimum ensure:

- campaign with partial analytics still returns stable shape
- campaign without AI insights returns empty AI matrix rather than throwing

- [ ] **Step 2: Implement loaders that gather existing campaign artifacts**

Load from:

- `campaign_results`
- `campaign_analytics`
- `analysis_run_respondent_quality`
- `campaign_ai_insights`
- `campaign_ona_runs`
- campaign metadata

- [ ] **Step 3: Expose new actions**

Add actions such as:

- `getInstrumentQualityReport(campaignId)`
- `getAiEvaluationMatrix(campaignId)`
- `getCampaignQualityOverview(campaignId)`

- [ ] **Step 4: Verify no existing analytics contract regressed**

Run: `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/lib/quality/quality-store.ts src/actions/analytics.ts src/lib/analytics/analysis-store.ts
git commit -m "feat: add campaign quality loaders"
```

## Chunk 4: Quality Page UI

### Task 4: Add campaign quality route

**Files:**

- Create: `src/app/(dashboard)/campaigns/[id]/results/quality/page.tsx`
- Create: `src/app/(dashboard)/campaigns/[id]/results/quality/quality-client.tsx`
- Modify: results navigation file in `src/app/(dashboard)/campaigns/[id]/results/`

- [ ] **Step 1: Implement server page loader**

Load:

- campaign
- instrument quality report
- AI evaluation matrix

- [ ] **Step 2: Implement UI sections**

Render:

- overall quality status
- reliability table
- item diagnostics table
- interpretability warnings
- AI matrix summary
- per-insight scorecard

- [ ] **Step 3: Add results navigation entry**

Label: `Calidad`

- [ ] **Step 4: Run build and UI safety checks**

Run:

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/campaigns/[id]/results/quality src/app/(dashboard)/campaigns/[id]/results
git commit -m "feat: add campaign quality page"
```

## Chunk 5: Technical Page Summary

### Task 5: Extend technical page with summary cards

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`

- [ ] **Step 1: Add compact instrument quality summary**

- [ ] **Step 2: Add compact AI evaluation summary**

- [ ] **Step 3: Link summaries to the new quality page**

- [ ] **Step 4: Re-run tests and build**

Run:

```bash
npm run lint
npm test
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx
git commit -m "feat: add quality summaries to technical page"
```

## Chunk 6: Documentation And Final Verification

### Task 6: Update docs and verify end-to-end

**Files:**

- Modify: `docs/TECHNICAL_REFERENCE.md`
- Modify: `docs/ROADMAP.md` if roadmap needs to reflect delivery

- [ ] **Step 1: Document the new quality page and scoring rules**

- [ ] **Step 2: Document AI evaluation semantics**

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run lint
npm test
npm run build
cd testing-agent && npm run typecheck
```

- [ ] **Step 4: Optional production smoke after deploy**

Check:

- campaign results navigation includes `quality`
- technical page still renders
- quality page renders with and without AI insights

- [ ] **Step 5: Commit**

```bash
git add docs/TECHNICAL_REFERENCE.md docs/ROADMAP.md
git commit -m "docs: add campaign quality reporting reference"
```

Plan complete and saved to `docs/superpowers/plans/2026-03-29-campaign-quality-ai-evaluation.md`. Ready to execute.
