-- ============================================================
-- Seed: Demo Organization
-- ============================================================

INSERT INTO organizations (id, name, slug, industry, country, employee_count, departments)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Demo Corp',
  'demo-corp',
  'Tecnología',
  'MX',
  25,
  ARRAY['Ingeniería', 'Marketing', 'Operaciones']
);

-- ============================================================
-- Seed: ClimaLab Core v1.0 (full instrument)
-- ============================================================

INSERT INTO instruments (id, name, slug, description, mode, target_size, version)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'ClimaLab Core',
  'climalab-core',
  'Instrumento completo de medición de clima organizacional. 6 indicadores, 28 ítems + 1 verificación de atención.',
  'full',
  'all',
  '1.0'
);

-- Dimensions for ClimaLab Core
INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Liderazgo', 'LID', 'Percepción sobre la calidad del liderazgo y la relación con el supervisor directo.', 1),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Justicia y equidad', 'JUS', 'Percepción de trato justo en evaluaciones, oportunidades y compensación.', 2),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Sentimiento de pertenencia', 'PER', 'Orgullo de formar parte de la organización y conexión con sus valores.', 3),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Innovación y gestión del cambio', 'INN', 'Apertura a nuevas ideas y capacidad de la organización para gestionar transformaciones.', 4),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Equilibrio y bienestar laboral', 'CAR', 'Balance entre las demandas del trabajo y los recursos disponibles para cumplirlas.', 5),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Claridad y desarrollo', 'CLA', 'Comprensión de las responsabilidades del puesto y oportunidades de crecimiento profesional.', 6);

-- Items for ClimaLab Core — Liderazgo (LID)
INSERT INTO items (dimension_id, text, is_reverse, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Mi supervisor directo me brinda retroalimentación útil sobre mi desempeño.', false, 1),
  ('c0000000-0000-0000-0000-000000000001', 'Siento que puedo expresar mis opiniones libremente a mi supervisor.', false, 2),
  ('c0000000-0000-0000-0000-000000000001', 'Mi supervisor muestra interés genuino en mi desarrollo profesional.', false, 3),
  ('c0000000-0000-0000-0000-000000000001', 'Las decisiones de mi supervisor son inconsistentes y difíciles de predecir.', true, 4),
  ('c0000000-0000-0000-0000-000000000001', 'Mi supervisor reconoce públicamente los logros del equipo.', false, 5);

-- Items for ClimaLab Core — Justicia Organizacional (JUS)
INSERT INTO items (dimension_id, text, is_reverse, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'Los procesos de evaluación del desempeño son justos y transparentes.', false, 1),
  ('c0000000-0000-0000-0000-000000000002', 'Las oportunidades de crecimiento se distribuyen equitativamente.', false, 2),
  ('c0000000-0000-0000-0000-000000000002', 'Mi compensación es justa considerando mis responsabilidades.', false, 3),
  ('c0000000-0000-0000-0000-000000000002', 'Las reglas se aplican de manera diferente según la persona.', true, 4),
  ('c0000000-0000-0000-0000-000000000002', 'Siento que mi voz cuenta en las decisiones que me afectan.', false, 5);

-- Items for ClimaLab Core — Pertenencia (PER)
INSERT INTO items (dimension_id, text, is_reverse, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'Me siento orgulloso de ser parte de esta organización.', false, 1),
  ('c0000000-0000-0000-0000-000000000003', 'Recomendaría esta empresa como un buen lugar para trabajar.', false, 2),
  ('c0000000-0000-0000-0000-000000000003', 'Los valores de la organización coinciden con los míos.', false, 3),
  ('c0000000-0000-0000-0000-000000000003', 'Me siento desconectado de mis compañeros de trabajo.', true, 4),
  ('c0000000-0000-0000-0000-000000000003', 'Siento que mi trabajo es valorado por la organización.', false, 5);

-- Items for ClimaLab Core — Innovación (INN)
INSERT INTO items (dimension_id, text, is_reverse, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000004', 'Se nos anima a proponer nuevas ideas y formas de trabajar.', false, 1),
  ('c0000000-0000-0000-0000-000000000004', 'La organización adopta nuevas tecnologías de forma oportuna.', false, 2),
  ('c0000000-0000-0000-0000-000000000004', 'Los errores se ven como oportunidades de aprendizaje.', false, 3),
  ('c0000000-0000-0000-0000-000000000004', 'Las propuestas de mejora rara vez se implementan.', true, 4),
  ('c0000000-0000-0000-0000-000000000004', 'Tengo libertad para experimentar con nuevos enfoques en mi trabajo.', false, 5);

-- Items for ClimaLab Core — Carga de Trabajo (CAR)
INSERT INTO items (dimension_id, text, is_reverse, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000005', 'La cantidad de trabajo que tengo es manejable.', false, 1),
  ('c0000000-0000-0000-0000-000000000005', 'Cuento con los recursos necesarios para realizar mi trabajo.', false, 2),
  ('c0000000-0000-0000-0000-000000000005', 'Puedo mantener un equilibrio saludable entre trabajo y vida personal.', false, 3),
  ('c0000000-0000-0000-0000-000000000005', 'Frecuentemente me siento abrumado por la cantidad de tareas.', true, 4);

-- Items for ClimaLab Core — Claridad de Rol (CLA)
INSERT INTO items (dimension_id, text, is_reverse, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000006', 'Tengo claro qué se espera de mí en mi puesto.', false, 1),
  ('c0000000-0000-0000-0000-000000000006', 'Mis objetivos están bien definidos y son medibles.', false, 2),
  ('c0000000-0000-0000-0000-000000000006', 'Entiendo cómo mi trabajo contribuye a los objetivos de la organización.', false, 3),
  ('c0000000-0000-0000-0000-000000000006', 'Con frecuencia recibo instrucciones contradictorias.', true, 4);

-- Attention check item (added to Liderazgo for placement)
INSERT INTO items (dimension_id, text, is_attention_check, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Por favor selecciona "De acuerdo" para esta pregunta.', true, 99);

-- ============================================================
-- Seed: ClimaLab Pulso v1.0 (pulse instrument)
-- ============================================================

INSERT INTO instruments (id, name, slug, description, mode, target_size, version)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'ClimaLab Pulso',
  'climalab-pulso',
  'Versión rápida con 1 ítem ancla por indicador. Ideal para seguimiento frecuente.',
  'pulse',
  'all',
  '1.0'
);

-- Dimensions for ClimaLab Pulso (same 6)
INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Liderazgo', 'LID', 'Percepción sobre la calidad del liderazgo y la relación con el supervisor directo.', 1),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Justicia y equidad', 'JUS', 'Percepción de trato justo en evaluaciones, oportunidades y compensación.', 2),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Sentimiento de pertenencia', 'PER', 'Orgullo de formar parte de la organización y conexión con sus valores.', 3),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Innovación y gestión del cambio', 'INN', 'Apertura a nuevas ideas y capacidad de la organización para gestionar transformaciones.', 4),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Equilibrio y bienestar laboral', 'CAR', 'Balance entre las demandas del trabajo y los recursos disponibles para cumplirlas.', 5),
  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Claridad y desarrollo', 'CLA', 'Comprensión de las responsabilidades del puesto y oportunidades de crecimiento profesional.', 6);

-- Anchor items for ClimaLab Pulso (1 per dimension)
INSERT INTO items (dimension_id, text, is_anchor, sort_order) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Mi supervisor directo me brinda retroalimentación útil sobre mi desempeño.', true, 1),
  ('d0000000-0000-0000-0000-000000000002', 'Los procesos de evaluación del desempeño son justos y transparentes.', true, 1),
  ('d0000000-0000-0000-0000-000000000003', 'Me siento orgulloso de ser parte de esta organización.', true, 1),
  ('d0000000-0000-0000-0000-000000000004', 'Se nos anima a proponer nuevas ideas y formas de trabajar.', true, 1),
  ('d0000000-0000-0000-0000-000000000005', 'La cantidad de trabajo que tengo es manejable.', true, 1),
  ('d0000000-0000-0000-0000-000000000006', 'Tengo claro qué se espera de mí en mi puesto.', true, 1);
