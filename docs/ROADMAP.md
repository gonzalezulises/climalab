# ClimaLab — Product Roadmap

## Estado Actual: v4.1.1

**Instrumento**: Core v4.0 (22 dimensiones, 109 items) — sin cambios en el instrumento

**Mejoras estadísticas v4.1**:

- rwg(j) para validar acuerdo intergrupal
- Alfa de Cronbach para confiabilidad interna
- Tabla de indicadores de negocio para correlación temporal
- Vista de 3 niveles de análisis (EMCO-aligned)
- Reporte técnico expandido con limitaciones auto-generadas

**Amplificación con IA v4.1.1**:

- Análisis de comentarios: temas, sentimiento, resumen por tipo
- Resumen ejecutivo narrativo en dashboard
- Interpretación de drivers: narrativa, paradojas, quick wins
- Contextualización de alertas: causa raíz + recomendación
- Perfiles narrativos de segmentos con fortalezas/riesgos
- Narrativa de tendencias: trayectoria, dimensiones mejorando/declinando
- Reporte ejecutivo IA descargable (.txt)

---

## Horizonte 1: Operativo (0–6 meses)

### Reportes PDF

- Generación automática de informe ejecutivo en PDF
- Incluye KPIs, radar, ranking, alertas, ficha técnica
- Marca blanca configurable por organización

### Benchmarks Internos

- Comparación automática entre departamentos de la misma organización
- Visualización de brechas entre segmentos
- Identificación de mejores prácticas internas

### Pulsos Automatizados

- Programación de pulsos periódicos (22 items ancla)
- Tracking automático de evolución por dimensión
- Alertas de deterioro entre mediciones

### Mejoras de UX

- Exportación de datos a CSV/Excel
- Filtros avanzados en resultados
- Notificaciones por email de hitos de campaña

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
