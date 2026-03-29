# Fase 4 Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** estabilizar el backend productivo post-rotación y operacionalizar smoke tests, backfill histórico, alertas activas y baseline de performance.

**Architecture:** la fase se ejecuta en cinco bloques secuenciales. Primero se resuelve el gate operativo del admin client en producción. Luego se automatizan smoke tests productivos. Con esa base estable, se corre el backfill histórico real, se conectan alertas a un destino operativo y se documenta el baseline de performance.

**Tech Stack:** Next.js 16, Supabase Postgres/Auth/Functions, Vercel, Vitest, testing-agent, SQL migrations, webhook/email notifications.

---

## Chunk 1: Estabilización Post-Rotación

### Task 1: Diagnosticar `Invalid API key` en runtime

**Files:**

- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/supabase/admin.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/env.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/app/api/jobs/analyze-batch/route.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/app/api/ingest/direct/route.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/PIPELINE_OPERATIONS.md`

- [ ] **Step 1: Reproducir el fallo en producción**

Run:

```bash
set -a; source .env.production.local; set +a
curl -i "https://climalab.rizo.ma/api/jobs/analyze-batch?source=manual&hours=24" -H "x-cron-secret: $CRON_SECRET"
curl -i -X POST "https://climalab.rizo.ma/api/ingest/direct" -H "Content-Type: application/json" -H "x-api-key: $INGEST_API_SECRET" -d '{"externalEventId":"smoke","campaignId":"00000000-0000-0000-0000-000000000000","demographics":{"department":"Ops","tenure":"1-3","gender":"Prefiero no decir"},"responses":[{"itemId":"00000000-0000-0000-0000-000000000000","score":4}]}'
```

Expected: respuestas no `Invalid API key` una vez corregido el runtime.

- [ ] **Step 2: Revisar la forma de inyección de la nueva key**

Verificar:

- Vercel `SUPABASE_SERVICE_ROLE_KEY`
- Supabase edge secret `PROCESS_RESPONSE_SERVICE_ROLE_KEY`
- si hace falta volver a inyectar la `sb_secret` desde un archivo seguro o desde dashboard

- [ ] **Step 3: Corregir el runtime mínimo**

Implementar el ajuste mínimo necesario para que `createAdminClient()` funcione en Vercel con la credencial nueva. Evitar cambios de lógica analítica mientras el problema sea operacional.

- [ ] **Step 4: Validar**

Run:

```bash
npm test
npm run lint
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "fix: restore production admin client after key rotation"
```

## Chunk 2: Smoke Productivo Automatizado

### Task 2: Crear runner repetible de smoke productivo

**Files:**

- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/testing-agent/src/commands/e2e-prod-smoke.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/testing-agent/src/index.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/testing-agent/src/lib/config.ts`

- [ ] **Step 1: Write the failing test/contract**

Definir checks mínimos:

- `batch` responde `200`
- `direct ingest` responde distinto de `Invalid API key`
- `process_response` sigue entregando dispatch

- [ ] **Step 2: Implement minimal runner**

Crear un comando `e2e-prod-smoke` que consuma `.env.production.local` y devuelva checks claros.

- [ ] **Step 3: Verify**

Run:

```bash
cd testing-agent && npx tsx src/index.ts e2e-prod-smoke
```

- [ ] **Step 4: Commit**

```bash
git add testing-agent/src
git commit -m "feat: add production smoke runner"
```

## Chunk 3: Backfill Histórico Real

### Task 3: Ejecutar y auditar backfill productivo

**Files:**

- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/jobs/backfillAnalysis.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/backfill-analysis.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/backfill-drift.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/statistical-health.ts`

- [ ] **Step 1: Ejecutar una corrida real por lotes**

Run:

```bash
curl -i "https://climalab.rizo.ma/api/jobs/backfill-analysis?limit=10000&batchSize=10&force=false" -H "x-cron-secret: $CRON_SECRET"
```

- [ ] **Step 2: Revisar resultados**

Verificar en base:

- `backfill_run_metrics`
- `analysis_runs`
- `analysis_run_snapshots`

- [ ] **Step 3: Documentar drift material**

Generar resumen de:

- campañas con drift alto
- campañas con `attention_needed`
- outliers de duración

- [ ] **Step 4: Commit cualquier ajuste necesario**

```bash
git add .
git commit -m "feat: execute and summarize production backfill"
```

## Chunk 4: Alertas Activas

### Task 4: Conectar notificaciones a un canal real

**Files:**

- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/pipeline-notifications.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/pipeline-alerts.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/PIPELINE_OPERATIONS.md`

- [ ] **Step 1: Confirmar canal**

Definir uno de:

- webhook
- email
- ambos

- [ ] **Step 2: Implementar payload final**

Normalizar severidades y shape final del mensaje.

- [ ] **Step 3: Validar con evento real**

Provocar al menos un evento de prueba y confirmar recepción.

- [ ] **Step 4: Commit**

```bash
git add src/lib docs/PIPELINE_OPERATIONS.md
git commit -m "feat: activate operational pipeline alerts"
```

## Chunk 5: Baseline de Performance

### Task 5: Documentar baseline inicial y preparar optimización

**Files:**

- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/performance-metrics.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/jobs/analyzeBatch.ts`
- Inspect: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/app/(dashboard)/operations/page.tsx`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/PIPELINE_OPERATIONS.md`

- [ ] **Step 1: Consolidar métricas**

Calcular:

- duración media de batch
- duración media de backfill
- máximos
- campañas outlier

- [ ] **Step 2: Publicar baseline**

Añadir una sección en la documentación operativa con límites y lectura esperada.

- [ ] **Step 3: Definir optimizaciones candidatas**

Listar qué partes pueden pasar a incremental y cuáles deben quedarse en recompute completo.

- [ ] **Step 4: Commit**

```bash
git add docs/PIPELINE_OPERATIONS.md
git commit -m "docs: publish initial pipeline performance baseline"
```

## Verificación Final

- [ ] **Step 1: Run full checks**

```bash
npm test
npm run lint
npm run build
cd testing-agent && npx tsx src/index.ts e2e-ops
cd testing-agent && npx tsx src/index.ts e2e-prod-smoke
```

- [ ] **Step 2: Smoke real**

Verificar:

- `batch_job_runs`
- `pipeline_dispatch_events`
- `backfill_run_metrics`
- `campaign_stats`

- [ ] **Step 3: Merge**

```bash
git push origin codex/fase4-production-readiness
gh pr create --draft --base main --head codex/fase4-production-readiness --title "[codex] Fase 4 production readiness" --body "Stabilize production runtime, automate smoke tests, execute historical backfill, activate alerts, and publish performance baseline."
```
