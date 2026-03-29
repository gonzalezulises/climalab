# Fase 2 Platform Maturation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar la operación, observabilidad, reproducibilidad y consumo analítico de ClimaLab después de la remediación de linaje.

**Architecture:** La fase se implementa en 4 olas secuenciales. Primero se cierra el trigger asíncrono y la observabilidad base. Luego se agregan snapshots y comparativas de corridas, calidad de datos y vistas semánticas. Finalmente se eleva módulos a primer nivel analítico, se endurece ONA y se amplía la cobertura E2E y de smoke.

**Tech Stack:** Next.js 16, TypeScript, Supabase/Postgres, Supabase Edge Functions, Vitest, testing-agent.

---

## Chunk 1: Operación del Trigger y Observabilidad Base

### Task 1: Activar y verificar el trigger asíncrono completo

**Files:**

- Modify: `docs/PIPELINE_OPERATIONS.md`
- Modify: `testing-agent/src/commands/e2e-http.ts`
- Test: `testing-agent/src/commands/e2e-http.ts`

- [ ] Escribir control E2E que verifique `pipeline_dispatch_events.status in ('queued','delivered')` cuando Vault está configurado
- [ ] Ejecutar el control y confirmar fallo si el entorno no tiene secretos
- [ ] Documentar el procedimiento productivo de Vault y validación
- [ ] Volver a ejecutar el control y confirmar paso

### Task 2: Crear superficie operativa del pipeline

**Files:**

- Create: `src/actions/pipeline-ops.ts`
- Create: `src/app/(dashboard)/campaigns/[id]/results/technical/pipeline/page.tsx`
- Test: `src/lib/__tests__/pipeline-ops.test.ts`

- [ ] Escribir tests de agregación para dispatch, batch y corridas
- [ ] Implementar action para resumen operativo por campaña
- [ ] Implementar página técnica de pipeline en dashboard
- [ ] Verificar tests, lint y build

### Task 3: Añadir alertas operativas básicas

**Files:**

- Modify: `src/actions/pipeline-ops.ts`
- Modify: `src/jobs/analyzeBatch.ts`
- Test: `src/lib/__tests__/pipeline-ops.test.ts`

- [ ] Escribir test para detección de fallas operativas
- [ ] Implementar cálculo de alertas de operación
- [ ] Persistir resumen/flags en `batch_job_runs.metadata`
- [ ] Ejecutar tests

## Chunk 2: Reproducibilidad y Calidad de Datos

### Task 4: Persistir snapshots comparables por corrida

**Files:**

- Create: `supabase/migrations/000032_analysis_run_snapshots.sql`
- Create: `src/lib/analysis-engine/snapshots.ts`
- Modify: `src/lib/analysis-engine/materialize.ts`
- Test: `src/lib/analysis-engine/__tests__/snapshots.test.ts`

- [ ] Escribir test que exija snapshot por corrida
- [ ] Implementar tabla/función de snapshot
- [ ] Persistir snapshot al materializar
- [ ] Ejecutar tests y db reset

### Task 5: Comparativas entre corridas

**Files:**

- Create: `src/actions/analysis-comparison.ts`
- Create: `src/app/(dashboard)/campaigns/[id]/results/trends/comparison/page.tsx`
- Test: `src/lib/__tests__/analysis-comparison.test.ts`

- [ ] Escribir test de diff entre corridas
- [ ] Implementar action de comparación por dimensión/categoría
- [ ] Exponer comparativa en resultados
- [ ] Verificar build

### Task 6: Reporting de calidad de datos por campaña

**Files:**

- Create: `src/actions/data-quality.ts`
- Modify: `src/actions/campaigns.ts`
- Modify: `src/actions/export.ts`
- Test: `src/lib/__tests__/data-quality.test.ts`

- [ ] Escribir test de agregación de calidad por campaña
- [ ] Implementar métricas de duplicados, faltantes, attention checks, cobertura demográfica
- [ ] Mostrar calidad en técnica/export
- [ ] Ejecutar tests

## Chunk 3: Módulos, Capa Semántica y Consumo

### Task 7: Elevar módulos a primer nivel en serving

**Files:**

- Modify: `src/actions/analytics.ts`
- Modify: `src/app/(dashboard)/campaigns/[id]/results/dimensions/page.tsx`
- Test: `src/lib/__tests__/module-analytics.test.ts`

- [ ] Escribir test que exija agrupación explícita core vs módulos
- [ ] Implementar acciones de lectura por familia analítica
- [ ] Reflejar separación en UI
- [ ] Verificar tests

### Task 8: Contrato semántico para dashboard y exportes

**Files:**

- Create: `src/actions/semantic-results.ts`
- Modify: `src/actions/export.ts`
- Modify: `src/actions/analytics.ts`
- Test: `src/lib/__tests__/semantic-results.test.ts`

- [ ] Escribir test del contrato de consumo
- [ ] Implementar capa semántica estable
- [ ] Migrar exportes/lecturas de dashboard a la capa nueva
- [ ] Verificar build y lint

### Task 9: Mostrar `logic_version` y procedencia visible

**Files:**

- Modify: `src/app/(dashboard)/campaigns/[id]/results/technical/page.tsx`
- Modify: `src/actions/export.ts`
- Test: `testing-agent/src/commands/e2e-lineage.ts`

- [ ] Escribir verificación E2E de `logic_version` y procedencia visible
- [ ] Exponer versión lógica, corrida y fuente en técnica/export
- [ ] Ejecutar E2E de lineage

## Chunk 4: ONA, Performance y Controles Finales

### Task 10: Registrar estado operativo de ONA

**Files:**

- Create: `supabase/migrations/000033_ona_job_status.sql`
- Modify: `src/actions/campaigns.ts`
- Modify: `src/actions/ona.ts`
- Test: `src/lib/__tests__/ona-status.test.ts`

- [ ] Escribir test para `completed/deferred/failed`
- [ ] Persistir estado de ejecución ONA por campaña/corrida
- [ ] Exponer lectura consistente desde `ona.ts`
- [ ] Verificar tests

### Task 11: Performance y selección incremental vs batch

**Files:**

- Modify: `src/lib/pipelineAnalysis.ts`
- Modify: `src/jobs/analyzeBatch.ts`
- Modify: `src/actions/campaigns.ts`
- Test: `src/lib/__tests__/pipeline-analysis.test.ts`

- [ ] Escribir test de selección de campañas y modos de refresco
- [ ] Implementar heurística/documentación para incremental vs batch
- [ ] Persistir métricas básicas de duración en metadata
- [ ] Verificar tests

### Task 12: Ampliar cobertura E2E y smoke controlado

**Files:**

- Modify: `testing-agent/src/commands/e2e-http.ts`
- Modify: `testing-agent/src/commands/e2e-lineage.ts`
- Create: `testing-agent/src/commands/e2e-ops.ts`

- [ ] Añadir checks de dispatch, snapshots, calidad y ONA status
- [ ] Ejecutar `npm test`
- [ ] Ejecutar `npm run lint`
- [ ] Ejecutar `npm run build`
- [ ] Ejecutar `cd testing-agent && npx tsx src/index.ts e2e-http`
- [ ] Ejecutar `cd testing-agent && npx tsx src/index.ts e2e-lineage`
- [ ] Ejecutar `cd testing-agent && npx tsx src/index.ts e2e-ops`
