# Electrisa — Siguientes pasos para cerrar el bucle con ClimaLab

Form Tally creado como **DRAFT**. Estos son los pasos para dejarlo productivo y conectado al webhook de ClimaLab.

## Estado actual

- **Form ID**: `kdRj8R`
- **Editor**: https://tally.so/forms/kdRj8R/edit
- **Link público (al publicar)**: https://tally.so/r/kdRj8R
- **Contenido**: 117 preguntas en 8 páginas
  - 4 demográficas: departamento (17 opciones), sucursal (10), tenure (4 rangos), género (2 opciones)
  - **Fuente oficial**: `DATA PARA ENCUESTA 2026.xls` (n=310 empleados, hoja `DATA ENCUESTA`)
  - 107 ítems del ClimaLab Core v4.0 (Bienestar, Dirección y Supervisión, Compensación, Cultura, Engagement)
  - 2 verificaciones de atención (una entre Dirección/Supervisión y otra al final de Cultura)
  - 1 eNPS (0–10)
  - 3 preguntas abiertas (fortaleza, mejora, general)
- **Spec submitted a Tally**: [`../tally-form.json`](../tally-form.json)
- **Metadata semántica** (con `key`, `dimension`, `is_anchor`, `is_reverse`, `target`): [`../form-metadata.json`](../form-metadata.json)

## Cambios aplicados (round 1 de feedback)

- **Departamentos**: lista resincronizada contra el .xls oficial (17 deptos). Cambios netos vs versión previa:
  - Se elimina `24 DE DICIEMBRE` (era sucursal mal listada como depto), `ADMINISTRACIÓN INDUSTRIAS`, `ADMINISTRACIÓN/VENTAS` (todos consolidados en `ADMINISTRACIÓN`), `CEDI`, `OPERACIONES`, `MERCADEO`, `PLANILLA`, `INDUSTRIAS`, `PROYECTOS`.
  - Se agrega `CAJA` y `PROYECTOS E INDUSTRIAS` (consolidación de `INDUSTRIAS` + `PROYECTOS`).
  - `CAPITAL HUMANO` se mantiene como depto independiente (5 personas en el .xls).
- **Tenure**: rangos cambiados a `Menos de 2 años`, `De 3 a 5 años`, `De 6 a 10 años`, `Más de 10 años`.
- **Género**: solo `femenino` / `masculino` (se eliminaron `no binario u otro` y `prefiero no decir`).
- **Attention checks**: ahora apuntan a las opciones extremas, que son las únicas etiquetadas en pantalla — `ATT-1` → `"Totalmente de acuerdo"` (expected 5), `ATT-2` → `"Totalmente en desacuerdo"` (expected 1). Antes pedían `"De acuerdo"` / `"En desacuerdo"`, opciones intermedias sin etiqueta visible que confundían al respondiente.
- **Branding (UI manual en Tally)**: orden ELECTRISA → ELECTRICAST, ambos al mismo tamaño/proporción. La API de Tally no expone branding; aplicar en el editor visual antes de publicar.
- **Redacción de items reverse**: 7 ítems del Core v4.0 reescritos para Electrisa para evitar doble negación / "rara vez". El `code`, `dimension` e `is_reverse` no cambian — el match al webhook se hace por `tally_field_key`, no por texto, así que no afecta la ingesta. Sí desvía la redacción del Core v4.0 estándar para esos items específicos: la comparabilidad psicométrica con benchmarks de otros clientes ClimaLab está limitada a esos 7 items (no a la dimensión completa, ya que el resto de items por dimensión queda intacto).
  - `PRO-4`: "Mi trabajo aporta poco impacto real a la organización."
  - `CUI-4`: "Cuando tengo un problema personal, me cuesta encontrar apoyo en el trabajo."
  - `LID-5`: "Me cuesta acceder a mi supervisor cuando lo necesito."
  - `CON-4`: "La dirección oculta información sobre la situación real de la organización."
  - `CMP-4`: "Mi salario es menor a lo que merece el trabajo que realizo."
  - `INN-5`: "Las nuevas ideas suelen quedar sin implementarse."
  - `RES-4`: "Los objetivos que me piden alcanzar superan los recursos que tengo disponibles."

> **Importante**: estos JSONs son la fuente de verdad local. El form ya creado en Tally (`kdRj8R`) **no se actualiza automáticamente**. Para reflejar los cambios hay que (a) reenviar el spec con la skill `tally-form` (puede crear un form nuevo) o (b) editar manualmente en el editor visual.

## Pasos para cerrar el bucle

### 1. Publicar el form

1. Entrar a https://tally.so/forms/kdRj8R/edit
2. Aplicar logo y colores de Electrisa (branding no expuesto por API — solo UI)
3. Revisar orden y copy
4. **Publicar**
5. Link público: `https://tally.so/r/kdRj8R`

### 2. Configurar webhook en Tally

En Tally → `Integrations` → `Webhooks`:

- **URL**: `https://climalab.rizo.ma/api/webhooks/tally`
- **Signing secret**: el mismo valor que la env var `TALLY_WEBHOOK_SECRET` en Vercel (si no existe en Vercel, crearla primero)
- **Eventos**: `FORM_RESPONSE`

### 3. Crear organización y campaña en ClimaLab

En ClimaLab (`/organizations/new` y luego `/campaigns`):

1. Crear organización **Electrisa** con branding (logo + colores)
2. Crear campaña con instrumento `ClimaLab Core` (id `b0000000-0000-0000-0000-000000000001`)
3. Sin módulos (CAM/CLI/DIG) para esta prueba
4. Anotar `campaign_id` — hace falta para el mapping

### 4. Generar mapping `tally_form_mappings`

La tabla `tally_form_mappings(tally_form_id, tally_field_key, target_type, target_id, target_meta, campaign_id)` conecta cada pregunta del Tally con su destino en ClimaLab. Sin esto, el webhook devuelve 404 (`Form not recognized`).

**Inputs para armar el SQL:**

- `tally_form_id` = `kdRj8R`
- `campaign_id` del punto 3
- `tally_field_key` de cada pregunta → hay que obtenerlos con `GET https://api.tally.so/forms/kdRj8R` y extraer los UUIDs de los bloques TITLE/INPUT
- `item_id` de cada ítem Core v4.0 → `SELECT id, code FROM items WHERE instrument_id = 'b0000000-0000-0000-0000-000000000001'`
- El orden de preguntas en Tally respeta `form-metadata.json` (cross-reference por `key` / `code`)

Estructura de cada row:

| tally_field_key              | target_type     | target_id          | target_meta   | campaign_id |
| ---------------------------- | --------------- | ------------------ | ------------- | ----------- |
| `<uuid-pregunta-department>` | `demographic`   | `null`             | `department`  | `<cid>`     |
| `<uuid-pregunta-branch>`     | `demographic`   | `null`             | `branch`      | `<cid>`     |
| `<uuid-pregunta-tenure>`     | `demographic`   | `null`             | `tenure`      | `<cid>`     |
| `<uuid-pregunta-gender>`     | `demographic`   | `null`             | `gender`      | `<cid>`     |
| `<uuid-item-ORG-1>`          | `item`          | `<items.id ORG-1>` | `null`        | `<cid>`     |
| ... (107 ítems)              | `item`          | ...                | `null`        | `<cid>`     |
| `<uuid-attn-108>`            | `item`          | `<items.id ATT-1>` | `null`        | `<cid>`     |
| `<uuid-attn-109>`            | `item`          | `<items.id ATT-2>` | `null`        | `<cid>`     |
| `<uuid-enps>`                | `enps`          | `null`             | `null`        | `<cid>`     |
| `<uuid-open-strength>`       | `open_response` | `null`             | `strength`    | `<cid>`     |
| `<uuid-open-improvement>`    | `open_response` | `null`             | `improvement` | `<cid>`     |
| `<uuid-open-general>`        | `open_response` | `null`             | `general`     | `<cid>`     |

Cuando se tenga `campaign_id`, se puede correr un script que junte el spec de Tally (vía API) con `form-metadata.json` y emita el SQL de inserción.

### 5. Ajustes en el handler del webhook

**Sucursal (`branch`)**: el handler actual (`src/app/api/webhooks/tally/route.ts:139-156`) solo entiende `department`, `tenure`, `gender`. Para guardar sucursal:

- Opción A: agregar `branch` como nueva columna en `respondents` (requiere migración + rebuild types)
- Opción B: concatenar con department (`<sucursal> — <departamento>`)
- Opción C: almacenar sucursal como metadata en `respondents.metadata` JSONB (si existe; si no, añadir)

Recomendado: Opción C si existe la columna, sino A.

**Género**: tras la simplificación a 2 opciones (`femenino` / `masculino`), el `GENDER_MAP` del webhook (`src/app/api/webhooks/tally/route.ts:43`) cubre los dos casos y no requiere cambios.

### 6. Prueba end-to-end

1. Enviar 1–2 respuestas de prueba desde el link público
2. Verificar que llegan a `responses`, `open_responses`, `respondents` para la campaña Electrisa
3. Correr `calculateResults(campaignId)` y revisar en `/campaigns/<id>/results`

## Referencias

- Handler webhook: `src/app/api/webhooks/tally/route.ts`
- Normalize: `src/lib/normalizeResponse.ts`
- Contract: `src/lib/ingest-contract.ts`
- Tabla mapping: `supabase/migrations/000039_tally_form_mappings.sql` (o equivalente — buscar por `tally_form_mappings`)
