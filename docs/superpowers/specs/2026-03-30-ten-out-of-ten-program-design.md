# ClimaLab 10/10 Program Design

## Goal

Llevar ClimaLab de una plataforma ya sólida a una plataforma operativamente excelente y metodológicamente gobernada en cinco dimensiones:

1. excelencia metodológica y estadística
2. excelencia de IA
3. excelencia operativa
4. excelencia semántica
5. excelencia de performance y capacidad

## Current State

ClimaLab ya tiene una base fuerte:

- linaje explícito con `analysis_runs`, `analysis_run_snapshots`, `campaign_instruments`
- calidad del instrumento y matriz de evaluación de IA por campaña
- gobernanza inicial de IA con contratos, estados editoriales y eventos de generación
- operaciones con backfill, observabilidad, smoke tests y panel técnico
- serving semántico básico para resultados y familias analíticas

La brecha al 10/10 no está en “tener más páginas”, sino en formalizar y automatizar controles que hoy existen parcialmente o de forma dispersa.

## Recommended Approach

### Option 1: Program foundations first

Construir primero una capa compartida de excelencia:

- baseline estadístico reusable
- baseline de performance reusable
- evidencia estructurada de IA
- scorecards y SLOs operativos
- capa semántica estable de lectura

Luego exponer esas capacidades en páginas, jobs y reportes.

**Pros**

- menor duplicación
- menor riesgo metodológico
- mejor auditabilidad

**Cons**

- la primera entrega es más de infraestructura que de UI visible

### Option 2: Deliver surface by surface

Mejorar una página a la vez: quality, technical, operations, export.

**Pros**

- feedback visible rápido

**Cons**

- tiende a duplicar reglas y loaders
- no cierra bien la gobernanza transversal

### Option 3: Performance first

Priorizar capacity/performance y dejar IA/metodología después.

**Pros**

- reduce riesgo operativo

**Cons**

- deja a medias la capa analítica y de gobernanza

### Recommendation

Tomar **Option 1**. ClimaLab ya tiene suficientes superficies. El siguiente salto de excelencia viene de una base compartida, no de más pantallas aisladas.

## Architecture

El programa se divide en cinco bloques que comparten infraestructura:

### 1. Statistical Excellence

Añadir una capa de baselines y drift para comparar campañas y corridas:

- `analysis_statistical_baselines`
- score de robustez longitudinal
- comparabilidad entre corridas y campañas
- protocolo explícito de interpretación

Esto no reemplaza `campaign_results` ni `campaign_analytics`; los contextualiza.

### 2. AI Excellence

Extender la gobernanza actual con:

- evidencia estructurada por claim
- scorecards de fidelidad/cobertura/calibración
- suite de regresión con casos gold
- gating de publicación

La IA no solo debe ser válida por schema; también debe ser defendible metodológicamente.

### 3. Operational Excellence

Formalizar SLOs y scorecards del pipeline:

- salud por dominio: ingest, dispatch, batch, AI, ONA
- umbrales explícitos
- resúmenes operativos persistidos
- alertas de severidad derivadas de SLOs

La vista de operaciones debe pasar de “telemetría útil” a “centro de control”.

### 4. Semantic Excellence

Publicar una capa semántica estable para consumo:

- resultados core vs módulos
- comparativos longitudinales
- packs estandarizados para exportes e IA

Esto reduce acoplamiento a tablas físicas y estabiliza la interpretación del producto.

### 5. Capacity Excellence

Persistir un baseline real de performance/capacidad:

- costos por campaña
- percentiles por duración
- campañas outlier
- presupuesto de recompute

Esto permite operar backfills y campañas grandes con criterio.

## Data Model Additions

### `analysis_statistical_baselines`

Tabla para persistir comparativas y nivel de robustez por campaña:

- `campaign_id`
- `analysis_run_id`
- `comparison_scope` (`latest`, `historical`, `cross_campaign`)
- `baseline_version`
- `robustness_score`
- `drift_summary`
- `interpretation_status`
- `interpretation_warnings`

### `campaign_ai_evidence`

Tabla para claims y evidencia estructurada por insight:

- `campaign_id`
- `analysis_run_id`
- `insight_type`
- `claim_key`
- `claim_text`
- `evidence`
- `metric_refs`
- `dimension_codes`
- `confidence_label`
- `policy_warnings`

### `pipeline_slo_snapshots`

Tabla para snapshots operativos:

- `snapshot_date`
- `domain`
- `slo_target`
- `observed_success_rate`
- `observed_latency_ms`
- `error_budget_remaining`
- `status`

### `performance_baselines`

Tabla para baseline de capacidad:

- `scope`
- `metric_key`
- `baseline_version`
- `summary`
- `observed_at`

## Product Surfaces

### Campaign results

- `Quality`: sumar robustez longitudinal y comparabilidad
- `Technical`: resumir statistical baselines y AI evidence coverage
- `AI Governance`: añadir claims/evidence y scorecards

### Operations

- scorecards SLO por dominio
- alertas ligadas a presupuesto de error
- baseline de performance y outliers

### Exports

- soporte para incluir evidencia IA y estado metodológico
- payload semántico estable para DOCX/AI report

## Error Handling

- Si falta baseline histórico, mostrar estado `pending_baseline`, no fallar la página.
- Si no hay evidencia IA, degradar a `coverage_low` y bloquear `published`.
- Si falta dato suficiente para drift longitudinal, marcar `insufficient_history`.
- Si un snapshot SLO no puede calcularse, persistir evento fallido y mostrar warning operativo.

## Testing Strategy

### Unit tests

- score de robustez estadística
- derivación de drift y warnings
- normalización de evidencia IA
- scorecards SLO
- baseline de performance
- payload semántico longitudinal

### Integration tests

- loaders de campaign quality y AI governance con tablas nuevas
- operations overview con SLO snapshots y baselines
- export loaders usando semantic packs

### End-to-end / smoke

- smoke productivo sigue siendo gate
- E2E ops extiende checks para:
  - `pipeline_slo_snapshots`
  - `analysis_statistical_baselines`
  - `campaign_ai_evidence`
  - `performance_baselines`

## Delivery Strategy

No se debe intentar “cerrar el 10/10 absoluto” en una sola mutación de runtime. La implementación correcta es:

1. foundations persistentes y funciones puras
2. loaders/actions
3. superficies UI
4. docs y roadmap
5. verificación local
6. integración y despliegue

## Success Criteria

El programa se considera bien encaminado si, al cierre de esta ola:

- existe baseline estadístico persistido y visible por campaña
- la gobernanza IA tiene evidencia estructurada por claim
- operaciones muestra SLOs explícitos y no solo conteos
- existe baseline de performance persistido
- exportes e IA pueden consumir un paquete semántico estable
- todo pasa `lint`, `test`, `build` y `db reset`
