# Fase 3 Ops And Backfill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir backfill total, comparativas históricas útiles, alertas operativas reales y telemetría estadística/performance para operación continua.

**Architecture:** La fase amplía las capacidades ya existentes de backfill, snapshots, data quality y pipeline ops. Primero se fortalece el backfill total por lotes con un resumen agregado de drift/calidad. Luego se conectan alertas reales y se exponen métricas estadísticas y de performance en las superficies operativas. Finalmente se cierran controles E2E y smoke.

**Tech Stack:** Next.js 16, TypeScript, Supabase/Postgres, Vitest, testing-agent, Resend/webhooks.

---

## Chunk 1: Backfill Total y Resúmenes Históricos

### Task 1: Backfill total por lotes con resumen agregado

**Files:**

- Modify: `src/jobs/backfillAnalysis.ts`
- Modify: `src/lib/backfill-analysis.ts`
- Test: `src/lib/__tests__/backfill-analysis.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement batch selection and aggregate summary**
- [ ] **Step 4: Run tests to verify it passes**
- [ ] **Step 5: Commit**

### Task 2: Comparativa de drift y calidad por campaña recalculada

**Files:**

- Modify: `src/actions/analysis-comparison.ts`
- Create: `src/lib/backfill-drift.ts`
- Test: `src/lib/__tests__/backfill-drift.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement drift classification helpers**
- [ ] **Step 4: Run tests to verify it passes**
- [ ] **Step 5: Commit**

### Task 3: Persistir métricas agregadas de backfill

**Files:**

- Create: `supabase/migrations/000037_backfill_run_metrics.sql`
- Modify: `src/jobs/backfillAnalysis.ts`
- Modify: `src/app/api/jobs/backfill-analysis/route.ts`
- Test: `src/lib/__tests__/backfill-analysis.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Persist backfill run metrics and summaries**
- [ ] **Step 4: Run tests and db reset**
- [ ] **Step 5: Commit**

## Chunk 2: Alertas Reales y Monitoreo Estadístico

### Task 4: Alertas específicas para backfill y calidad analítica

**Files:**

- Modify: `src/lib/pipeline-alerts.ts`
- Modify: `src/lib/pipeline-notifications.ts`
- Test: `src/lib/__tests__/pipeline-alerts.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Add backfill/drift/data-quality alert bundles**
- [ ] **Step 4: Run tests to verify it passes**
- [ ] **Step 5: Commit**

### Task 5: Resumen estadístico operativo por campaña

**Files:**

- Modify: `src/actions/data-quality.ts`
- Modify: `src/lib/data-quality.ts`
- Create: `src/lib/statistical-health.ts`
- Test: `src/lib/__tests__/statistical-health.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement statistical health summary**
- [ ] **Step 4: Run tests to verify it passes**
- [ ] **Step 5: Commit**

### Task 6: Exponer reportes de backfill y salud en operaciones

**Files:**

- Modify: `src/actions/pipeline-ops.ts`
- Modify: `src/app/(dashboard)/operations/page.tsx`
- Modify: `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`
- Test: `src/lib/__tests__/pipeline-ops.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Surface backfill, drift and health summaries in ops UI**
- [ ] **Step 4: Run tests to verify it passes**
- [ ] **Step 5: Commit**

## Chunk 3: Performance, E2E y Cierre Operativo

### Task 7: Telemetría de performance para batch y backfill

**Files:**

- Modify: `src/jobs/analyzeBatch.ts`
- Modify: `src/jobs/backfillAnalysis.ts`
- Create: `src/lib/performance-metrics.ts`
- Test: `src/lib/__tests__/pipeline-analysis.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement duration/outlier telemetry**
- [ ] **Step 4: Run tests to verify it passes**
- [ ] **Step 5: Commit**

### Task 8: Extender E2E de operaciones y backfill

**Files:**

- Modify: `testing-agent/src/commands/e2e-ops.ts`
- Modify: `testing-agent/src/index.ts`
- Test: `testing-agent/src/commands/e2e-ops.ts`

- [ ] **Step 1: Write the failing E2E assertions**
- [ ] **Step 2: Run E2E to verify it fails**
- [ ] **Step 3: Implement the minimal code to satisfy the checks**
- [ ] **Step 4: Re-run E2E and verify it passes**
- [ ] **Step 5: Commit**

### Task 9: Verificación final de fase

**Files:**

- Modify: `docs/PIPELINE_OPERATIONS.md`

- [ ] **Step 1: Update operational docs for backfill and statistical health**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Run `npm run lint`**
- [ ] **Step 4: Run `npm run build`**
- [ ] **Step 5: Run `supabase db reset`**
- [ ] **Step 6: Run `cd testing-agent && npx tsx src/index.ts e2e-ops`**
- [ ] **Step 7: Commit**
