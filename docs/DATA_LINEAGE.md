# Data Lineage

## Objetivo

Este documento describe el linaje técnico actual de ClimaLab desde la captura de respuestas hasta la materialización de resultados analíticos.

## Capas

### 1. Raw capture

- `respondents`
- `participants`
- `responses`
- `open_responses`
- `ingest_events`

Las respuestas del survey web y de las ingestas alternativas convergen al mismo modelo raw. `responses.source` identifica el canal (`web`, `webhook`, `csv`, `api`).

`ingest_events` ahora también conserva:

- `contract_version`
- `external_subject_id`
- `mapping_version`
- `metadata`

### 2. Campaign instrument mapping

- `campaigns.instrument_id`
- `campaigns.module_instrument_ids`
- `campaign_instruments`

`campaign_instruments` es la fuente canónica de procedencia de instrumentos por campaña. El trigger `trg_sync_campaign_instruments` mantiene sincronizado el mapeo a partir de `campaigns`.

### 3. Taxonomía analítica

- `dimensions.category`
- `dimension_taxonomy.analytics_category`

`dimension_taxonomy` resuelve la categoría analítica persistida. Los módulos dejan de depender de remapeos exclusivos de UI y pasan a registrarse como `modulos`.

### 4. Corridas analíticas

- `analysis_runs`
- `analysis_run_respondent_quality`
- `analysis_run_snapshots`

Cada corrida guarda:

- campaña
- fuente de ejecución (`manual`, `batch`, `seed`, `incremental_refresh`, `response_hook`, `cron`)
- versión lógica
- snapshot de entrada
- estado final

La calidad por respondent se persiste por corrida, sin mutar el estado operacional del respondente.

### 5. Serving cache

- `campaign_stats`

`campaign_stats` es cache incremental de serving. Ahora incluye:

- `analysis_run_id`
- `instrument_id`
- `instrument_type`
- `dimension_id`

No reemplaza la capa analítica completa.

### 6. Deterministic analytics

- `campaign_results`
- `campaign_analytics`

Estas tablas representan el output analítico determinista más reciente por campaña. Los rows incluyen linaje explícito por corrida, instrumento y dimensión cuando aplica.

### 7. AI enrichment

- `campaign_ai_insights`

Las narrativas IA ya no comparten la misma superficie de almacenamiento que los analytics deterministas.

### 8. ONA operational status

- `campaign_ona_runs`

El análisis de red mantiene un estado operativo independiente (`pending`, `completed`, `deferred`, `failed`) para distinguir la salud del runtime Python respecto del cálculo estadístico principal.

## Flujo

### Survey web

`/survey/[token]` -> `survey-session.ts` -> `respondents` + `responses(source='web')` + `open_responses` -> `refresh_campaign_stats()`

### Ingesta alternativa

`/api/ingest/direct|csv|webhook` -> `normalizeResponse()` -> `process_normalized_ingest()` -> raw tables + `ingest_events`

### Incremental

`responses INSERT` -> `process_response` / `refresh_campaign_stats()`

### Batch

`/api/jobs/analyze-batch` -> `calculateResults()` -> `analysis_runs` -> `campaign_results` + `campaign_analytics`

### Backfill histórico

`/api/jobs/backfill-analysis` -> selección de campañas sin snapshot / sin corrida / lógica desactualizada -> `calculateResults()`

## Reglas clave

- Un resultado de dimensión debe poder rastrearse a `analysis_run_id`, `instrument_id`, `instrument_type` y `dimension_id`.
- Los módulos son instrumentos de primera clase en el linaje, no solo convenciones de `dimension_code`.
- La ingesta alternativa debe ser atómica e idempotente.
- El contrato de ingestión debe ser versionado y persistido para conciliación futura.
- Las narrativas IA no deben mezclarse con analytics deterministas.
