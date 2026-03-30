# Refactorización de Hotspots Design

## Objetivo

Reducir complejidad estructural en los hotspots principales de ClimaLab sin alterar:

- el linaje de datos
- el motor estadístico
- los contratos funcionales existentes
- los controles que evitan deriva o fallos operativos

La meta no es “bajar líneas” por estética, sino separar responsabilidades para disminuir blast radius, facilitar auditoría y hacer más seguros los cambios futuros.

## Restricciones Aprobadas

La refactorización puede limpiar interfaces internas y mover responsabilidades entre archivos, siempre que:

1. se preserve el linaje de la data
2. el motor estadístico siga intacto
3. los contratos sigan controlando deriva y fallos
4. no se introduzcan cambios visibles no intencionales

## Hotspots Priorizados

1. `src/actions/ai-insights.ts`
2. `src/actions/export.ts`
3. `src/app/survey/[token]/survey-client.tsx`
4. `src/actions/analytics.ts`
5. `src/actions/campaigns.ts`

## Enfoque Elegido

Se adopta una **extracción conservadora por capas**:

- mantener las funciones públicas actuales como fachadas
- mover lógica interna a módulos más pequeños y testeables
- evitar cambios de contratos externos salvo compatibilidad total hacia atrás
- verificar cada bloque antes de continuar

No se adopta una reescritura agresiva por dominio porque aumenta demasiado el riesgo operativo sobre código que hoy ya está funcionando en producción.

## Diseño por Hotspot

### 1. `ai-insights.ts`

Problema actual:

- mezcla descubrimiento de provider, llamadas HTTP, rate limiting, parsing JSON, prompts, persistencia y orquestación
- cualquier cambio en un proveedor o insight toca un archivo muy grande

Diseño:

- `src/lib/ai/provider.ts`
  - resolución de proveedor activo
  - metadata del proveedor
  - `callAI` y adapters por backend
- `src/lib/ai/json.ts`
  - extracción/parseo seguro de JSON
- `src/lib/ai/rate-limit.ts`
  - control de rate limit específico para IA
- `src/lib/ai/prompts/*.ts`
  - prompts por tipo de insight
- `src/lib/ai/persistence.ts`
  - lectura y escritura en `campaign_ai_insights`
- `src/actions/ai-insights.ts`
  - fachada pública y orquestación de casos de uso

Resultado buscado:

- mantener `generateAllInsights` y getters públicos
- aislar provider, prompts y persistencia

### 2. `export.ts`

Problema actual:

- mezcla carga de datos, composición de reportes, helpers DOCX, Excel y reportes IA

Diseño:

- `src/lib/export/loaders.ts`
  - carga paralela del dataset de exportación
- `src/lib/export/shared.ts`
  - helpers comunes, estilos, nombres de archivo
- `src/lib/export/excel.ts`
  - generación XLSX
- `src/lib/export/docx.ts`
  - generación DOCX
- `src/lib/export/ai-report.ts`
  - composición de reporte IA
- `src/actions/export.ts`
  - dispatcher público

Resultado buscado:

- un punto único de carga de datos
- generadores desacoplados por formato

### 3. `survey-client.tsx`

Problema actual:

- concentra estado, backup local, navegación de pasos, rendering y persistencia del flujo

Diseño:

- `src/app/survey/[token]/survey-types.ts`
- `src/app/survey/[token]/survey-backup.ts`
- `src/app/survey/[token]/survey-helpers.ts`
- `src/app/survey/[token]/use-survey-session.ts`
- componentes chicos para:
  - welcome
  - demographics
  - dimension step
  - open questions
  - thank you

Resultado buscado:

- mantener mismo flujo y endpoints
- mover estado y utilidades a piezas reusables y testeables

### 4. `analytics.ts`

Problema actual:

- demasiadas queries y lecturas heterogéneas agrupadas en una sola action file

Diseño:

- `src/actions/analytics-dashboard.ts`
- `src/actions/analytics-drivers.ts`
- `src/actions/analytics-segments.ts`
- `src/actions/analytics-benchmarks.ts`
- `src/actions/analytics-technical.ts`
- `src/actions/analytics.ts` como barrel/fachada si sigue aportando claridad

Resultado buscado:

- separar familias de lectura sin cambiar nombres públicos donde ya se consumen

### 5. `campaigns.ts`

Problema actual:

- mezcla CRUD de campañas, activación, links, lectura y cálculo/materialización

Diseño:

- preservar `calculateResults()` como entrada principal
- extraer:
  - lifecycle y mutaciones de campaña
  - helpers de links/respondents
  - carga de dataset
  - materialización y persistencia

Resultado buscado:

- no tocar el corazón metodológico más de lo necesario
- reducir mezcla entre operación y análisis

## Guardrails

### Invariantes

- sin cambios de esquema
- sin cambios de semántica estadística
- sin cambios de tablas de linaje
- sin cambios de contratos API públicos
- sin cambios de payloads persistidos salvo equivalencia total

### Verificación por bloque

Obligatoria en cada hotspot:

- `npm run lint`
- `npm test`
- `npm run build`

Verificación adicional al cerrar la ola:

- `cd testing-agent && npm run typecheck`
- `cd testing-agent && npx tsx src/index.ts e2e-prod-smoke --env-file ../.env.production.local`

### Criterio de rollback

Si un hotspot introduce ruido metodológico, dudas sobre linaje o regresión funcional, se detiene la ola en ese bloque y no se continúa al siguiente.

## Riesgos

### Riesgos controlados

- regressions por mover imports o helpers internos
- pérdida de claridad si se sobre-fragmenta
- tests insuficientes en zonas con comportamiento implícito

### Mitigación

- refactor por capas, no reescritura
- fachada pública estable
- commits por hotspot
- verificación completa entre bloques

## Resultado Esperado

Al final de la ola:

- archivos hotspot significativamente más pequeños y con una sola responsabilidad dominante
- contratos públicos preservados
- linaje y motor estadístico intactos
- menor acoplamiento entre UI, acceso a datos, orquestación y lógica de dominio
