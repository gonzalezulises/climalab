# Operación del Pipeline

## 1. Variables y secretos

App / Vercel:

- `INGEST_API_SECRET`
- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Edge function `process_response`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PROCESS_RESPONSE_HOOK_SECRET`

## 2. Desplegar la edge function

```bash
supabase functions deploy process_response
supabase secrets set PROCESS_RESPONSE_HOOK_SECRET=change-me
```

La función espera:

- `POST`
- header `x-hook-secret: <PROCESS_RESPONSE_HOOK_SECRET>`

## 3. Configurar secretos en Postgres Vault

El trigger `trg_dispatch_process_response` lee secretos desde Vault con `get_pipeline_secret(...)`.

Ejemplo:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/process_response',
  'process_response_function_url',
  'Edge function URL for pipeline dispatch'
);

select vault.create_secret(
  'change-me',
  'process_response_hook_secret',
  'Shared secret for process_response dispatch'
);

select vault.create_secret(
  '<service-role-jwt>',
  'process_response_function_jwt',
  'JWT used by DB trigger to invoke process_response'
);
```

Si no guardas `process_response_function_jwt`, el trigger intenta usar `supabase_service_role_key` desde Vault.

Para entornos locales con Postgres en contenedor, usa una URL alcanzable desde el contenedor, normalmente algo como:

```text
http://host.docker.internal:54321/functions/v1/process_response
```

## 4. Cron del batch

`vercel.json` agenda:

- `GET /api/jobs/analyze-batch`

El endpoint acepta:

- `x-cron-secret: <CRON_SECRET>`
- `Authorization: Bearer <CRON_SECRET>`
- opcional `?hours=24`
- opcional `?source=cron|manual|response_hook`

## 5. Observabilidad

Tablas nuevas:

- `pipeline_dispatch_events`: cola/resultado de invocaciones del trigger hacia `process_response`
- `batch_job_runs`: auditoría de ejecuciones del análisis batch
- `analysis_run_snapshots`: snapshot comparable por corrida analítica
- `campaign_ona_runs`: estado operativo del análisis de red

Consultas útiles:

```sql
select status, count(*)
from pipeline_dispatch_events
group by 1
order by 1;
```

```sql
select created_at, hook_name, status, reason, response_status
from pipeline_dispatch_events
order by created_at desc
limit 20;
```

```sql
select created_at, trigger_source, status, processed, succeeded, failed, error_message
from batch_job_runs
order by created_at desc
limit 20;
```

```sql
select created_at, analysis_run_id, logic_version
from analysis_run_snapshots
order by created_at desc
limit 20;
```

El job batch también ejecuta `refresh_pipeline_dispatch_events()` al arrancar para reconciliar respuestas HTTP pendientes.

## 6. Smoke test recomendado

1. Ejecutar `supabase db reset`
2. Sembrar demo con `npm run seed:results`
3. Servir la edge function localmente
4. Configurar secretos de Vault para la URL, hook secret y JWT
5. Levantar la app con `npm run dev`
6. Ejecutar `cd testing-agent && npx tsx src/index.ts e2e-http`

Se espera ver:

- respuestas `web` guardadas
- `ingest_events` en `completed`
- al menos un `batch_job_runs` en `completed`
- `campaign_results` y `campaign_analytics` materializados para la campaña de prueba

## 7. Notas operativas

- El trigger de `responses` solo despacha para fuentes no `web` y respondentes ya `completed`.
- El survey web sigue refrescando `campaign_stats` al completar la encuesta, para evitar recálculos parciales durante un llenado en progreso.
- Si faltan secretos de Vault, el trigger no rompe la escritura: registra `pipeline_dispatch_events.status = 'skipped'` con razón `missing_pipeline_secret`.
