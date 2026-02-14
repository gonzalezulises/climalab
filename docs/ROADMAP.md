# ClimaLab — Product Roadmap

## Estado Actual: v4.3

**Instrumento**: Core v4.0 (22 dimensiones, 109 items) — sin cambios en el instrumento desde v4.0

| Feature                                        | Estado                        | Commit            |
| ---------------------------------------------- | ----------------------------- | ----------------- |
| Core v4.0 (22 dims, 109 items)                 | Implementado                  | 5ea0548 + f4c2fd1 |
| rwg, Cronbach alpha, ficha tecnica             | Implementado                  | b59e11e           |
| Business indicators (tabla + CRUD + seed data) | Implementado                  | b59e11e           |
| Niveles EMCO (3 niveles)                       | Implementado                  | b59e11e           |
| AI Insights (Ollama, 7 paginas)                | Implementado                  | fc35ab6           |
| Export Excel + PDF                             | Implementado                  | 8d423fa           |
| Benchmarks internos                            | Implementado                  | 8d423fa           |
| Multi-instrumento (base + modulos)             | Implementado                  | 531ec39           |
| ONA perceptual (igraph, Leiden, stability NMI) | Implementado                  | a553ea2           |
| Tests + CI/CD + Error boundaries               | Implementado                  | d817d19           |
| Pulsos automatizados                           | Pendiente                     | —                 |
| Reportes PDF con marca blanca                  | Pendiente (PDF basico existe) | —                 |
| CFA / Invariancia                              | Horizonte 2                   | —                 |
| ONA sociometrica                               | Horizonte 2                   | —                 |
| NLP comentarios (local)                        | Horizonte 3                   | —                 |
| Modulos sectoriales                            | Horizonte 3 (infra lista)     | —                 |

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

### Pendiente

- Pulsos automatizados (programacion periodica de 22 items ancla)
- Recordatorios automáticos por cron (programación periódica)
- Onboarding wizard multi-paso para nuevas organizaciones

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
