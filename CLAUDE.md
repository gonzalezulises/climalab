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
- `src/app/(auth)/` — Auth routes (login with magic link)
- `src/app/survey/[token]/` — Public anonymous survey experience
- `src/components/ui/` — shadcn/ui components
- `src/components/layout/` — Layout components (sidebar, header, nav-user)
- `src/lib/supabase/` — Supabase client utilities (client.ts, server.ts, middleware.ts)
- `src/lib/validations/` — Zod schemas (organization, instrument, campaign)
- `src/lib/constants.ts` — Roles, size categories, countries, instrument modes
- `src/actions/` — Server Actions (auth, organizations, instruments, campaigns)
- `src/types/` — Database types (generated) and derived types
- `supabase/migrations/` — SQL migrations (7 files)
- `supabase/seed.sql` — Demo data + ClimaLab Core v2.0 instrument
- `messages/` — i18n translation files

## Database Schema

### Core Tables
- `organizations` — Multi-tenant orgs with departments, employee_count, size_category
- `profiles` — User profiles (extends auth.users)
- `instruments` — Survey templates (full/pulse modes)
- `dimensions` — Instrument dimensions (8 in Core v2.0)
- `items` — Survey items with is_reverse, is_anchor, is_attention_check flags

### Measurement Pipeline
- `campaigns` — Measurement waves per organization (draft → active → closed → archived)
- `respondents` — Anonymous participants with unique tokens
- `responses` — Likert 1-5 scores per item per respondent
- `open_responses` — Free-text responses (strength, improvement, general)
- `campaign_results` — Calculated statistics (dimension scores, engagement profiles, segments)

## Architecture Decisions

- **Server Actions** over API routes for all mutations
- **RLS helper functions** (`get_user_role()`, `get_user_org_id()`) with `SECURITY DEFINER`
- **Magic link auth** — local dev uses Supabase Inbucket at localhost:54324
- **size_category** auto-computed from employee_count via trigger
- **Build order**: SQL migrations → TS types → Server Actions → UI
- **Public survey** uses Supabase anon client (no auth required)
- **Statistical calculations** run server-side in `calculateResults()` server action
- **Attention checks**: 2 per instrument, respondents failing any are disqualified
- **Reverse items**: inverted (6 - score) before all calculations
- **Anonymity**: demographic segments with < 5 respondents are not reported

## Instrument: ClimaLab Core v2.0

8 dimensions × 4-5 items = 35 items + 2 attention checks:

1. **LID** — Liderazgo y Supervisión (5 items, based on LMX-7)
2. **JUS** — Justicia Organizacional (5 items, based on Colquitt 2001)
3. **PER** — Sentido de Pertenencia (4 items, based on Mael & Ashforth 1992)
4. **INN** — Innovación y Cambio (5 items, based on Edmondson 1999)
5. **BIE** — Bienestar y Equilibrio (4 items, based on JD-R Model)
6. **CLA** — Claridad y Desarrollo (4 items, based on Rizzo 1970)
7. **COM** — Comunicación y Participación (4 items, based on Roberts & O'Reilly 1974)
8. **ENG** — Engagement y Compromiso (4 items, based on UWES-9) — serves as DV

## User Roles

- `super_admin` — Full platform access, manages all organizations
- `org_admin` — Manages their own organization only
- `member` — Basic access (future stages)

## Measurement Flow

1. Admin creates campaign (selects org + instrument)
2. Admin generates respondent links (anonymous tokens)
3. Admin activates campaign
4. Respondents access `/survey/[token]` — demographics → Likert questions → open questions
5. Admin closes campaign → `calculateResults()` computes all statistics
6. Admin views results dashboard (KPIs, radar, heatmap, engagement profiles, top/bottom items)

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
