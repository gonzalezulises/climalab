# Spec Audit Report — ClimaLab Statistical Motor & ONA

**Fecha**: 2026-03-08
**Alcance**: Auditoría del motor estadístico (`src/lib/statistics.ts`), ONA (`scripts/ona-analysis.py`), y especificación formal del README.

---

## 1. Funciones Auditadas

### `src/lib/statistics.ts` — 6 funciones exportadas

| Función                 | Fórmula                                | Edge cases documentados                                        |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `mean(arr)`             | Σx/n                                   | arr vacío → NaN (sin guard, by design)                         |
| `stdDev(arr)`           | √(Σ(x-μ)²/(n-1)) — Bessel's correction | n < 2 → 0                                                      |
| `favorability(arr)`     | (count(x≥4)/n) × 100                   | arr vacío → NaN (sin guard)                                    |
| `rwg(scores)`           | 1 - σ²pop/σ²EU, σ²EU=2.0               | n < 3 → null; todos iguales → 1.0; varianza > EU → clamped a 0 |
| `cronbachAlpha(matrix)` | (k/(k-1)) × (1 - Σσ²ᵢ/σ²ₜ)             | n < 10 → null; k < 2 → null; totalVar=0 → null                 |
| `pearson(x, y)`         | Σ(dx·dy)/√(Σdx²·Σdy²)                  | n < 10 → {r:0, p:1}; denom=0 → {r:0, p:1}                      |

### `src/actions/campaigns.ts` — Fórmulas inline (no exportadas)

| Cálculo               | Ubicación | Edge cases                                                         |
| --------------------- | --------- | ------------------------------------------------------------------ |
| Margen de error (FPC) | L734-737  | n≤0 o N≤1 → 0; n≥N → FPC→0                                         |
| eNPS                  | L694-697  | promotores ≥9, detractores ≤6                                      |
| Perfiles engagement   | L641-644  | ≥4.5 embajador, ≥4.0 comprometido, ≥3.0 neutral, <3.0 desvinculado |
| Umbral anonimato      | L555-556  | n < 5 → segmento no reportado                                      |

### `scripts/ona-analysis.py` — Funciones principales

| Función                               | Descripción                                    | Constantes                                             |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `build_similarity_graph()`            | Grafo coseno con threshold adaptativo          | DENSITY_TARGET_MIN=0.10, DENSITY_TARGET_MAX=0.30       |
| `detect_communities_with_stability()` | Leiden × 50 iteraciones + NMI                  | NMI_ROBUST_THRESHOLD=0.80, NMI_MODERATE_THRESHOLD=0.50 |
| `compute_ona_metrics()`               | Centralidad, perfiles, discriminantes, puentes | MIN_RESPONDENTS=10                                     |
| `generate_graph_image()`              | PNG base64, Fruchterman-Reingold               | —                                                      |

---

## 2. Bugs Encontrados

**No se encontraron bugs en la lógica estadística.** Todas las fórmulas implementan correctamente las referencias bibliográficas documentadas.

### Observaciones (no son bugs):

1. **rwg usa umbral n < 3 en lugar de n < 2**: Más estricto que James et al. (1984) que permite n ≥ 2. Decisión de diseño conservadora — no es un bug.

2. **cronbachAlpha usa umbral n < 10 en lugar de n < 2**: Decisión de diseño para evitar alfas inestables con muestras pequeñas. Correcto para el contexto de clima organizacional.

3. **p-value de Pearson es aproximado**: Usa `Math.exp(-0.717 * |t| - 0.416 * t²/df)` en lugar de la distribución t exacta. Adecuado para el uso (screening de drivers, no publicación académica).

4. **ONA threshold adaptativo**: La spec original pedía extraer `COSINE_SIMILARITY_THRESHOLD` como constante fija, pero el código usa búsqueda binaria para 10-30% de densidad. Se documentaron las constantes de densidad objetivo en su lugar.

---

## 3. Cobertura de Tests

### Antes

| Suite                                    | Tests  |
| ---------------------------------------- | ------ |
| `src/lib/statistics.test.ts` (existente) | 25     |
| `src/lib/rate-limit.test.ts`             | 4      |
| `src/lib/validations/schemas.test.ts`    | 18     |
| **Total**                                | **47** |

### Después

| Suite                                    | Tests         | Nuevo |
| ---------------------------------------- | ------------- | ----- |
| `src/lib/statistics.test.ts` (existente) | 25            | —     |
| `src/lib/__tests__/statistics.test.ts`   | 66            | ✓     |
| `src/lib/rate-limit.test.ts`             | 4             | —     |
| `src/lib/validations/schemas.test.ts`    | 18            | —     |
| **Total Vitest**                         | **113**       | +66   |
| `scripts/test_ona.py` (pytest)           | 9             | ✓     |
| `testing-agent verify-stats`             | 20 assertions | ✓     |

### Tests nuevos por categoría

| Categoría           | Tests | Archivo                        |
| ------------------- | ----- | ------------------------------ |
| mean                | 6     | `__tests__/statistics.test.ts` |
| stdDev              | 5     | `__tests__/statistics.test.ts` |
| favorability        | 7     | `__tests__/statistics.test.ts` |
| rwg(j)              | 9     | `__tests__/statistics.test.ts` |
| cronbachAlpha       | 8     | `__tests__/statistics.test.ts` |
| pearson             | 8     | `__tests__/statistics.test.ts` |
| FPC (formula)       | 6     | `__tests__/statistics.test.ts` |
| eNPS (formula)      | 7     | `__tests__/statistics.test.ts` |
| Engagement profiles | 7     | `__tests__/statistics.test.ts` |
| Anonymity threshold | 3     | `__tests__/statistics.test.ts` |
| ONA communities     | 2     | `scripts/test_ona.py`          |
| ONA NMI             | 1     | `scripts/test_ona.py`          |
| ONA constants       | 4     | `scripts/test_ona.py`          |
| ONA determinism     | 2     | `scripts/test_ona.py`          |

---

## 4. Threshold del ONA — Confirmado

**No existe un threshold fijo de similitud coseno.** El algoritmo usa búsqueda binaria adaptativa:

- **Objetivo**: densidad de aristas entre 10% y 30%
- **Constantes**: `DENSITY_TARGET_MIN = 0.10`, `DENSITY_TARGET_MAX = 0.30`
- **Método**: 40 iteraciones de binary search sobre el rango de similitudes observadas
- **Fallback**: si no converge, usa el último midpoint calculado

---

## 5. Invariantes Verificados

| #   | Invariante               | Verificable  | Método                                                                                                                                                                                                                                                                                          |
| --- | ------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Anonimato                | ✓            | Umbral n<5 en campaigns.ts:555, PII separada en `participants`                                                                                                                                                                                                                                  |
| 2   | Determinismo estadístico | ✓            | Funciones puras en statistics.ts, tests reproducibles. ONA determinista via `RANDOM_SEED=42` + `ig.set_random_number_generator()` — verificado con tests de determinismo exacto (`test_ona.py`)                                                                                                 |
| 3   | Aislamiento multi-tenant | ✓ Verificado | RLS test suite: `supabase/tests/rls-isolation.test.ts` (65 tests — 2 orgs × 3 usuarios, usuario huérfano, joins cross-tabla, escala 12 deps, SECURITY DEFINER guard) + auditoría: `docs/rls-audit.md`. Todos los gaps cerrados: `get_org_department_counts` guard agregado en migration 000020. |
| 4   | Degradación de IA        | ✓            | `callAI()` retorna error, no lanza excepción (documentado en CLAUDE.md)                                                                                                                                                                                                                         |
| 5   | Módulos aditivos         | ✓            | Módulos tienen `category=NULL`, excluidos de agregación de categorías                                                                                                                                                                                                                           |
| 6   | ONA opcional             | ✓            | Invocado non-blocking, `hasONAData()` oculta nav si no hay datos                                                                                                                                                                                                                                |

**Todos los invariantes verificados.** #3 (Aislamiento multi-tenant) cerrado con test suite RLS en `supabase/tests/rls-isolation.test.ts`.

---

## 6. Archivos Modificados/Creados

### Modificados

- `src/lib/statistics.ts` — JSDoc agregado a 6 funciones (sin cambios de lógica)
- `scripts/ona-analysis.py` — Constantes nombradas + documentación (lógica equivalente)
- `README.md` — 3 nuevas secciones de especificación formal
- `testing-agent/src/index.ts` — Nuevo subcomando `verify-stats`

### Creados

- `src/lib/__tests__/statistics.test.ts` — 66 tests unitarios
- `scripts/test_ona.py` — 6 tests pytest
- `testing-agent/src/commands/verify-stats.ts` — 20 assertions estadísticas
- `docs/spec-audit-report.md` — Este reporte

---

## 7. Comandos de Verificación

```bash
# Vitest — 113 tests (66 nuevos)
npm run test

# ONA pytest — 6 tests
uv run --with pytest --with python-igraph --with numpy --with scipy --with pandas --with matplotlib --with supabase pytest scripts/test_ona.py -v

# Testing agent — 20 assertions
cd testing-agent && npx tsx src/index.ts verify-stats
```
