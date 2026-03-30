# Admin Client Runtime Stabilization Design

## Objetivo

Resolver de forma definitiva el incidente `Invalid API key` en rutas server-only productivas de ClimaLab después de la rotación de credenciales Supabase, sin introducir regresiones en el pipeline analítico.

## Contexto Confirmado

- El smoke runner productivo [`e2e-prod-smoke`](/Users/ulisesgonzalez/Documents/GitHub/climalab/testing-agent/src/commands/e2e-prod-smoke.ts) ya reproduce el gate rojo.
- El sitio productivo responde `200`.
- `direct ingest` alcanza la validación de payload con credenciales de app.
- El path que hoy falla de forma reproducible es el backend del batch: `GET /api/jobs/analyze-batch?source=manual&hours=24` devuelve `{"error":"Invalid API key"}`.
- El admin client actual depende de una sola variable: [`SUPABASE_SERVICE_ROLE_KEY`](/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/env.ts) consumida en [`createAdminClient()`](/Users/ulisesgonzalez/Documents/GitHub/climalab/src/lib/supabase/admin.ts).
- La edge function `process_response` ya tolera claves modernas usando `PROCESS_RESPONSE_SERVICE_ROLE_KEY` como env principal.

## Hipótesis Probables

1. La app Next productiva sigue leyendo una credencial inválida o desalineada en `SUPABASE_SERVICE_ROLE_KEY`.
2. La rotación quedó aplicada a algunos runtimes, pero no a todos.
3. Falta un contrato explícito para claves backend modernas (`sb_secret_*`) en el runtime web, mientras que la edge function ya tiene ese camino.

## Alternativas

### Opción A: Reinyectar la misma variable y redeploy

Tratar el incidente como un problema puramente operacional y volver a sembrar `SUPABASE_SERVICE_ROLE_KEY` en Vercel.

Ventajas:

- rápida si el problema es solo de despliegue

Desventajas:

- no deja evidencia diagnóstica
- no mejora la resiliencia futura
- depende de que el operador tenga la key correcta a mano

### Opción B: Introducir fallback explícito para backend secret moderno

Ampliar el runtime para aceptar `SUPABASE_SECRET_KEY` o `PROCESS_RESPONSE_SERVICE_ROLE_KEY` como fallback server-side, además de `SUPABASE_SERVICE_ROLE_KEY`, y añadir diagnóstico controlado.

Ventajas:

- reduce fragilidad frente a rotaciones futuras
- alinea la app Next con la edge function
- permite una migración más clara fuera de la legacy key

Desventajas:

- requiere cambios de código y validación

### Opción C: Exponer diagnóstico detallado por respuesta

Hacer que las rutas productivas devuelvan más contexto del error.

Ventajas:

- acelera depuración

Desventajas:

- mala práctica operacional
- aumenta superficie de exposición

## Recomendación

Seguir la **Opción B** con una ejecución en dos capas:

1. **diagnóstico interno controlado**
2. **fallback explícito de credenciales backend**

La solución definitiva no debe depender de recordar “cuál env exacta había que tocar”. Debe quedar claro qué variable usa el backend web, cuál usa la edge function y cómo se valida esa ruta tras una rotación.

## Diseño Propuesto

### 1. Contrato de credenciales backend

Definir este orden server-only:

1. `SUPABASE_SECRET_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`

Mantener `PROCESS_RESPONSE_SERVICE_ROLE_KEY` solo para la edge function.

Esto separa claramente:

- credencial backend web
- credencial backend edge

### 2. Diagnóstico controlado

Agregar un helper interno que:

- determine qué variable se resolvió
- clasifique la familia de la clave sin imprimirla (`sb_secret`, `legacy_jwt`, `missing`, `unknown`)
- permita logging server-side estructurado cuando falle el admin client

No debe exponerse el valor de la credencial ni fragmentos útiles.

### 3. Smoke como gate oficial

`e2e-prod-smoke` pasa a ser la puerta de aceptación:

- site reachable
- batch no devuelve `Invalid API key`
- direct ingest llega a validación
- si hay key explícita disponible, DB probe básico también funciona

### 4. Despliegue y cierre

Una vez verde:

- redeploy de Vercel
- rerun de smoke
- solo entonces retomar backfill histórico y alertas

## Error Handling

- si no hay credencial backend: error explícito de config
- si la credencial existe pero falla: log estructurado con `key_family` y ruta
- nunca devolver al cliente información sensible del secreto

## Criterio de salida

- `e2e-prod-smoke` verde
- `batch` responde sin `Invalid API key`
- el runtime web documenta y resuelve explícitamente la credencial backend moderna
