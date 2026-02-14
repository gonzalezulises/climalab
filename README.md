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
- **IA**: Ollama (Qwen 2.5 72B) para insights cualitativos
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
8. **Resultados** — 11 sub-páginas: dashboard, dimensiones, tendencias, segmentos, benchmarks, drivers, alertas, comentarios, red ONA, ficha técnica, exportar
9. **Insights IA** — análisis cualitativos generados por Ollama (narrativas, drivers, alertas, segmentos, tendencias)
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

## ONA — Análisis de Red Perceptual

Módulo Python (igraph) que construye un grafo de similitud coseno a partir de vectores de 22 dimensiones por respondente. Detecta clusters de personas que perciben la organización de manera similar (NO es ONA sociométrica).

- **Algoritmo**: Leiden community detection con análisis de estabilidad (50 iteraciones + NMI)
- **Estabilidad**: NMI medio entre pares de iteraciones. >0.80 robusto, 0.50-0.80 moderado, <0.50 débil
- **Centralidad**: Eigenvector, betweenness (vértices + aristas), grado
- **Visualización**: Imagen PNG generada server-side (matplotlib + igraph Fruchterman-Reingold)
- **Aristas críticas**: Top 10 aristas inter-comunidad por edge betweenness

## Branding por organización

Sistema de identidad visual per-org aplicado en todos los touchpoints:

- **Encuesta**: colores dinámicos en header, botones CTA, barra de progreso
- **Emails**: 4 tipos (invitación, recordatorio, cierre, resultados) con logo y colores de la org
- **PDF**: colores dinámicos en portada, secciones, tablas
- **Resultados**: logo de la org en sidebar
- **Configuración**: pestaña "Identidad visual" en detalle de organización (color pickers, upload de logo, textos personalizados)

## Multi-instrumento

Las campañas soportan un instrumento base (Core o Pulso) + hasta 3 módulos opcionales. El esquema usa:

- `instruments.instrument_type` — enum `base` | `module` para clasificación
- `campaigns.module_instrument_ids` — array `uuid[]` con IDs de módulos seleccionados

Los módulos se cargan junto con el instrumento base en la encuesta, el cálculo de resultados y las páginas de dimensiones (pestaña "Módulos Opcionales").

## Licencia

Propietario — Rizo.ma / Prozess Group S.A.
