# Fase 2 Platform Maturation Design

## Objetivo

Completar la arquitectura operativa y analítica posterior a la remediación de linaje para que ClimaLab tenga:

1. trigger asíncrono realmente activo de `responses` a `process_response`
2. observabilidad operativa y controles de salud del pipeline
3. reproducibilidad analítica visible para operaciones y producto
4. módulos como entidades analíticas de primer nivel
5. ONA y export/consumo en estado de producción

## Alcance

Esta fase cubre 12 puntos secuenciales:

1. activar Vault para `dispatch_process_response`
2. validar `pipeline_dispatch_events` entregado
3. comprobar refresco asíncrono de `campaign_stats`
4. endurecer ONA en runtime
5. smoke final de aceptación operativa
6. dashboard operativo del pipeline
7. snapshots y comparativas de corridas analíticas
8. reporting de calidad de datos por campaña
9. módulos como primer nivel analítico en serving/export
10. performance y selección incremental vs batch
11. contratos de consumo semántico para app/export
12. cobertura E2E ampliada y controles productivos

## Enfoque

La implementación se divide en 4 olas:

- Ola 1: activar el trigger y observabilidad base sin romper producción
- Ola 2: gobernanza analítica y reproducibilidad
- Ola 3: experiencia analítica de módulos, calidad de datos y capa semántica
- Ola 4: ONA productivo, performance y validación E2E/operativa

## Decisiones de diseño

### Trigger y Vault

- El trigger de base debe seguir siendo no bloqueante.
- Si falta `pg_net` o Vault, el sistema no debe fallar escribiendo respuestas.
- Debe existir una ruta de diagnóstico visible para `queued`, `delivered`, `failed`, `skipped`.

### Observabilidad

- No se añadirá una herramienta externa nueva en esta fase.
- La observabilidad vivirá primero en tablas y server actions del propio producto.
- Se expondrá una vista operativa para admins, basada en `pipeline_dispatch_events`, `batch_job_runs` y `analysis_runs`.

### Reproducibilidad

- `analysis_runs` sigue siendo la unidad de ejecución.
- Se añadirá una capa de snapshots y comparativas, sin mutar outputs históricos.
- `logic_version` será visible en UI técnica y exportes.

### Módulos

- Los módulos dejarán de aparecer solo como dimensiones mezcladas.
- Se agruparán, compararán y exportarán como familia analítica separada.
- El linaje ya existe; esta fase lo hace visible en serving y consumo.

### ONA

- ONA seguirá siendo no bloqueante respecto al cálculo principal.
- Se registrará explícitamente el estado del análisis de red para distinguir `completed`, `deferred` y `failed`.
- La plataforma debe seguir operando aunque ONA no esté disponible.

## Pruebas y controles

- Unit tests para helpers nuevos de observabilidad, snapshots y clasificación.
- E2E HTTP ampliado para dispatch, batch, snapshots y contratos de consumo.
- Smoke SQL/HTTP productivo para pipeline y ONA.
- Verificación de build, lint y suites existentes en cada ola.

## Riesgos

- Cambios en tablas de analytics pueden afectar páginas de resultados y exportes.
- El trigger asíncrono depende de secretos fuera del repo.
- ONA productivo depende de runtime Python disponible.

## Resultado esperado

Al cierre de la fase, ClimaLab debe tener un pipeline operable y auditable end-to-end, con mejor visibilidad de salud, resultados reproducibles, módulos claramente diferenciados y contratos de consumo estables para dashboard y exportes.
