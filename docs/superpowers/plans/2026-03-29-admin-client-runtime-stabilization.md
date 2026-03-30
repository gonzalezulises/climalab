# Admin Client Runtime Stabilization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** eliminar de forma definitiva el `Invalid API key` en rutas server-only productivas tras la rotación de credenciales Supabase.

**Architecture:** el plan introduce un contrato explícito para credenciales backend del runtime web, añade diagnóstico interno sin exponer secretos y usa el smoke runner productivo como gate oficial antes de retomar backfill y alertas.

**Tech Stack:** Next.js 16, Supabase JS, Zod env parsing, Vercel runtime, testing-agent.

---

## Chunk 1: Contrato De Credenciales

### Task 1: Formalizar el backend secret del runtime web

**Files:**

- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/env.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/supabase/admin.ts`

- [ ] **Step 1: Write the failing test**

Crear un test unitario para un helper puro que resuelva el backend secret con prioridad:

1. `SUPABASE_SECRET_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/lib/__tests__/supabase-admin-config.test.ts
```

- [ ] **Step 3: Write minimal implementation**

Extraer un helper puro, por ejemplo:

- `resolveAdminSupabaseKey(envLike)`
- `classifySupabaseKeyFamily(key)`

- [ ] **Step 4: Wire the runtime**

Actualizar `createAdminClient()` para usar el helper y dejar error explícito si no existe una credencial válida.

- [ ] **Step 5: Verify**

Run:

```bash
npx vitest run src/lib/__tests__/supabase-admin-config.test.ts
npm run lint
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/supabase/admin.ts src/lib/__tests__/supabase-admin-config.test.ts
git commit -m "fix: formalize backend supabase secret resolution"
```

## Chunk 2: Diagnóstico Controlado

### Task 2: Añadir logging seguro de familia de clave

**Files:**

- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/supabase/admin.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/app/api/jobs/analyze-batch/route.ts`
- Optionally Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/supabase/admin-debug.ts`

- [ ] **Step 1: Write the failing test**

Cubrir que el helper clasifica:

- `sb_secret_*`
- JWT legacy `eyJ...`
- vacío/missing
- unknown

- [ ] **Step 2: Implement minimal logging**

Emitir logs server-side con:

- `route`
- `key_family`
- `has_key`

Sin incluir el valor del secreto.

- [ ] **Step 3: Verify**

Run:

```bash
npx vitest run src/lib/__tests__/supabase-admin-config.test.ts
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase src/app/api/jobs/analyze-batch/route.ts src/lib/__tests__/supabase-admin-config.test.ts
git commit -m "chore: add safe admin client diagnostics"
```

## Chunk 3: Smoke Gate

### Task 3: Usar `e2e-prod-smoke` como aceptación oficial

**Files:**

- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/testing-agent/src/commands/e2e-prod-smoke.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/PIPELINE_OPERATIONS.md`

- [ ] **Step 1: Ajustar el runner si hace falta**

Confirmar que el command falla con código no-cero cuando `batch` devuelve `Invalid API key`.

- [ ] **Step 2: Verificar**

Run:

```bash
cd testing-agent && npm run typecheck
cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local
```

- [ ] **Step 3: Documentar el gate**

Añadir a la runbook que ninguna corrida histórica ni merge operacional pasa a la siguiente fase con el smoke en rojo.

- [ ] **Step 4: Commit**

```bash
git add testing-agent/src docs/PIPELINE_OPERATIONS.md
git commit -m "docs: standardize production smoke gate"
```

## Chunk 4: Validación Final

- [ ] **Step 1: Deploy**

Redeploy de Vercel tras el fix.

- [ ] **Step 2: Run full checks**

```bash
npm test
npm run lint
npm run build
cd testing-agent && npm run typecheck
cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local
```

- [ ] **Step 3: Confirm resolution**

Esperado:

- `batch` ya no devuelve `Invalid API key`
- `e2e-prod-smoke` verde
- Fase 4 puede continuar con backfill real
