# ClimaLab 10/10 Program Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** elevar ClimaLab hacia un nivel 10/10 con foundations compartidas para excelencia estadística, IA, operación, semántica y performance.

**Architecture:** la implementación agrega cuatro tablas nuevas y una capa de funciones puras reutilizables para baselines estadísticos, evidencia IA, SLOs y performance. Sobre esas foundations se montan loaders, acciones y superficies de campaña/operaciones sin tocar el linaje ni el motor estadístico central.

**Tech Stack:** Next.js 16, TypeScript, Supabase/Postgres, Zod, Vitest, shadcn/ui.

---

## Chunk 1: Foundations Persistentes

### Task 1: Crear migraciones 10/10

**Files:**

- Create: `supabase/migrations/000039_ten_out_of_ten_foundations.sql`
- Modify: `src/types/database.ts`
- Test: `src/lib/__tests__/ten-out-of-ten-foundations.test.ts`

- [ ] **Step 1: Write failing test for new derived helpers that depend on new tables**
- [ ] **Step 2: Run `npm test -- --run src/lib/__tests__/ten-out-of-ten-foundations.test.ts` and confirm failure**
- [ ] **Step 3: Add migration for `analysis_statistical_baselines`, `campaign_ai_evidence`, `pipeline_slo_snapshots`, and `performance_baselines`**
- [ ] **Step 4: Extend generated database types manually**
- [ ] **Step 5: Run `supabase db reset` and verify migration applies**
- [ ] **Step 6: Commit foundations schema**

## Chunk 2: Statistical and Semantic Foundations

### Task 2: Implement statistical baseline builders

**Files:**

- Create: `src/lib/excellence/statistical-baselines.ts`
- Create: `src/lib/__tests__/statistical-baselines.test.ts`
- Modify: `src/actions/analysis-comparison.ts`

- [ ] **Step 1: Write failing tests for robustness score, drift summary and interpretation labels**
- [ ] **Step 2: Run `npm test -- --run src/lib/__tests__/statistical-baselines.test.ts` and confirm failure**
- [ ] **Step 3: Implement pure baseline builder and interpretation rules**
- [ ] **Step 4: Wire action helpers to consume baseline builder**
- [ ] **Step 5: Run targeted tests and confirm pass**
- [ ] **Step 6: Commit statistical foundations**

### Task 3: Expand semantic result packs

**Files:**

- Modify: `src/lib/semantic-results.ts`
- Modify: `src/actions/semantic-results.ts`
- Modify: `src/lib/export/loaders.ts`
- Test: `src/lib/__tests__/semantic-results.test.ts`

- [ ] **Step 1: Write failing tests for longitudinal and export-ready semantic packs**
- [ ] **Step 2: Run `npm test -- --run src/lib/__tests__/semantic-results.test.ts` and confirm failure**
- [ ] **Step 3: Extend semantic packs with baseline/drift and stable AI/export metadata**
- [ ] **Step 4: Update export loaders to consume the enriched semantic pack**
- [ ] **Step 5: Re-run targeted tests**
- [ ] **Step 6: Commit semantic expansion**

## Chunk 3: AI Excellence

### Task 4: Persist AI evidence and scorecards

**Files:**

- Create: `src/lib/ai/evidence.ts`
- Create: `src/lib/__tests__/ai-evidence.test.ts`
- Modify: `src/lib/ai/generate.ts`
- Modify: `src/actions/ai-governance.ts`
- Modify: `src/lib/quality/ai-evaluation.ts`

- [ ] **Step 1: Write failing tests for claim extraction, evidence normalization and publish gating**
- [ ] **Step 2: Run `npm test -- --run src/lib/__tests__/ai-evidence.test.ts` and confirm failure**
- [ ] **Step 3: Implement evidence extraction and persistence payload builders**
- [ ] **Step 4: Enforce publish gating when evidence coverage is insufficient**
- [ ] **Step 5: Extend AI evaluation scorecards with evidence coverage**
- [ ] **Step 6: Run targeted tests**
- [ ] **Step 7: Commit AI excellence layer**

## Chunk 4: Operational and Capacity Excellence

### Task 5: Implement SLO scorecards and performance baselines

**Files:**

- Create: `src/lib/excellence/slo-scorecards.ts`
- Create: `src/lib/excellence/performance-baselines.ts`
- Create: `src/lib/__tests__/slo-scorecards.test.ts`
- Create: `src/lib/__tests__/performance-baselines.test.ts`
- Modify: `src/actions/pipeline-ops.ts`
- Modify: `src/jobs/analyzeBatch.ts`
- Modify: `src/jobs/backfillAnalysis.ts`

- [ ] **Step 1: Write failing tests for SLO status derivation and performance baseline summaries**
- [ ] **Step 2: Run targeted tests and confirm failure**
- [ ] **Step 3: Implement pure scorecard builders**
- [ ] **Step 4: Persist snapshots from batch/backfill jobs**
- [ ] **Step 5: Extend pipeline ops action to load the new scorecards**
- [ ] **Step 6: Re-run targeted tests**
- [ ] **Step 7: Commit operational/capacity layer**

## Chunk 5: Surfaces and Docs

### Task 6: Surface 10/10 foundations in campaign and operations UI

**Files:**

- Modify: `src/actions/quality.ts`
- Modify: `src/lib/quality/quality-store.ts`
- Modify: `src/app/(dashboard)/campaigns/[id]/results/quality/page.tsx`
- Modify: `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`
- Modify: `src/app/(dashboard)/campaigns/[id]/results/ai-governance/page.tsx`
- Modify: `src/app/(dashboard)/operations/page.tsx`
- Modify: `docs/TECHNICAL_REFERENCE.md`
- Modify: `docs/PIPELINE_OPERATIONS.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add loaders for statistical baselines, AI evidence, SLOs and performance baselines**
- [ ] **Step 2: Surface summaries in quality, technical, AI governance and operations pages**
- [ ] **Step 3: Update architecture and operations docs**
- [ ] **Step 4: Run `npm run lint`, `npm test`, and `npm run build`**
- [ ] **Step 5: Commit surfaces and docs**

## Chunk 6: End-to-End Verification

### Task 7: Extend end-to-end and regression verification

**Files:**

- Modify: `testing-agent/src/commands/e2e-ops.ts`
- Modify: `testing-agent/src/commands/e2e-prod-smoke.ts`
- Modify: `testing-agent/src/index.ts`

- [ ] **Step 1: Extend ops E2E to assert new baseline/evidence/SLO tables**
- [ ] **Step 2: Run `cd testing-agent && npx tsx src/index.ts e2e-ops`**
- [ ] **Step 3: Run `cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local`**
- [ ] **Step 4: Fix any regression until all checks pass**
- [ ] **Step 5: Commit end-to-end verification**

## Final Verification

- [ ] Run: `supabase db reset`
- [ ] Run: `npm run lint`
- [ ] Run: `npm test`
- [ ] Run: `npm run build`
- [ ] Run: `cd testing-agent && npx tsx src/index.ts e2e-ops`
- [ ] Run: `cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local`

## Integration

- [ ] Push branch
- [ ] Open PR
- [ ] Merge after review
- [ ] Deploy production
- [ ] Re-run production smoke

Plan complete and saved to `docs/superpowers/plans/2026-03-30-ten-out-of-ten-program.md`. Ready to execute.
