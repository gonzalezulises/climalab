# AI Governance Design

## Goal

Convert ClimaLab's AI layer from prompt-driven best effort generation into a governed subsystem with explicit contracts, versioned prompts, structured evidence, editorial state, and operational observability, without breaking current campaign result pages or the existing AI buttons.

## Current State

Confirmed by code:

- Each insight type has a dedicated system prompt under [/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/prompts](/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/prompts).
- The orchestration layer lives in [/Users/ulisesgonzalez/Documents/GitHub/climalab/src/actions/ai-insights.ts](/Users/ulisesgonzalez/Documents/GitHub/climalab/src/actions/ai-insights.ts).
- Insights are persisted in `campaign_ai_insights` with `campaign_id`, `analysis_run_id`, `insight_type`, `provider`, `model`, and `data`.
- Outputs are parsed with a permissive JSON extractor in [/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/json.ts](/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/ai/json.ts).
- There is already a campaign-level evaluation matrix in [/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/quality/ai-evaluation.ts](/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/quality/ai-evaluation.ts).

Gaps:

- No prompt version registry.
- No strict output validation per insight type.
- No evidence model linking claims to campaign metrics.
- No editorial workflow.
- No persisted failure telemetry for invalid outputs.
- No regression harness for prompt/schema drift.

## Architecture

### 1. Prompt Registry

Introduce a registry layer that defines, per `insight_type`:

- `prompt_version`
- `schema_version`
- `system_prompt`
- `output_contract_summary`
- `active`

The registry is code-defined for now, but the persisted output stores the selected version so runs remain auditable even if prompts evolve.

### 2. Strict Output Contracts

Each insight type gets a dedicated Zod schema describing the persisted payload.

The contract shape will be normalized around:

- `summary`
- `claims[]`
- optional `recommendations[]`
- optional type-specific payload fields
- `qualityCautions[]`

Each `claim` includes:

- `statement`
- `dimensionCodes[]`
- `metricRefs[]`
- `confidence`

This keeps existing pages functional while giving us stable structure for downstream evaluation and export.

### 3. Repair Loop

If the model returns invalid JSON or a payload that fails schema validation:

1. Extract JSON
2. Validate with Zod
3. If invalid, issue one repair prompt with the validation errors
4. Validate again
5. Persist failure telemetry if still invalid

This avoids silent empty success and makes provider/model failures observable.

### 4. Editorial State

Persist each AI insight with:

- `status`: `draft`, `approved`, `published`, `rejected`, `failed`
- `prompt_version`
- `schema_version`
- `input_fingerprint`
- `warnings[]`
- `validation_errors[]`
- `generated_at`

Current UI reads the latest `published` insight when available, otherwise latest `draft`.

### 5. Evidence and Governance Metadata

Persist structured metadata alongside the normalized insight:

- `provider`
- `model`
- `analysis_run_id`
- `prompt_version`
- `schema_version`
- `input_fingerprint`
- `warnings`
- `validation_errors`

This is the minimum required for auditability, support, and drift investigation.

### 6. AI Ops Surface

Add an internal governance surface that shows:

- coverage by insight type
- success rate
- failure count
- invalid output count
- prompt versions in use
- provider/model mix
- editorial state distribution
- methodological score by insight

This lives at the campaign level first and can later be aggregated at the operations level.

## Data Model

### Table evolution: `campaign_ai_insights`

Add columns:

- `status text not null default 'draft'`
- `prompt_version text`
- `schema_version text`
- `input_fingerprint text`
- `warnings jsonb not null default '[]'::jsonb`
- `validation_errors jsonb not null default '[]'::jsonb`
- `generated_at timestamptz`
- `published_at timestamptz`

Keep `data jsonb` as the canonical normalized payload.

### Optional companion table: `campaign_ai_generation_events`

Store every generation attempt:

- `campaign_id`
- `analysis_run_id`
- `insight_type`
- `provider`
- `model`
- `prompt_version`
- `schema_version`
- `status`
- `error_message`
- `latency_ms`
- `raw_excerpt`

This avoids overloading the primary content table with operational history.

## UI

### Campaign Quality page

Extend the AI matrix with:

- prompt version
- schema version
- editorial status
- warning badges
- evidence coverage

### New campaign governance page

Add a page under results:

- `AI Governance`

Sections:

- latest insight states
- per-type contract validity
- warnings and failures
- provider/model breakdown
- evidence completeness

### Existing AI buttons

Keep the buttons, but generation now:

- produces `draft`
- validates
- persists governance metadata
- reuses latest `published` output for stable viewing unless explicitly regenerating

## Testing Strategy

### Unit tests

- schemas accept valid payloads
- schemas reject malformed payloads
- repair loop retries once and records failures
- prompt registry resolves correct versions
- persistence stores metadata and statuses correctly

### Integration tests

- generate and persist each insight type with normalized payload
- failed validation yields `failed` or `draft` with warnings, not silent success
- reading functions prefer `published` over `draft`

### Regression tests

Create fixed fixtures for each insight type and verify:

- contract validity
- evidence field presence
- no unsupported dimension references
- caution language present when campaign quality is weak

## Rollout

1. Add schema + backward-compatible readers
2. Add contracts and registry
3. Migrate generators one by one
4. Add governance UI
5. Add regression fixtures

## Success Criteria

- Every insight type is validated against a schema before persistence
- Every stored insight exposes prompt and schema version
- Invalid outputs are visible and diagnosable
- Campaign pages still render with the normalized payload
- AI matrix reflects real governance metadata, not just presence/absence
