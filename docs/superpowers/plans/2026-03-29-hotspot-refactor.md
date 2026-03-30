# Hotspot Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir complejidad en los hotspots principales sin alterar linaje, contratos ni motor estadístico.

**Architecture:** Se usará extracción conservadora por capas. Cada hotspot mantendrá una fachada pública estable y moverá lógica interna a módulos más pequeños y testeables. Cada bloque se valida completo antes de pasar al siguiente.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, Zod, Vitest, Vercel, testing-agent

---

## File Map

### Bloque 1: AI Insights

**Create:**

- `src/lib/ai/provider.ts`
- `src/lib/ai/json.ts`
- `src/lib/ai/rate-limit.ts`
- `src/lib/ai/persistence.ts`
- `src/lib/ai/prompts/comments.ts`
- `src/lib/ai/prompts/dashboard.ts`
- `src/lib/ai/prompts/drivers.ts`
- `src/lib/ai/prompts/alerts.ts`
- `src/lib/ai/prompts/segments.ts`
- `src/lib/ai/prompts/trends.ts`

**Modify:**

- `src/actions/ai-insights.ts`
- `src/lib/__tests__/supabase-admin-config.test.ts` (solo si hace falta patrón de tests)

### Bloque 2: Export

**Create:**

- `src/lib/export/loaders.ts`
- `src/lib/export/shared.ts`
- `src/lib/export/excel.ts`
- `src/lib/export/docx.ts`
- `src/lib/export/ai-report.ts`

**Modify:**

- `src/actions/export.ts`

### Bloque 3: Survey Client

**Create:**

- `src/app/survey/[token]/survey-types.ts`
- `src/app/survey/[token]/survey-backup.ts`
- `src/app/survey/[token]/survey-helpers.ts`
- `src/app/survey/[token]/use-survey-session.ts`
- `src/app/survey/[token]/components/survey-welcome.tsx`
- `src/app/survey/[token]/components/survey-demographics.tsx`
- `src/app/survey/[token]/components/survey-dimension-step.tsx`
- `src/app/survey/[token]/components/survey-open-questions.tsx`
- `src/app/survey/[token]/components/survey-thanks.tsx`

**Modify:**

- `src/app/survey/[token]/survey-client.tsx`

### Bloque 4: Analytics

**Create:**

- `src/actions/analytics-dashboard.ts`
- `src/actions/analytics-drivers.ts`
- `src/actions/analytics-segments.ts`
- `src/actions/analytics-benchmarks.ts`
- `src/actions/analytics-technical.ts`

**Modify:**

- `src/actions/analytics.ts`

### Bloque 5: Campaigns

**Create:**

- `src/actions/campaigns-lifecycle.ts`
- `src/actions/campaigns-links.ts`
- `src/actions/campaigns-results.ts`
- `src/actions/campaigns-queries.ts`

**Modify:**

- `src/actions/campaigns.ts`

---

## Chunk 1: Preparación y Red de Seguridad

### Task 1: Capturar baseline verificable

**Files:**

- Modify: `docs/superpowers/plans/2026-03-29-hotspot-refactor.md`

- [ ] **Step 1: Confirmar árbol limpio y rama activa**

Run: `git status --short && git branch --show-current`
Expected: branch `codex/refactor-hotspots`, sin cambios inesperados

- [ ] **Step 2: Ejecutar baseline local**

Run: `npm run lint && npm test && npm run build`
Expected: todo verde

- [ ] **Step 3: Ejecutar baseline del testing-agent**

Run: `cd testing-agent && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Ejecutar smoke productivo**

Run: `cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local`
Expected: `4/4 production smoke checks passed`

- [ ] **Step 5: Commit de baseline si hace falta evidencia adicional**

```bash
git add .
git commit -m "test: capture hotspot refactor baseline"
```

---

## Chunk 2: Refactor de AI Insights

### Task 2: Extraer providers y utilidades puras

**Files:**

- Create: `src/lib/ai/provider.ts`
- Create: `src/lib/ai/json.ts`
- Create: `src/lib/ai/rate-limit.ts`
- Modify: `src/actions/ai-insights.ts`
- Test: `src/lib/__tests__/ai-provider.test.ts`

- [ ] **Step 1: Escribir tests de provider/json/rate-limit**

Run: `npx vitest run src/lib/__tests__/ai-provider.test.ts`
Expected: FAIL inicial por módulos no implementados

- [ ] **Step 2: Implementar provider adapters y metadata**

Mover:

- `getAiProviderMetadata`
- `callAI`
- `callOpenAI`
- `callAnthropic`
- `callOllamaNative`
- `extractJSON`
- `checkAiRateLimit`

- [ ] **Step 3: Mantener `src/actions/ai-insights.ts` como fachada**

La action debe seguir exportando las mismas funciones públicas.

- [ ] **Step 4: Correr tests focalizados**

Run: `npx vitest run src/lib/__tests__/ai-provider.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai src/actions/ai-insights.ts src/lib/__tests__/ai-provider.test.ts
git commit -m "refactor: extract ai providers and utilities"
```

### Task 3: Separar prompts y persistencia

**Files:**

- Create: `src/lib/ai/prompts/comments.ts`
- Create: `src/lib/ai/prompts/dashboard.ts`
- Create: `src/lib/ai/prompts/drivers.ts`
- Create: `src/lib/ai/prompts/alerts.ts`
- Create: `src/lib/ai/prompts/segments.ts`
- Create: `src/lib/ai/prompts/trends.ts`
- Create: `src/lib/ai/persistence.ts`
- Modify: `src/actions/ai-insights.ts`

- [ ] **Step 1: Extraer constantes de prompts por insight**
- [ ] **Step 2: Extraer lecturas/escrituras a `campaign_ai_insights`**
- [ ] **Step 3: Rewire de `generateAllInsights` y getters**
- [ ] **Step 4: Ejecutar verificación**

Run: `npm run lint && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai src/actions/ai-insights.ts
git commit -m "refactor: split ai prompts and persistence"
```

---

## Chunk 3: Refactor de Export

### Task 4: Extraer loaders y utilidades compartidas

**Files:**

- Create: `src/lib/export/loaders.ts`
- Create: `src/lib/export/shared.ts`
- Modify: `src/actions/export.ts`
- Test: `src/lib/__tests__/export-loaders.test.ts`

- [ ] **Step 1: Escribir test del loader agregado**
- [ ] **Step 2: Mover el `Promise.all` y normalización de datos**
- [ ] **Step 3: Reducir `export.ts` a dispatcher y composición**
- [ ] **Step 4: Ejecutar tests**

Run: `npx vitest run src/lib/__tests__/export-loaders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/export src/actions/export.ts src/lib/__tests__/export-loaders.test.ts
git commit -m "refactor: extract export data loaders"
```

### Task 5: Separar generadores por formato

**Files:**

- Create: `src/lib/export/excel.ts`
- Create: `src/lib/export/docx.ts`
- Create: `src/lib/export/ai-report.ts`
- Modify: `src/actions/export.ts`

- [ ] **Step 1: Mover generación Excel**
- [ ] **Step 2: Mover generación DOCX**
- [ ] **Step 3: Mover reporte IA**
- [ ] **Step 4: Verificación completa**

Run: `npm run lint && npm test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/export src/actions/export.ts
git commit -m "refactor: split export generators by format"
```

---

## Chunk 4: Modularización del Survey Client

### Task 6: Extraer tipos, backup y helpers

**Files:**

- Create: `src/app/survey/[token]/survey-types.ts`
- Create: `src/app/survey/[token]/survey-backup.ts`
- Create: `src/app/survey/[token]/survey-helpers.ts`
- Modify: `src/app/survey/[token]/survey-client.tsx`

- [ ] **Step 1: Mover tipos y constantes**
- [ ] **Step 2: Mover helpers de backup y shuffle**
- [ ] **Step 3: Validar que el cliente conserve el mismo flujo**
- [ ] **Step 4: Verificación**

Run: `npm run lint && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/survey/[token]
git commit -m "refactor: extract survey client utilities"
```

### Task 7: Extraer hook y componentes de pasos

**Files:**

- Create: `src/app/survey/[token]/use-survey-session.ts`
- Create: `src/app/survey/[token]/components/survey-welcome.tsx`
- Create: `src/app/survey/[token]/components/survey-demographics.tsx`
- Create: `src/app/survey/[token]/components/survey-dimension-step.tsx`
- Create: `src/app/survey/[token]/components/survey-open-questions.tsx`
- Create: `src/app/survey/[token]/components/survey-thanks.tsx`
- Modify: `src/app/survey/[token]/survey-client.tsx`

- [ ] **Step 1: Extraer estado/navegación a hook**
- [ ] **Step 2: Extraer componentes presentacionales**
- [ ] **Step 3: Dejar `survey-client.tsx` como ensamblador**
- [ ] **Step 4: Verificación completa**

Run: `npm run lint && npm test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/survey/[token]
git commit -m "refactor: modularize survey client flow"
```

---

## Chunk 5: Adelgazamiento de Analytics

### Task 8: Separar analytics por familia de lectura

**Files:**

- Create: `src/actions/analytics-dashboard.ts`
- Create: `src/actions/analytics-drivers.ts`
- Create: `src/actions/analytics-segments.ts`
- Create: `src/actions/analytics-benchmarks.ts`
- Create: `src/actions/analytics-technical.ts`
- Modify: `src/actions/analytics.ts`

- [ ] **Step 1: Mover queries agrupadas por familia**
- [ ] **Step 2: Mantener exports públicos compatibles**
- [ ] **Step 3: Ejecutar verificación**

Run: `npm run lint && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/actions/analytics*.ts
git commit -m "refactor: split analytics actions by domain"
```

---

## Chunk 6: Adelgazamiento de Campaigns

### Task 9: Separar lifecycle y helpers de campañas

**Files:**

- Create: `src/actions/campaigns-lifecycle.ts`
- Create: `src/actions/campaigns-links.ts`
- Create: `src/actions/campaigns-queries.ts`
- Modify: `src/actions/campaigns.ts`

- [ ] **Step 1: Mover CRUD/lifecycle**
- [ ] **Step 2: Mover helpers de links y lectura**
- [ ] **Step 3: Dejar `campaigns.ts` como fachada**
- [ ] **Step 4: Verificación**

Run: `npm run lint && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/actions/campaigns*.ts
git commit -m "refactor: split campaign lifecycle and helpers"
```

### Task 10: Separar dataset/materialización de resultados sin tocar la metodología

**Files:**

- Create: `src/actions/campaigns-results.ts`
- Modify: `src/actions/campaigns.ts`

- [ ] **Step 1: Extraer carga de dataset y materialización**
- [ ] **Step 2: Mantener `calculateResults()` como entrypoint**
- [ ] **Step 3: Confirmar que no cambie el motor estadístico**
- [ ] **Step 4: Verificación completa**

Run: `npm run lint && npm test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/actions/campaigns*.ts
git commit -m "refactor: extract campaign result orchestration"
```

---

## Chunk 7: Verificación Final y Release

### Task 11: Verificación end-to-end de la ola completa

**Files:**

- Modify: `docs/TECHNICAL_REFERENCE.md`
- Modify: `docs/PIPELINE_OPERATIONS.md` (solo si cambia algo operativo)

- [ ] **Step 1: Ejecutar suite local**

Run: `npm run lint && npm test && npm run build`
Expected: PASS

- [ ] **Step 2: Ejecutar verificación del testing-agent**

Run: `cd testing-agent && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Ejecutar smoke productivo**

Run: `cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local`
Expected: `4/4 production smoke checks passed`

- [ ] **Step 4: Actualizar documentación técnica**

Documentar la nueva partición de hotspots y sus fachadas públicas.

- [ ] **Step 5: Commit final**

```bash
git add docs src testing-agent package.json package-lock.json
git commit -m "refactor: split hotspot modules with stable contracts"
```
