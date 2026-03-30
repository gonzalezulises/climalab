# AI Governance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add governed AI generation with prompt/version contracts, strict schema validation, repair loop, editorial status, generation events, and campaign-level governance UI.

**Architecture:** Extend `campaign_ai_insights` with governance metadata, add a generation-events table, introduce a typed prompt registry plus Zod contracts, normalize every insight through a common pipeline, and surface the resulting metadata in both campaign quality and a dedicated AI governance page.

**Tech Stack:** Next.js 16, TypeScript, Zod, Supabase/Postgres, existing AI provider abstraction, Vitest.

---

## Chunk 1: Schema and Registry Foundations

### Task 1: Add the failing database expectations to tests

**Files:**

- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/__tests__/ai-evaluation.test.ts`
- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/__tests__/ai-contracts.test.ts`

- [ ] **Step 1: Write failing tests for governance metadata and strict contracts**
- [ ] **Step 2: Run `npm test -- --run src/lib/__tests__/ai-contracts.test.ts src/lib/__tests__/ai-evaluation.test.ts` and confirm failure**
- [ ] **Step 3: Add the minimal registry/contracts implementation**
- [ ] **Step 4: Re-run the targeted tests and confirm pass**
- [ ] **Step 5: Commit**

### Task 2: Add database support for governed AI outputs

**Files:**

- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/supabase/migrations/000038_ai_governance.sql`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/types/database.ts`

- [ ] **Step 1: Write failing tests or type assertions for new fields usage**
- [ ] **Step 2: Add migration for `campaign_ai_insights` metadata and `campaign_ai_generation_events`**
- [ ] **Step 3: Update generated local DB types manually**
- [ ] **Step 4: Run targeted tests and `npm run lint`**
- [ ] **Step 5: Commit**

## Chunk 2: Contracts, Repair Loop, Persistence

### Task 3: Implement prompt registry and contracts

**Files:**

- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/contracts.ts`
- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/registry.ts`
- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/normalize.ts`

- [ ] **Step 1: Write failing tests for contract validation and registry lookup**
- [ ] **Step 2: Implement the registry and schemas**
- [ ] **Step 3: Implement normalization helpers for claims/evidence/cautions**
- [ ] **Step 4: Re-run targeted tests**
- [ ] **Step 5: Commit**

### Task 4: Implement generation pipeline with repair loop and telemetry

**Files:**

- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/generate.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/json.ts`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/persistence.ts`

- [ ] **Step 1: Write failing tests for repair-on-invalid-output and event persistence**
- [ ] **Step 2: Implement repair loop and generation event writes**
- [ ] **Step 3: Update persistence helpers to support statuses and metadata**
- [ ] **Step 4: Re-run targeted tests**
- [ ] **Step 5: Commit**

## Chunk 3: Migrate AI Actions

### Task 5: Move all insight generators onto governed contracts

**Files:**

- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/actions/ai-insights.ts`
- Modify: prompt files under `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/prompts/`

- [ ] **Step 1: Write failing tests for governed output reads/writes**
- [ ] **Step 2: Route each insight type through the shared generation pipeline**
- [ ] **Step 3: Preserve public action signatures while changing persistence internals**
- [ ] **Step 4: Re-run AI-focused tests**
- [ ] **Step 5: Commit**

## Chunk 4: Governance UI

### Task 6: Add campaign-level AI governance page

**Files:**

- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/actions/ai-governance.ts`
- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/app/(dashboard)/campaigns/[id]/results/ai-governance/page.tsx`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/app/(dashboard)/campaigns/[id]/results/results-nav.tsx`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/app/(dashboard)/campaigns/[id]/results/quality/page.tsx`

- [ ] **Step 1: Write failing tests for governance summaries and navigation**
- [ ] **Step 2: Implement action loader and governance page**
- [ ] **Step 3: Extend quality page with metadata/version/status visibility**
- [ ] **Step 4: Re-run targeted tests and `npm run build`**
- [ ] **Step 5: Commit**

## Chunk 5: Regression and Documentation

### Task 7: Add governance regression fixtures

**Files:**

- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/__tests__/ai-governance.test.ts`
- Create: `/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/__fixtures__/`

- [ ] **Step 1: Add fixed fixtures per insight type**
- [ ] **Step 2: Add regression tests for contract validity, warnings, and evidence completeness**
- [ ] **Step 3: Run `npm test`**
- [ ] **Step 4: Commit**

### Task 8: Update documentation and verify end to end

**Files:**

- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/TECHNICAL_REFERENCE.md`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/ROADMAP.md`
- Modify: `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/PIPELINE_OPERATIONS.md`

- [ ] **Step 1: Document AI governance architecture, states, and operational checks**
- [ ] **Step 2: Run `npm run lint`**
- [ ] **Step 3: Run `npm test`**
- [ ] **Step 4: Run `npm run build`**
- [ ] **Step 5: Deploy and run `cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local`**
- [ ] **Step 6: Commit**

Plan complete and saved to `/Users/ulisesgonzalez/Documents/GitHub/climalab/docs/superpowers/plans/2026-03-30-ai-governance.md`. Ready to execute.
