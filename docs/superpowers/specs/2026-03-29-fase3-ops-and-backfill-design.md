# Fase 3 Ops And Backfill Design

## Objetivo

Completar la transición de ClimaLab desde una plataforma ya endurecida y desplegada hacia una operación continua con visibilidad histórica, alertas reales y control estadístico de calidad.

## Alcance

Esta fase cubre cuatro frentes coordinados:

1. backfill histórico total de campañas cerradas y archivadas
2. comparativas automáticas de drift, calidad y estabilidad analítica
3. alertas operativas conectadas a canales reales y resúmenes accionables
4. telemetría de performance y superficie operativa para seguir campañas grandes

## Enfoque

La implementación se divide en tres olas:

- Ola 1: backfill total escalonado, con lotes y resumen agregado
- Ola 2: monitoreo estadístico y alertas operativas con señales más útiles
- Ola 3: telemetría de performance, panel operativo ampliado y controles E2E

## Decisiones de diseño

### Backfill

- El backfill debe cubrir todas las campañas cerradas/archivadas, no solo una muestra.
- La ejecución será por lotes para no perder observabilidad ni aislar peor los fallos.
- Cada campaña recalculada debe producir una comparación contra su snapshot previo cuando exista.

### Drift y calidad

- El objetivo no es solo recalcular, sino detectar campañas con cambios materiales.
- Se resumen al menos:
  - cambios por dimensión y eNPS
  - cobertura y completitud demográfica
  - duplicados, fallos de ingesta y respondentes descalificados
  - estabilidad ONA cuando exista

### Alertas

- Las alertas deben salir del modo “solo persistidas” hacia canales configurables reales.
- Debe existir una síntesis separada para backfill masivo, distinta de una alerta puntual de pipeline.
- Si no hay canal configurado, el sistema sigue registrando en base sin bloquear operación.

### Performance

- Cada ejecución de backfill y batch debe registrar duración, modo, volumen procesado y outliers.
- La estrategia incremental vs full debe quedar visible en la operación, no enterrada solo en logs.

## Pruebas y controles

- Unit tests para selección por lotes, clasificación de drift, calidad y performance.
- Tests de integración para resumen de backfill y alertas.
- E2E para backfill, operación y verificaciones de dispatch/batch.
- Verificación final con `lint`, `test`, `build`, `db reset` y comandos del `testing-agent`.

## Riesgos

- Un backfill total puede exponer campañas con datos históricos incompletos o mappings viejos.
- La señal de drift puede generar ruido si no se aplican umbrales mínimos.
- Alertas demasiado sensibles pueden cansar al operador.

## Resultado esperado

Al cierre de la fase, ClimaLab debe poder recalcular todo su histórico de forma controlada, resumir cambios relevantes, avisar fallos reales en canales útiles y mostrar calidad/performance con suficiente detalle para operar y escalar con confianza.
