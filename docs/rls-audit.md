# RLS Audit — ClimaLab Multi-Tenant Isolation

**Fecha**: 2026-03-08
**Método**: Auditoría estática de 19 migraciones SQL (`supabase/migrations/`)
**Funciones helper**: `get_user_role()` y `get_user_org_id()` — ambas `SECURITY DEFINER` en `src/public`

## Funciones de Control de Acceso

```sql
-- Retorna el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Retorna el organization_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

## Estado RLS por Tabla

| Tabla                 | RLS Enabled | Policies (authenticated)                                                                            | Policies (anon)                                   |              Filtro org_id              | Riesgo |
| --------------------- | :---------: | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | :-------------------------------------: | :----: |
| `organizations`       |      ✓      | SELECT: super_admin=all, org_admin=own; INSERT: super_admin; UPDATE: super_admin=all, org_admin=own | SELECT: `true` (branding en survey)               |       ✓ `id = get_user_org_id()`        |  Bajo  |
| `profiles`            |      ✓      | SELECT: own + super_admin=all + org_admin=same org; UPDATE: own + super_admin                       | —                                                 | ✓ `organization_id = get_user_org_id()` |  Bajo  |
| `instruments`         |      ✓      | SELECT: active=all, super_admin=all; INSERT/UPDATE: super_admin                                     | —                                                 |              N/A (global)               |  N/A   |
| `dimensions`          |      ✓      | SELECT: via instrument visibility; INSERT/UPDATE: super_admin                                       | SELECT: `true` (survey)                           |              N/A (global)               |  N/A   |
| `items`               |      ✓      | SELECT: via instrument visibility; INSERT/UPDATE: super_admin                                       | SELECT: `true` (survey)                           |              N/A (global)               |  N/A   |
| `campaigns`           |      ✓      | SELECT/INSERT/UPDATE/DELETE: org_admin=own org, super_admin=all                                     | SELECT: `status = 'active'`                       | ✓ `organization_id = get_user_org_id()` |  Bajo  |
| `respondents`         |      ✓      | SELECT/INSERT/UPDATE/DELETE: via campaign→org subquery                                              | INSERT/UPDATE: `true`; SELECT: `true`             |              ✓ (subquery)               |  Bajo  |
| `responses`           |      ✓      | SELECT: via respondent→campaign→org subquery                                                        | INSERT/UPDATE/SELECT: `true` (survey + auto-save) |              ✓ (subquery)               |  Bajo  |
| `open_responses`      |      ✓      | SELECT: via respondent→campaign→org subquery                                                        | INSERT: `true`                                    |              ✓ (subquery)               |  Bajo  |
| `campaign_results`    |      ✓      | SELECT: via campaign→org subquery; ALL: super_admin                                                 | —                                                 |              ✓ (subquery)               |  Bajo  |
| `campaign_analytics`  |      ✓      | SELECT: via campaign→org subquery; ALL: super_admin                                                 | —                                                 |              ✓ (subquery)               |  Bajo  |
| `participants`        |      ✓      | SELECT/INSERT/UPDATE/DELETE: via campaign→org subquery                                              | —                                                 |              ✓ (subquery)               |  Bajo  |
| `business_indicators` |      ✓      | SELECT/ALL: via campaign→org subquery                                                               | —                                                 |              ✓ (subquery)               |  Bajo  |

## Patrón de Aislamiento

Todas las tablas con datos organizacionales usan el patrón:

```
authenticated → get_user_org_id() → organization_id match
```

Para tablas sin `organization_id` directo, se usa subquery encadenada:

```
respondents.campaign_id → campaigns.organization_id = get_user_org_id()
responses.respondent_id → respondents.campaign_id → campaigns.organization_id
```

## Acceso Anónimo (Survey)

El rol `anon` tiene acceso limitado para el flujo de encuesta pública:

| Tabla            | Operación            | Condición           | Justificación                                |
| ---------------- | -------------------- | ------------------- | -------------------------------------------- |
| `organizations`  | SELECT               | `true`              | Mostrar branding (logo, colores) en survey   |
| `dimensions`     | SELECT               | `true`              | Cargar estructura del instrumento            |
| `items`          | SELECT               | `true`              | Mostrar preguntas de la encuesta             |
| `campaigns`      | SELECT               | `status = 'active'` | Verificar que la campaña está activa         |
| `respondents`    | INSERT/UPDATE/SELECT | `true`              | Crear/actualizar respondente, leer por token |
| `responses`      | INSERT/UPDATE/SELECT | `true`              | Guardar respuestas, auto-save, upsert        |
| `open_responses` | INSERT               | `true`              | Guardar respuestas abiertas                  |

## Tablas sin RLS

**Ninguna.** Las 13 tablas públicas tienen RLS habilitado.

## Tablas con RLS pero sin Policies

**Ninguna.** Todas las tablas con RLS tienen al menos una policy definida.

## Observaciones

1. **Tablas globales** (instruments, dimensions, items): no requieren filtro por org_id — son compartidas entre todas las organizaciones. Solo super_admin puede modificarlas.

2. **Anon SELECT en respondents/responses**: es `true` (sin restricción). Esto es by-design para el flujo de survey (auto-save, recovery). Los respondent tokens son UUIDs aleatorios que actúan como auth implícita.

3. **Storage (org-assets)**: bucket público para logos. INSERT/UPDATE/DELETE requieren `authenticated`. No hay filtro por org_id en storage — cualquier usuario autenticado puede subir al bucket. Riesgo bajo (solo imágenes de logo).

4. **campaign_results y campaign_analytics**: solo super_admin puede escribir (INSERT/UPDATE/DELETE). org_admin solo puede leer sus propios resultados vía subquery a campaigns.

## Funciones SECURITY DEFINER

Las siguientes funciones ejecutan con permisos del creador (superuser), no del llamante. Pueden bypassear RLS si no filtran internamente.

| Función                             | Migración | Propósito                                                               |           ¿Filtra por org?            |                                   Riesgo                                    |
| ----------------------------------- | --------- | ----------------------------------------------------------------------- | :-----------------------------------: | :-------------------------------------------------------------------------: |
| `get_user_role()`                   | 000004    | Retorna rol del usuario autenticado                                     | N/A (lee `profiles` por `auth.uid()`) |                       Bajo — solo retorna rol propio                        |
| `get_user_org_id()`                 | 000004    | Retorna org_id del usuario autenticado                                  | N/A (lee `profiles` por `auth.uid()`) |                       Bajo — solo retorna org propia                        |
| `handle_new_user()`                 | 000002    | Trigger: crea perfil en `profiles` al registrar usuario en `auth.users` |         N/A (trigger interno)         |                Bajo — solo inserta perfil del nuevo usuario                 |
| `get_org_department_counts(org_id)` | 000005    | Retorna conteo de departamentos como JSONB                              |  ✓ Guard interno (migration 000020)   | Bajo — guard interno verifica que `org_id = get_user_org_id()` del llamante |

### Funciones NO SECURITY DEFINER (seguras)

| Función                                | Migración | Tipo                                                             |
| -------------------------------------- | --------- | ---------------------------------------------------------------- |
| `generate_slug(text)`                  | 000005    | `IMMUTABLE` — transformación pura de texto                       |
| `get_org_total_headcount(uuid)`        | 000012    | `STABLE` — lee organizations, sin SECURITY DEFINER (respeta RLS) |
| `get_department_headcount(uuid, text)` | 000012    | `STABLE` — lee organizations, sin SECURITY DEFINER (respeta RLS) |
