# ClimaLab

Plataforma SaaS multi-tenant para medición de clima organizacional en PYMEs (1–500 empleados). Desarrollado por [Rizo.ma](https://rizo.ma).

## Stack tecnológico

- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Base de datos / Auth**: Supabase (Postgres + Auth + RLS)
- **UI**: shadcn/ui, recharts
- **Validación**: Zod + react-hook-form

## Instrumento

ClimaLab Core v2.0 — instrumento de 35 ítems + 2 attention checks, 8 dimensiones basadas en evidencia psicométrica:

| Dimensión | Código | Base teórica | Ítems |
|-----------|--------|-------------|-------|
| Liderazgo y Supervisión | LID | LMX-7 (Graen & Uhl-Bien, 1995) | 5 |
| Justicia Organizacional | JUS | Organizational Justice (Colquitt, 2001) | 5 |
| Sentido de Pertenencia | PER | Org. Identification (Mael & Ashforth, 1992) | 4 |
| Innovación y Cambio | INN | Psychological Safety (Edmondson, 1999) | 5 |
| Bienestar y Equilibrio | BIE | JD-R Model (Bakker & Demerouti, 2007) | 4 |
| Claridad y Desarrollo | CLA | Role Clarity (Rizzo, 1970) | 4 |
| Comunicación y Participación | COM | Org. Communication (Roberts & O'Reilly, 1974) | 4 |
| Engagement y Compromiso | ENG | UWES-9 (Schaufeli, 2006) | 4 |

Incluye instrumento de Pulso (1 anchor por dimensión = 8 ítems) para seguimiento frecuente.

## Arquitectura

```
src/
├── actions/          # Server Actions (campaigns, organizations, instruments)
├── app/
│   ├── (auth)/       # Login (magic link)
│   ├── (dashboard)/  # Admin: organizations, campaigns, instruments, results
│   └── survey/       # Encuesta pública anónima (/survey/[token])
├── components/       # shadcn/ui + layout components
├── lib/              # Supabase clients, validations, constants
└── types/            # Database types (auto-generated) + derived types

supabase/
├── migrations/       # 10 migrations (schema + RLS + enums)
└── seed.sql          # Demo org + instruments + 32 respondentes demo
```

## Setup local

```bash
# 1. Clonar e instalar
git clone <repo> && cd climalab
npm install

# 2. Iniciar Supabase local
supabase start
supabase db reset

# 3. Calcular resultados de campaña demo
npm run seed:results

# 4. Iniciar la app
npm run dev
```

- App: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Inbucket (email): http://localhost:54324

## Pipeline de medición

1. **Crear organización** — registrar empresa con departamentos
2. **Crear campaña** — seleccionar instrumento, definir fechas
3. **Generar enlaces** — tokens anónimos por participante
4. **Distribuir** — copiar enlaces individuales o masivos
5. **Activar** — la encuesta queda disponible en `/survey/[token]`
6. **Monitorear** — panel en vivo con auto-refresh cada 30s
7. **Cerrar y calcular** — motor estadístico computa resultados
8. **Resultados** — dashboard con KPIs, radar, ranking, heatmap, perfiles, eNPS, comentarios
9. **Comparar** — comparación wave-over-wave con campañas anteriores

## Motor estadístico

- Inversión de ítems reversos (6 - score)
- Exclusión por attention checks (2 checks, ambos deben pasar)
- Margen de error con corrección de población finita
- Umbral de anonimato: no reportar segmentos con < 5 respondentes
- eNPS: promotores (9-10) - detractores (0-6) / total × 100
- Perfiles de engagement: Embajadores (≥4.5), Comprometidos (4.0-4.49), Neutrales (3.0-3.99), Desvinculados (<3.0)
- Segmentación por departamento, antigüedad y género

## Licencia

Propietario — Rizo.ma / Prozess Group S.A.
