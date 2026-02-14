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

## Project Structure

- `src/app/` — App Router pages and layouts
- `src/app/(dashboard)/` — Protected admin routes (dashboard, organizations, campaigns, instruments)
- `src/app/(dashboard)/campaigns/[id]/results/` — 10 results sub-pages with sidebar nav (incl. ONA network)
- `src/app/(auth)/` — Auth routes (login with magic link)
- `src/app/survey/[token]/` — Public anonymous survey experience
- `src/components/ui/` — shadcn/ui components
- `src/components/layout/` — Layout components (sidebar, header, nav-user)
- `src/components/results/` — 18 reusable chart components for results module
- `src/lib/supabase/` — Supabase client utilities (client.ts, server.ts, middleware.ts)
- `src/lib/validations/` — Zod schemas (organization, instrument, campaign, business-indicator)
- `src/lib/constants.ts` — Roles, size categories, countries, instrument modes, indicator types, analysis levels
- `src/actions/` — Server Actions (auth, organizations, instruments, campaigns, analytics, business-indicators, ai-insights, ona)
- `src/types/` — Database types (generated) and derived types
- `supabase/migrations/` — SQL migrations (18 files)
- `supabase/seed.sql` — Demo data + ClimaLab Core v4.0 instrument (~24K lines, includes module responses)
- `scripts/generate-demo-seed.mjs` — Seeded PRNG (mulberry32) for reproducible demo data
- `scripts/seed-results.ts` — Post-seed script to calculate analytics for demo campaigns (invokes ONA at end)
- `scripts/ona-analysis.py` — Python (NetworkX) perceptual network analysis engine (PEP 723 inline deps, runs via `uv run`)
- `messages/` — i18n translation files
- `docs/TECHNICAL_REFERENCE.md` — Comprehensive audit documentation (Spanish)
- `docs/ROADMAP.md` — Product roadmap (horizons 1-3)

## Database Schema

### Core Tables

- `organizations` — Multi-tenant orgs with departments (JSONB), employee_count, size_category
- `profiles` — User profiles (extends auth.users)
- `instruments` — Survey templates (full/pulse modes, version tracking, instrument_type: base/module)
- `dimensions` — Instrument dimensions (22 in Core v4.0) with category and theoretical_basis
- `items` — Survey items with is_reverse, is_anchor, is_attention_check flags

### Measurement Pipeline

- `campaigns` — Measurement waves per organization (draft → active → closed → archived), with `module_instrument_ids uuid[]` for optional modules
- `respondents` — Anonymous participants with unique tokens (+ enps_score)
- `participants` — PII table (name, email) separated from respondents for survey anonymity
- `responses` — Likert 1-5 scores per item per respondent
- `open_responses` — Free-text responses (strength, improvement, general)
- `campaign_results` — Calculated statistics (dimension scores, engagement profiles, eNPS, segments)
- `campaign_analytics` — Advanced analytics as JSONB (correlations, drivers, alerts, categories, reliability, AI insights)
- `business_indicators` — Objective business metrics per campaign (turnover, absenteeism, NPS, etc.)

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

## Statistical Methods (v4.1)

- **rwg(j)**: Within-group agreement index (James et al. 1984). Expected variance = 2.0 for 5-point Likert. Computed per dimension for global and segment results. Thresholds: ≥0.70 sufficient, 0.50-0.69 moderate, <0.50 low.
- **Cronbach's alpha**: Internal consistency reliability per dimension. Min k=2 items, min n=10. Stored in campaign_analytics as analysis_type "reliability". Thresholds: ≥0.70 acceptable, 0.60-0.69 marginal, <0.60 low.
- **Pearson correlation**: Between all dimension pairs (min n=10) for engagement drivers
- **eNPS**: 0-10 scale, promoters ≥9, passives 7-8, detractors ≤6
- **Favorability**: % of responses ≥4 on 5-point Likert
- **Margin of error**: 1.96 × √(0.25/n) × FPC × 100
- **Engagement profiles**: ambassadors (≥4.5), committed (4.0-4.49), neutral (3.0-3.99), disengaged (<3.0)

## ONA — Perceptual Network Analysis

Python-based (NetworkX) module that builds a cosine-similarity graph from respondent 22-dimension score vectors (excluding ENG as DV). NOT sociometric ONA — detects clusters of people who perceive the organization similarly.

- **Script**: `scripts/ona-analysis.py` — fetches data from Supabase, builds graph, runs Louvain community detection, computes centrality metrics. PEP 723 inline deps — just `uv run scripts/ona-analysis.py`, zero setup
- **Server action**: `src/actions/ona.ts` — `getONAResults()` retrieves from `campaign_analytics` where `analysis_type = 'ona_network'`
- **Results page**: `src/app/(dashboard)/campaigns/[id]/results/network/` — 6 sections: narrative, KPI cards, community profiles (tabs with radar + bar charts), discriminant dimensions, department density heatmap, bridge nodes table
- **Integration**: `calculateResults()` fires ONA asynchronously (non-blocking). `seed-results.ts` invokes it synchronously at end.
- **Adaptive threshold**: starts at 0.85 cosine similarity, adjusts ±0.05 targeting 10-30% edge density
- **Min respondents**: 10

## Business Indicators

Objective business metrics tracked per campaign in `business_indicators` table. Predefined types: turnover_rate, absenteeism_rate, customer_nps, customer_satisfaction, productivity_index, incident_count, custom. Admin can add/delete via campaign detail page. Displayed in results dashboard when present.

## Analysis Levels (EMCO-aligned)

3-level presentation framework for dimension results (presentation layer only, no instrument changes):

- **Individual**: Bienestar dimensions
- **Interpersonal**: Dirección y Supervisión dimensions
- **Organizacional**: Compensación + Cultura dimensions
- **ENG** shown separately as transversal variable

## AI Insights (Ollama Integration)

AI-powered analysis across 6 result pages, using Ollama (Qwen 2.5 72B) via `OLLAMA_BASE_URL` env var. All insights are stored in `campaign_analytics` with dedicated `analysis_type` values and retrieved on page load (SSR). Each page has a "Regenerar" button for on-demand refresh.

| analysis_type         | Page      | What it generates                                                   |
| --------------------- | --------- | ------------------------------------------------------------------- |
| `comment_analysis`    | Comments  | Theme extraction, sentiment distribution, summary per question type |
| `dashboard_narrative` | Dashboard | Executive summary, highlights, concerns, recommendation             |
| `driver_insights`     | Drivers   | Narrative interpretation, paradoxes, quick wins                     |
| `alert_context`       | Alerts    | Root cause hypothesis + recommendation per alert                    |
| `segment_profiles`    | Segments  | Per-segment narrative with strengths/risks                          |
| `trends_narrative`    | Trends    | Trajectory, improving/declining/stable dims, inflection points      |

**Architecture**: `src/actions/ai-insights.ts` contains 6 generation functions, 6 retrieval functions, and 1 orchestrator (`generateAllInsights`). The orchestrator runs all 5 campaign-level analyses in parallel and stores results. Dashboard has a single "Generar insights IA" button that triggers the orchestrator. Export page generates a downloadable text executive report combining all AI insights.

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

## User Roles

- `super_admin` — Full platform access, manages all organizations
- `org_admin` — Manages their own organization only
- `member` — Basic access (future stages)

## Measurement Flow

1. Admin creates campaign (selects org + base instrument + optional modules, sets objective and target departments)
2. Admin adds participants or generates anonymous respondent links
3. Admin activates campaign
4. Respondents access `/survey/[token]` — welcome → demographics → dimensions (shuffled items) → open questions + eNPS → thanks
5. Admin closes campaign → `calculateResults()` computes all statistics:
   - Attention check filtering → reverse item inversion → dimension/item aggregation
   - rwg(j) per dimension (global + segments) → stored in metadata
   - Engagement profiles (ambassadors/committed/neutral/disengaged)
   - eNPS calculation
   - Segment analysis (department, tenure, gender) with anonymity threshold
   - Pearson correlation matrix → engagement drivers → automatic alerts → category scores
   - Cronbach's alpha per dimension → stored as "reliability" analytics
   - Ficha técnica (population, sample, response rate, margin of error with FPC)
6. Admin views results dashboard (9 sub-pages: overview, dimensions, heatmap, items, engagement, eNPS, correlations, comments, ficha técnica)

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
