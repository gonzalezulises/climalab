# ClimaLab — Product Roadmap

## Estado Actual: v4.9

**Instrumento**: Core v4.0 (22 dimensiones, 109 items) — sin cambios en el instrumento desde v4.0

| Feature                                                      | Estado                       | Commit                           |
| ------------------------------------------------------------ | ---------------------------- | -------------------------------- |
| Core v4.0 (22 dims, 109 items)                               | Implementado                 | 5ea0548 + f4c2fd1                |
| rwg, Cronbach alpha, ficha tecnica                           | Implementado                 | b59e11e                          |
| Business indicators (tabla + CRUD + seed data)               | Implementado                 | b59e11e                          |
| Niveles EMCO (3 niveles)                                     | Implementado                 | b59e11e                          |
| AI Insights (Ollama, 7 paginas)                              | Implementado                 | fc35ab6                          |
| Export Excel + DOCX                                          | Implementado                 | 8d423fa + 7b9b6c0                |
| Benchmarks internos                                          | Implementado                 | 8d423fa                          |
| Multi-instrumento (base + modulos)                           | Implementado                 | 531ec39                          |
| ONA perceptual (NetworkX, Louvain)                           | Implementado                 | a553ea2                          |
| Tests + CI/CD + Error boundaries                             | Implementado                 | d817d19                          |
| Branding per-org + emails + recordatorios                    | Implementado                 | 97554e3                          |
| ONA igraph migration (Leiden + NMI stability)                | Implementado                 | 463477e                          |
| AI dual backend (DGX + Ollama fallback)                      | Implementado                 | 3f8f5d5                          |
| AI error handling (fail-fast + UI feedback)                  | Implementado                 | ea569e4                          |
| Testing agent (E2E pipeline, 20 checks)                      | Implementado                 | 56c6898                          |
| Ingesta múltiple + pipeline incremental/batch                | Implementado                 | 141f4a1                          |
| Linaje explícito + analysis runs + snapshots                 | Implementado                 | 9a02797 + 81ecc7c                |
| Operaciones, backfill y salud estadística                    | Implementado                 | 81ecc7c                          |
| Observabilidad productiva + smoke de producción              | Implementado                 | 6ff9c13                          |
| Refactor hotspots (IA, export, survey, analytics, campaigns) | Implementado                 | 90cda4d                          |
| Reporte de calidad por campaña + matriz de desempeño IA      | En progreso                  | codex/campaign-quality-ai-matrix |
| Pulsos automatizados                                         | Pendiente                    | —                                |
| Reportes PDF con marca blanca                                | Implementado (branding v4.4) | 97554e3                          |
| CFA / Invariancia                                            | Horizonte 2                  | —                                |
| ONA sociometrica                                             | Horizonte 2                  | —                                |
| NLP comentarios (local)                                      | Horizonte 3                  | —                                |
| Modulos sectoriales                                          | Horizonte 3 (infra lista)    | —                                |

---

## Horizonte 1: Operativo (0–6 meses)

### Completado

- Export Excel con datos completos (dimensiones, items, segmentos, drivers, alertas, comentarios, ficha tecnica)
- PDF ejecutivo con KPIs, categorias, dimensiones, departamentos, alertas, drivers, comentarios, indicadores de negocio, ONA, ficha tecnica
- Benchmarks internos (comparacion entre departamentos, gap analysis)
- Filtros de segmentacion en resultados
- Loading states en todas las paginas de resultados
- Error boundaries globales y por seccion
- CI/CD con GitHub Actions
- Tests unitarios con vitest

### Completado (v4.4)

- Sistema de branding per-org: colores, logo, textos personalizados aplicados en survey, emails, PDF y resultados
- Emails con marca de la organización: 4 tipos (invitación, recordatorio, cierre, resultados)
- Recordatorios manuales: botón en campaña activa envía emails de recordatorio a participantes pendientes
- Logo de organización en sidebar de resultados y portada de PDF
- PDF con marca blanca (colores dinámicos per-org, logo en portada)

### Completado (v4.5)

- ONA migrado de NetworkX/Louvain a igraph/Leiden
- Análisis de estabilidad NMI (50 iteraciones pairwise)
- Imagen de grafo generada server-side (matplotlib + Fruchterman-Reingold)
- Edge betweenness para aristas críticas inter-comunidad
- Corrección de colores DEFAULT_BRAND_CONFIG (secondary=#4a90d9, accent=#22c55e)

### Completado (v4.6)

- Backend dual de IA: DGX (OpenAI-compatible vía Cloudflare Tunnel `ollama.rizo.ma`) con fallback a Ollama nativo
- Fail-fast: si ningún proveedor IA configurado, retorna error inmediato con mensaje claro en español
- UI feedback: los 5 clientes de resultados ahora muestran errores de IA en vez de fallar silenciosamente
- Testing agent standalone (`testing-agent/`): genera orgs, empleados, encuestas; calcula resultados; verifica con 20 assertions
- Fix crash Select.Item (Radix UI requiere value no vacío en segment filter bar)

### Completado (v4.7)

- Ingesta múltiple: survey web, direct API, CSV, webhook externo y Tally convergen al mismo modelo de datos
- Pipeline operacional en 3 capas: ingesta → trigger → procesamiento → análisis → output
- `campaign_stats` como cache incremental para dashboard con refresh asíncrono
- Batch programado y bajo demanda con observabilidad (`batch_job_runs`, `pipeline_dispatch_events`)
- Linaje explícito de resultados con `analysis_runs`, `campaign_instruments`, taxonomía de dimensiones y separación de `campaign_ai_insights`
- Backfill histórico controlado, snapshots de corrida, comparativas de drift y panel técnico/operativo

### Completado (v4.8)

- Runtime productivo estabilizado con `SUPABASE_SECRET_KEY` como credencial backend prioritaria
- Smoke productivo automatizado para sitio, batch, ingest y runtime admin
- Hygiene pass del repositorio: poda de código muerto, upgrades de dependencias y `npm audit` productivo en cero
- Refactorización de hotspots:
  - `ai-insights.ts` extraído en proveedor, prompts, persistencia y rate limit
  - `export.ts` dividido en loaders y builders
  - survey público modularizado en hook, helpers, backup y step components
  - `analytics.ts` separado por familias de lectura
  - `campaigns.ts` reducido a fachadas + núcleo `calculateResults()`

### Pendiente inmediato

- Cerrar merge y despliegue del reporte de calidad por campaña + matriz de desempeño IA

### Pendiente

- Pulsos automatizados (programacion periodica de 22 items ancla)
- Recordatorios automáticos por cron (programación periódica)
- Onboarding wizard multi-paso para nuevas organizaciones
- Alertas operativas conectadas a un canal real (Slack/email/webhook) y playbooks de respuesta
- Backfill histórico real en producción con revisión de drift y thresholds
- Rotación final manual fuera de credenciales legacy donde aún aplique en infraestructura externa
- Baseline formal de performance/capacidad para campañas grandes

### Próximos pasos recomendados (siguientes 90 días)

1. Correr backfill histórico completo en producción y revisar diferencias materiales por campaña
2. Activar notificaciones operativas reales para fallos de ingest, batch, dispatch y ONA
3. Medir tiempos y costo de `calculateResults()` para definir qué más pasar a incremental
4. Cerrar pulsos automatizados y recordatorios por cron como siguientes features de negocio
5. Preparar la siguiente capa analítica: comparativas longitudinales más claras y validación CFA/invariancia

---

## Horizonte 2: Analítico (6–18 meses)

### Análisis Factorial Confirmatorio (CFA)

- Validación empírica de la estructura de 22 dimensiones
- Evaluación de ajuste del modelo (CFI, RMSEA, SRMR)
- Identificación de ítems con cargas factoriales bajas

### Invariancia de Medición

- Invariancia configural, métrica y escalar
- Habilitar comparaciones válidas entre organizaciones
- Establecer normas regionales por industria y tamaño

### Normas Regionales

- Construcción de base de datos normativa LATAM
- Percentiles por industria, tamaño y país
- Benchmarking externo opcional para clientes

### ONA Sociométrica

- Preguntas sociométricas opcionales ("¿A quién acudes para resolver problemas?")
- Grafo de interacciones reales (no solo similitud perceptual)
- Identificación de líderes informales, silos de comunicación, redes de influencia
- Combinación con ONA perceptual para diagnóstico integral

### Mejoras Estadísticas

- Intervalos de confianza para diferencias entre segmentos
- Pruebas de significancia para cambios wave-over-wave
- Análisis de sensibilidad para tamaño de efecto

---

## Horizonte 3: Avanzado (18–36 meses)

### Modelado Multinivel (HLM)

- Separar varianza individual, de equipo y organizacional
- Efectos cross-level entre liderazgo y engagement
- Control por variables de composición grupal

### Análisis de Texto (NLP)

- Clasificación temática de respuestas abiertas
- Análisis de sentimiento en español latinoamericano
- Extracción automática de temas emergentes

### Módulos Sectoriales

- Módulos especializados por industria (salud, educación, retail, manufactura)
- Dimensiones adicionales específicas del sector
- Normas sectoriales diferenciadas
- **Nota**: La infraestructura multi-instrumento (base + módulos) ya está implementada en v4.2. Solo se requiere crear los módulos sectoriales como nuevos instrumentos con `instrument_type = 'module'`

### Integraciones API

- Integración con HRIS (BambooHR, Factorial, etc.)
- Webhooks para eventos de campaña
- API pública para integración con dashboards de BI

---

## Principios de Evolución

1. **Evidencia primero**: Ninguna métrica se agrega sin fundamento teórico y validación empírica
2. **Simplicidad para el usuario**: La complejidad estadística se abstrae; el admin ve insights accionables
3. **Transparencia metodológica**: Las limitaciones se reportan automáticamente, nunca se ocultan
4. **Compatibilidad hacia atrás**: Los datos históricos siempre son re-procesables con nuevas métricas
5. **Contexto LATAM**: Todas las normas, traducciones y adaptaciones priorizan el contexto latinoamericano
