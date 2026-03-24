# Plan Maestro — ClimaLab
## Hacia una plataforma de calidad mundial con fundamento estadístico y psicométrico insuperable

**Autor del diagnóstico:** ChatGPT (GPT-5.4 Thinking)  
**Fecha:** 2026-03-24  
**Proyecto:** `gonzalezulises/climalab`  
**Repositorio base revisado:** rama `main`  
**Propósito del documento:** servir como plan maestro operativo y también como **artefacto de continuidad** para retomar este trabajo en otra conversación o instancia sin perder contexto.

---

## 1. Resumen ejecutivo

ClimaLab **no es un MVP improvisado**. Ya muestra señales poco comunes en un producto temprano: arquitectura multi-tenant, pruebas de aislamiento RLS, motor estadístico propio, testing agent E2E, exportación, ONA perceptual y una capa de IA con fallback múltiple.

Sin embargo, **todavía no está en estándar mundial**. La distancia con ese nivel no está en el frontend ni en el branding. Está en cinco frentes críticos:

1. **Fundamento psicométrico todavía insuficiente** para reclamar excelencia científica.
2. **Motor de cálculo demasiado concentrado** en lógica monolítica y acoplada a Server Actions.
3. **Ambigüedad conceptual en engagement** y al menos un bug relevante en favorabilidad de engagement.
4. **Persistencia y orquestación analítica** todavía demasiado artesanal para escalar con seguridad y trazabilidad.
5. **Capa IA y NLP útil pero aún no audit-able** como sistema analítico serio.

La oportunidad es real: con una secuencia disciplinada de refactor, endurecimiento estadístico y arquitectura, ClimaLab puede evolucionar desde “SaaS serio de clima” a **infraestructura de medición organizacional versionada, auditable y científicamente gobernada**.

---

## 2. Diagnóstico sintético del estado actual

### 2.1 Fortalezas verificadas
- Plataforma SaaS multi-tenant bien concebida.
- Separación explícita entre PII (`participants`) y respuestas (`respondents`).
- RLS con pruebas serias de aislamiento entre organizaciones.
- Testing unitario de funciones estadísticas puras.
- Testing agent E2E externo al app.
- ONA perceptual bien encuadrado como similitud de percepciones, no sociometría.
- Contratos metodológicos documentados en el README.
- Soporte multi-instrumento y branding por organización.

### 2.2 Debilidades críticas
- `calculateResults()` concentra demasiada lógica crítica.
- Favorabilidad de engagement calculada con redondeo previo del score individual.
- Dos ontologías de engagement coexistiendo:
  - `ENG` como dimensión dependiente
  - score global compuesto como engagement operativo
- Pearson con p-value aproximado, no inferencia robusta.
- Persistencia de analytics avanzados en blobs JSON sin gobierno analítico fuerte.
- Ejecución de ONA vía `child_process`, frágil para cloud y escala.
- Capa IA útil, pero todavía basada en prompts + extracción regex + persistencia JSON.
- Fundamento psicométrico aún insuficiente para una narrativa “world-class”.

### 2.3 Dictamen de madurez
**Madurez actual:** producto serio en etapa temprana/intermedia.  
**Nivel objetivo deseado:** plataforma world-class de medición organizacional.

---

## 3. Norte estratégico

ClimaLab debe dejar de pensarse como “app de encuestas de clima” y pasar a concebirse como un sistema con tres motores claramente diferenciados:

### 3.1 Motor de medición
Responsable de:
- instrumentos,
- dimensiones,
- ítems,
- reverse coding,
- módulos,
- benchmarks,
- versiones,
- evidencia psicométrica,
- reglas de scoring.

### 3.2 Motor analítico
Responsable de:
- cálculo base,
- confiabilidad,
- segmentación,
- benchmarking,
- ONA,
- NLP de texto abierto,
- alertas,
- sensibilidad,
- inferencia,
- versionado de análisis.

### 3.3 Motor de entrega
Responsable de:
- campañas,
- branding,
- UX,
- exports,
- multi-tenancy,
- permisos,
- jobs,
- observabilidad,
- auditoría,
- operación SaaS.

**Meta final:** que ningún insight relevante dependa de lógica ambigua, heurística no trazada o infraestructura improvisada.

---

## 4. Principios rectores

1. **Verdad analítica antes que espectacularidad visual.**
2. **Psicometría y estadística como activo de producto, no como decoración técnica.**
3. **Separar medición, análisis y entrega.**
4. **Todo cálculo crítico debe ser versionado, reproducible e idempotente.**
5. **Toda salida ejecutiva debe tener trazabilidad metodológica.**
6. **No mezclar heurísticas operativas con claims científicos.**
7. **La IA debe ampliar interpretación, no reemplazar fundamento.**
8. **Cada benchmark debe tener fuente, tipo y nivel de comparabilidad.**
9. **Todo módulo nuevo debe nacer con contrato de datos, tests y límites explícitos.**
10. **Escalabilidad sin degradar rigor.**

---

## 5. Hallazgos críticos que deben resolverse primero

### 5.1 Bug de favorabilidad de engagement
Hoy la favorabilidad de engagement se calcula sobre el promedio individual **redondeado**, lo que puede convertir scores sub-favorables en favorables.

**Acción**
- corregir inmediatamente el cálculo;
- agregar test de regresión;
- documentar la corrección como cambio de motor analítico.

**Severidad:** Alta.

### 5.2 Ambigüedad en la definición de engagement
Hoy coexisten:
- `ENG` como dimensión dependiente transversal,
- promedio de todos los scores del respondente como engagement operativo.

**Riesgo**
- inconsistencia conceptual,
- interpretaciones contradictorias,
- drivers mal encuadrados,
- comunicación ejecutiva confusa.

**Acción**
Definir una arquitectura conceptual única:

**Opción A**
- `ENG` = outcome analítico primario
- score global compuesto = índice general de clima

**Opción B**
- score global compuesto = outcome principal
- `ENG` se redefine o se integra como subescala específica

**Recomendación:** Opción A.

### 5.3 Concentración excesiva en `calculateResults()`
La lógica crítica está demasiado acoplada y centralizada.

**Acción**
Extraer hacia un motor versionado con capas:
- `measurement_engine`
- `scoring_engine`
- `analytics_engine`
- `reporting_engine`

### 5.4 Inferencia estadística insuficiente
Pearson usa p-values aproximados.

**Acción**
Migrar a una capa inferencial seria:
- t exacta cuando aplique,
- o bootstrap/permutación,
- o ambos.

### 5.5 ONA y cómputo pesado no deben ejecutarse desde request lifecycle
ONA vía `child_process` desde la app es aceptable como puente, no como arquitectura final.

**Acción**
Mover ONA, NLP, benchmarks complejos y análisis pesados a jobs asincrónicos.

---

## 6. Arquitectura objetivo

### 6.1 Arquitectura lógica futura

```text
[App / UX / Multi-tenant SaaS]
        |
        v
[Application Layer / Orchestrators]
        |
        +---------------------+
        |                     |
        v                     v
[Measurement Registry]   [Job Queue / Workers]
        |                     |
        v                     v
[Scoring Engine]       [Analytics Workers]
        |                     |
        |         +-----------+-----------+
        |         |           |           |
        v         v           v           v
[Results Store] [ONA] [Psychometrics] [NLP/AI]
        |
        v
[Exports / Dashboards / APIs]
```

### 6.2 Componentes objetivo

#### A. Measurement Registry
Repositorio versionado de:
- instrumentos,
- dimensiones,
- ítems,
- reverse items,
- módulos,
- benchmarks,
- reglas de scoring,
- evidencia psicométrica.

#### B. Scoring Engine
Responsable de:
- validación de respuestas,
- attention checks,
- reverse coding,
- scoring por dimensión,
- scoring por categorías,
- scoring outcome,
- segmentación base,
- ficha técnica.

#### C. Analytics Engine
Responsable de:
- confiabilidad,
- correlaciones,
- drivers,
- alertas,
- benchmarking,
- ONA,
- texto abierto,
- comparativos históricos,
- sensibilidad.

#### D. Results Registry
Persistencia con:
- `analysis_run_id`
- `schema_version`
- `engine_version`
- `instrument_version`
- timestamps
- lineage.

#### E. Jobs / Workers
Para:
- ONA,
- NLP,
- benchmarks complejos,
- CFA/IRT/validaciones pesadas,
- exports pesados,
- regeneraciones históricas.

---

## 7. Workstreams estratégicos

### 7.1 Workstream 1 — Measurement Science / Psicometría
**Objetivo:** convertir el instrumento en un activo científico defendible.

**Alcance**
- item-total correlations,
- alpha + omega,
- policóricas,
- EFA,
- CFA,
- invariancia factorial,
- DIF,
- IRT / GRM,
- revisión de anclas del Pulso,
- reglas de eliminación o rediseño de ítems,
- governance de versiones del instrumento.

**Entregables**
- `measurement-registry.md`
- `instrument-evidence-matrix.md`
- pipeline psicométrico reproducible
- scorecard psicométrico por dimensión

### 7.2 Workstream 2 — Statistical Core Hardening
**Objetivo:** blindar el motor cuantitativo.

**Alcance**
- corregir bug de favorabilidad de engagement,
- unificar ontología de engagement,
- reemplazar p-values aproximados,
- añadir bootstrap CIs,
- inferencia robusta,
- tests de regresión estadística,
- versionado del engine,
- separación de heurísticas vs métricas científicas.

**Entregables**
- `engine_versioning_spec.md`
- suite ampliada de tests estadísticos
- changelog metodológico

### 7.3 Workstream 3 — Analytics Platform & Jobs
**Objetivo:** escalar cálculo sin acoplarlo al request lifecycle.

**Alcance**
- job queue,
- workers dedicados,
- retries,
- idempotencia,
- tracing,
- reprocessing,
- observabilidad,
- estados de cálculo.

### 7.4 Workstream 4 — Benchmarking serio
**Objetivo:** eliminar benchmarks decorativos y sustituirlos por referencias trazables.

**Tipos de benchmark**
- histórico interno,
- externo directo,
- externo calibrado,
- direccional,
- sin referencia verificable.

### 7.5 Workstream 5 — Open Text / NLP
**Objetivo:** convertir respuestas abiertas en una fuente analítica seria.

**Alcance**
- clustering temático por pregunta,
- embeddings,
- labels sobrios,
- citas representativas,
- temas emergentes,
- cruces por segmento con umbral de anonimato,
- almacenamiento versionado.

### 7.6 Workstream 6 — ONA 2.0
**Objetivo:** endurecer el valor del ONA perceptual sin vender más de lo que soporta.

### 7.7 Workstream 7 — Enterprise Security & Compliance
**Objetivo:** volverlo enterprise-ready de verdad.

### 7.8 Workstream 8 — AI Governance
**Objetivo:** que la IA sea útil sin contaminar la verdad analítica.

---

## 8. Roadmap maestro

### Fase 0 — Correcciones críticas inmediatas (0–2 semanas)
**Objetivos**
- corregir favorabilidad de engagement;
- definir engagement oficialmente;
- documentar limitaciones actuales;
- abrir decision log formal.

**Entregables**
- patch del motor
- ADR sobre engagement
- changelog metodológico vNext
- tests de regresión

### Fase 1 — Hardening del motor (2–6 semanas)
**Objetivos**
- desmontar `calculateResults()` en piezas testeables;
- introducir `analysis_run_id`, `engine_version`, `schema_version`;
- separar cálculo base de analytics avanzados.

### Fase 2 — Psicometría seria (6–12 semanas)
**Objetivos**
- construir pipeline psicométrico reproducible;
- auditar dimensiones del Core;
- evaluar Pulso v4.0 como anclas;
- definir criterios de rediseño de ítems.

### Fase 3 — Workers y escalabilidad analítica (8–16 semanas)
**Objetivos**
- jobs asincrónicos,
- reintentos,
- observabilidad,
- ONA y NLP desacoplados.

### Fase 4 — Benchmarking y comparativos (10–18 semanas)
**Objetivos**
- benchmark histórico interno sólido;
- benchmark externo solo si es verificable;
- comparability framework visible.

### Fase 5 — NLP / open text / IA gobernada (12–20 semanas)
**Objetivos**
- análisis temático serio,
- clustering por pregunta,
- insights ejecutivos con trazabilidad,
- IA interpretativa gobernada.

### Fase 6 — Enterprise readiness (16–24 semanas)
**Objetivos**
- seguridad,
- compliance,
- resiliencia,
- operación SaaS robusta.

---

## 9. Backlog priorizado (top 25)

1. Corregir favorabilidad de engagement.
2. ADR: definición única de engagement.
3. Extraer `calculateResults()` a un engine modular.
4. Introducir `analysis_run_id`.
5. Introducir `engine_version`.
6. Introducir `result_schema_version`.
7. Reemplazar p-values aproximados.
8. Bootstrap CIs para métricas clave.
9. Decision log metodológico versionado.
10. Registry del instrumento.
11. Registry de benchmarks.
12. Worker asincrónico para ONA.
13. Worker asincrónico para NLP.
14. Persistencia tipada para analytics avanzados.
15. Data lineage por ejecución.
16. Suite de tests de regresión estadística ampliada.
17. Pipeline psicométrico externo al app.
18. Evaluación EFA/CFA del Core.
19. Evaluación de anclas del Pulso.
20. DIF / invariancia por segmentos críticos.
21. Capa de comparativos históricos internos.
22. Módulo open text robusto.
23. Gobernanza de IA y prompts.
24. Observabilidad y alerting operativo.
25. Hardening de compliance y seguridad.

---

## 10. KPIs de transformación

### 10.1 Ciencia / medición
- % de dimensiones con evidencia psicométrica completa
- % de dimensiones con omega >= umbral
- % de ítems con funcionamiento aceptable
- % de comparativos con comparabilidad explícita

### 10.2 Ingeniería analítica
- tiempo promedio de cálculo por campaña
- % de runs reproducibles sin drift
- tasa de fallos por pipeline
- cobertura de tests de motor
- cantidad de regressions detectadas antes de producción

### 10.3 Producto
- tiempo desde cierre de campaña a resultados listos
- % de insights usados por clientes
- retención de campañas recurrentes
- adopción de módulos opcionales
- uso de benchmark histórico interno

### 10.4 Operación
- tasa de éxito de jobs
- tiempo de recuperación ante fallos
- incidentes de aislamiento multi-tenant
- latencia de exportación pesada
- costos por análisis

---

## 11. Riesgos principales

### Riesgo 1 — Sobrepromesa científica prematura
Si comercialmente se vende “fundamento insuperable” antes de construir la capa psicométrica robusta, el producto se vuelve atacable.

### Riesgo 2 — Acumulación de deuda en el motor
Agregar features sin separar motor de medición, motor analítico y entrega degradará calidad rápidamente.

### Riesgo 3 — Ambigüedad conceptual
No resolver engagement, benchmarks y uso de IA introduce ruido estructural.

### Riesgo 4 — Escalabilidad engañosa
La app puede verse escalable funcionalmente, pero no analíticamente.

### Riesgo 5 — Mezcla de insights heurísticos con claims científicos
Eso mata credibilidad a mediano plazo.

---

## 12. Recomendación estratégica final

No intentes convertir ClimaLab en “todo” al mismo tiempo.

La secuencia correcta es:

1. **verdad del motor**
2. **claridad conceptual**
3. **psicometría**
4. **arquitectura de jobs**
5. **benchmarking serio**
6. **NLP/open text**
7. **enterprise readiness**

Si haces eso en ese orden, ClimaLab puede construir una ventaja difícil de copiar.

---

## 13. Propuesta de organización de trabajo

### 13.1 Frentes
- **Frente A — Ciencia de medición**
- **Frente B — Motor analítico**
- **Frente C — Plataforma SaaS**
- **Frente D — IA y NLP**
- **Frente E — Producto ejecutivo**

### 13.2 Cadencia sugerida
- semanal: comité técnico-científico
- quincenal: revisión de artefactos metodológicos
- mensual: steering de producto y arquitectura
- trimestral: revisión de roadmap y evidencia acumulada

---

## 14. Primer sprint recomendado (2 semanas)

### Objetivo del sprint
Cerrar las mayores fuentes de ambigüedad metodológica y abrir la arquitectura futura.

### Tareas
1. Corregir favorabilidad de engagement.
2. Definir ADR de engagement.
3. Crear `analysis_run_id`, `engine_version`, `schema_version`.
4. Abrir decision log metodológico.
5. Diseñar separación del engine.
6. Crear backlog psicométrico formal.
7. Diseñar benchmark registry.
8. Diseñar tabla/job model para analytics pesados.

### Entregables del sprint
- PR del bug crítico
- ADR-001 Engagement
- ADR-002 Engine versioning
- ADR-003 Analytics jobs
- backlog priorizado v1
- blueprint del Measurement Registry

---

## 15. Continuity brief para retomar esta conversación en otra instancia

Esta sección está diseñada para copiarse/pegarse al inicio de una nueva conversación y recuperar contexto rápidamente.

### 15.1 Resumen mínimo
Estoy desarrollando **ClimaLab** (`gonzalezulises/climalab`), una plataforma SaaS multi-tenant para clima organizacional. Ya se hizo una revisión profunda del repo y se concluyó que:

- la base del producto es seria;
- la seguridad multi-tenant y el testing son fortalezas reales;
- el proyecto todavía no está en estándar world-class;
- los bloqueos principales están en psicometría, arquitectura del motor, versionado analítico, benchmarking serio y desacople de cómputo pesado.

### 15.2 Hallazgos críticos ya identificados
- `calculateResults()` está demasiado concentrado.
- Hay un bug en favorabilidad de engagement por redondeo previo.
- Hay ambigüedad entre `ENG` como dimensión y engagement como score global.
- Pearson usa p-value aproximado.
- ONA corre vía `child_process`.
- La capa IA es útil pero todavía artesanal y poco audit-able.
- El producto necesita un Measurement Registry y un Analytics Engine versionado.

### 15.3 Meta acordada
Convertir ClimaLab en una plataforma de **calidad mundial**, con:
- fundamento estadístico y psicométrico muy superior,
- arquitectura analítica escalable,
- benchmarking serio,
- NLP/open text trazable,
- y gobierno explícito de medición.

### 15.4 Próximo paso recomendado
En la próxima conversación, continuar por este orden:
1. definir la ontología oficial de engagement;
2. diseñar el `Measurement Registry`;
3. diseñar el `Analytics Engine` versionado;
4. construir el backlog psicométrico de trabajo;
5. aterrizar el roadmap técnico en PRs, ADRs y milestones.

### 15.5 Instrucción útil para el siguiente asistente
No responder con generalidades. Partir de este diagnóstico y trabajar a nivel de:
- arquitectura,
- psicometría,
- estadística aplicada,
- gobierno analítico,
- diseño de plataforma.

---

## 16. Cierre

ClimaLab ya tiene base para convertirse en algo excepcional.  
La diferencia entre “buen SaaS” y “plataforma de referencia” estará en la disciplina con la que se gobiernen:

- las definiciones,
- los cálculos,
- la evidencia,
- la trazabilidad,
- y la arquitectura.

Ese es el trabajo correcto.
