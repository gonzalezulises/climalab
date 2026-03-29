# Contratos de Ingesta

Estos endpoints alimentan el mismo modelo de datos (`respondents`, `responses`, `open_responses`, `ingest_events`) y usan la misma normalización en `src/lib/normalizeResponse.ts`.

## Autenticación

- `POST /api/ingest/direct`
- `POST /api/ingest/webhook`
- `POST /api/ingest/csv`

Todos requieren una de estas cabeceras:

- `x-api-key: <INGEST_API_SECRET>`
- `Authorization: Bearer <INGEST_API_SECRET>`

Si `INGEST_API_SECRET` no está configurada, la ingesta falla.

## Versionado del contrato

Versión actual soportada:

- `2026-03-29`

Puede enviarse por:

- header `x-climalab-contract-version`
- campo `contractVersion` en `direct` y `webhook`

Si header y body no coinciden, la ingesta falla. Si no se envía ninguna versión, se usa `2026-03-29`.

## Idempotencia

- `direct` y `webhook` requieren `externalEventId`.
- `csv` acepta `external_event_id` por fila; si no viene, genera uno aleatorio y esa fila deja de ser idempotente.
- La deduplicación vive en `ingest_events` con clave única `(source, external_event_id)`.

Respuesta típica para `direct` y `webhook`:

```json
{
  "ok": true,
  "duplicate": false,
  "respondentId": "uuid"
}
```

## POST /api/ingest/direct

`Content-Type: application/json`

```json
{
  "contractVersion": "2026-03-29",
  "externalEventId": "hris-sync-2026-03-28-001",
  "externalSubjectId": "employee-123",
  "campaignId": "uuid",
  "mappingVersion": "hris-v1",
  "startedAt": "2026-03-28T10:00:00.000Z",
  "completedAt": "2026-03-28T10:05:00.000Z",
  "metadata": {
    "connector": "hris"
  },
  "demographics": {
    "department": "Producto",
    "tenure": "1-3",
    "gender": "Prefiero no decir"
  },
  "responses": [
    { "itemId": "uuid", "score": 4 },
    { "itemId": "uuid", "score": 5 }
  ],
  "openResponses": [{ "questionType": "general", "text": "Texto libre" }],
  "enpsScore": 9
}
```

Reglas:

- `responses` es obligatorio y debe tener al menos un item.
- `score` debe estar entre `1` y `5`.
- `questionType` válido: `strength`, `improvement`, `general`.
- `enpsScore` válido: `0` a `10`.
- Todos los `itemId` deben pertenecer al instrumento base o módulos de la campaña.

## POST /api/ingest/webhook

`Content-Type: application/json`

Usa el mismo contrato que `direct`, pero la fuente se registra como `webhook`.

Payload mínimo:

```json
{
  "contractVersion": "2026-03-29",
  "externalEventId": "typeform-evt-123",
  "externalSubjectId": "respondent-42",
  "campaignId": "uuid",
  "mappingVersion": "typeform-v2",
  "demographics": {
    "department": "Operaciones",
    "tenure": "3-5",
    "gender": "Femenino"
  },
  "responses": [{ "itemId": "uuid", "score": 3 }]
}
```

## POST /api/ingest/csv

`Content-Type: multipart/form-data`

Campos:

- `campaignId`: `uuid` de campaña
- `file`: archivo `.csv`

Encabezados soportados por fila:

- `external_event_id`
- `external_subject_id`
- `mapping_version`
- `started_at`
- `completed_at`
- `department`
- `tenure`
- `gender`
- `enps_score`
- `open:strength`
- `open:improvement`
- `open:general`
- `item:<item_id>` para cada respuesta Likert

Ejemplo:

```csv
external_event_id,external_subject_id,mapping_version,department,tenure,gender,enps_score,open:general,item:11111111-1111-1111-1111-111111111111,item:22222222-2222-2222-2222-222222222222
csv-row-001,employee-123,legacy-gforms-v1,Producto,1-3,Prefiero no decir,8,"Buen clima",4,5
```

Respuesta típica:

```json
{
  "ok": false,
  "contractVersion": "2026-03-29",
  "imported": 12,
  "duplicates": 1,
  "failed": 2,
  "total": 15,
  "errors": [{ "rowNumber": 7, "error": "ID de item inválido" }]
}
```

## Estados internos

`ingest_events.status` puede quedar en:

- `processing`: evento registrado y aún en curso
- `completed`: persistido correctamente
- `failed`: rechazado o falló la normalización

Los `responses.source` válidos son:

- `web`
- `webhook`
- `csv`
- `api`

`ingest_events` también persiste:

- `contract_version`
- `external_subject_id`
- `mapping_version`
- `metadata`
