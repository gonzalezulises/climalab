# ClimaLab

Multi-tenant organizational climate measurement platform for SMEs (1–500 employees).
Product of Rizo.ma consulting (Panama). Target: LATAM SMEs.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database/Auth**: Supabase (Postgres + Auth + RLS)
- **UI**: shadcn/ui components
- **Charts**: recharts
- **Validation**: Zod + react-hook-form
- **i18n**: next-intl (Spanish only)
- **Email**: Resend (transactional branded emails)
- **Statistical API**: Python FastAPI service on DGX (ONA, CFA, invariance, HLM) at `stats.rizo.ma`
- **AI**: Triple backend — OpenAI (GPT-4o, priority) → Anthropic API (Claude Haiku 4.5) → Ollama native fallback
- **Export**: docx (Word/DOCX), exceljs (Excel)

## Project Structure

- `src/app/` — App Router pages and layouts
- `src/app/(dashboard)/` — Protected admin routes (dashboard, organizations, campaigns, instruments)
- `src/app/(dashboard)/campaigns/[id]/results/` — 11 results sub-pages with sidebar nav (dashboard, dimensions, trends, segments, benchmarks, drivers, alerts, comments, network, technical, export)
- `src/app/(auth)/` — Auth routes (login with magic link)
- `src/app/survey/[token]/` — Public anonymous survey experience
- `src/components/ui/` — shadcn/ui components
- `src/components/layout/` — Layout components (sidebar, header, nav-user)
- `src/components/results/` — 22 reusable chart components for results module; includes `ai-insight-progress.tsx` (polling component for background job status)
- `src/components/branding/` — LogoUpload and BrandConfigEditor components
- `src/lib/supabase/` — Supabase client utilities (client.ts, server.ts, middleware.ts)
- `src/lib/validations/` — Zod schemas (organization, instrument, campaign, business-indicator, **survey**, **analytics**)
- `src/lib/constants.ts` — Roles, size categories, countries, instrument modes, indicator types, analysis levels, DEFAULT_BRAND_CONFIG
- `src/lib/score-utils.ts` — Centralized score classification (classifyFavorability, favToHex, SEVERITY_LABELS) with Rizoma-aligned colors
- `src/lib/statistics.ts` — Pure statistical functions (mean, stdDev, rwg, cronbachAlpha, pearson, welchTTest, welchTTestFromStats, bootstrapCI, cohensD, segmentSignificance)
- `src/lib/email.ts` — Multi-type branded email sender (Resend)
- `src/lib/env.ts` — Zod-validated environment variables
- `src/lib/rate-limit.ts` — Persistent sliding-window rate limiter backed by Supabase (`rate_limit_log` table via `check_rate_limit()` RPC). Works across Vercel cold starts.
- `src/app/api/jobs/process-ai-insight/route.ts` — Background job processor endpoint (maxDuration=300, atomic claim via RPC, routes to ai-insights actions)
- `src/actions/` — Server Actions (auth, organizations, instruments, campaigns, analytics, business-indicators, ai-insights, ona, export, reminders, participants, statistical-validation)
- `src/types/` — Database types (generated) and derived types (BrandConfig)
- `supabase/migrations/` — SQL migrations (42 files, 000001–000042)
- `supabase/seed.sql` — Demo data + ClimaLab Core v4.0 instrument (~24K lines, includes module responses)
- `scripts/generate-demo-seed.mjs` — Seeded PRNG (mulberry32) for reproducible demo data
- `scripts/seed-results.ts` — Post-seed script to calculate analytics for demo campaigns (includes wave comparison enrichment)
- `services/statistical-api/` — FastAPI service (ONA, CFA, invariance, HLM) deployed on DGX via Cloudflare Tunnel at `stats.rizo.ma`
- `messages/` — i18n translation files
- `docs/TECHNICAL_REFERENCE.md` — Comprehensive audit documentation (Spanish)
- `docs/ROADMAP.md` — Product roadmap (horizons 1-3)
- `.github/workflows/ci.yml` — CI/CD pipeline
- `vitest.config.ts` — Test configuration
- `tsconfig.test.json` — TypeScript config for test files (extends main, includes `__tests__/**/*.ts` and `*.test.ts`); run with `npm run typecheck:test`
- `testing-agent/` — Standalone CLI tool for end-to-end pipeline testing (own package.json, tsx runner)

## Database Schema

### Core Tables

- `organizations` — Multi-tenant orgs with departments (JSONB), employee_count, size_category, logo_url, brand_config (JSONB)
- `profiles` — User profiles (extends auth.users)
- `instruments` — Survey templates (full/pulse modes, version tracking, instrument_type: base/module)
- `dimensions` — Instrument dimensions (22 in Core v4.0) with category and theoretical_basis
- `items` — Survey items with is_reverse, is_anchor, is_attention_check flags

### Measurement Pipeline

- `campaigns` — Measurement waves per organization (draft → active → closed → archived), with `module_instrument_ids uuid[]` for optional modules
- `respondents` — Anonymous participants with unique tokens (+ enps_score)
- `participants` — PII table (name, email, reminded_at, reminder_count) separated from respondents for survey anonymity
- `responses` — Likert 1-5 scores per item per respondent
- `open_responses` — Free-text responses (strength, improvement, general)
- `campaign_results` — Calculated statistics (dimension scores, engagement profiles, eNPS, segments)
- `campaign_analytics` — Advanced analytics as JSONB (correlations, drivers, alerts, categories, reliability, AI insights, ONA)
- `business_indicators` — Objective business metrics per campaign (turnover, absenteeism, NPS, etc.)

### Infrastructure

- `rate_limit_log(key text PK, timestamps timestamptz[], updated_at)` — Persistent sliding-window rate limit state shared across all Vercel instances. RLS deny-all; accessed only via `check_rate_limit()`, `record_circuit_failure()`, `is_circuit_open()` SECURITY DEFINER RPCs.
- `ai_insight_jobs(id uuid PK, campaign_id, organization_id, batch_id uuid, insight_type, status CHECK('pending'|'processing'|'completed'|'failed'), attempt_count, max_attempts, error_message, started_at, completed_at, created_by, created_at)` — Background AI insight job queue. UNIQUE (batch_id, insight_type). INSERT fires `dispatch_ai_insight_job()` trigger → pg_net HTTP POST to Vercel. `claim_ai_insight_job(p_job_id)` does atomic FOR UPDATE claim with stale-lock recovery.

### Storage

- `org-assets` — Supabase Storage bucket for organization logos (public read, authenticated upload, 2MiB limit, image mime types)

## Architecture Decisions

- **Server Actions** over API routes for all mutations
- **Build order**: SQL migrations → TS types → Server Actions → UI
- **RLS**: `get_user_role()`, `get_user_org_id()` with `SECURITY DEFINER`
- **Auth**: Magic link (Supabase Inbucket at localhost:54324 in dev)
- **Role gate**: `src/app/(dashboard)/layout.tsx` checks `ADMIN_ROLES = ["super_admin","org_admin"]` — `member` role is rejected even with valid session
- **Survey**: Supabase anon client (no auth), localStorage backup with recovery
- **PII separation**: `participants` table (name/email) separate from `respondents` (anonymous)
- **Anonymity**: Segments with < 5 respondents not reported
- **Attention checks**: 2 per instrument, failing any = disqualified
- **Reverse items**: Inverted (6 - score) before calculations
- **Rate limiter**: Persistent sliding-window backed by `rate_limit_log` table via `check_rate_limit()` RPC. Works across Vercel cold starts and parallel instances. `src/lib/rate-limit.ts` is async — all call sites must `await`.
- **Background AI jobs**: `generateAllInsights()` inserts 6 rows in `ai_insight_jobs`; `dispatch_ai_insight_job()` pg_net trigger fires independent Vercel invocations (maxDuration=300 each). Sync fallback if `AI_INSIGHT_HOOK_SECRET` not set. Frontend polls via `<AiInsightProgress>` every 4s.
- **Circuit breaker (Statistical API)**: Sliding window 5 min / threshold 3 using `rate_limit_log`. On trip: Telegram alert via Bot API. `src/actions/statistical-validation.ts` — retry delays 0/1.5s/4.5s, fail-closed (returns error to caller, never propagates raw API body).
- **JSONB safety**: All `campaign_analytics.data` reads go through `parseAnalyticsArray` / `parseAnalyticsObject` in `src/lib/validations/analytics.ts`. Invalid items warn in structured JSON log, never crash.
- **Vercel timeout**: `maxDuration = 300` in results layout and AI job processor (72B model needs 30-120s)
- **Design system**: Rizo.ma — Inter (body) + Source Serif 4 (headings), Green #289448, Cyan #1FACC0, Red #C32421

## Statistical Methods

Implementation in `src/lib/statistics.ts` and `src/lib/score-utils.ts`:

- **rwg(j)**: Within-group agreement (≥0.70 sufficient). Per dimension × segment.
- **Cronbach's alpha**: Internal consistency (≥0.70 acceptable). Min k=2, n=10.
- **Pearson correlation**: Between dimension pairs for engagement drivers (min n=10)
- **eNPS**: 0-10 scale. Promoters ≥9, passives 7-8, detractors ≤6
- **Favorability**: % responses ≥4 on 5-point Likert
- **Engagement profiles**: ambassadors (≥4.5), committed (4.0-4.49), neutral (3.0-3.99), disengaged (<3.0)
- **Welch t-test**: Wave-over-wave significance (min n=15 per wave). Also `welchTTestFromStats` from aggregates.
- **Bootstrap CI**: Confidence intervals for difference of means (min n=10, seeded PRNG for reproducibility)
- **Cohen's d**: Effect size classification (negligible <0.2, small 0.2-0.5, medium 0.5-0.8, large ≥0.8)
- **Segment significance**: Wrapper combining Welch + bootstrap (if n<30) + Cohen's d

## Statistical API — Python Service on DGX

FastAPI service at `stats.rizo.ma` (Cloudflare Tunnel → DGX Docker container port 8787). All heavy Python computation runs here, called via `fetch()` from Next.js server actions.

- **Service**: `services/statistical-api/` (FastAPI, uvicorn, Docker)
- **Endpoints**: `POST /ona`, `POST /cfa`, `POST /invariance`, `POST /hlm`, `GET /health`
- **Auth**: Bearer token via `STATISTICAL_API_SECRET`
- **Action**: `src/actions/statistical-validation.ts` → `fetch(STATISTICAL_ENGINE_URL + endpoint)`
- **Auto-trigger**: After `calculateResults()`, CFA (n≥100) and HLM (n≥50) fire automatically (non-blocking)
- **UI buttons**: Technical page has manual execution buttons for CFA, invariance, HLM

### ONA — Perceptual Network Analysis

Cosine-similarity graph from respondent dimension vectors (NOT sociometric). Python igraph + Leiden + NMI stability.

- **Engine**: `services/statistical-api/engine/ona.py`
- **Action**: `src/actions/ona.ts` → reads from `campaign_analytics` where `analysis_type = 'ona_network'`
- **Invocation**: Fire-and-forget from `calculateResults()` via `fetch(STATISTICAL_ENGINE_URL/ona)`
- **Results**: 9 sections in `/campaigns/[id]/results/network/`
- **Min respondents**: 10. Stability: >0.80 robust, 0.50-0.80 moderate, <0.50 weak

### CFA — Confirmatory Factor Analysis

Validates the 22-factor structure of Core v4.0 using semopy (DWLS estimator).

- **Engine**: `services/statistical-api/engine/cfa.py`
- **Min respondents**: 100 (campaign), 500 (cross-org)
- **Output**: Fit indices (CFI, RMSEA, SRMR), factor loadings, problematic items, discriminant issues
- **Storage**: `campaign_analytics` with `analysis_type = 'cfa_campaign'`

### Measurement Invariance

Tests if the survey measures the same constructs across groups (department, tenure, gender). Progressive: configural → metric → scalar. Chen (2007) criteria (ΔCFI ≤ 0.010, ΔRMSEA ≤ 0.015).

- **Engine**: `services/statistical-api/engine/invariance.py`
- **Min respondents**: 75 per group, ≥2 groups
- **Storage**: `campaign_analytics` with `analysis_type = 'invariance_campaign'`

### HLM — Hierarchical Linear Modeling

Null intercept-only model per dimension. Decomposes variance into individual vs departmental (ICC). statsmodels REML estimator.

- **Engine**: `services/statistical-api/engine/hlm.py`
- **Min respondents**: 50, ≥3 departments with ≥10 each
- **ICC thresholds**: <0.05 negligible, 0.05-0.15 bajo, 0.15-0.30 moderado, >0.30 alto
- **Storage**: `campaign_analytics` with `analysis_type = 'hlm_campaign'`

### Wave-over-Wave Significance

Computed in TypeScript during `calculateResults()`. Stored in `campaign_results.metadata.wave_comparison`.

- **Builder**: `src/lib/analysis-engine/wave-comparison.ts` → `enrichResultsWithWaveComparison()`
- **Method**: Welch t-test from aggregates + Cohen's d effect size
- **UI**: Significance badges on trends page (↑ green / ↓ red / ≈ gray), full table in ficha técnica
- **Shared**: Same function used by `calculateResults()` and `seed-results.ts`

## Branding, Email & Business Indicators

- **Branding**: Per-org `brand_config` JSONB on organizations. Applied to survey, emails, DOCX, results sidebar. Config UI in org "Identidad visual" tab. Logos in `org-assets` Supabase bucket.
- **Email**: `sendBrandedEmail()` in `src/lib/email.ts` (Resend). Types: invitation, reminder, campaign_closed, results_ready. Reminders in `src/actions/reminders.ts`.
- **Business Indicators**: Objective metrics per campaign (turnover, absenteeism, NPS, etc.) in `business_indicators` table. Shown in results dashboard.

## Analysis Levels (EMCO-aligned)

3-level presentation framework for dimension results (presentation layer only, no instrument changes):

- **Individual**: Bienestar dimensions
- **Interpersonal**: Dirección y Supervisión dimensions
- **Organizacional**: Compensación + Cultura dimensions
- **ENG** shown separately as transversal variable

## AI Insights (Triple Backend)

AI-powered analysis across 6 result pages. Triple backend architecture with automatic fallback:

1. **OpenAI (priority)**: GPT-4o via `OPENAI_API_KEY` (~3-8s per call)
2. **Anthropic API (secondary)**: Claude Haiku 4.5 via `ANTHROPIC_API_KEY` (~2-5s per call, ~$0.03 per full generation)
3. **Ollama native (fallback)**: Direct Ollama API via `OLLAMA_BASE_URL` (e.g., `http://localhost:11434` or DGX via Tailscale)

If none is configured, AI buttons show a clear error message in Spanish. All insights are stored in `campaign_analytics` with dedicated `analysis_type` values and retrieved on page load (SSR). Each page has a "Regenerar" button for on-demand refresh.

| analysis_type         | Page      | What it generates                                                   |
| --------------------- | --------- | ------------------------------------------------------------------- |
| `comment_analysis`    | Comments  | Theme extraction, sentiment distribution, summary per question type |
| `dashboard_narrative` | Dashboard | Executive summary, highlights, concerns, recommendation             |
| `driver_insights`     | Drivers   | Narrative interpretation, paradoxes, quick wins                     |
| `alert_context`       | Alerts    | Root cause hypothesis + recommendation per alert                    |
| `segment_profiles`    | Segments  | Per-segment narrative with strengths/risks                          |
| `trends_narrative`    | Trends    | Trajectory, improving/declining/stable dims, inflection points      |

**Architecture**: `src/actions/ai-insights.ts` contains `callAI` (triple backend dispatcher), `callOpenAI`, `callAnthropic`, `callOllamaNative`, 6 generation functions, 6 retrieval functions, and 3 orchestration helpers:

- `generateAllInsights(campaignId, orgId)` — **Background mode** (when `AI_INSIGHT_HOOK_SECRET` set): inserts 6 rows in `ai_insight_jobs`, returns `{ batch_id, job_count: 6 }`. **Sync fallback**: runs all 6 in parallel, returns first error or `{ synced: true }`.
- `getInsightJobStatus(batchId)` — Returns per-insight status + `is_done` flag. Used by `<AiInsightProgress>` polling component.
- `retryFailedInsights(batchId)` — DELETEs failed rows then INSERTs new ones (re-triggers pg_net dispatch).

All JSONB reads from `campaign_analytics.data` use `parseAnalyticsArray` / `parseAnalyticsObject` from `src/lib/validations/analytics.ts` — no more raw `as Array<...>` casts. Dashboard renders `<AiInsightProgress batchId={...} onDone={...}>` when background mode is active. Export page generates downloadable text executive report combining all AI insights. Results layout and job processor both export `maxDuration = 300`.

## Instrument: ClimaLab Core v4.0

22 dimensions in 4 categories + ENG (transversal DV) = 107 items + 2 attention checks. Optional modules: CAM (8 items), CLI (4 items), DIG (4 items).

- Categories: Bienestar (6 dims), Dirección y Supervisión (5), Compensación (5), Cultura (5), ENG (transversal)
- Multi-instrument: base + up to 3 modules (`module_instrument_ids uuid[]` on campaigns)
- Module dimensions have `category = NULL` in DB, mapped to `"modulos"` pseudo-category in UI
- Ficha técnica auto-generates alpha/rwg tables + limitations detection

Full dimension list with items and academic references: `docs/ENCUESTA_PREGUNTAS.md`

## Export & Reports

Server action: `src/actions/export.ts`. Formats:

- **DOCX**: 13-section executive report (branded with org colors/logo) via `docx` package
- **Excel**: Full campaign data via exceljs
- **AI report**: Text executive report with AI narratives
- **CSV/JSON**: Dimension data and full results dump

## User Roles

- `super_admin` — Full platform access, manages all organizations
- `org_admin` — Manages their own organization only
- `member` — Basic access (future stages)

## Measurement Flow

1. Admin creates campaign (selects org + base instrument + optional modules, sets objective and target departments)
2. Admin adds participants or generates anonymous respondent links
3. Admin activates campaign → invitation emails sent with org branding
4. Respondents access `/survey/[token]` — welcome → demographics → dimensions (shuffled items) → open questions + eNPS → thanks (all styled with org brand colors)
5. Admin can send reminder emails to incomplete participants via campaign page button
6. Admin closes campaign → `calculateResults()` computes all statistics:
   - Attention check filtering → reverse item inversion → dimension/item aggregation
   - rwg(j) per dimension × segment for within-group agreement
   - Cronbach's alpha per dimension for internal consistency
   - Engagement profiles (ambassadors/committed/neutral/disengaged)
   - eNPS calculation
   - Segment analysis (department, tenure, gender) with anonymity threshold (n<5)
   - Pearson correlation matrix → engagement drivers → automatic alerts → category scores
   - Ficha técnica (population, sample, response rate, margin of error with FPC)
   - Reliability data (alpha per dimension) → campaign_analytics
   - Wave-over-wave significance (Welch t-test + Cohen's d vs previous campaign) → campaign_results.metadata
   - ONA perceptual analysis → `fetch(stats.rizo.ma/ona)` fire-and-forget → campaign_analytics
   - CFA (if n≥100) → `fetch(stats.rizo.ma/cfa)` fire-and-forget → campaign_analytics
   - HLM (if n≥50) → `fetch(stats.rizo.ma/hlm)` fire-and-forget → campaign_analytics
7. Admin views results dashboard (11 sub-pages: dashboard, dimensions, trends, segments, benchmarks, drivers, alerts, comments, network, technical, export)
8. AI Insights (optional, requires AI provider): narrative summaries on dashboard, drivers, alerts, segments, comments, trends; AI-powered executive report export
9. Export: branded DOCX, Excel, CSV, AI report

## Local Development

```bash
supabase start          # Start local Supabase
supabase db reset       # Apply migrations + seed
npm run seed:results    # Calculate demo campaign results
npm run dev             # Start Next.js dev server
```

- Inbucket (email): http://localhost:54324
- Supabase Studio: http://localhost:54323
- App: http://localhost:3000

## Environment Variables

Required for production:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `RESEND_API_KEY` — Resend API key for transactional emails
- `RESEND_FROM_EMAIL` — Sender email (e.g., "ClimaLab <noreply@climalab.app>")

Optional (Statistical API — required for ONA, CFA, HLM, invariance):

- `STATISTICAL_ENGINE_URL` — Statistical API URL (e.g., `https://stats.rizo.ma`). If not set, ONA/CFA/HLM are deferred.
- `STATISTICAL_API_SECRET` — Bearer token for statistical API auth

Optional (AI — at least one required for AI insights):

- `OPENAI_API_KEY` — OpenAI API key for GPT-4o. **Priority provider** (~3-8s).
- `OPENAI_MODEL` — OpenAI model name (default: `gpt-4o`)
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude Haiku 4.5. **Secondary provider** (~2-5s).
- `ANTHROPIC_MODEL` — Anthropic model name (default: `claude-haiku-4-5-20251001`)
- `OLLAMA_BASE_URL` — Ollama server URL (tertiary/local provider, e.g., `http://localhost:11434` or DGX via Tailscale)

Optional (Background AI jobs + Alerting):

- `AI_INSIGHT_HOOK_SECRET` — Shared secret for `x-hook-secret` header on `/api/jobs/process-ai-insight`. **If set in production, required** — endpoint returns 401 without it. If absent, `generateAllInsights` falls back to sync execution.
- `TELEGRAM_BOT_TOKEN` — Telegram Bot API token for circuit breaker alerts. If absent, alerting is silently skipped.
- `TELEGRAM_ALERT_CHAT_ID` — Chat ID to send alerts to (matches `TELEGRAM_BOT_TOKEN` bot).

## Harness (gobernanza de agentes)

- **Verificación:** `make check` = `npm ci && npm run lint && npm run test && npm run build`.
  Debe salir 0 antes de cada commit; en CI es el check requerido `Required quality`.
- **Estado durable:** `feature_list.json` (una feature `active`; `passing` solo lo
  escribe `scripts/verify-feature.sh`) y `PROGRESS.md` al cierre de sesión.
- **Decisiones:** `DECISIONS.md` append-only.
- **Política:** Build libre, deploy con compuerta (POLITICA.md de sdlc-ai-nativo,
  D10). No editar `.github/workflows/required-quality.yml`.
