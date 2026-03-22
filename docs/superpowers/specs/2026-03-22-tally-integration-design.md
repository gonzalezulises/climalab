# Tally.so Integration — Design Spec

## Goal

Replace ClimaLab's custom survey frontend with Tally.so forms generated automatically via API when a campaign is activated. Tally handles the respondent UX; ClimaLab handles processing, statistics, and reporting.

## Architecture

```
Admin activates campaign
  → ClimaLab calls Tally API (POST /forms)
  → Generates form: demographics + dimensions (1 page each) + open questions + eNPS
  → Configures webhook (POST /webhooks → climalab.vercel.app/api/webhooks/tally)
  → Saves form_id, form_url, and field mappings in DB
  → Admin shares the Tally link

Respondent fills form on Tally
  → Tally webhook POST → /api/webhooks/tally
  → Validate SHA256 signature
  → Create respondent (status=completed)
  → Map fields → item_ids via tally_form_mappings
  → INSERT responses, open_responses, enps_score
```

## Decisions

| Decision             | Choice                                    | Rationale                                               |
| -------------------- | ----------------------------------------- | ------------------------------------------------------- |
| Field mapping        | Mapping table (`tally_form_mappings`)     | Flexible, allows Google Sheets backup reconciliation    |
| Form creation timing | On campaign activation                    | Avoids creating orphan forms for discarded drafts       |
| Form structure       | 1 page per dimension                      | Best UX for long surveys, Tally handles pagination well |
| Item shuffle         | No shuffle (fixed sort_order)             | Bias mitigated by dimension separation into pages       |
| Attention checks     | Included as LINEAR_SCALE                  | Standard quality control, calculateResults handles them |
| Branding             | Apply org colors via Tally theme settings | Differentiator for sales, minimal code                  |

## Database

New table `tally_form_mappings`:

```sql
CREATE TABLE tally_form_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tally_form_id text NOT NULL,
  tally_form_url text NOT NULL,
  tally_field_key text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('item', 'demographic', 'open_response', 'enps')),
  target_id uuid REFERENCES items(id),
  target_meta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, tally_field_key)
);
```

- `target_type = 'item'`: `target_id` = item UUID, `target_meta` = NULL
- `target_type = 'demographic'`: `target_id` = NULL, `target_meta` = 'department' | 'tenure' | 'gender'
- `target_type = 'open_response'`: `target_id` = NULL, `target_meta` = 'strength' | 'improvement' | 'general'
- `target_type = 'enps'`: `target_id` = NULL, `target_meta` = NULL

## Form Structure Generated in Tally

```
Page 1: Welcome + Demographics
  - FORM_TITLE: "Encuesta de Clima Organizacional — {org_name}"
  - HIDDEN_FIELDS: campaign_id
  - MULTIPLE_CHOICE: Department (dynamic options from org.departments)
  - MULTIPLE_CHOICE: Tenure (<1, 1-3, 3-5, 5-10, 10+)
  - MULTIPLE_CHOICE: Gender (Femenino, Masculino, Otro, Prefiero no decir)

Pages 2-23: Base instrument dimensions (22 pages)
  - TITLE: dimension name (e.g., "Orgullo Institucional")
  - LINEAR_SCALE 1-5: one per item (4-6 per page)
    Labels: "Totalmente en desacuerdo" → "Totalmente de acuerdo"

Pages 24-N: Optional modules (CAM, CLI, DIG — if selected)
  - Same structure as base dimensions

Final Page: Open questions + eNPS
  - TEXTAREA: "¿Cuál consideras que es la mayor fortaleza de la organización?"
  - TEXTAREA: "¿Qué aspecto consideras que la organización debería mejorar?"
  - TEXTAREA: "¿Hay algo más que quieras compartir?"
  - LINEAR_SCALE 0-10: eNPS

Settings:
  - theme: colors from org brand_config
  - language: "es"
  - redirectUrl: "{baseUrl}/survey/thanks"
```

## Components

### 1. Migration: `000022_tally_form_mappings.sql`

- CREATE TABLE tally_form_mappings
- RLS policies (authenticated read/write, service_role all)

### 2. Server Action: `src/actions/tally.ts`

- `createTallyForm(campaignId)` — builds form via Tally API, saves mappings
- `getTallyFormUrl(campaignId)` — returns public form URL

### 3. API Route: `src/app/api/webhooks/tally/route.ts`

- POST handler for Tally webhook
- Validates `Tally-Signature` header (SHA256)
- Creates respondent with status=completed
- Maps tally field keys → item_ids via mappings table
- Inserts responses, open_responses, updates enps_score

### 4. UI Changes

- Campaign activation flow calls `createTallyForm`
- `PublicLinkCard` shows Tally form URL instead of internal link
- Add `tally_form_id` column to campaigns table (optional, for quick lookup)

### 5. Environment Variables

- `TALLY_API_KEY` — Tally API bearer token
- `TALLY_WEBHOOK_SECRET` — Signing secret for webhook validation

## What Does NOT Change

- `calculateResults` — reads from same tables
- `responses`, `open_responses`, `respondents` — same schema
- Statistical engine, reports, AI insights, ONA — all intact
- Existing survey (`/survey/[token]`) — kept as fallback

## Env Vars to Add

- `TALLY_API_KEY` (required for form creation)
- `TALLY_WEBHOOK_SECRET` (required for webhook validation)
