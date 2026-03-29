# Fase 4: Production Readiness Design

## Objetivo

Cerrar la brecha entre una plataforma ya endurecida a nivel de código y una operación realmente confiable en producción. Esta fase prioriza cinco frentes en secuencia:

1. estabilización post-rotación de credenciales
2. smoke tests productivos automatizables
3. backfill histórico real sobre campañas productivas
4. alertas activas a canales reales
5. baseline de performance para campañas grandes

## Contexto Confirmado

- `main` ya contiene Fase 3 tras el merge de [PR #3](https://github.com/gonzalezulises/climalab/pull/3).
- La rotación parcial a una `sb_secret` nueva dejó un problema operativo abierto: rutas server-only productivas como `/api/jobs/analyze-batch` y `/api/ingest/direct` están devolviendo `{"error":"Invalid API key"}` en runtime.
- La edge function [`process_response`](/Users/ulisesgonzalez/Documents/GitHub/climalab/supabase/functions/process_response/index.ts) sí quedó desplegada y tipada, pero la app Next productiva aún necesita una validación completa del admin client con la credencial nueva.
- La plataforma ya tiene piezas listas para Fase 4:
  - observabilidad y panel técnico
  - backfill histórico por lotes
  - comparativas de drift
  - notificaciones técnicas
  - health summaries y métricas de performance

## Alternativas Consideradas

### Opción A: Estabilización operativa primero, luego expansión

Resolver primero la credencial backend, automatizar smoke tests y solo entonces ejecutar backfill real, alertas y performance.

Ventajas:

- minimiza riesgo de falsos negativos en backfill
- evita mezclar fallos de entorno con regresiones de producto
- deja un gate claro antes de correr procesos históricos

Desventajas:

- retrasa el valor visible de nuevas métricas y alertas

### Opción B: Backfill y alertas en paralelo con la estabilización

Avanzar con jobs y notificaciones mientras se depura la rotación.

Ventajas:

- más velocidad aparente

Desventajas:

- aumenta la dificultad de diagnóstico
- puede producir corridas históricas incompletas o poco confiables
- mezcla bugs operativos con cambios de producto

### Opción C: Seguir con mejoras analíticas y dejar producción para después

Continuar con reporting longitudinal, benchmarks y módulos, posponiendo la estabilización productiva.

Ventajas:

- acelera roadmap visible

Desventajas:

- mala decisión operacional
- cualquier mejora nueva hereda una base inestable

## Recomendación

Seguir la **Opción A**.

Fase 4 debe tratar producción como sistema crítico. El primer entregable no es una nueva feature, sino volver a tener confianza operativa completa en rutas backend con admin client, y dejar smoke tests repetibles que impidan volver a romper esto silenciosamente.

## Diseño Propuesto

### 1. Gate de estabilización

Crear un bloque de validación post-rotación con dos objetivos:

- verificar que `createAdminClient()` funciona con la credencial activa en Vercel
- confirmar que `batch`, `direct ingest` y `backfill` pueden hablar con Supabase en producción

Esto no implica crear nuevos flujos de negocio; implica aislar la causa del `Invalid API key` y dejar una ruta estándar para futuras rotaciones.

### 2. Smoke tests productivos

Formalizar una pequeña suite de smoke tests fuera del flujo local de desarrollo:

- `batch smoke`
- `direct ingest smoke`
- `dispatch smoke`
- `health query smoke`

La suite debe poder ejecutarse con secretos productivos y devolver resultados comprensibles sin requerir inspección manual de logs cada vez.

### 3. Backfill histórico real

Una vez que el gate operacional esté verde:

- ejecutar backfill por lotes sobre todas las campañas productivas cerradas/archivadas
- persistir métricas en `backfill_run_metrics`
- resumir drift, campañas con attention needed y outliers de duración

El backfill no debe tratarse como un recompute ciego; debe generar un informe final para interpretar si el modelo nuevo está introduciendo diferencias relevantes.

### 4. Alertas activas

La plataforma ya genera eventos de alerta; esta fase debe conectar esos eventos a un destino operativo real. La integración inicial puede ser un webhook genérico, con payloads normalizados y severidades claras:

- `critical`: ingest/batch caído
- `warning`: ONA deferred, campañas con calidad baja, drift alto
- `info`: resumen de backfill y baseline de performance

### 5. Baseline de performance

Tomar las métricas ya persistidas y convertirlas en un baseline operativo:

- duración media por campaña
- percentil alto por corrida
- campañas outlier
- heurística para decidir incremental vs full recompute

El objetivo no es optimizar antes de medir; es definir con evidencia qué partes del pipeline realmente necesitan optimización.

## Componentes

### Capa de estabilización

- scripts/runbooks operativos
- smoke commands reutilizables
- validaciones post-rotación

### Capa de ejecución histórica

- `backfillAnalysis`
- `backfill_run_metrics`
- comparación de snapshots
- statistical health summary

### Capa de observabilidad

- `operations/page`
- `technical/page`
- `pipeline_notifications`
- `pipeline_alerts`

## Flujo

```mermaid
flowchart LR
  A["Credencial backend activa"] --> B["Smoke tests productivos"]
  B --> C["Batch / Direct ingest / Dispatch OK"]
  C --> D["Backfill histórico por lotes"]
  D --> E["Resumen de drift, calidad y performance"]
  E --> F["Alertas activas y baseline operativo"]
```

## Errores y Controles

- Si el admin client falla con `Invalid API key`, no se ejecuta backfill.
- Si el smoke falla, se documenta causa raíz antes de tocar lógica analítica.
- Si el backfill encuentra drift alto, se aísla por campaña y se compara contra snapshots.
- Si ONA queda `deferred`, no bloquea la corrida principal, pero sí genera warning operativo.

## Testing

### Obligatorio

- tests unitarios de nuevos helpers operativos
- `npm test`
- `npm run lint`
- `npm run build`
- smoke real de producción para `batch` y `direct ingest`

### Deseable

- comando repetible de smoke productivo en `testing-agent`
- resumen SQL/REST para `pipeline_dispatch_events`, `batch_job_runs` y `backfill_run_metrics`

## Criterios de salida de Fase 4

- rutas server-only productivas sin `Invalid API key`
- smoke tests productivos repetibles
- al menos una corrida de backfill histórico real completada
- alertas activas hacia un canal real
- baseline de performance documentado
