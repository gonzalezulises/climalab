# ClimaLab

Multi-tenant organizational climate measurement platform for SMEs (1–200 employees).

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript, Tailwind CSS v4)
- **Database/Auth**: Supabase (Postgres + Auth + RLS)
- **UI**: shadcn/ui components
- **Validation**: Zod
- **i18n**: next-intl (Spanish only in Stage 1)

## Project Structure

- `src/app/` — App Router pages and layouts
- `src/components/ui/` — shadcn/ui components
- `src/components/layout/` — Layout components (sidebar, header, nav-user)
- `src/lib/supabase/` — Supabase client utilities (client.ts, server.ts, middleware.ts)
- `src/lib/validations/` — Zod schemas
- `src/actions/` — Server Actions (auth, organizations, instruments)
- `src/types/` — Database types (generated) and derived types
- `supabase/migrations/` — SQL migrations
- `messages/` — i18n translation files

## Architecture Decisions

- **Server Actions** over API routes for all mutations
- **RLS helper functions** (`get_user_role()`, `get_user_org_id()`) with `SECURITY DEFINER`
- **Magic link auth** — local dev uses Supabase Inbucket at localhost:54324
- **size_category** auto-computed from employee_count via trigger
- **Build order**: SQL migrations → TS types → Server Actions → UI

## User Roles

- `super_admin` — Full platform access, manages all organizations
- `org_admin` — Manages their own organization only
- `member` — Basic access (future stages)

## Local Development

```bash
supabase start          # Start local Supabase
supabase db reset       # Apply migrations + seed
npm run dev             # Start Next.js dev server
```

- Inbucket (email): http://localhost:54324
- Supabase Studio: http://localhost:54323
- App: http://localhost:3000
