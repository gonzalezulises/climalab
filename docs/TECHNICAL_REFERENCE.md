# ClimaLab — Referencia Técnica para Auditoría

**Versión del instrumento**: Core v4.0 / Pulso v4.0 | **Mejoras estadísticas**: v4.1 | **IA**: v4.1.1 | **Multi-instrumento**: v4.2 | **ONA perceptual**: v4.3
**Plataforma**: ClimaLab (producto de Rizo.ma Consulting, Panamá)
**Público objetivo**: PyMEs de LATAM (1–500 empleados)
**Stack tecnológico**: Next.js 16, Supabase (Postgres + Auth + RLS), TypeScript

---

## Tabla de Contenidos

1. [Modelo de Medición](#1-modelo-de-medición)
2. [Variables y Escalas](#2-variables-y-escalas)
3. [Algoritmos de Cálculo](#3-algoritmos-de-cálculo)
4. [Pipeline de Procesamiento](#4-pipeline-de-procesamiento)
5. [Arquitectura de Datos](#5-arquitectura-de-datos)
6. [Flujo de Encuesta](#6-flujo-de-encuesta)
7. [Flujo de Campaña](#7-flujo-de-campaña)
8. [Esquema de UUIDs](#8-esquema-de-uuids)
9. [Métricas Psicométricas (v4.1)](#9-métricas-psicométricas-v41)
10. [Indicadores de Negocio](#10-indicadores-de-negocio)
11. [Análisis con IA (v4.1.1)](#11-análisis-con-ia-v411)
12. [Análisis de Redes Perceptuales (ONA)](#12-análisis-de-redes-perceptuales-ona)
13. [Referencias Adicionales](#13-referencias-adicionales-v41)
14. [Multi-instrumento](#14-multi-instrumento-v42)
15. [Export y Reportes](#15-export-y-reportes)

---

## 1. Modelo de Medición

### 1.1 Filosofía de Diseño

El instrumento ClimaLab Core v4.0 se construyó sobre principios de psicometría basada en evidencia. Cada dimensión se fundamenta en teorías validadas de comportamiento organizacional, y los ítems se adaptaron al contexto cultural latinoamericano manteniendo la integridad de los constructos originales.

### 1.2 Estructura del Instrumento

- **22 dimensiones** organizadas en **4 categorías** + 1 variable transversal (ENG)
- **107 ítems regulares** + **2 verificaciones de atención** = **109 ítems** (Core v4.0)
- **22 ítems ancla** (Pulso v4.0) — 1 por dimensión para seguimiento frecuente
- **3 módulos opcionales**: Gestión del Cambio (8 ítems), Orientación al Cliente (4), Preparación Digital (4)
- Cada dimensión incluye **1 ítem inverso** para detectar aquiescencia
- Cada dimensión incluye **1 ítem ancla** compartido con el instrumento Pulso

### 1.3 Tabla Completa de Dimensiones

#### Categoría: Bienestar (6 dimensiones)

| #   | Código | Nombre                         | Base Teórica                                                | Ítems |
| --- | ------ | ------------------------------ | ----------------------------------------------------------- | ----- |
| 1   | ORG    | Orgullo Institucional          | Mael & Ashforth 1992, Psychological Ownership (Pierce 2001) | 4     |
| 2   | PRO    | Propósito del Trabajo          | Meaning of Work (Steger 2012), UWES-9 dedicación            | 5     |
| 3   | SEG    | Seguridad Física y Psicológica | JD-R Model (Bakker & Demerouti 2007), COPSOQ                | 5     |
| 4   | BAL    | Balance Vida-Trabajo           | Work-Life Balance (Greenhaus 2003), JD-R recursos           | 4     |
| 5   | CUI    | Cuidado Mutuo                  | Perceived Organizational Support (Eisenberger 1986)         | 5     |
| 6   | DEM    | Demandas Laborales             | JD-R Model (Bakker & Demerouti 2007), Job Demands           | 4     |

#### Categoría: Dirección y Supervisión (5 dimensiones)

| #   | Código | Nombre                  | Base Teórica                                                     | Ítems |
| --- | ------ | ----------------------- | ---------------------------------------------------------------- | ----- |
| 7   | LID    | Liderazgo Efectivo      | LMX-7 (Graen & Uhl-Bien 1995), Servant Leadership (Liden 2008)   | 6     |
| 8   | AUT    | Autonomía               | Self-Determination Theory (Deci & Ryan 2000), JD-R               | 5     |
| 9   | COM    | Comunicación Interna    | Roberts & O'Reilly 1974, Voice Behavior (LePine & Van Dyne 1998) | 5     |
| 10  | CON    | Confianza Institucional | Organizational Trust (Mayer 1995)                                | 5     |
| 11  | ROL    | Claridad de Rol         | Role Clarity (Rizzo 1970), Role Ambiguity & Conflict             | 5     |

#### Categoría: Compensación (5 dimensiones)

| #   | Código | Nombre                        | Base Teórica                                                              | Ítems |
| --- | ------ | ----------------------------- | ------------------------------------------------------------------------- | ----- |
| 12  | CMP    | Compensación                  | Equity Theory (Adams 1963), Organizational Justice (Colquitt 2001)        | 4     |
| 13  | REC    | Reconocimiento                | Perceived Organizational Support, Recognition practices                   | 4     |
| 14  | BEN    | Beneficios                    | Total Rewards (WorldatWork), Perceived investment in employee development | 4     |
| 15  | EQA    | Equidad en Ascensos           | Procedural Justice (Colquitt 2001), Promotional Justice                   | 6     |
| 16  | NDI    | No Discriminación e Inclusión | Procedural Justice (Colquitt 2001), DEI frameworks                        | 6     |

#### Categoría: Cultura (5 dimensiones)

| #   | Código | Nombre                     | Base Teórica                                                              | Ítems |
| --- | ------ | -------------------------- | ------------------------------------------------------------------------- | ----- |
| 17  | COH    | Cohesión de Equipo         | Team Cohesion (Carron 1985), Social Capital                               | 6     |
| 18  | INN    | Innovación y Cambio        | Psychological Safety (Edmondson 1999), Change Readiness (Armenakis 1993)  | 6     |
| 19  | RES    | Resultados y Logros        | Goal Setting Theory (Locke & Latham 1990), Achievement motivation         | 5     |
| 20  | DES    | Desarrollo Profesional     | Career Growth Opportunity (Kraimer 2011), Role Clarity (Rizzo 1970)       | 4     |
| 21  | APR    | Aprendizaje Organizacional | Organizational Learning (Senge 1990), Learning Organization (Garvin 1993) | 4     |

#### Variable Transversal (Dependiente)

| #   | Código | Nombre                  | Base Teórica                                                            | Ítems |
| --- | ------ | ----------------------- | ----------------------------------------------------------------------- | ----- |
| 22  | ENG    | Engagement y Compromiso | UWES-9 (Schaufeli 2006), Organizational Commitment (Allen & Meyer 1990) | 5     |

### 1.4 Ítems Inversos

Cada dimensión contiene al menos 1 ítem formulado en sentido negativo (`is_reverse = true`) para detectar patrones de respuesta automática (aquiescencia). Antes de cualquier cálculo, estos ítems se invierten mediante la fórmula `6 - score`.

Ejemplos de ítems inversos:

| Dimensión | Ítem Inverso                                                                             |
| --------- | ---------------------------------------------------------------------------------------- |
| ORG       | "Frecuentemente considero buscar empleo en otra organización."                           |
| SEG       | "En esta organización, cometer un error puede tener consecuencias desproporcionadas."    |
| BAL       | "Frecuentemente siento que el trabajo invade mi tiempo personal."                        |
| LID       | "Mi supervisor rara vez está disponible cuando lo necesito."                             |
| CON       | "Siento que la dirección no es transparente sobre la situación real de la organización." |
| CMP       | "Siento que no me pagan lo justo por el trabajo que realizo."                            |
| ROL       | "Las expectativas sobre mi desempeño son confusas o contradictorias."                    |
| DEM       | "La presión por cumplir plazos en mi puesto es excesiva."                                |
| APR       | "Los errores se ocultan en lugar de usarse como oportunidades de mejora."                |

### 1.5 Ítems Ancla (Pulso v4.0)

El instrumento Pulso contiene 22 ítems ancla — uno por dimensión — idénticos en texto a ítems del Core. Esto permite comparaciones directas entre mediciones completas y pulsos de seguimiento frecuente.

### 1.6 Verificaciones de Atención

El instrumento incluye 2 ítems de verificación (`is_attention_check = true`) intercalados entre las preguntas regulares:

| Ítem                                                                      | Respuesta Esperada |
| ------------------------------------------------------------------------- | ------------------ |
| "Para verificar que estás leyendo con atención, selecciona 'De acuerdo'." | 4 (De acuerdo)     |
| "Esta es una pregunta de verificación, selecciona 'En desacuerdo'."       | 2 (En desacuerdo)  |

**Lógica de descalificación**: Un respondente que falle **cualquiera** de las dos verificaciones es marcado como `disqualified` y excluido de todos los cálculos. La detección de la respuesta esperada se hace programáticamente analizando el texto del ítem (ver `calculateResults()`, líneas 323-329 en `src/actions/campaigns.ts`).

### 1.7 Módulos Opcionales

Los módulos son instrumentos con `instrument_type = 'module'` que se combinan con un instrumento base (Core o Pulso) al crear una campaña. Se seleccionan hasta 3 módulos mediante checkboxes en el diálogo de creación, y sus IDs se almacenan en `campaigns.module_instrument_ids` (uuid[]). Las dimensiones de los módulos tienen `category = NULL` y se presentan en la UI bajo una pseudo-categoría "Módulos Opcionales":

| Módulo                 | Código | Ítems                      | Base Teórica                                                                   |
| ---------------------- | ------ | -------------------------- | ------------------------------------------------------------------------------ |
| Gestión del Cambio     | CAM    | 8 (4 inversos, 4 directos) | Change Readiness (Armenakis 1993), Resistance to Change (Oreg 2003)            |
| Orientación al Cliente | CLI    | 4 (todos directos)         | Customer Orientation (Narver & Slater 1990), Service Climate (Schneider 1998)  |
| Preparación Digital    | DIG    | 4 (todos directos)         | Technology Acceptance Model (Davis 1989), Digital Readiness (Parasuraman 2000) |

---

## 2. Variables y Escalas

### 2.1 Escala Likert (1–5)

Todos los ítems del instrumento utilizan una escala Likert de 5 puntos:

| Valor | Etiqueta                       |
| ----- | ------------------------------ |
| 1     | Totalmente en desacuerdo       |
| 2     | En desacuerdo                  |
| 3     | Ni de acuerdo ni en desacuerdo |
| 4     | De acuerdo                     |
| 5     | Totalmente de acuerdo          |

### 2.2 Variables Demográficas

Se recopilan al inicio de la encuesta (paso "demographics"):

| Variable     | Tipo        | Opciones                                                                             |
| ------------ | ----------- | ------------------------------------------------------------------------------------ |
| Departamento | Obligatorio | Lista definida por la organización (filtrada por `target_departments` de la campaña) |
| Antigüedad   | Obligatorio | `<1 año`, `1-3 años`, `3-5 años`, `5-10 años`, `10+ años`                            |
| Género       | Opcional    | `Femenino`, `Masculino`, `Otro`, `Prefiero no decir`                                 |

### 2.3 eNPS (Employee Net Promoter Score)

Escala de 0 a 10 para la pregunta: "¿Qué tan probable es que recomiendes esta organización como lugar de trabajo?"

| Clasificación | Rango |
| ------------- | ----- |
| Promotores    | 9–10  |
| Pasivos       | 7–8   |
| Detractores   | 0–6   |

### 2.4 Perfiles de Engagement

Basados en el promedio global (todos los ítems ajustados) por respondente:

| Perfil         | Umbral                  |
| -------------- | ----------------------- |
| Embajadores    | promedio >= 4.5         |
| Comprometidos  | promedio >= 4.0 y < 4.5 |
| Neutrales      | promedio >= 3.0 y < 4.0 |
| Desenganchados | promedio < 3.0          |

---

## 3. Algoritmos de Cálculo

Todos los algoritmos están implementados en `src/actions/campaigns.ts` (función `calculateResults()`, líneas 284-950) y replicados en `scripts/seed-results.ts` para procesamiento offline.

### 3.1 Inversión de Ítems Inversos

```
score_ajustado = 6 - score_original
```

Se aplica **antes** de cualquier otro cálculo a todos los ítems marcados con `is_reverse = true`. Esto transforma la escala para que valores altos siempre indiquen percepción positiva.

**Referencia en código** (`src/actions/campaigns.ts:438`):

```typescript
const adjustedScore = itemInfo.is_reverse ? 6 - score : score;
```

### 3.2 Media Aritmética

```
μ = Σxᵢ / n
```

Donde `xᵢ` son los puntajes ajustados y `n` es el número de observaciones.

**Referencia en código** (`src/actions/campaigns.ts:451-453`):

```typescript
function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
```

### 3.3 Desviación Estándar (con corrección de Bessel)

```
σ = √[Σ(xᵢ - μ)² / (n - 1)]
```

Se utiliza `n - 1` en el denominador (corrección de Bessel) ya que se trabaja con una muestra, no con la población completa. Para muestras de tamaño 1, retorna 0.

**Referencia en código** (`src/actions/campaigns.ts:455-460`):

```typescript
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
```

### 3.4 Favorabilidad

```
favorabilidad = (count(xᵢ >= 4) / n) × 100
```

Porcentaje de respuestas con valor 4 ("De acuerdo") o 5 ("Totalmente de acuerdo"). Es la métrica principal para identificar fortalezas y oportunidades.

**Referencia en código** (`src/actions/campaigns.ts:462-464`):

```typescript
function favorability(arr: number[]): number {
  return (arr.filter((v) => v >= 4).length / arr.length) * 100;
}
```

### 3.5 Correlación de Pearson

```
r = Σ(dxᵢ)(dyᵢ) / √[Σ(dxᵢ)² · Σ(dyᵢ)²]
```

Donde `dxᵢ = xᵢ - μₓ` y `dyᵢ = yᵢ - μᵧ`.

**Requisito mínimo**: n >= 10 respondentes. Si n < 10, retorna `r = 0, pValue = 1`.

Se calcula sobre los **promedios por dimensión por respondente** (no sobre ítems individuales), lo cual produce una correlación ecológicamente válida a nivel de dimensión.

**Referencia en código** (`src/actions/campaigns.ts:761-783`):

```typescript
function pearson(xArr: number[], yArr: number[]): { r: number; pValue: number; n: number } {
  const n = xArr.length;
  if (n < 10) return { r: 0, pValue: 1, n };
  const mx = mean(xArr);
  const my = mean(yArr);
  let sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - mx;
    const dy = yArr[i] - my;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom === 0) return { r: 0, pValue: 1, n };
  const r = sumXY / denom;
  // ...
}
```

### 3.6 Aproximación del Valor-p

Para evaluar la significancia estadística de las correlaciones, se usa una aproximación basada en la distribución t:

```
t = r × √[(n - 2) / (1 - r² + ε)]
p ≈ exp(-0.717 × |t| - 0.416 × t² / df)
```

Donde `df = n - 2` y `ε = 1e-10` para estabilidad numérica. Esta es una aproximación computacionalmente eficiente que evita la necesidad de tablas de distribución t.

**Referencia en código** (`src/actions/campaigns.ts:778-782`):

```typescript
const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
const df = n - 2;
const pValue = df > 0 ? Math.exp(-0.717 * Math.abs(t) - (0.416 * t * t) / df) : 1;
```

### 3.7 eNPS

```
eNPS = ((Promotores - Detractores) / Total) × 100
```

El resultado es un valor entero entre -100 y +100.

**Referencia en código** (`src/actions/campaigns.ts:674-678`):

```typescript
const promoters = enpsScoresArr.filter((s) => s >= 9).length;
const detractors = enpsScoresArr.filter((s) => s <= 6).length;
const enpsTotal = enpsScoresArr.length;
const enpsValue = Math.round(((promoters - detractors) / enpsTotal) * 100);
```

### 3.8 Margen de Error

```
ME = 1.96 × √(0.25 / n) × √((N - n) / (N - 1)) × 100
```

Donde:

- `1.96` = valor z para 95% de confianza
- `0.25` = varianza máxima (p = 0.5 para estimación conservadora)
- `n` = tamaño de muestra (respondentes válidos)
- `N` = población objetivo (`target_population` o `employee_count` de la organización)
- `√((N - n) / (N - 1))` = corrección por población finita (FPC)

**Referencia en código** (`src/actions/campaigns.ts:706-710`):

```typescript
if (sampleN > 0 && populationN > 1) {
  const fpcCorrection = Math.sqrt((populationN - sampleN) / (populationN - 1));
  marginOfError = Math.round(1.96 * Math.sqrt(0.25 / sampleN) * fpcCorrection * 100 * 100) / 100;
}
```

### 3.9 Puntajes por Categoría

El puntaje de cada categoría (bienestar, dirección, compensación, cultura) se calcula como la media de **todos los ítems** de todas las dimensiones de esa categoría, no como la media de las medias dimensionales. Las dimensiones de módulos opcionales tienen `category = NULL` y son excluidas automáticamente de los puntajes por categoría.

**Referencia en código** (`src/actions/campaigns.ts:907-932`):

```typescript
for (const [cat, codes] of Object.entries(categoryMap)) {
  const allScores: number[] = [];
  for (const code of codes) {
    for (const [, rd] of respondentData) {
      const scores = rd.dimensionScores.get(code);
      if (scores) allScores.push(...scores);
    }
  }
  // mean(allScores) y favorability(allScores)
}
```

---

## 4. Pipeline de Procesamiento

La función `calculateResults()` en `src/actions/campaigns.ts` (líneas 284-950) ejecuta el siguiente pipeline secuencial:

### 4.1 Diagrama de Flujo

```
1. Validación de verificaciones de atención
   └─ Respondentes que fallan → status = "disqualified", excluidos
2. Inversión de ítems inversos
   └─ score_ajustado = 6 - score (para is_reverse = true)
3. Agregación por dimensión
   └─ Global: media, σ, favorabilidad por dimensión
   └─ Segmentado: por departamento, antigüedad, género
4. Resultados por ítem
   └─ Media, σ, favorabilidad por cada ítem (global)
5. Perfiles de engagement
   └─ Clasificación: embajador, comprometido, neutral, desenganchado
6. eNPS
   └─ Promotores - Detractores / Total × 100
7. Ficha técnica
   └─ N, n, tasa de respuesta, margen de error
8. Matriz de correlaciones
   └─ Pearson entre todos los pares de dimensiones (n >= 10)
9. Drivers de engagement
   └─ Correlación de cada dimensión con ENG, ordenadas por |r|
10. Alertas automáticas
    └─ Crisis: favorabilidad < 60%
    └─ Atención: favorabilidad < 70%
    └─ Grupo de riesgo: ENG < 3.5 en segmento
11. Puntajes por categoría
    └─ Media y favorabilidad por categoría
```

### 4.2 Umbral de Anonimato

Para proteger la identidad de los respondentes, los resultados segmentados (por departamento, antigüedad o género) se **excluyen** cuando el segmento tiene menos de 5 respondentes.

**Referencia en código** (`src/actions/campaigns.ts:553-554`):

```typescript
if (respondentCount < 5) continue;
```

### 4.3 Umbrales de Alerta

| Severidad    | Tipo                     | Condición                                     |
| ------------ | ------------------------ | --------------------------------------------- |
| `crisis`     | `low_favorability`       | Favorabilidad de ítem < 60%                   |
| `attention`  | `low_favorability`       | Favorabilidad de ítem < 70% (y >= 60%)        |
| `risk_group` | `low_engagement_segment` | ENG promedio < 3.5 en un segmento demográfico |

Las alertas se ordenan por severidad: crisis > risk_group > decline > attention.

**Referencia en código** (`src/actions/campaigns.ts:848-898`).

### 4.4 Almacenamiento de Resultados

Los resultados se almacenan en dos tablas:

1. **`campaign_results`**: Estadísticas dimensionales, por ítem, engagement y eNPS. Se insertan en lotes de 50.
2. **`campaign_analytics`**: Análisis avanzados (correlaciones, drivers, alertas, categorías) como JSONB. Se insertan en lotes de 10.

Antes de insertar, se eliminan los resultados previos de la campaña para garantizar idempotencia.

---

## 5. Arquitectura de Datos

### 5.1 Esquema de Tablas

#### Tablas del Modelo Organizacional

| Tabla           | Descripción                                 | Columnas Clave                                                                            |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `organizations` | Organizaciones multi-tenant                 | `id`, `name`, `slug`, `employee_count`, `size_category`, `departments` (JSONB), `country` |
| `profiles`      | Perfiles de usuario (extiende `auth.users`) | `id` (FK a auth.users), `email`, `role`, `organization_id`                                |

#### Tablas del Instrumento

| Tabla         | Descripción                 | Columnas Clave                                                                                                    |
| ------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `instruments` | Plantillas de encuesta      | `id`, `name`, `slug`, `mode` (full/pulse), `version`, `target_size`, `is_active`, `instrument_type` (base/module) |
| `dimensions`  | Dimensiones del instrumento | `id`, `instrument_id`, `name`, `code`, `category`, `theoretical_basis`, `sort_order`                              |
| `items`       | Ítems de cada dimensión     | `id`, `dimension_id`, `text`, `is_reverse`, `is_anchor`, `is_attention_check`, `sort_order`                       |

#### Tablas del Pipeline de Medición

| Tabla            | Descripción                                      | Columnas Clave                                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `campaigns`      | Olas de medición por organización                | `id`, `organization_id`, `instrument_id`, `name`, `status`, `starts_at`, `ends_at`, `population_n`, `sample_n`, `response_rate`, `margin_of_error`, `target_departments`, `target_population`, `measurement_objective`, `module_instrument_ids` (uuid[]) |
| `respondents`    | Participantes anónimos con tokens                | `id`, `campaign_id`, `token` (hex único), `department`, `tenure`, `gender`, `status`, `enps_score`                                                                                                                                                       |
| `participants`   | Datos PII separados (nombre, email)              | `id`, `campaign_id`, `respondent_id`, `name`, `email`, `department`, `invitation_status`                                                                                                                                                                 |
| `responses`      | Respuestas Likert (1 por ítem por respondente)   | `id`, `respondent_id`, `item_id`, `score` (1-5), UNIQUE(`respondent_id`, `item_id`)                                                                                                                                                                      |
| `open_responses` | Respuestas abiertas (fortaleza, mejora, general) | `id`, `respondent_id`, `question_type`, `text` (3-2000 chars)                                                                                                                                                                                            |

#### Tablas de Resultados

| Tabla                | Descripción                              | Columnas Clave                                                                                                                                                                              |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `campaign_results`   | Estadísticas calculadas (materializadas) | `id`, `campaign_id`, `result_type`, `dimension_code`, `segment_key`, `segment_type`, `avg_score`, `std_score`, `favorability_pct`, `response_count`, `respondent_count`, `metadata` (JSONB) |
| `campaign_analytics` | Análisis avanzados como JSONB            | `id`, `campaign_id`, `analysis_type`, `data` (JSONB)                                                                                                                                        |

### 5.2 Enumeraciones (Enums)

| Enum              | Valores                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `campaign_status` | `draft`, `active`, `closed`, `archived`                               |
| `user_role`       | `super_admin`, `org_admin`, `member`                                  |
| `instrument_mode` | `full`, `pulse`                                                       |
| `size_category`   | `micro` (1-10), `small` (11-50), `medium` (51-200), `large` (201-500) |
| `target_size`     | `all`, `small`, `medium`                                              |
| `instrument_type` | `base`, `module`                                                      |

### 5.3 Políticas RLS (Row Level Security)

Todas las tablas tienen RLS habilitado. El control de acceso se basa en dos funciones helper `SECURITY DEFINER`:

```sql
-- Obtiene el rol del usuario autenticado
CREATE FUNCTION get_user_role() RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obtiene la organización del usuario autenticado
CREATE FUNCTION get_user_org_id() RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### Resumen de Políticas por Tabla

| Tabla                | Rol `anon`           | Rol `org_admin`                          | Rol `super_admin`            |
| -------------------- | -------------------- | ---------------------------------------- | ---------------------------- |
| `organizations`      | SELECT (para survey) | SELECT/UPDATE (propia org)               | SELECT/INSERT/UPDATE (todas) |
| `profiles`           | —                    | SELECT (org)                             | SELECT/UPDATE (todos)        |
| `instruments`        | —                    | SELECT (activos)                         | SELECT/INSERT/UPDATE (todos) |
| `dimensions`         | SELECT               | SELECT                                   | SELECT/INSERT/UPDATE         |
| `items`              | SELECT               | SELECT                                   | SELECT/INSERT/UPDATE         |
| `campaigns`          | SELECT (activas)     | SELECT/ALL (propia org)                  | ALL                          |
| `respondents`        | SELECT/INSERT/UPDATE | SELECT                                   | SELECT/INSERT/UPDATE/DELETE  |
| `participants`       | —                    | SELECT/INSERT/UPDATE/DELETE (propia org) | SELECT/INSERT/UPDATE/DELETE  |
| `responses`          | SELECT/INSERT/UPDATE | SELECT                                   | SELECT                       |
| `open_responses`     | INSERT               | SELECT                                   | SELECT                       |
| `campaign_results`   | —                    | SELECT (propia org)                      | SELECT/ALL                   |
| `campaign_analytics` | —                    | SELECT (propia org)                      | SELECT/ALL                   |

### 5.4 Estructura JSONB: `campaign_analytics`

La tabla `campaign_analytics` almacena 11 tipos de análisis (5 estadísticos + 6 IA):

#### `analysis_type = "correlation_matrix"`

```json
{
  "ORG": {
    "ORG": { "r": 1, "pValue": 0, "n": 180 },
    "PRO": { "r": 0.72, "pValue": 0.0001, "n": 180 },
    "ENG": { "r": 0.65, "pValue": 0.0003, "n": 180 }
  },
  "PRO": { "..." }
}
```

#### `analysis_type = "engagement_drivers"`

```json
[
  { "code": "LID", "name": "Liderazgo Efectivo", "r": 0.82, "pValue": 0.0001, "n": 180 },
  { "code": "CON", "name": "Confianza Institucional", "r": 0.78, "pValue": 0.0001, "n": 180 }
]
```

Ordenado por `|r|` descendente. Excluye ENG (es la variable dependiente).

#### `analysis_type = "alerts"`

```json
[
  {
    "severity": "crisis",
    "type": "low_favorability",
    "dimension_code": "CMP",
    "item_id": "e3000000-...",
    "item_text": "Siento que no me pagan lo justo...",
    "value": 55.2,
    "threshold": 60,
    "message": "Ítem con favorabilidad crítica (55%) en Compensación"
  },
  {
    "severity": "risk_group",
    "type": "low_engagement_segment",
    "segment_key": "Ventas",
    "dimension_code": "ENG",
    "value": 3.2,
    "threshold": 3.5,
    "message": "Segmento \"Ventas\" con engagement bajo (3.2)"
  }
]
```

#### `analysis_type = "categories"`

```json
[
  { "category": "bienestar", "avg_score": 3.95, "favorability_pct": 72.3, "dimension_count": 6 },
  { "category": "direccion", "avg_score": 3.82, "favorability_pct": 68.1, "dimension_count": 5 },
  { "category": "compensacion", "avg_score": 3.45, "favorability_pct": 55.8, "dimension_count": 5 },
  { "category": "cultura", "avg_score": 3.88, "favorability_pct": 70.5, "dimension_count": 5 }
]
```

#### `analysis_type = "reliability"` (v4.1)

```json
[
  {
    "dimension_code": "ORG",
    "dimension_name": "Orgullo Institucional",
    "alpha": 0.82,
    "item_count": 4,
    "respondent_count": 120
  }
]
```

#### `analysis_type = "comment_analysis"` (v4.1.1 — IA)

```json
{
  "themes": [
    { "theme": "Liderazgo", "count": 15, "sentiment": "positive", "examples": ["Mi jefe..."] }
  ],
  "summary": { "strengths": "...", "improvements": "...", "general": "..." },
  "sentiment_distribution": { "positive": 45, "negative": 20, "neutral": 15 }
}
```

#### `analysis_type = "dashboard_narrative"` (v4.1.1 — IA)

```json
{
  "executive_summary": "Párrafo con diagnóstico general...",
  "highlights": ["Engagement alto en 4.2"],
  "concerns": ["Compensación con baja favorabilidad"],
  "recommendation": "Recomendación principal..."
}
```

#### `analysis_type = "driver_insights"` (v4.1.1 — IA)

```json
{
  "narrative": "Interpretación de drivers...",
  "paradoxes": ["Alta correlación pero alto score en LID"],
  "quick_wins": [
    {
      "dimension": "COM",
      "action": "Implementar reuniones 1:1",
      "impact": "Mejora estimada en engagement"
    }
  ]
}
```

#### `analysis_type = "alert_context"` (v4.1.1 — IA)

```json
[
  {
    "alert_index": 0,
    "root_cause": "Hipótesis de causa raíz...",
    "recommendation": "Acción concreta..."
  }
]
```

#### `analysis_type = "segment_profiles"` (v4.1.1 — IA)

```json
[
  {
    "segment": "Ventas",
    "segment_type": "department",
    "narrative": "Perfil del segmento...",
    "strengths": ["LID"],
    "risks": ["CMP"]
  }
]
```

#### `analysis_type = "trends_narrative"` (v4.1.1 — IA)

```json
{
  "trajectory": "Descripción de trayectoria general...",
  "improving": ["LID mejoró de 3.8 a 4.1"],
  "declining": ["CMP bajó de 3.5 a 3.2"],
  "stable": ["ENG se mantuvo en ~4.0"],
  "inflection_points": ["Cambio notable entre Q3 y Q1"]
}
```

### 5.5 Estructura JSONB: `campaign_results.metadata`

El campo `metadata` varía según `result_type`:

#### `result_type = "dimension"`

```json
{ "dimension_name": "Liderazgo Efectivo" }
```

#### `result_type = "item"`

```json
{
  "item_text": "Mi supervisor me brinda retroalimentación útil...",
  "dimension_name": "Liderazgo Efectivo"
}
```

#### `result_type = "engagement"`

```json
{
  "profiles": {
    "ambassadors": { "count": 45, "pct": 25.0 },
    "committed": { "count": 72, "pct": 40.0 },
    "neutral": { "count": 50, "pct": 27.8 },
    "disengaged": { "count": 13, "pct": 7.2 }
  }
}
```

#### `result_type = "enps"`

```json
{
  "promoters": { "count": 85, "pct": 47.2 },
  "passives": { "count": 60, "pct": 33.3 },
  "detractors": { "count": 35, "pct": 19.4 }
}
```

Para eNPS, `avg_score` almacena el valor eNPS (-100 a +100) y `favorability_pct` almacena el porcentaje de promotores.

### 5.6 Triggers de Base de Datos

| Trigger                        | Tabla           | Evento                          | Acción                                                |
| ------------------------------ | --------------- | ------------------------------- | ----------------------------------------------------- |
| `trg_classify_size_category`   | `organizations` | INSERT/UPDATE of employee_count | Clasifica automáticamente en micro/small/medium/large |
| `trg_organizations_updated_at` | `organizations` | UPDATE                          | Actualiza `updated_at`                                |
| `trg_profiles_updated_at`      | `profiles`      | UPDATE                          | Actualiza `updated_at`                                |
| `trg_instruments_updated_at`   | `instruments`   | UPDATE                          | Actualiza `updated_at`                                |
| `trg_items_updated_at`         | `items`         | UPDATE                          | Actualiza `updated_at`                                |
| `trg_campaigns_updated_at`     | `campaigns`     | UPDATE                          | Actualiza `updated_at`                                |
| `on_auth_user_created`         | `auth.users`    | INSERT                          | Crea perfil automáticamente                           |

### 5.7 Índices

| Índice                          | Tabla                | Columna(s)                 |
| ------------------------------- | -------------------- | -------------------------- |
| `idx_campaigns_org`             | `campaigns`          | `organization_id`          |
| `idx_campaigns_status`          | `campaigns`          | `status`                   |
| `idx_respondents_campaign`      | `respondents`        | `campaign_id`              |
| `idx_respondents_token`         | `respondents`        | `token`                    |
| `idx_responses_respondent`      | `responses`          | `respondent_id`            |
| `idx_responses_item`            | `responses`          | `item_id`                  |
| `idx_campaign_results_campaign` | `campaign_results`   | `campaign_id`              |
| `idx_campaign_results_type`     | `campaign_results`   | `campaign_id, result_type` |
| `idx_analytics_campaign`        | `campaign_analytics` | `campaign_id`              |
| `idx_analytics_type`            | `campaign_analytics` | `analysis_type`            |
| `idx_participants_campaign`     | `participants`       | `campaign_id`              |
| `idx_participants_respondent`   | `participants`       | `respondent_id`            |
| `idx_participants_email`        | `participants`       | `campaign_id, email`       |

---

## 6. Flujo de Encuesta

### 6.1 Acceso Basado en Token

Cada respondente tiene un token hexadecimal único de 32 caracteres generado por `encode(gen_random_bytes(16), 'hex')`. La URL de acceso es:

```
https://{dominio}/survey/{token}
```

No se requiere autenticación. El cliente Supabase `anon` es suficiente para leer el instrumento y escribir respuestas. Si la campaña incluye módulos opcionales (`module_instrument_ids`), las dimensiones de los módulos se cargan junto con las del instrumento base y se presentan después de las dimensiones base.

### 6.2 Pasos de la Encuesta

```
1. Welcome
   └─ Logo de la organización, instrucciones, botón "Comenzar"
   └─ Marca respondent.status = "in_progress", started_at = now()

2. Demographics
   └─ Departamento (requerido, de lista de la organización)
   └─ Antigüedad (requerido)
   └─ Género (opcional)
   └─ Guarda en tabla respondents

3. Dimensiones (1 página por dimensión)
   └─ "Sección X de Y" con barra de progreso
   └─ Ítems de la dimensión con orden aleatorio (Fisher-Yates con seed)
   └─ Todos los ítems deben responderse antes de avanzar
   └─ Al hacer "Siguiente": upsert de respuestas con retry

4. Preguntas Abiertas + eNPS (si allow_comments = true)
   └─ eNPS (0-10): "¿Qué tan probable es que recomiendes...?"
   └─ Fortaleza: "¿Qué es lo mejor de trabajar aquí?"
   └─ Mejora: "Si pudieras cambiar una cosa...?"
   └─ General: "¿Algo más que quieras compartir?"
   └─ Todas opcionales (mín. 3 caracteres si se responden)

5. Agradecimiento
   └─ Confirmación de respuestas guardadas
   └─ Marca respondent.status = "completed", completed_at = now()
```

### 6.3 Aleatorización de Ítems

Los ítems dentro de cada dimensión se aleatorizan usando el algoritmo Fisher-Yates con un generador de números pseudoaleatorios (LCG) con semilla determinista:

```
semilla = hash("{token}-{código_dimensión}")
```

Esto garantiza:

- **Estabilidad**: El mismo respondente siempre ve el mismo orden
- **Diversidad**: Cada dimensión tiene su propia semilla
- **Reproducibilidad**: Permite reanudar la encuesta sin reordenar

Las dimensiones **no** se aleatorizan; mantienen su `sort_order` original.

### 6.4 Respaldo en localStorage

Para resiliencia ante fallos de red:

1. **Guardado automático**: Cada cambio de puntaje se guarda en `localStorage` bajo la clave `climalab_survey_{token}`
2. **Estructura**: `{ scores: { [item_id]: score } }`
3. **Recuperación al cargar**: Al montar el componente, se comparan las respuestas en localStorage con las de la base de datos
4. **Upsert de diferencias**: Las respuestas presentes en localStorage pero ausentes en DB se reinsertan automáticamente
5. **Limpieza**: El localStorage se borra al completar exitosamente la encuesta

### 6.5 Estrategia de Upsert

Las respuestas se guardan mediante upsert (INSERT con ON CONFLICT DO UPDATE) aprovechando la restricción UNIQUE `(respondent_id, item_id)`:

```typescript
await supabase.from("responses").upsert(rows, {
  onConflict: "respondent_id,item_id",
});
```

Incluye lógica de retry con 3 intentos y backoff exponencial (1s, 2s, 3s).

### 6.6 Reanudación de Encuesta

Si un respondente con status `in_progress` regresa:

1. Se verifican qué dimensiones están completamente respondidas
2. Se reanuda en la primera dimensión incompleta
3. Si todas las dimensiones están completas, se muestra la página de preguntas abiertas

---

## 7. Flujo de Campaña

### 7.1 Ciclo de Vida

```
draft → active → closed → archived
```

| Estado     | Descripción               | Acciones Permitidas                                       |
| ---------- | ------------------------- | --------------------------------------------------------- |
| `draft`    | Configuración inicial     | Editar nombre, objetivo, departamentos, generar enlaces   |
| `active`   | Recolección de respuestas | Los respondentes pueden completar la encuesta             |
| `closed`   | Encuesta finalizada       | Se ejecuta `calculateResults()`, se visualizan resultados |
| `archived` | Histórico                 | Solo lectura, disponible para comparaciones               |

### 7.2 Multi-Instrumento: Base + Módulos (v4.2)

Las campañas soportan un instrumento base obligatorio (Core o Pulso) + hasta 3 módulos opcionales. La clasificación se controla mediante el enum `instrument_type` (`base` | `module`) en la tabla `instruments`.

**Esquema:**

- `instruments.instrument_type` — clasifica instrumentos como base o módulo
- `campaigns.module_instrument_ids uuid[]` — array de IDs de módulos seleccionados (default `{}`)

**Flujo de selección:**

1. El admin selecciona un instrumento base (Select filtrado por `instrument_type = 'base'`)
2. Opcionalmente marca módulos (checkboxes filtrados por `instrument_type = 'module'`)
3. Al crear la campaña, se valida que los IDs de módulos existan con tipo `module`

**Carga de dimensiones:**

En `calculateResults()`, el survey page y `seed-results.ts`, las dimensiones se cargan con:

```typescript
const allInstrumentIds = [campaign.instrument_id, ...(campaign.module_instrument_ids ?? [])];
supabase.from("dimensions").select("*, items(*)").in("instrument_id", allInstrumentIds);
```

**Categorías:** Las dimensiones de módulos tienen `category = NULL` en la base de datos. En el cálculo de resultados, son excluidas automáticamente de los puntajes por categoría (`if (!cat) continue`). En la UI de dimensiones, se mapean a una pseudo-categoría `"modulos"` y se muestran en una pestaña "Módulos Opcionales" que aparece dinámicamente cuando hay resultados de módulos.

### 7.3 Generación de Respondentes

El admin genera respondentes en lote especificando la cantidad. Cada respondente recibe:

- Un UUID único como `id`
- Un token hexadecimal de 32 caracteres para acceso anónimo
- Status inicial `pending`

Para campañas con participantes nombrados, se crea adicionalmente un registro en `participants` vinculado al respondente, con nombre y email para gestión de invitaciones.

### 7.4 Cálculo de Resultados

Al cerrar la campaña (transición `active` → `closed`), se ejecuta `calculateResults()` que:

1. Obtiene la campaña, organización, instrumento base y dimensiones (incluyendo módulos si `module_instrument_ids` tiene entries)
2. Carga todos los respondentes con status `completed`
3. Carga todas las respuestas
4. Filtra por verificaciones de atención
5. Calcula estadísticas (ver [Pipeline de Procesamiento](#4-pipeline-de-procesamiento))
6. Elimina resultados previos (idempotencia)
7. Inserta resultados en `campaign_results` y `campaign_analytics`
8. Actualiza la ficha técnica en la campaña (population_n, sample_n, response_rate, margin_of_error)

### 7.5 Ficha Técnica

Se calcula y almacena directamente en la tabla `campaigns`:

| Campo              | Descripción                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `population_n`     | Población objetivo (de `target_population` o `employee_count`)    |
| `sample_n`         | Número de respondentes válidos (pasaron verificación de atención) |
| `response_rate`    | `(sample_n / population_n) × 100`                                 |
| `margin_of_error`  | Margen de error al 95% de confianza con FPC (ver sección 3.8)     |
| `confidence_level` | Fijo en 95.0%                                                     |

---

## 8. Esquema de UUIDs

Para garantizar reproducibilidad en datos de demostración y facilitar las migraciones, se utiliza un esquema de UUIDs deterministas:

### 8.1 Prefijos por Entidad

| Entidad                        | Prefijo UUID                        | Rango                                                      |
| ------------------------------ | ----------------------------------- | ---------------------------------------------------------- |
| Organización demo              | `a0000000-0000-0000-0000-000000000` | `001`                                                      |
| Core v4.0                      | `b0000000-0000-0000-0000-000000000` | `001`                                                      |
| Pulso v4.0                     | `b0000000-0000-0000-0000-000000000` | `002`                                                      |
| Módulo: Gestión del Cambio     | `b0000000-0000-0000-0000-000000000` | `003`                                                      |
| Módulo: Orientación al Cliente | `b0000000-0000-0000-0000-000000000` | `004`                                                      |
| Módulo: Preparación Digital    | `b0000000-0000-0000-0000-000000000` | `005`                                                      |
| Dimensiones Core               | `d3000000-0000-0000-0000-000000000` | `001`–`022`                                                |
| Ítems Core                     | `e3000000-0000-0000-0000-000000000` | `001`–`112` (con huecos: 082 eliminado, 108–109 no usados) |
| Dimensiones Pulso              | `d4000000-0000-0000-0000-000000000` | `001`–`022`                                                |
| Ítems Pulso                    | `e4000000-0000-0000-0000-000000000` | `001`–`022`                                                |
| Dimensiones Módulos            | `d5000000-0000-0000-0000-000000000` | `001`–`003`                                                |
| Ítems Módulos                  | `e5000000-0000-0000-0000-000000000` | `001`–`016`                                                |
| Campañas demo                  | `f0000000-0000-0000-0000-000000000` | `001`–`002`                                                |

### 8.2 Convención

- Los prefijos `d3`/`e3` indican Core v4.0
- Los prefijos `d4`/`e4` indican Pulso v4.0
- Los prefijos `d5`/`e5` indican módulos opcionales
- El sufijo secuencial (`001`, `002`, ...) permite rastreo y depuración

---

## Apéndice A: Archivos Fuente Clave

| Archivo                                    | Líneas      | Descripción                                                           |
| ------------------------------------------ | ----------- | --------------------------------------------------------------------- |
| `src/actions/campaigns.ts`                 | 284–950     | `calculateResults()` — motor de cálculo estadístico                   |
| `src/actions/analytics.ts`                 | 1–221       | 7 server actions para consulta de analytics                           |
| `scripts/seed-results.ts`                  | —           | Réplica offline del pipeline para datos demo                          |
| `scripts/generate-demo-seed.mjs`           | —           | Generador de datos demo con PRNG determinista (mulberry32)            |
| `scripts/ona-analysis.py`                  | —           | Análisis de redes perceptuales (Python/NetworkX)                      |
| `supabase/seed.sql`                        | ~24K líneas | Definición completa del instrumento v4.0 + datos demo (incl. módulos) |
| `src/app/survey/[token]/page.tsx`          | —           | Server component de validación del survey                             |
| `src/app/survey/[token]/survey-client.tsx` | ~800 líneas | Client component con toda la lógica de encuesta                       |

## Apéndice B: Migraciones SQL

| Migración                                 | Descripción                                                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `000001_enums_and_organizations.sql`      | Enums (size_category, user_role, instrument_mode, target_size) + tabla organizations con trigger de clasificación                                                                 |
| `000002_profiles.sql`                     | Tabla profiles + trigger de auto-creación en signup                                                                                                                               |
| `000003_instruments_dimensions_items.sql` | Tablas instruments, dimensions, items                                                                                                                                             |
| `000004_rls_policies.sql`                 | Funciones helper RLS (get_user_role, get_user_org_id) + políticas para org/profiles/instruments/dimensions/items                                                                  |
| `000005_helper_functions.sql`             | Función generate_slug + get_org_department_counts                                                                                                                                 |
| `000006_measurement_pipeline.sql`         | Tablas campaigns, respondents, responses, open_responses, campaign_results + RLS + índices                                                                                        |
| `000007_update_org_limit.sql`             | Aumenta employee_count máximo de 200 a 500                                                                                                                                        |
| `000008_fix_anon_rls.sql`                 | Políticas anon: SELECT en respondents, responses, campaigns, dimensions, items, organizations                                                                                     |
| `000009_add_enps.sql`                     | Columna enps_score (0-10) en respondents                                                                                                                                          |
| `000010_add_large_size.sql`               | Enum value 'large' en size_category + trigger actualizado                                                                                                                         |
| `000011_v3_dimensions_analytics.sql`      | Columnas category/theoretical_basis en dimensions + tabla campaign_analytics                                                                                                      |
| `000012_onboarding_evolution.sql`         | Columnas comerciales en organizations + departments text[] → JSONB + columnas de campaña (objective, target)                                                                      |
| `000013_participants.sql`                 | Tabla participants (PII separada) + RLS para respondents autenticados                                                                                                             |
| `000014_fix_anon_responses_upsert.sql`    | Política UPDATE para anon en responses (fix de upsert silencioso)                                                                                                                 |
| `000015_core_v4_instrument.sql`           | Rediseño Core v4.0: 3 nuevas dimensiones, 26 nuevos ítems, Pulso v4.0, módulos opcionales                                                                                         |
| `000016_instrument_v4_corrections.sql`    | Correcciones psicométricas: desagregación EQA/NDI, reducción LID a 6 ítems, fix DEM reverse, fix SEG anchor, renombrar liderazgo→direccion, ítem de orientación al cliente en RES |
| `000017_business_indicators.sql`          | Tabla business_indicators para métricas objetivas de negocio por campaña                                                                                                          |
| `000018_multi_instrument_modules.sql`     | Enum `instrument_type` (base/module) en instruments + columna `module_instrument_ids uuid[]` en campaigns para soporte multi-instrumento                                          |

## Apéndice C: Server Actions de Analytics

| Action                   | Descripción                                              | Fuente                                  |
| ------------------------ | -------------------------------------------------------- | --------------------------------------- |
| `getCorrelationMatrix()` | Matriz de correlación Pearson entre dimensiones          | `campaign_analytics.correlation_matrix` |
| `getEngagementDrivers()` | Dimensiones rankeadas por correlación con ENG            | `campaign_analytics.engagement_drivers` |
| `getAlerts()`            | Alertas automáticas (crisis, atención, grupo de riesgo)  | `campaign_analytics.alerts`             |
| `getCategoryScores()`    | Puntajes promedio por categoría de dimensión             | `campaign_analytics.categories`         |
| `getHeatmapData()`       | Puntajes dimensionales segmentados (excluye global)      | `campaign_results` filtrado             |
| `getWaveComparison()`    | Comparación de todas las campañas cerradas de una org    | `campaign_results` multi-campaña        |
| `getTrendsData()`        | Series históricas de puntajes dimensionales              | `campaign_results` multi-campaña        |
| `getReliabilityData()`   | Alfa de Cronbach por dimensión                           | `campaign_analytics.reliability`        |
| `getONAResults()`        | Análisis de red perceptual (grafo, comunidades, bridges) | `campaign_analytics.ona_network`        |

---

## 9. Métricas Psicométricas (v4.1)

### 9.1 Índice de Acuerdo Intergrupal — rwg(j)

El índice rwg(j) (James, Demaree & Wolf, 1984) mide el grado de acuerdo entre respondentes dentro de un grupo. Justifica la agregación de percepciones individuales a nivel grupal.

**Fórmula:**

```
rwg(j) = 1 - (S²_obs / S²_esperada)
```

Donde:

- `S²_obs` = varianza poblacional observada (÷ N, no N-1) de las medias por respondente para la dimensión
- `S²_esperada` = varianza esperada bajo distribución uniforme = (A² - 1) / 12 = (25 - 1) / 12 = **2.0** para escala Likert de 5 puntos
- Mínimo 3 scores. Resultado clamped a [0, 1]

**Umbrales interpretativos:**
| rwg | Interpretación |
|-----|---------------|
| ≥ 0.70 | Acuerdo suficiente — el promedio grupal representa una percepción compartida |
| 0.50 – 0.69 | Acuerdo moderado — percepciones heterogéneas |
| < 0.50 | Acuerdo bajo — el promedio no representa una percepción compartida |

**Implementación:**

- Se calcula para cada dimensión a nivel global y por segmento demográfico
- Se almacena en el campo `metadata.rwg` de `campaign_results`
- En la UI: el valor numérico NO se muestra al usuario; se muestra un badge cualitativo (amarillo/rojo) solo cuando rwg < 0.70

### 9.2 Alfa de Cronbach — Confiabilidad Interna

El coeficiente alfa de Cronbach (1951) mide la consistencia interna de los ítems dentro de cada dimensión.

**Fórmula:**

```
α = (k / (k-1)) × (1 - Σσ²_item / σ²_total)
```

Donde:

- `k` = número de ítems en la dimensión
- `σ²_item` = varianza de cada ítem (entre respondentes)
- `σ²_total` = varianza del puntaje total (suma de ítems por respondente)
- Mínimo k=2 ítems, mínimo n=10 respondentes
- Se utilizan puntajes ajustados (post-inversión de ítems reversos)

**Umbrales interpretativos:**
| α | Interpretación |
|---|---------------|
| ≥ 0.70 | Aceptable para investigación organizacional |
| 0.60 – 0.69 | Marginal — interpretar con cautela |
| < 0.60 | Bajo — la dimensión puede no medir un constructo unitario |

**Nota de sensibilidad:** El alfa es sensible al número de ítems. Dimensiones con 4 ítems tendrán alfas naturalmente más bajos que dimensiones con 6 ítems, sin que esto implique menor calidad de medición.

**Implementación:**

- Se calcula después de los puntajes por categoría, antes de insertar analytics
- Se almacena como `analysis_type: "reliability"` en `campaign_analytics`

### 9.3 Limitaciones Metodológicas Auto-detectadas

El sistema genera automáticamente una sección de limitaciones en la Ficha Técnica basándose en:

| Condición                      | Mensaje                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| α < 0.60 en alguna dimensión   | Lista dimensiones con baja consistencia interna                |
| rwg < 0.50 en alguna dimensión | Lista dimensiones con bajo acuerdo intergrupal                 |
| Tasa de respuesta < 60%        | Advertencia de posible sesgo de no respuesta                   |
| n < 30                         | Advertencia de muestra insuficiente para estimaciones estables |
| Siempre                        | Nota sobre percepciones vs. condiciones objetivas              |
| Siempre                        | Nota sobre invariancia factorial no establecida                |

---

## 10. Indicadores de Negocio

### 10.1 Tabla `business_indicators`

Permite registrar métricas objetivas de negocio por campaña para correlación temporal con resultados de clima.

| Campo                         | Tipo    | Descripción                        |
| ----------------------------- | ------- | ---------------------------------- |
| `campaign_id`                 | uuid FK | Campaña asociada                   |
| `indicator_name`              | text    | Nombre del indicador (2-100 chars) |
| `indicator_value`             | numeric | Valor numérico                     |
| `indicator_unit`              | text    | Unidad (max 20 chars, opcional)    |
| `indicator_type`              | text    | Tipo predefinido o 'custom'        |
| `period_start` / `period_end` | date    | Periodo de medición (opcional)     |
| `notes`                       | text    | Notas adicionales (max 500 chars)  |

**Tipos predefinidos:**
turnover_rate, absenteeism_rate, customer_nps, customer_satisfaction, productivity_index, incident_count, custom

**Nota importante:** La co-evolución temporal de indicadores de negocio y resultados de clima NO implica causalidad. Las correlaciones observadas entre mejoras de clima y mejoras de indicadores requieren diseños cuasi-experimentales o longitudinales con controles para establecer relaciones causales.

### 10.2 Flujo de Administración

1. El admin navega a la página de detalle de campaña
2. En la sección "Indicadores de negocio", hace clic en "+ Agregar indicador"
3. Selecciona tipo predefinido (auto-completa nombre y unidad) o "Otro indicador" para entrada libre
4. Ingresa valor, periodo opcional y notas
5. Los indicadores se muestran en el dashboard de resultados cuando existen

---

## 11. Análisis con IA (v4.1.1)

### 11.1 Arquitectura

ClimaLab integra un modelo de lenguaje (LLM) vía Ollama para generar análisis cualitativos complementarios a las métricas estadísticas. La integración sigue el patrón:

```
Ollama (Qwen 2.5 72B) ← system prompt + datos estructurados → JSON → campaign_analytics
```

**Configuración:**

- `OLLAMA_BASE_URL`: URL del servidor Ollama
- `OLLAMA_MODEL`: Modelo a usar (default: `qwen2.5:72b`)
- Temperature: 0.3 (baja para consistencia)
- Timeout: 120s por llamada

### 11.2 Funciones de Generación

| Función                     | Entrada                                           | Salida                                        | Almacenamiento        |
| --------------------------- | ------------------------------------------------- | --------------------------------------------- | --------------------- |
| `analyzeComments()`         | Comentarios abiertos por tipo                     | Temas, sentimiento, resumen                   | `comment_analysis`    |
| `generateNarrative()`       | KPIs, categorías, dimensiones top/bottom, alertas | Resumen ejecutivo, destacados, preocupaciones | `dashboard_narrative` |
| `interpretDrivers()`        | Drivers de engagement + scores                    | Narrativa, paradojas, quick wins              | `driver_insights`     |
| `contextualizeAlerts()`     | Lista de alertas con severity/value               | Causa raíz + recomendación por alerta         | `alert_context`       |
| `profileSegments()`         | Scores por segmento vs global                     | Perfil narrativo con fortalezas/riesgos       | `segment_profiles`    |
| `generateTrendsNarrative()` | Scores por dimensión across campaigns             | Trayectoria, mejoras, declives, inflexiones   | `trends_narrative`    |

### 11.3 Orquestación

`generateAllInsights(campaignId)` ejecuta las 5 funciones de campaña en paralelo (`Promise.all`), luego genera la narrativa de tendencias. Elimina insights previos antes de insertar nuevos. Disponible desde el dashboard con botón "Generar insights IA".

### 11.4 Páginas con IA

| Página    | Componente             | Funcionalidad IA                                                   |
| --------- | ---------------------- | ------------------------------------------------------------------ |
| Dashboard | `dashboard-client.tsx` | Resumen ejecutivo con highlights/concerns/recommendation           |
| Comments  | `comments-client.tsx`  | Distribución de sentimiento, temas con ejemplos, resumen           |
| Drivers   | `drivers-client.tsx`   | Interpretación narrativa, quick wins, paradojas                    |
| Alerts    | `alerts-client.tsx`    | Causa raíz y recomendación inline por alerta                       |
| Segments  | `segments-client.tsx`  | Perfiles narrativos por segmento con badges                        |
| Trends    | `trends-client.tsx`    | Análisis de trayectoria con dims mejorando/declinando              |
| Export    | `export-client.tsx`    | Reporte ejecutivo descargable (.txt) combinando todos los insights |

### 11.5 Consideraciones

- Los insights IA son **complementarios**, no sustituyen el análisis estadístico
- Se almacenan en `campaign_analytics` y se cargan en SSR para carga rápida
- Cada página tiene botón "Regenerar" para actualización on-demand
- Si Ollama no está configurado (`OLLAMA_BASE_URL` ausente), las funciones retornan error sin afectar la operación normal
- Los prompts están en español latinoamericano profesional
- Se solicita JSON estructurado al modelo para parsing confiable

---

## 12. Análisis de Redes Perceptuales (ONA)

### 12.1 Concepto

El módulo ONA (Organizational Network Analysis) construye un grafo de similitud perceptual: dos respondentes están "conectados" si perciben la organización de forma similar (coseno de sus vectores de 22 dimensiones > umbral). NO es ONA sociométrico (quién habla con quién) — detecta clusters de personas que experimentan la organización de la misma manera.

### 12.2 Método

1. **Vectores dimensionales**: Para cada respondente válido, se calcula el puntaje promedio en cada una de las 21 dimensiones (excluyendo ENG como variable dependiente). Los ítems inversos se ajustan antes del cálculo.

2. **Grafo de similitud**: Se calcula la similitud coseno entre todos los pares de respondentes. Se aplica un umbral adaptativo (inicia en 0.85, ajusta ±0.05) buscando una densidad de aristas entre 10-30%.

3. **Detección de comunidades**: Algoritmo de Louvain (Blondel et al. 2008) con seed=42 para reproducibilidad. Maximiza la modularidad del grafo.

4. **Métricas de centralidad**:
   - **Eigenvector**: Influencia basada en conexiones con nodos influyentes
   - **Betweenness**: Control de flujo de información entre comunidades
   - **Degree**: Número de conexiones directas

### 12.3 Resultados Almacenados

Se almacena en `campaign_analytics` con `analysis_type = 'ona_network'`:

| Campo                | Contenido                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `summary`            | Nodos, aristas, densidad, comunidades, modularidad, clustering                                                              |
| `communities`        | Perfil por comunidad: tamaño, puntaje promedio, distribución departamental, scores dimensionales, top diferencias vs. media |
| `discriminants`      | Top 10 dimensiones por spread (max - min entre clusters)                                                                    |
| `department_density` | Matriz de densidad de conexiones entre departamentos                                                                        |
| `bridges`            | Nodos puente (alto betweenness + vecinos en múltiples comunidades)                                                          |
| `global_means`       | Promedios globales por dimensión                                                                                            |

### 12.4 Parámetros

| Parámetro         | Valor   | Justificación                        |
| ----------------- | ------- | ------------------------------------ |
| Mín. respondentes | 10      | Mínimo para grafo significativo      |
| Umbral inicial    | 0.85    | Coseno alto = percepción muy similar |
| Densidad objetivo | 10-30%  | Balance entre señal y ruido          |
| Algoritmo         | Louvain | Escalable, determinista con seed     |
| Seed              | 42      | Reproducibilidad                     |

### 12.5 Interpretación

- **1 comunidad**: Percepción homogénea
- **2-3 comunidades**: Realidades diferenciadas (valor diagnóstico alto)
- **4+ comunidades**: Fragmentación organizacional
- **Modularidad > 0.3**: Estructura comunitaria clara
- **Nodos puente**: "Traductores culturales" que conectan mundos perceptuales diferentes

### 12.6 Limitaciones

- Los vectores se basan en promedios dimensionales, no en ítems individuales
- La similitud coseno no captura diferencias de magnitud (solo patrón)
- Louvain puede producir soluciones ligeramente diferentes con grafos cerca del umbral de resolución
- Con < 30 respondentes, las comunidades pueden ser artefactos del tamaño muestral
- NO es análisis sociométrico — no mide interacciones reales entre personas

### 12.7 Stack Técnico

- **Python**: NetworkX (grafos), scipy (coseno), numpy (vectores), pandas (dataframes)
- **Dependencias**: PEP 723 inline script metadata — `uv run` resuelve e instala automáticamente, sin pasos manuales
- **Invocación**: `uv run scripts/ona-analysis.py [campaign_id]` (prefiere uv, fallback a `python3`)
- **Integración**: Se invoca automáticamente al cerrar campaña (async, non-blocking) y en `seed-results.ts` (sync). Ambos usan cadena de fallback: intenta `uv run` primero, luego `python3`. Si ninguno está disponible, falla silenciosamente sin afectar el flujo principal
- **Narrativa server-side**: El script genera una narrativa template-based que se almacena en el campo `narrative` del JSON. El cliente usa esta narrativa si existe, con fallback a generación client-side

---

## 14. Multi-instrumento (v4.2)

### 14.1 Modelo de Datos

La version 4.2 introduce soporte para instrumentos modulares:

- **Enum `instrument_type`**: `base` (Core, Pulso) o `module` (modulos opcionales)
- **Columna `module_instrument_ids uuid[]`** en `campaigns`: lista de instrumentos modulo seleccionados para la campana
- Cada campana tiene exactamente 1 instrumento base + 0 a 3 modulos opcionales

### 14.2 Modulos Disponibles

| Modulo                 | Codigo | Items | Base Teorica         |
| ---------------------- | ------ | ----- | -------------------- |
| Gestion del Cambio     | CAM    | 8     | Armenakis 1993       |
| Orientacion al Cliente | CLI    | 4     | Narver & Slater 1990 |
| Preparacion Digital    | DIG    | 4     | Davis 1989           |

### 14.3 Carga de Dimensiones

En tres puntos criticos, las dimensiones se cargan usando `.in("instrument_id", [base, ...modules])`:

1. **Survey client** (`src/app/survey/[token]/survey-client.tsx`): Presenta items de base + modulos seleccionados
2. **calculateResults** (`src/actions/campaigns.ts`): Procesa respuestas de todos los instrumentos
3. **seed-results** (`scripts/seed-results.ts`): Replica el calculo para datos demo

### 14.4 Presentacion en Resultados

- Las dimensiones de modulos tienen `category = NULL` en la tabla `dimensions`
- En la UI, se mapean a la pseudo-categoria `"modulos"` y se presentan en una pestana separada "Modulos Opcionales"
- Los scores de modulos NO se incluyen en el calculo de scores por categoria (bienestar, direccion, etc.)

---

## 15. Export y Reportes

### 15.1 Formatos de Exportacion

| Formato      | Descripcion                                                                                                                                   | Generacion                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Excel (XLSX) | 8 hojas: resumen, dimensiones, items, segmentos, drivers, alertas, comentarios, ficha tecnica                                                 | Server-side via exceljs             |
| PDF          | Reporte ejecutivo con KPIs, categorias, dimensiones, departamentos, alertas, drivers, comentarios, indicadores de negocio, ONA, ficha tecnica | Server-side via @react-pdf/renderer |
| CSV          | Scores por dimension                                                                                                                          | Client-side                         |
| JSON         | Dump completo de datos analiticos                                                                                                             | Client-side                         |
| TXT (IA)     | Reporte ejecutivo con narrativas AI (requiere Ollama)                                                                                         | Client-side con server actions      |

### 15.2 Arquitectura

- **Server action**: `src/actions/export.ts` — `generateExcelReport()` y `generatePdfReport()`
- **PDF component**: `src/components/reports/pdf-report.tsx` — componente React-PDF con 11 secciones
- **Client**: `src/app/(dashboard)/campaigns/[id]/results/export/export-client.tsx` — interfaz de descarga
- Los reportes se generan on-demand (no pre-calculados) y se envian como base64 al cliente para descarga

### 15.3 Contenido del PDF

1. Portada (campana, organizacion, fecha)
2. Resumen ejecutivo (AI, si disponible)
3. Indicadores clave (engagement, favorabilidad, eNPS, tasa de respuesta)
4. Scores por categoria
5. Ranking de dimensiones (codigo, nombre, score, fav%, rwg)
6. Resumen por departamento
7. Alertas principales
8. Top drivers de engagement
9. Resumen de comentarios (AI, si disponible)
10. Indicadores de negocio (si existen)
11. Red perceptual ONA (si existe)
12. Ficha tecnica (poblacion, muestra, tasa, margen de error, Cronbach alpha)

---

## 13. Referencias Adicionales (v4.1)

- James, L. R., Demaree, R. G., & Wolf, G. (1984). Estimating within-group interrater reliability with and without response bias. _Journal of Applied Psychology, 69_(1), 85-98.
- Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. _Psychometrika, 16_(3), 297-334.
- Blondel, V. D., Guillaume, J. L., Lambiotte, R., & Lefebvre, E. (2008). Fast unfolding of communities in large networks. _Journal of Statistical Mechanics, 2008_(10), P10008.
- Martinolli, G. et al. (2023). Encuesta de Clima Organizacional VI (ECO VI). Universidad de Buenos Aires.
- Patlán, J. & Flores, R. (2013). Desarrollo y validación de la escala multidimensional de clima organizacional (EMCO). _Acta de Investigación Psicológica, 3_(1), 1067-1084.
