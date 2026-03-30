# Campaign Quality And AI Evaluation Design

## Goal

Add a campaign-level quality reporting surface that makes instrument quality, statistical interpretability, and AI output quality explicit without altering ClimaLab's core scoring engine, lineage, or existing result contracts.

## Problem

ClimaLab already exposes parts of the technical layer in the campaign technical page, but it still lacks two things that matter for auditability and professional delivery:

1. A dedicated instrument quality report per campaign with stronger psychometric and interpretive controls.
2. A structured AI evaluation matrix that separates methodological quality from operational performance.

Today, reliability and data quality are fragmented across `campaign_results`, `campaign_analytics`, `analysis_run_respondent_quality`, and the technical page. AI outputs are persisted, but there is no explicit scorecard that tells an admin whether those outputs were faithful, stable, actionable, or operationally healthy.

## Constraints

- Preserve the current statistical engine and campaign lineage.
- Avoid changing existing dashboard/result contracts unless additive.
- Keep the new feature campaign-scoped.
- Reuse existing analytical artifacts before inventing new calculations.
- Keep the first version explainable to non-technical admins.

## Recommended Product Shape

Use a hybrid approach:

- Keep a compact summary inside the existing technical page.
- Add a new result sub-page: `quality`.

This gives fast access to quality signals in the current technical flow while creating a dedicated space for deeper evidence, scoring, and recommendations.

## User Experience

### Technical Page Summary

Extend `/campaigns/[id]/results/technical` with two new summary cards:

- `Calidad del instrumento`
- `Desempeño de IA`

These cards should show:

- overall status badge
- headline score
- number of warnings
- strongest and weakest signals
- link to the detailed quality page

### New Quality Page

Create `/campaigns/[id]/results/quality` with two primary sections.

#### 1. Instrument Quality

Purpose: determine whether the campaign results are statistically interpretable and where the instrument is weak.

Recommended sections:

- Overall quality score and interpretability badge
- Sample and completion quality
- Response quality and disqualification quality
- Dimension reliability table
- Item diagnostics table
- Segment agreement quality
- Strong warnings and interpretation rules

Key output labels:

- `robusto`
- `aceptable`
- `precaucion`
- `no_interpretable`

#### 2. AI Evaluation Matrix

Purpose: assess whether AI-generated insights are methodologically trustworthy and operationally healthy.

Two layers:

- `Metodologica`
- `Operativa`

Methodological criteria:

- fidelidad a los datos
- cobertura analitica
- consistencia interna
- sensibilidad a la señal
- calibracion/prudencia
- accionabilidad
- robustez entre regeneraciones
- alineacion metodologica

Operational criteria:

- proveedor
- modelo
- latencia
- tasa de exito
- fallback
- costo estimado

The page should show:

- campaign-level aggregate score
- per-insight-type matrix
- alerts when an insight is low-confidence or weakly grounded

## Data Model Strategy

### Instrument Quality

Use a new campaign analytics artifact for the detailed quality report.

Recommended `analysis_type` additions:

- `instrument_quality_report`
- `ai_evaluation_matrix`

Rationale:

- These are campaign-scoped analytic artifacts.
- They should remain versioned and tied to analysis runs where possible.
- They fit the current serving model without introducing a large new table immediately.

### Analysis Inputs

Reuse and extend:

- `campaign_results`
- `campaign_analytics`
- `analysis_run_respondent_quality`
- `campaign_ai_insights`
- `campaign_ona_runs`
- `responses`
- `respondents`
- `items`
- `dimensions`

## Statistical Scope For Instrument Quality

### Reuse Existing Metrics

- Cronbach's alpha
- rwg
- respondent quality/disqualification
- sample size
- response rate
- margin of error

### Add Stronger Psychometric Diagnostics

First version should add:

- corrected item-total correlation
- alpha if item deleted
- missingness per item and per dimension
- floor/ceiling concentration per item
- response distribution entropy or concentration summary
- dimension interpretability status based on combined rules

Potential later additions:

- McDonald's omega
- CFA / model fit
- measurement invariance by key segments

These later additions are valuable, but they should not be in the first implementation because they add methodological and computational complexity.

## AI Evaluation Method

### Methodological Scoring

AI evaluation should not guess from pure prompt text. It should compare persisted AI outputs against campaign evidence and product rules.

The first version should score AI artifacts using deterministic heuristics:

- references high/low dimensions that actually exist
- does not contradict campaign results
- does not overstate weak evidence
- respects suppressed segments and low-quality dimensions
- uses enough evidence breadth
- produces concrete recommendations

This keeps the matrix transparent and auditable.

### Operational Scoring

Operational metrics should be derived from stored AI metadata and generation artifacts:

- provider/model
- generation presence
- latency where available
- fallback source if available
- success/failure coverage by expected insight type

## Architecture

### New Server Actions / Loaders

- load campaign quality detail
- load AI evaluation detail
- load campaign quality page aggregate

### New Analysis Builders

- `instrument-quality.ts`
- `ai-evaluation.ts`

These should be pure builders operating on campaign artifacts rather than UI-specific helpers.

### New Route

- `src/app/(dashboard)/campaigns/[id]/results/quality/page.tsx`

### Navigation Update

Add `quality` to the results navigation alongside `technical`.

## Interpretability Rules

The campaign should expose an overall interpretability status driven by explicit rules, for example:

- `no_interpretable` if valid sample is too low or quality is critically degraded
- `precaucion` if several dimensions have low alpha, high missingness, or weak agreement
- `aceptable` if most signals are usable but some caveats remain
- `robusto` if reliability, agreement, response quality, and coverage are all strong

These rules must be deterministic and documented in the UI.

## Testing Strategy

- unit tests for item diagnostics and interpretability rules
- unit tests for AI evaluation heuristics
- page-level loader tests for empty and partial states
- regression test ensuring no mutation of the scoring engine
- build/lint/full test suite

## Risks

- Overloading the technical area with too much detail
- Presenting psychometric labels too aggressively for low-n campaigns
- AI score heuristics becoming too opaque

Mitigations:

- put summaries in `technical`, depth in `quality`
- document every rule
- keep first version deterministic and auditable

## Success Criteria

- Every campaign exposes an explicit instrument-quality report.
- Every campaign with AI outputs exposes an AI evaluation matrix.
- Admins can distinguish robust findings from findings that require caution.
- No changes to core scoring outputs are required for existing pages to keep working.
