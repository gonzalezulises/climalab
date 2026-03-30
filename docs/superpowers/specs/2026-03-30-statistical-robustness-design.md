# ClimaLab Statistical Robustness — Design Spec

> **Date:** 2026-03-30
> **Status:** Approved
> **Goal:** Implementar 5 mejoras estadísticas para validar la robustez del instrumento Core v4.0 y habilitar comparaciones confiables.

## Scope

1. **CFA** — Análisis Factorial Confirmatorio (validar estructura de 22 dimensiones)
2. **Invariancia de medición** — Confirmar equivalencia entre grupos
3. **Pruebas de significancia wave-over-wave** — Determinar si cambios entre mediciones son reales
4. **Intervalos de confianza entre segmentos** — Evitar reportar diferencias no significativas
5. **HLM** — Modelado Multinivel (separar varianza individual/equipo/organización)

---

## Architecture

### Computation split: TypeScript for lightweight, Python for heavy

```
TypeScript (src/lib/statistics.ts)
├─ welchTTest(wave1, wave2)
├─ bootstrapCI(sample1, sample2, iterations)
├─ cohensD(mean1, mean2, sd1, sd2, n1, n2)
└─ segmentSignificance(segA, segB)
→ Executed within calculateResults()
→ Stored in campaign_results.metadata

Python (scripts/statistical-engine.py)
├─ cfa <campaign_id>          (semopy)
├─ cfa --cross-org             (semopy)
├─ invariance <campaign_id>    (semopy)
├─ invariance --cross-org      (semopy)
└─ hlm <campaign_id>           (pymer4/statsmodels)
→ Invoked via uv run (same pattern as ONA)
→ Stored in campaign_analytics
```

### Storage — no new tables

- `campaign_results.metadata` (JSONB): significance and CI fields added inline
- `campaign_analytics.data` (JSONB): CFA, invariance, HLM results with dedicated `analysis_type` values

### New `analysis_type` values in `campaign_analytics`

| analysis_type           | Level     | Content                                           |
| ----------------------- | --------- | ------------------------------------------------- |
| `cfa_campaign`          | Campaign  | Fit indices, factor loadings, problematic items   |
| `cfa_instrument`        | Cross-org | Global Core v4.0 validation                       |
| `invariance_campaign`   | Campaign  | Invariance across departments/gender/tenure       |
| `invariance_instrument` | Cross-org | Invariance across organizations                   |
| `hlm_campaign`          | Campaign  | ICC per dimension, 2-level variance decomposition |
| `hlm_instrument`        | Cross-org | 3-level variance decomposition                    |

---

## 1. Significance Testing (TypeScript)

### New functions in `src/lib/statistics.ts`

```typescript
welchTTest(sample1: number[], sample2: number[])
→ { t, df, pValue, significant: boolean }  // α = 0.05

bootstrapCI(sample1: number[], sample2: number[], options?: { iterations?: number, alpha?: number })
→ { lower, upper, meanDiff, significant: boolean }  // default: 2000 iter, α = 0.05

cohensD(mean1, mean2, sd1, sd2, n1, n2)
→ { d, label: "negligible" | "small" | "medium" | "large" }
// |d| < 0.2 negligible, 0.2-0.5 small, 0.5-0.8 medium, >= 0.8 large

segmentSignificance(segA: number[], segB: number[])
→ { welch, bootstrap: BootstrapResult | null, effectSize }
// bootstrap only when n < 30 in either group
```

### Integration in `calculateResults()`

When a previous campaign exists for the same organization:

1. For each dimension × segment, load scores from previous wave
2. Run `welchTTest` + `cohensD` (always) and `bootstrapCI` (if n < 30)
3. Store in `campaign_results.metadata.wave_comparison`:

```jsonc
{
  "wave_comparison": {
    "previous_campaign_id": "uuid",
    "previous_avg": 3.8,
    "current_avg": 4.1,
    "delta": 0.3,
    "welch": { "t": 2.31, "df": 87.4, "p_value": 0.023, "significant": true },
    "bootstrap": null,
    "effect_size": { "d": 0.42, "label": "small" },
    "method": "welch_t",
  },
}
```

### Presentation (3 layers)

- **Trends page (admin):** badge next to delta — "↑ Mejora significativa" (green), "↓ Declive significativo" (red), "≈ Cambio no concluyente" (gray)
- **Segments page:** same badge when comparing two segments with n >= 10 each
- **Technical page (ficha técnica):** full table with dimension, delta, t, df, p-value, CI 95%, Cohen's d, method, n per wave

---

## 2. CFA — Confirmatory Factor Analysis (Python)

### Model specification

22 correlated latent factors, each measured by its 4-6 observed items. Generated dynamically from `dimensions` + `items` tables. ENG included as correlated factor.

Estimator: DWLS (robust for ordinal Likert data). Library: `semopy`.

### Two execution levels

**Campaign CFA** (`uv run scripts/statistical-engine.py cfa <campaign_id>`):

- Requirement: n >= 100 valid respondents
- Reads responses, builds respondent × item matrix, inverts reverse items
- Stores in `campaign_analytics` as `analysis_type = 'cfa_campaign'`

**Cross-org CFA** (`uv run scripts/statistical-engine.py cfa --cross-org`):

- Requirement: n >= 500 accumulated respondents
- Pools all organizations (service_role)
- Stores as `analysis_type = 'cfa_instrument'` without `campaign_id`

### Output structure

```jsonc
{
  "fit_indices": {
    "chi2": 1245.3,
    "df": 812,
    "chi2_df_ratio": 1.53,
    "cfi": 0.94,
    "rmsea": 0.048,
    "srmr": 0.052,
    "fit_verdict": "aceptable",
  },
  "factor_loadings": [
    {
      "dimension_code": "LID",
      "items": [
        { "item_id": "uuid", "item_text": "...", "loading": 0.78, "se": 0.04, "flag": null },
      ],
      "avg_loading": 0.68,
      "flag": null,
    },
  ],
  "problematic_items": [
    { "item_id": "uuid", "dimension_code": "CMP", "loading": 0.31, "issue": "loading < 0.40" },
  ],
  "factor_correlations": [
    { "factor_a": "LID", "factor_b": "CON", "r": 0.82, "flag": "high_correlation" },
  ],
  "discriminant_issues": [
    {
      "factors": ["LID", "CON"],
      "r": 0.82,
      "issue": "r > 0.80 suggests poor discriminant validity",
    },
  ],
  "sample_n": 156,
  "estimator": "DWLS",
  "computed_at": "...",
  "engine_version": "1.0.0",
}
```

### Automatic flags

| Condition                  | Flag               | Impact                             |
| -------------------------- | ------------------ | ---------------------------------- |
| Factor loading < 0.40      | `low_loading`      | Weak item, marked in ficha técnica |
| Factor correlation > 0.80  | `high_correlation` | Possible dimensional redundancy    |
| CFI < 0.90 or RMSEA > 0.08 | `poor_fit`         | Structure not supported by data    |

---

## 3. Measurement Invariance (Python)

### Progressive levels

1. **Configural** — Same factorial structure across groups
2. **Metric** — Same factor loadings across groups (scale units are equivalent)
3. **Scalar** — Same intercepts across groups (means are comparable)

### Evaluation criterion — Chen (2007)

| Transition          | Holds if...                       |
| ------------------- | --------------------------------- |
| Configural → Metric | ΔCFI <= 0.010 and ΔRMSEA <= 0.015 |
| Metric → Scalar     | ΔCFI <= 0.010 and ΔRMSEA <= 0.015 |

### Grouping variables

**Campaign level:** department, tenure, gender (n >= 75 per group, min 2 groups)
**Cross-org level:** organization (n >= 75 per org, min 3 orgs)

### Output structure

```jsonc
{
  "grouping_variable": "department",
  "groups": [
    { "name": "Ventas", "n": 82 },
    { "name": "Operaciones", "n": 91 },
  ],
  "levels": [
    { "level": "configural", "cfi": 0.932, "rmsea": 0.051, "passed": true },
    {
      "level": "metric",
      "cfi": 0.928,
      "rmsea": 0.053,
      "delta_cfi": -0.004,
      "delta_rmsea": 0.002,
      "passed": true,
    },
    {
      "level": "scalar",
      "cfi": 0.919,
      "rmsea": 0.058,
      "delta_cfi": -0.009,
      "delta_rmsea": 0.005,
      "passed": true,
    },
  ],
  "highest_supported": "scalar",
  "verdict": "Las comparaciones de medias entre departamentos son válidas",
  "partial_invariance": null,
  "sample_n": 173,
  "computed_at": "...",
  "engine_version": "1.0.0",
}
```

### Partial invariance fallback

If scalar fails but metric holds:

- Release intercepts of most problematic items (<= 20%)
- If partial scalar achieved → `partial_invariance` lists freed items
- UI: "Las comparaciones son válidas con reservas — items X, Y, Z se comportan diferente entre grupos"

If metric fails:

- No scalar attempted
- Verdict: comparisons not valid, warning shown on segments page

### Dependency

Invariance requires CFA to exist. If missing, the subcommand runs CFA first automatically.

---

## 4. HLM — Hierarchical Linear Modeling (Python)

### What it answers

"Does climate in this dimension depend more on the person, their department, or the organization?"

Quantified via ICC (Intraclass Correlation Coefficient).

### 2-level model (campaign)

```
Score_ij = γ00 + u_0j + e_ij

Level 1 (individual i in department j): e_ij
Level 2 (department j): u_0j

ICC = var(u_0j) / [var(u_0j) + var(e_ij)]
```

Null model (intercept-only) per dimension. Estimator: REML.

**Requirements:** n >= 50, >= 3 departments with n >= 10 each.

### 3-level model (cross-org)

```
Score_ijk = γ000 + v_00k + u_0jk + e_ijk

Level 1 (individual): e_ijk
Level 2 (department in org): u_0jk
Level 3 (organization): v_00k
```

**Requirements:** n >= 200, >= 5 organizations with >= 3 departments each.

### ICC classification

| ICC         | Label      | Interpretation                            |
| ----------- | ---------- | ----------------------------------------- |
| < 0.05      | negligible | Purely individual experience              |
| 0.05 - 0.15 | bajo       | Slight team influence                     |
| 0.15 - 0.30 | moderado   | Department notably influences             |
| > 0.30      | alto       | Experience strongly depends on department |

### Output structure

```jsonc
{
  "levels": 2,
  "grouping": ["department"],
  "dimensions": [
    {
      "code": "LID",
      "name": "Liderazgo Efectivo",
      "icc_department": 0.35,
      "icc_label": "alto",
      "variance_individual": 0.52,
      "variance_department": 0.28,
      "grand_mean": 3.72,
      "n_respondents": 156,
      "n_groups": 8,
      "convergence": true,
    },
  ],
  "summary": {
    "most_departmental": { "code": "LID", "icc": 0.35 },
    "most_individual": { "code": "BAL", "icc": 0.06 },
    "avg_icc": 0.18,
    "interpretation": "...",
  },
  "model": "null_intercept_only",
  "estimator": "REML",
  "computed_at": "...",
  "engine_version": "1.0.0",
}
```

### Non-convergence handling

If model fails to converge for a dimension: `convergence: false`, ICC reported as 0 with note. Not an error — means no detectable group effect.

### Library fallback

1. `pymer4` (R `lme4` wrapper, more robust)
2. If R not available: `statsmodels.MixedLM` (pure Python)
3. Output identical, only `estimator` field changes

---

## 5. Python Engine: `scripts/statistical-engine.py`

Single script with PEP 723 inline deps (same pattern as `ona-analysis.py`).

### Invocation

```bash
uv run scripts/statistical-engine.py cfa <campaign_id>
uv run scripts/statistical-engine.py cfa --cross-org
uv run scripts/statistical-engine.py invariance <campaign_id> --groups department,tenure,gender
uv run scripts/statistical-engine.py invariance --cross-org
uv run scripts/statistical-engine.py hlm <campaign_id>
uv run scripts/statistical-engine.py hlm --cross-org
uv run scripts/statistical-engine.py --test
```

**Dependencies:** `semopy`, `statsmodels`, `pandas`, `numpy`, `supabase`.

### Shared data loading pipeline

1. Read responses + items + dimensions + respondents from Supabase
2. Build respondent × item matrix
3. Invert reverse items (6 - score)
4. Filter disqualified respondents
5. Execute analysis
6. Save result to `campaign_analytics`

---

## 6. Server Action: `src/actions/statistical-validation.ts`

```typescript
"use server"

// Campaign level (on-demand via UI button)
runCampaignCFA(campaignId: string)
runCampaignInvariance(campaignId: string)
runCampaignHLM(campaignId: string)

// Read results (SSR)
getCampaignCFA(campaignId: string)
getCampaignInvariance(campaignId: string)
getCampaignHLM(campaignId: string)

// Cross-org (super_admin only)
runInstrumentCFA()
runInstrumentInvariance()
runInstrumentHLM()
```

`run*` functions invoke Python via `child_process.execFile` (same pattern as ONA in `src/actions/ona.ts`). `get*` functions read from `campaign_analytics`.

---

## 7. Product Surfaces

No new pages. Integrate into existing:

| Content                             | Where                                                        |
| ----------------------------------- | ------------------------------------------------------------ |
| Wave-over-wave significance         | `trends/page.tsx` — badges next to deltas                    |
| Segment confidence intervals        | `segments/page.tsx` — badges on comparisons                  |
| CFA fit indices + problematic items | `technical/page.tsx` — new "Validez Factorial" section       |
| Invariance results                  | `technical/page.tsx` — new "Invariancia de Medición" section |
| ICC / HLM indicators                | `dimensions/page.tsx` — indicator per dimension              |
| All detailed tables                 | `technical/page.tsx` — expanded ficha técnica                |
| Robustness summaries                | `quality/page.tsx` — instrument robustness section           |

Execution buttons (CFA, invariance, HLM) in `technical/page.tsx`, only visible when minimum thresholds are met.

### AI Insights enrichment

Prompts for `dashboard_narrative`, `driver_insights`, `segment_profiles` receive as additional context:

- ICC per dimension (if HLM exists)
- Significance of changes (if previous wave exists)
- Invariance warnings (if invariance fails)

No architecture change — only enriched `userContent` passed to prompts.

---

## 8. Minimum Sample Thresholds

| Analysis      | Minimum                                | Justification                        |
| ------------- | -------------------------------------- | ------------------------------------ |
| Welch t-test  | n >= 15 per wave                       | Robust from ~15                      |
| Bootstrap CI  | n >= 10 per wave                       | Works with small n                   |
| Segment CI    | n >= 10 per segment                    | Consistent with Pearson threshold    |
| CFA campaign  | n >= 100                               | 5:1 items/respondents for 22 factors |
| CFA cross-org | n >= 500                               | Standard for robust SEM              |
| Invariance    | n >= 75 per group                      | Minimum for configural               |
| HLM 2-level   | n >= 50, >= 3 departments with n >= 10 | ICC needs between-group variance     |
| HLM 3-level   | n >= 200, >= 5 organizations           | Statistical power for level 3        |

When threshold not met: analysis not executed, UI shows explanatory message.

---

## 9. Testing Strategy

### TypeScript unit tests (`src/lib/__tests__/`)

**`significance.test.ts`:**

- welchTTest: significant, non-significant, equal samples, n < 15 returns null
- bootstrapCI: CI contains 0, CI excludes 0, reproducibility with seed
- cohensD: negligible, small, medium, large
- segmentSignificance: wrapper correctness, bootstrap only when n < 30

**`significance-integration.test.ts`:**

- With previous wave: metadata includes `wave_comparison`
- Without previous wave: metadata doesn't include it
- Insufficient n: not calculated

### Python tests (`uv run scripts/statistical-engine.py --test`)

- CFA: synthetic data (3 factors, 9 items) → fit indices in expected range; n < 100 → exit with message
- Invariance: identical groups → scalar passes; different intercepts → scalar fails, metric passes; n < 75 → excluded
- HLM: simulated ICC → estimated within ±0.05; < 3 departments → exit; non-convergence → `convergence: false`

### E2E (testing-agent)

- Verify `campaign_results.metadata` contains `wave_comparison` for campaigns with prior wave
- Verify `campaign_analytics` contains `cfa_campaign` after execution
- Don't run CFA/HLM in e2e (too slow) — only verify graceful handling of insufficient data

---

## 10. Rollout (3 independent phases)

**Phase 1 — Significance & CI (TypeScript):**

- Pure functions in `statistics.ts`
- Integration in `calculateResults()`
- Update trends and segments pages
- Update ficha técnica
- Deploy

**Phase 2 — CFA + Invariance (Python):**

- `statistical-engine.py` with `cfa` and `invariance` subcommands
- Server action + buttons in technical page
- Test with seed data (120 respondents passes CFA threshold)
- Deploy

**Phase 3 — HLM (Python):**

- Add `hlm` subcommand to engine
- Integrate in dimensions page
- Enrich AI insight prompts with ICC
- Deploy

Each phase is independent and deployable separately.
