# ClimaLab

Plataforma SaaS multi-tenant para medición de clima organizacional en PYMEs (1–500 empleados). Desarrollado por [Rizo.ma](https://rizo.ma).

## Stack tecnológico

- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Base de datos / Auth**: Supabase (Postgres + Auth + RLS)
- **UI**: shadcn/ui, recharts
- **Validación**: Zod + react-hook-form
- **i18n**: next-intl (español)
- **Email**: Resend (emails transaccionales con marca de organización)
- **ONA**: Python (igraph + matplotlib), invocado vía `uv run`
- **IA**: Backend dual — DGX (OpenAI-compatible vía Cloudflare Tunnel) con fallback a Ollama nativo. Modelo: Qwen 2.5 72B
- **Exportación**: @react-pdf/renderer (PDF), exceljs (Excel)

## Instrumento

### ClimaLab Core v4.0

22 dimensiones en 4 categorías + ENG (variable transversal) = 107 ítems + 2 verificaciones de atención:

| Categoría        | Dimensiones                            | Ítems |
| ---------------- | -------------------------------------- | ----- |
| Bienestar (6)    | ORG, PRO, SEG, BAL, CUI, DEM           | 27    |
| Dirección (5)    | LID, AUT, COM, CON, ROL                | 26    |
| Compensación (5) | CMP, REC, BEN, EQA, NDI                | 24    |
| Cultura (5)      | COH, INN, RES, DES, APR                | 25    |
| Engagement (1)   | ENG — variable dependiente transversal | 5     |

Incluye instrumento **Pulso v4.0** (22 ítems ancla, 1 por dimensión) para seguimiento frecuente.

### Módulos opcionales

Los módulos se combinan con el instrumento base (Core o Pulso) al crear una campaña:

| Módulo                 | Código | Ítems | Base teórica              |
| ---------------------- | ------ | ----- | ------------------------- |
| Gestión del Cambio     | CAM    | 8     | Armenakis 1993, Oreg 2003 |
| Orientación al Cliente | CLI    | 4     | Narver & Slater 1990      |
| Preparación Digital    | DIG    | 4     | Davis 1989 (TAM)          |

## Arquitectura

```
src/
├── actions/          # 13 Server Actions (campaigns, organizations, instruments, analytics,
│                     #   ai-insights, ona, export, reminders, participants, business-indicators, auth)
├── app/
│   ├── (auth)/       # Login (magic link)
│   ├── (dashboard)/  # Admin: organizations, campaigns, instruments, results (11 sub-páginas)
│   └── survey/       # Encuesta pública anónima (/survey/[token])
├── components/
│   ├── ui/           # shadcn/ui
│   ├── layout/       # Sidebar, header, nav
│   ├── results/      # 21 componentes reutilizables de gráficos
│   ├── branding/     # LogoUpload, BrandConfigEditor (identidad visual per-org)
│   └── reports/      # Componente PDF (@react-pdf/renderer)
├── lib/              # Supabase clients, validations, constants, statistics, email, env
└── types/            # Database types (auto-generated) + derived types (BrandConfig)

supabase/
├── migrations/       # 19 migraciones (schema + RLS + enums + multi-instrument + branding)
└── seed.sql          # Demo org + instrumentos + ~200 respondentes demo

scripts/
├── generate-demo-seed.mjs  # Generador PRNG determinista (mulberry32)
├── seed-results.ts          # Cálculo offline de resultados para datos demo
└── ona-analysis.py          # ONA perceptual (igraph, Leiden, NMI stability, graph image)

testing-agent/              # CLI standalone para testing E2E del pipeline
└── src/                    # Genera orgs, empleados, respuestas; calcula resultados; verifica
```

## Setup local

```bash
# 1. Clonar e instalar
git clone <repo> && cd climalab
npm install

# 2. Iniciar Supabase local
supabase start
supabase db reset

# 3. Calcular resultados de campañas demo
npm run seed:results

# 4. Iniciar la app
npm run dev
```

- App: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Inbucket (email): http://localhost:54324

## Pipeline de medición

1. **Crear organización** — registrar empresa con departamentos, configurar branding (colores, logo)
2. **Crear campaña** — seleccionar instrumento base + módulos opcionales, definir fechas y alcance
3. **Agregar participantes** — por nombre/email o generar enlaces anónimos
4. **Activar** — la encuesta queda disponible en `/survey/[token]`, se envían emails de invitación con marca de la org
5. **Recordatorios** — botón manual envía emails de recordatorio a participantes pendientes
6. **Monitorear** — panel en vivo con auto-refresh cada 30s
7. **Cerrar y calcular** — motor estadístico computa resultados (base + módulos) + ONA perceptual
8. **Resultados** — 11 sub-páginas: dashboard, dimensiones (cards expandibles con texto completo), tendencias, segmentos, benchmarks, drivers, alertas, comentarios, red ONA, ficha técnica, exportar
9. **Insights IA** — análisis cualitativos generados por IA (DGX vía Cloudflare Tunnel o Ollama local): narrativas, drivers, alertas, segmentos, tendencias
10. **Exportar** — PDF ejecutivo con branding, Excel completo, CSV, reporte IA

## Motor estadístico

- Inversión de ítems reversos (6 - score)
- Exclusión por attention checks (2 checks, ambos deben pasar)
- Margen de error con corrección de población finita (FPC)
- rwg(j) — acuerdo intergrupal por dimensión (James et al. 1984)
- Alfa de Cronbach — confiabilidad interna por dimensión
- Correlación de Pearson — matriz entre dimensiones, drivers de engagement
- Umbral de anonimato: no reportar segmentos con < 5 respondentes
- eNPS: promotores (9-10) - detractores (0-6) / total × 100
- Perfiles de engagement: Embajadores (≥4.5), Comprometidos (4.0-4.49), Neutrales (3.0-3.99), Desvinculados (<3.0)
- Segmentación por departamento, antigüedad y género
- Limitaciones metodológicas auto-detectadas

## Contratos del Motor Estadístico

Los siguientes contratos son verificables mediante `npm run test`. Cada contrato
tiene un test correspondiente en `src/lib/__tests__/statistics.test.ts`.

### Cronbach Alpha

- **Precondición**: n ≥ 10 respondentes, k ≥ 2 ítems (implementación usa umbral más estricto que el mínimo teórico de n ≥ 2)
- **Retorna**: `CronbachResult` — discriminated union con `value`, `status`, `n`, `k`
- **Status posibles**: `calculated` | `insufficient_n` | `insufficient_items` | `zero_variance`
- **Rango válido** (cuando calculated): [-∞, 1.0] — valores < 0.6 indican baja confiabilidad
- **UI**: `AlphaIndicator` component — muestra valor con color de calidad o razón de ausencia con tooltip en español
- **Exports**: DOCX/Excel muestran `n/d (n=X)` con nota al pie cuando status ≠ calculated
- **Umbral**: n < 10 retorna `insufficient_n` (conservador — alfas con n < 10 son inestables)
- **Redondeo**: 3 decimales
- **Referencia**: Cronbach (1951), Coefficient Alpha and the Internal Structure of Tests

### rwg(j)

- **Precondición**: n ≥ 3 scores (implementación usa umbral más estricto que James que permite n ≥ 2)
- **Escala**: Likert 1-5, σ²EU = 2.0 = (A² - 1) / 12 = (25 - 1) / 12
- **Varianza**: poblacional (÷ N), no muestral
- **Rango válido**: [0, 1.0] — clamped con `Math.max(0, Math.min(1, value))`
- **Thresholds**: ≥ 0.70 acuerdo aceptable, 0.50–0.69 moderado, < 0.50 bajo
- **Edge n < 3**: retorna `null`
- **Edge todos los scores idénticos**: varianza = 0, retorna 1.0 (acuerdo perfecto)
- **Redondeo**: 3 decimales
- **Referencia**: James, Demaree & Wolf (1984), rwg: An Assessment of Within-Group Interrater Agreement

### Corrección de Población Finita

- **Implementación**: inline en `src/actions/campaigns.ts` (no exportada como función pura)
- **Fórmula**: ME = 1.96 × √(0.25/n) × √((N−n)/(N−1)) × 100
- **Resultado**: porcentaje redondeado a 2 decimales
- **Edge n ≥ N**: `(N−n)/(N−1)` → 0 o negativo, FPC correction → 0, ME → 0 (censo completo)
- **Edge N ≤ 1**: retorna 0

### eNPS

- **Implementación**: inline en `src/actions/campaigns.ts` (no exportada como función pura)
- **Escala**: 0-10 (almacenado en `respondents.enps_score`)
- **Promotores**: score ≥ 9
- **Detractores**: score ≤ 6
- **Pasivos**: score 7-8
- **Fórmula**: eNPS = Math.round(((promotores − detractores) / total) × 100)
- **Rango**: [-100, 100]

### Umbral de Anonimato

- **Regla**: segmentos con n < 5 no se reportan en ninguna vista
- **Implementación**: `src/actions/campaigns.ts:555-556`
- **Alcance**: aplica a segmentación por departamento, antigüedad y género
- **No hay excepciones**: ni admins ni exports bypasean este umbral

### Perfiles de Engagement

| Perfil       | Rango      | Límite inferior | Límite superior |
| ------------ | ---------- | --------------- | --------------- |
| Embajador    | [4.5, 5.0] | inclusivo       | inclusivo       |
| Comprometido | [4.0, 4.5) | inclusivo       | exclusivo       |
| Neutral      | [3.0, 4.0) | inclusivo       | exclusivo       |
| Desvinculado | [0, 3.0)   | inclusivo       | exclusivo       |

- **Implementación**: `src/actions/campaigns.ts:641-644`
- **Input**: promedio de todos los scores (Likert 1-5) del respondente

### Pearson

- **Precondición**: n ≥ 10 pares de observaciones
- **Edge n < 10**: retorna `{ r: 0, pValue: 1, n }`
- **Edge denominador = 0**: retorna `{ r: 0, pValue: 1, n }` (array constante)
- **p-value**: aproximación (no distribución t exacta), epsilon 1e-10 para estabilidad numérica
- **Redondeo**: r a 3 decimales, pValue a 4 decimales

## ONA — Análisis de Red Perceptual

Módulo Python (igraph) que construye un grafo de similitud coseno a partir de vectores de 22 dimensiones por respondente. Detecta clusters de personas que perciben la organización de manera similar (NO es ONA sociométrica).

- **Algoritmo**: Leiden community detection con análisis de estabilidad (50 iteraciones + NMI)
- **Estabilidad**: NMI medio entre pares de iteraciones. >0.80 robusto, 0.50-0.80 moderado, <0.50 débil
- **Centralidad**: Eigenvector, betweenness (vértices + aristas), grado
- **Visualización**: Imagen PNG generada server-side (matplotlib + igraph Fruchterman-Reingold)
- **Aristas críticas**: Top 10 aristas inter-comunidad por edge betweenness

## Contratos del ONA

Verificable mediante `pytest scripts/test_ona.py`.

- **Threshold de similitud coseno**: adaptativo (NO es un valor fijo). `build_similarity_graph()` usa búsqueda binaria para encontrar un threshold que produzca entre 10–30% de densidad de aristas (`DENSITY_TARGET_MIN = 0.10`, `DENSITY_TARGET_MAX = 0.30`)
- **Iteraciones de estabilidad**: `STABILITY_ITERATIONS = 50`
- **Clasificación NMI**: `NMI_ROBUST_THRESHOLD = 0.80` (robusto), `NMI_MODERATE_THRESHOLD = 0.50` (moderado), < 0.50 (débil)
- **Tipo de ONA**: perceptual (similitud de respuestas), NO sociométrica (no mide interacciones)
- **Mínimo de respondentes**: `MIN_RESPONDENTS = 10`
- **Variable excluida**: ENG (variable dependiente) excluida de vectores de similitud
- **Algoritmo**: Leiden community detection con `objective_function="modularity"`

## Branding por organización

Sistema de identidad visual per-org aplicado en todos los touchpoints:

- **Encuesta**: colores dinámicos en header, botones CTA, barra de progreso
- **Emails**: 4 tipos (invitación, recordatorio, cierre, resultados) con logo y colores de la org
- **PDF**: colores dinámicos en portada, secciones, tablas
- **Resultados**: logo de la org en sidebar
- **Configuración**: pestaña "Identidad visual" en detalle de organización (color pickers, upload de logo, textos personalizados)

## Infraestructura IA

Backend dual con fallback automático para insights cualitativos en 6 páginas de resultados:

```
                    ┌─────────────────────────┐
                    │   callAI() dispatcher    │
                    └────────┬────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   AI_LOCAL_ENDPOINT                 OLLAMA_BASE_URL
   (OpenAI-compatible)               (Ollama nativo)
              │                             │
   /v1/chat/completions              /api/chat
              │                             │
   ┌──────────┴──────────┐      ┌──────────┴──────────┐
   │  Cloudflare Tunnel  │      │   Ollama local       │
   │  ollama.rizo.ma/v1  │      │   localhost:11434    │
   └──────────┬──────────┘      └─────────────────────┘
              │
   ┌──────────┴──────────┐
   │  NVIDIA DGX Spark   │
   │  Qwen 2.5 72B       │
   │  128GB unified mem   │
   └─────────────────────┘
```

- **Prioridad**: `AI_LOCAL_ENDPOINT` → `OLLAMA_BASE_URL` → error con mensaje claro
- **Fail-fast**: si ningún proveedor configurado, retorna error inmediatamente (no falla silenciosamente)
- **Timeout**: `maxDuration = 300` en results layout — permite hasta 5 min para modelos grandes (requiere Vercel Pro)
- **6 tipos de análisis**: dashboard_narrative, comment_analysis, driver_insights, alert_context, segment_profiles, trends_narrative
- **Orquestador**: `generateAllInsights()` ejecuta 5 análisis en paralelo; dashboard tiene botón "Generar insights IA"
- **Almacenamiento**: `campaign_analytics` con `analysis_type` dedicado por tipo de insight

## Multi-instrumento

Las campañas soportan un instrumento base (Core o Pulso) + hasta 3 módulos opcionales. El esquema usa:

- `instruments.instrument_type` — enum `base` | `module` para clasificación
- `campaigns.module_instrument_ids` — array `uuid[]` con IDs de módulos seleccionados

Los módulos se cargan junto con el instrumento base en la encuesta, el cálculo de resultados y las páginas de dimensiones (pestaña "Módulos Opcionales").

## Testing Agent

CLI standalone para testing end-to-end del pipeline completo. Genera datos realistas, ejecuta el motor estadístico y verifica los resultados con 20 assertions.

```bash
cd testing-agent && npm install
npx tsx src/index.ts run-full --respondents 75 --seed 42
npx tsx src/index.ts run-full --respondents 100 --modules CAM,DIG --climate excellent --skip-cleanup
```

**Pipeline**: crear org → crear campaña → agregar participantes → activar → simular encuestas → cerrar → calcular resultados → verificar (20 checks) → cleanup

**Subcomandos**: `create-org`, `create-campaign`, `simulate-survey`, `calculate`, `verify`, `cleanup`, `run-full`

## Variables de entorno

Requeridas (producción):

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clave anon de Supabase
- `RESEND_API_KEY` — Clave API de Resend para emails transaccionales
- `RESEND_FROM_EMAIL` — Email remitente (e.g., `ClimaLab <noreply@climalab.app>`)

Opcionales (IA — al menos una requerida para insights):

- `AI_LOCAL_ENDPOINT` — URL del endpoint OpenAI-compatible (e.g., `https://ollama.rizo.ma/v1`). **Proveedor prioritario**.
- `AI_LOCAL_MODEL` — Nombre del modelo (default: `qwen2.5:72b`)
- `AI_LOCAL_API_KEY` — Clave API para el endpoint local (si aplica)
- `OLLAMA_BASE_URL` — URL de Ollama nativo (proveedor fallback, e.g., `http://localhost:11434`)

## Invariantes del Sistema

Las siguientes propiedades deben mantenerse verdaderas en todo momento.
Cualquier cambio que las viole requiere actualización de esta sección primero.

1. **Anonimato**: ningún endpoint, vista o export expone datos individuales de respondentes. La tabla `participants` (PII) está separada de `respondents` (respuestas anónimas)
2. **Determinismo estadístico**: dado el mismo set de respuestas, el motor produce siempre el mismo resultado. Las funciones en `src/lib/statistics.ts` son puras (sin estado, sin I/O)
3. **Aislamiento multi-tenant**: una organización nunca puede leer datos de otra (RLS en Supabase con `get_user_org_id()` SECURITY DEFINER). Verificado con test suite: `supabase/tests/rls-isolation.test.ts` (61 tests — 2 orgs × 3 usuarios, usuario huérfano, joins cross-tabla, escala 12 departamentos). Auditoría completa: `docs/rls-audit.md`
4. **Degradación de IA**: si el backend de IA no está disponible, las páginas de resultados cargan sin insights pero sin error bloqueante. `callAI()` retorna error, no lanza excepción
5. **Módulos aditivos**: agregar un módulo opcional a una campaña nunca altera los scores del instrumento base. Los módulos tienen `category = NULL` y se excluyen de agregación por categoría
6. **ONA opcional**: si el proceso Python falla, el sistema reporta el error claramente pero entrega el resto de resultados. ONA se invoca non-blocking desde `calculateResults`

## Licencia

Propietario — Rizo.ma / Prozess Group S.A.
