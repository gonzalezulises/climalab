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
- **ONA**: Python (igraph + matplotlib), invoked via `uv run`
- **AI**: Triple backend — Anthropic API (Claude Haiku 4.5, priority) → DGX (OpenAI-compatible via Cloudflare Tunnel) → Ollama native fallback
- **Export**: @react-pdf/renderer (PDF), exceljs (Excel)

## Project Structure

- `src/app/` — App Router pages and layouts
- `src/app/(dashboard)/` — Protected admin routes (dashboard, organizations, campaigns, instruments)
- `src/app/(dashboard)/campaigns/[id]/results/` — 11 results sub-pages with sidebar nav (dashboard, dimensions, trends, segments, benchmarks, drivers, alerts, comments, network, technical, export)
- `src/app/(auth)/` — Auth routes (login with magic link)
- `src/app/survey/[token]/` — Public anonymous survey experience
- `src/components/ui/` — shadcn/ui components
- `src/components/layout/` — Layout components (sidebar, header, nav-user)
- `src/components/results/` — 21 reusable chart components for results module
- `src/components/reports/` — PDF report component (@react-pdf/renderer)
- `src/components/branding/` — LogoUpload and BrandConfigEditor components
- `src/lib/supabase/` — Supabase client utilities (client.ts, server.ts, middleware.ts)
- `src/lib/validations/` — Zod schemas (organization, instrument, campaign, business-indicator)
- `src/lib/constants.ts` — Roles, size categories, countries, instrument modes, indicator types, analysis levels, DEFAULT_BRAND_CONFIG
- `src/lib/score-utils.ts` — Centralized score classification (classifyFavorability, favToHex, SEVERITY_LABELS) with Rizoma-aligned colors
- `src/lib/statistics.ts` — Pure statistical functions (mean, stdDev, rwg, cronbachAlpha, pearson)
- `src/lib/email.ts` — Multi-type branded email sender (Resend)
- `src/lib/env.ts` — Zod-validated environment variables
- `src/lib/rate-limit.ts` — Rate limiting utility
- `src/actions/` — Server Actions (auth, organizations, instruments, campaigns, analytics, business-indicators, ai-insights, ona, export, reminders, participants)
- `src/types/` — Database types (generated) and derived types (BrandConfig)
- `supabase/migrations/` — SQL migrations (19 files)
- `supabase/seed.sql` — Demo data + ClimaLab Core v4.0 instrument (~24K lines, includes module responses)
- `scripts/generate-demo-seed.mjs` — Seeded PRNG (mulberry32) for reproducible demo data
- `scripts/seed-results.ts` — Post-seed script to calculate analytics for demo campaigns (invokes ONA at end)
- `scripts/ona-analysis.py` — Python (igraph) perceptual network analysis engine with Leiden + stability analysis (PEP 723 inline deps, runs via `uv run` or `python3`)
- `messages/` — i18n translation files
- `docs/TECHNICAL_REFERENCE.md` — Comprehensive audit documentation (Spanish)
- `docs/ROADMAP.md` — Product roadmap (horizons 1-3)
- `.github/workflows/ci.yml` — CI/CD pipeline
- `vitest.config.ts` — Test configuration
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

### Storage

- `org-assets` — Supabase Storage bucket for organization logos (public read, authenticated upload, 2MiB limit, image mime types)

## Architecture Decisions

- **Server Actions** over API routes for all mutations
- **RLS helper functions** (`get_user_role()`, `get_user_org_id()`) with `SECURITY DEFINER`
- **Magic link auth** — local dev uses Supabase Inbucket at localhost:54324
- **size_category** auto-computed from employee_count via trigger (micro/small/medium/large)
- **Build order**: SQL migrations → TS types → Server Actions → UI
- **Public survey** uses Supabase anon client (no auth required)
- **Statistical calculations** run server-side in `calculateResults()` server action
- **Attention checks**: 2 per instrument, respondents failing any are disqualified
- **Reverse items**: inverted (6 - score) before all calculations
- **Anonymity**: demographic segments with < 5 respondents are not reported
- **Pearson correlations**: computed between all dimension pairs (min n=10) for engagement drivers
- **eNPS**: 0-10 scale, promoters ≥9, passives 7-8, detractors ≤6
- **localStorage backup**: survey responses backed up client-side with automatic recovery
- **Participants PII separation**: name/email stored in separate `participants` table, never on survey page
- **Multi-instrument**: campaigns have `instrument_id` (base) + `module_instrument_ids uuid[]` (up to 3 modules). Dimension loading uses `.in("instrument_id", [base, ...modules])` in calculateResults, survey page, and seed-results
- **Module categories**: Module dimensions have `category = NULL` in DB, mapped to `"modulos"` pseudo-category in UI. Naturally excluded from category score aggregation
- **ONA**: Python igraph script invoked non-blocking from calculateResults, uses `uv` with `python3` fallback. Results stored in campaign_analytics as JSONB (includes base64 PNG graph image). Network nav link hidden via `hasONAData()` check in analytics.ts when no data exists
- **Statistics extraction**: Pure functions in `src/lib/statistics.ts` shared between campaigns.ts and seed-results.ts
- **PDF/Excel export**: Server-side generation via @react-pdf/renderer and exceljs in `src/actions/export.ts`. PDF uses dynamic `createStyles(primaryColor)` for per-org branding
- **Branding system**: Per-org visual identity via `brand_config` JSONB column on organizations. `BrandConfig` type in `src/types/index.ts`, `DEFAULT_BRAND_CONFIG` in `src/lib/constants.ts`. Applied to survey (inline styles), emails (`sendBrandedEmail`), PDF report (dynamic `createStyles`), and results sidebar (logo). Logo uploads to `org-assets` Supabase Storage bucket. Config UI in organization detail "Identidad visual" tab
- **Email infrastructure**: Multi-type branded emails via `sendBrandedEmail()` in `src/lib/email.ts` (invitation, reminder, campaign_closed, results_ready). Shared HTML layout wrapper with dynamic logo/colors/footer. Legacy `sendSurveyInvitation` preserved as wrapper
- **Reminders**: `sendReminders(campaignId)` server action in `src/actions/reminders.ts`. Sends branded reminder emails to incomplete participants. Updates `reminded_at` and `reminder_count` on participants. UI button in campaign detail page (active campaigns only) with confirmation dialog
- **Rizoma branding**: ClimaLab uses the Rizo.ma design system — Inter (body) + Source Serif 4 (headings/brand), Rizoma Green (#289448) as primary, Cyan (#1FACC0) as secondary/accent, Red (#C32421) for destructive. Design tokens from `gonzalezulises/rizoma-ui`
- **Results enhancements (v4.7)**: Strengths/weaknesses card on dashboard, action priority matrix (scatter quadrants) on drivers, score-utils centralized classification with Rizoma colors
- **Expandable dimension cards (v4.7.1)**: DimensionCard click-to-expand shows full item text (collapsed = truncated, expanded = full wrap with metrics below). Top/Bottom items view wraps text instead of truncating
- **Vercel timeout (v4.7.1)**: `maxDuration = 300` in results layout.tsx — allows up to 5 minutes for AI server actions with 72B model (requires Vercel Pro)

## Statistical Methods (v4.1)

- **rwg(j)**: Within-group agreement index (James et al. 1984). Expected variance = 2.0 for 5-point Likert. Computed per dimension for global and segment results. Thresholds: ≥0.70 sufficient, 0.50-0.69 moderate, <0.50 low.
- **Cronbach's alpha**: Internal consistency reliability per dimension. Min k=2 items, min n=10. Stored in campaign_analytics as analysis_type "reliability". Thresholds: ≥0.70 acceptable, 0.60-0.69 marginal, <0.60 low.
- **Pearson correlation**: Between all dimension pairs (min n=10) for engagement drivers
- **eNPS**: 0-10 scale, promoters ≥9, passives 7-8, detractors ≤6
- **Favorability**: % of responses ≥4 on 5-point Likert
- **Margin of error**: 1.96 × √(0.25/n) × FPC × 100
- **Engagement profiles**: ambassadors (≥4.5), committed (4.0-4.49), neutral (3.0-3.99), disengaged (<3.0)

## ONA — Perceptual Network Analysis

Python-based (igraph) module that builds a cosine-similarity graph from respondent 22-dimension score vectors (excluding ENG as DV). NOT sociometric ONA — measures shared perception, not interaction patterns.

- **Algorithm**: Leiden community detection with stability analysis (50 iterations + NMI)
- **Stability metric**: Mean pairwise NMI across iterations. >0.80 robust, 0.50-0.80 moderate, <0.50 weak
- **Centrality**: Eigenvector, betweenness (vertex + edge), degree
- **Graph image**: Server-side PNG generation with Fruchterman-Reingold layout (matplotlib + igraph)
- **Stack**: python-igraph (C core), scipy, matplotlib. Invoked non-blocking from calculateResults
- **Script**: `scripts/ona-analysis.py` — PEP 723 inline deps, just `uv run scripts/ona-analysis.py`
- **Server action**: `src/actions/ona.ts` — `getONAResults()` retrieves from `campaign_analytics` where `analysis_type = 'ona_network'`
- **Results page**: `src/app/(dashboard)/campaigns/[id]/results/network/` — 9 sections: narrative, KPI cards (incl. stability), stability badge, community profiles, graph image, discriminant dimensions, density heatmap, bridge nodes, critical edges
- **Storage**: campaign_analytics with analysis_type='ona_network' (JSONB includes base64 PNG)
- **Min respondents**: 10

## Branding System

Per-organization visual identity applied consistently across all touchpoints:

- **Data**: `organizations.brand_config` JSONB column + `organizations.logo_url`
- **Type**: `BrandConfig` in `src/types/index.ts` (primary_color, secondary_color, accent_color, text_color, background_color, logo_position, show_powered_by, custom_welcome_text, custom_thankyou_text, custom_email_footer)
- **Defaults**: `DEFAULT_BRAND_CONFIG` in `src/lib/constants.ts` (primary=#289448 Rizoma Green, secondary=#1FACC0 Cyan, accent=#1FACC0 Cyan)
- **Storage**: `org-assets` Supabase Storage bucket for logo uploads (public read, 2MiB limit)
- **Applied to**: Survey (inline styles on header/buttons/progress), Emails (HTML template with dynamic header/CTA/footer), PDF report (dynamic `createStyles(primaryColor)`), Results sidebar (org logo)
- **Config UI**: "Identidad visual" tab in organization detail page with `LogoUpload` + `BrandConfigEditor` components (live preview)

## Email Infrastructure

- **Sender**: `sendBrandedEmail()` in `src/lib/email.ts` via Resend API
- **Types**: invitation, reminder, campaign_closed, results_ready
- **Layout**: Shared HTML wrapper with org logo/colors in header, accent-colored CTA buttons, conditional "Powered by ClimaLab" footer
- **Reminders**: `sendReminders(campaignId)` in `src/actions/reminders.ts` — sends to all incomplete participants, tracks `reminded_at`/`reminder_count`
- **Legacy**: `sendSurveyInvitation()` preserved as wrapper around `sendBrandedEmail`

## Business Indicators

Objective business metrics tracked per campaign in `business_indicators` table. Predefined types: turnover_rate, absenteeism_rate, customer_nps, customer_satisfaction, productivity_index, incident_count, custom. Admin can add/delete via campaign detail page. Displayed in results dashboard when present.

## Analysis Levels (EMCO-aligned)

3-level presentation framework for dimension results (presentation layer only, no instrument changes):

- **Individual**: Bienestar dimensions
- **Interpersonal**: Dirección y Supervisión dimensions
- **Organizacional**: Compensación + Cultura dimensions
- **ENG** shown separately as transversal variable

## AI Insights (Triple Backend)

AI-powered analysis across 6 result pages. Triple backend architecture with automatic fallback:

1. **Anthropic API (priority)**: Claude Haiku 4.5 via `ANTHROPIC_API_KEY` (~2-5s per call, ~$0.03 per full generation)
2. **DGX (fallback)**: OpenAI-compatible endpoint via `AI_LOCAL_ENDPOINT` (e.g., `https://ollama.rizo.ma/v1` → Cloudflare Tunnel → NVIDIA DGX Spark running Qwen 2.5 72B)
3. **Ollama native (fallback)**: Direct Ollama API via `OLLAMA_BASE_URL` (e.g., `http://localhost:11434`)

If none is configured, AI buttons show a clear error message in Spanish. All insights are stored in `campaign_analytics` with dedicated `analysis_type` values and retrieved on page load (SSR). Each page has a "Regenerar" button for on-demand refresh.

| analysis_type         | Page      | What it generates                                                   |
| --------------------- | --------- | ------------------------------------------------------------------- |
| `comment_analysis`    | Comments  | Theme extraction, sentiment distribution, summary per question type |
| `dashboard_narrative` | Dashboard | Executive summary, highlights, concerns, recommendation             |
| `driver_insights`     | Drivers   | Narrative interpretation, paradoxes, quick wins                     |
| `alert_context`       | Alerts    | Root cause hypothesis + recommendation per alert                    |
| `segment_profiles`    | Segments  | Per-segment narrative with strengths/risks                          |
| `trends_narrative`    | Trends    | Trajectory, improving/declining/stable dims, inflection points      |

**Architecture**: `src/actions/ai-insights.ts` contains `callAI` (triple backend dispatcher), `callAnthropic` (Anthropic Messages API), `callOpenAICompatible` (DGX/OpenAI endpoint), `callOllamaNative` (legacy Ollama), 6 generation functions, 6 retrieval functions, and 1 orchestrator (`generateAllInsights`). The orchestrator runs all 5 campaign-level analyses in parallel with fail-fast: if no AI provider is configured, it returns an error immediately instead of silently succeeding with empty data. Dashboard has a single "Generar insights IA" button that triggers the orchestrator. Export page generates a downloadable text executive report combining all AI insights. Results layout exports `maxDuration = 300` for Vercel serverless timeout (72B model needs 30-120s per analysis).

## Psychometric Reporting

The technical page (ficha técnica) auto-generates:

- Cronbach's alpha table per dimension with acceptability thresholds
- rwg global table per dimension with agreement thresholds
- Limitations section: auto-detects low alpha, low rwg, low response rate, small sample
- Segment heatmap shows AgreementBadge for cells with rwg < 0.70

## Instrument: ClimaLab Core v4.0

22 dimensions in 4 categories + ENG (transversal DV) = 107 items + 2 attention checks:

### Bienestar (6)

1. **ORG** — Orgullo Institucional (4 items, Mael & Ashforth 1992)
2. **PRO** — Propósito del Trabajo (5 items, Steger 2012)
3. **SEG** — Seguridad Física y Psicológica (5 items, JD-R Model)
4. **BAL** — Balance Vida-Trabajo (4 items, Greenhaus 2003)
5. **CUI** — Cuidado Mutuo (5 items, Eisenberger 1986)
6. **DEM** — Demandas Laborales (4 items, JD-R Model)

### Dirección y Supervisión (5)

7. **LID** — Liderazgo Efectivo (6 items, LMX-7 / Servant Leadership)
8. **AUT** — Autonomía (5 items, SDT Deci & Ryan 2000)
9. **COM** — Comunicación Interna (5 items, Roberts & O'Reilly 1974)
10. **CON** — Confianza Institucional (5 items, Mayer 1995)
11. **ROL** — Claridad de Rol (5 items, Rizzo 1970)

### Compensación (5)

12. **CMP** — Compensación (4 items, Adams 1963)
13. **REC** — Reconocimiento (4 items, POS)
14. **BEN** — Beneficios (4 items, Total Rewards)
15. **EQA** — Equidad en Ascensos (6 items, Colquitt 2001)
16. **NDI** — No Discriminación e Inclusión (6 items, Colquitt 2001 / DEI)

### Cultura (5)

17. **COH** — Cohesión de Equipo (6 items, Carron 1985)
18. **INN** — Innovación y Cambio (6 items, Edmondson 1999)
19. **RES** — Resultados y Logros (5 items, Locke & Latham 1990)
20. **DES** — Desarrollo Profesional (4 items, Kraimer 2011)
21. **APR** — Aprendizaje Organizacional (4 items, Senge 1990)

### Engagement (transversal)

22. **ENG** — Engagement y Compromiso (5 items, UWES-9) — serves as DV

### Optional Modules

- **CAM** — Gestión del Cambio (8 items, Armenakis 1993)
- **CLI** — Orientación al Cliente (4 items, Narver & Slater 1990)
- **DIG** — Preparación Digital (4 items, Davis 1989)

### Multi-instrument Support (v4.2)

- Campaigns can include a base instrument (Core/Pulse) + up to 3 optional modules
- Modules are instruments with `instrument_type = 'module'`
- Available modules: CAM (Gestión del Cambio, 8 items), CLI (Orientación al Cliente, 4 items), DIG (Preparación Digital, 4 items)
- Module dimensions appear in a separate "Módulos Opcionales" tab in results

## Export & Reports

- **Excel export**: Full campaign data via exceljs (dimensions, items, segments, drivers, alerts, comments, ficha técnica)
- **PDF report**: Executive report via @react-pdf/renderer with KPIs, categories, dimensions, departments, alerts, drivers, comments, business indicators, ONA summary, ficha técnica. Branded with org colors/logo
- **AI report**: Text-based executive report with AI-generated narratives (requires Ollama)
- **CSV/JSON**: Dimension data and full results dump
- **Server action**: `src/actions/export.ts`

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
   - ONA perceptual analysis (Python/igraph, Leiden + NMI stability, non-blocking) → campaign_analytics
7. Admin views results dashboard (11 sub-pages: dashboard, dimensions, trends, segments, benchmarks, drivers, alerts, comments, network, technical, export)
8. AI Insights (optional, requires Ollama): narrative summaries on dashboard, drivers, alerts, segments, comments, trends; AI-powered executive report export
9. Export: branded PDF, Excel, CSV, AI report

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

Optional (AI — at least one required for AI insights):

- `ANTHROPIC_API_KEY` — Anthropic API key for Claude Haiku 4.5. **Priority provider** (~2-5s, cheapest).
- `ANTHROPIC_MODEL` — Anthropic model name (default: `claude-haiku-4-5-20251001`)
- `AI_LOCAL_ENDPOINT` — OpenAI-compatible endpoint URL (e.g., `https://ollama.rizo.ma/v1` for DGX via Cloudflare Tunnel). **Secondary provider**.
- `AI_LOCAL_MODEL` — Model name for local endpoint (default: `qwen2.5:72b`)
- `AI_LOCAL_API_KEY` — API key for local endpoint (if required)
- `OLLAMA_BASE_URL` — Native Ollama server URL (tertiary/local dev provider, e.g., `http://localhost:11434`)
