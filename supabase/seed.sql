-- ============================================================
-- Seed: Demo Organization
-- ============================================================

INSERT INTO organizations (id, name, slug, industry, country, employee_count, departments)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Demo Corp',
  'demo-corp',
  'Tecnología',
  'PA',
  85,
  ARRAY['Ingeniería', 'Marketing', 'Operaciones', 'Recursos Humanos', 'Finanzas']
);

-- ============================================================
-- Seed: ClimaLab Core v2.0 (full instrument)
-- Evidence-based: 8 dimensions × 4-5 ítems = 35 + 2 attention checks
-- ============================================================

INSERT INTO instruments (id, name, slug, description, mode, target_size, version)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'ClimaLab Core',
  'climalab-core',
  'Instrumento completo de medición de clima organizacional. 8 dimensiones, 35 ítems + 2 verificaciones de atención. Diseño basado en evidencia psicométrica.',
  'full',
  'all',
  '2.0'
);

-- ============================================================
-- 8 Dimensions for ClimaLab Core v2.0
-- ============================================================
INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order) VALUES
  ('c1000001-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Liderazgo y Supervisión', 'LID',
   'Calidad de la relación supervisor-subordinado: retroalimentación, accesibilidad, integridad y apoyo al desarrollo. Base teórica: LMX-7 (Graen & Uhl-Bien, 1995), Servant Leadership (Liden, 2008).', 1),

  ('c1000001-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Justicia Organizacional', 'JUS',
   'Equidad percibida en compensación, procesos de decisión, trato interpersonal y oportunidades. Base teórica: Organizational Justice Scale (Colquitt, 2001).', 2),

  ('c1000001-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Sentido de Pertenencia', 'PER',
   'Orgullo organizacional, identificación con valores, recomendación y conexión social. Base teórica: Organizational Identification (Mael & Ashforth, 1992), Psychological Ownership (Pierce, 2001).', 3),

  ('c1000001-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'Innovación y Cambio', 'INN',
   'Seguridad para proponer ideas, tolerancia al error, adopción tecnológica y gestión del cambio. Base teórica: Psychological Safety (Edmondson, 1999), Change Readiness (Armenakis, 1993).', 4),

  ('c1000001-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'Bienestar y Equilibrio', 'BIE',
   'Carga manejable, recursos suficientes, equilibrio vida-trabajo y seguridad psicológica. Base teórica: JD-R Model (Bakker & Demerouti, 2007), COPSOQ.', 5),

  ('c1000001-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'Claridad y Desarrollo', 'CLA',
   'Expectativas claras, objetivos medibles, oportunidades de desarrollo y contribución visible. Base teórica: Role Clarity (Rizzo, 1970), Career Growth Opportunity (Kraimer, 2011).', 6),

  ('c1000001-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'Comunicación y Participación', 'COM',
   'Información oportuna, canales bidireccionales, participación en decisiones y transparencia. Base teórica: Organizational Communication (Roberts & O''Reilly, 1974), Voice Behavior (LePine & Van Dyne, 1998).', 7),

  ('c1000001-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   'Engagement y Compromiso', 'ENG',
   'Vigor, dedicación, absorción e intención de permanencia. Variable dependiente para calcular engagement drivers. Base teórica: UWES-9 (Schaufeli, 2006), Organizational Commitment (Allen & Meyer, 1990).', 8);

-- ============================================================
-- Items: LID — Liderazgo y Supervisión (5 ítems, 1 reverso)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001',
   'Mi supervisor me brinda retroalimentación específica que me ayuda a mejorar.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000001',
   'Puedo acudir a mi supervisor cuando necesito apoyo o tengo una dificultad.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000003', 'c1000001-0000-0000-0000-000000000001',
   'Mi supervisor demuestra con sus acciones lo que espera del equipo.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000004', 'c1000001-0000-0000-0000-000000000001',
   'Mi supervisor se interesa genuinamente en mi crecimiento profesional.', false, false, 4),
  ('c1000002-0000-0000-0000-000000000005', 'c1000001-0000-0000-0000-000000000001',
   'Mi supervisor toma decisiones sin considerar el impacto en el equipo.', true, false, 5);

-- ============================================================
-- Items: JUS — Justicia Organizacional (5 ítems, 1 reverso)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000006', 'c1000001-0000-0000-0000-000000000002',
   'Los criterios para evaluar mi desempeño son claros y se aplican de manera consistente.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000007', 'c1000001-0000-0000-0000-000000000002',
   'Las oportunidades de crecimiento están disponibles para todos por igual.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000008', 'c1000001-0000-0000-0000-000000000002',
   'Mi compensación es justa en relación con mis responsabilidades y contribución.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000009', 'c1000001-0000-0000-0000-000000000002',
   'Las decisiones que me afectan se toman considerando mi punto de vista.', false, false, 4),
  ('c1000002-0000-0000-0000-000000000010', 'c1000001-0000-0000-0000-000000000002',
   'Las reglas y políticas se aplican de manera diferente según la persona.', true, false, 5);

-- ============================================================
-- Items: PER — Sentido de Pertenencia (4 ítems, 1 reverso)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000011', 'c1000001-0000-0000-0000-000000000003',
   'Me siento orgulloso de decir que trabajo en esta organización.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000012', 'c1000001-0000-0000-0000-000000000003',
   'Los valores de esta organización coinciden con lo que considero importante.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000013', 'c1000001-0000-0000-0000-000000000003',
   'Siento una conexión genuina con mis compañeros de trabajo.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000014', 'c1000001-0000-0000-0000-000000000003',
   'A veces siento que mi trabajo aquí no tiene un propósito real.', true, false, 4);

-- ============================================================
-- Attention Check 1 (~ítem 12, dentro de PER)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_attention_check, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000015', 'c1000001-0000-0000-0000-000000000003',
   'Para verificar tu atención, selecciona ''De acuerdo'' en esta pregunta.', true, 98);

-- ============================================================
-- Items: INN — Innovación y Cambio (5 ítems, 1 reverso)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000016', 'c1000001-0000-0000-0000-000000000004',
   'Me siento seguro al proponer ideas nuevas, aunque no resulten como se esperaba.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000017', 'c1000001-0000-0000-0000-000000000004',
   'Los errores se tratan como oportunidades de aprendizaje, no como motivo de castigo.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000018', 'c1000001-0000-0000-0000-000000000004',
   'La organización se adapta con agilidad a las nuevas tecnologías y formas de trabajo.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000019', 'c1000001-0000-0000-0000-000000000004',
   'Los cambios en la organización se comunican con suficiente anticipación y claridad.', false, false, 4),
  ('c1000002-0000-0000-0000-000000000020', 'c1000001-0000-0000-0000-000000000004',
   'Las ideas que propongo rara vez reciben atención o seguimiento.', true, false, 5);

-- ============================================================
-- Items: BIE — Bienestar y Equilibrio (4 ítems, 1 reverso)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000021', 'c1000001-0000-0000-0000-000000000005',
   'Mi carga de trabajo me permite cumplir con mis responsabilidades sin estrés excesivo.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000022', 'c1000001-0000-0000-0000-000000000005',
   'Cuento con los recursos y herramientas necesarios para hacer bien mi trabajo.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000023', 'c1000001-0000-0000-0000-000000000005',
   'Puedo mantener un equilibrio saludable entre mi trabajo y mi vida personal.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000024', 'c1000001-0000-0000-0000-000000000005',
   'Frecuentemente me siento agotado emocionalmente por las demandas de mi trabajo.', true, false, 4);

-- ============================================================
-- Items: CLA — Claridad y Desarrollo (4 ítems, 1 reverso)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000025', 'c1000001-0000-0000-0000-000000000006',
   'Tengo claro qué se espera de mí y cómo se mide mi desempeño.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000026', 'c1000001-0000-0000-0000-000000000006',
   'Mis objetivos laborales están bien definidos y son alcanzables.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000027', 'c1000001-0000-0000-0000-000000000006',
   'La organización me ofrece oportunidades reales para desarrollar mis habilidades.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000028', 'c1000001-0000-0000-0000-000000000006',
   'Con frecuencia recibo instrucciones que se contradicen entre sí.', true, false, 4);

-- ============================================================
-- Attention Check 2 (~ítem 25, dentro de CLA)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_attention_check, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000029', 'c1000001-0000-0000-0000-000000000006',
   'Esta es una pregunta de control. Selecciona ''En desacuerdo''.', true, 99);

-- ============================================================
-- Items: COM — Comunicación y Participación (4 ítems, 1 reverso)
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000030', 'c1000001-0000-0000-0000-000000000007',
   'Recibo información oportuna sobre las decisiones y cambios que afectan mi trabajo.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000031', 'c1000001-0000-0000-0000-000000000007',
   'Existen canales efectivos para comunicar mis ideas a la dirección.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000032', 'c1000001-0000-0000-0000-000000000007',
   'Mi opinión se toma en cuenta cuando se toman decisiones que afectan a mi área.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000033', 'c1000001-0000-0000-0000-000000000007',
   'Me entero de cambios importantes por rumores antes que por comunicación oficial.', true, false, 4);

-- ============================================================
-- Items: ENG — Engagement y Compromiso (4 ítems, 1 reverso)
-- Variable dependiente para calcular engagement drivers
-- ============================================================
INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, sort_order) VALUES
  ('c1000002-0000-0000-0000-000000000034', 'c1000001-0000-0000-0000-000000000008',
   'Me siento entusiasmado y con energía al realizar mi trabajo diario.', false, true, 1),
  ('c1000002-0000-0000-0000-000000000035', 'c1000001-0000-0000-0000-000000000008',
   'Estoy dedicado a hacer mi trabajo lo mejor posible.', false, false, 2),
  ('c1000002-0000-0000-0000-000000000036', 'c1000001-0000-0000-0000-000000000008',
   'Me visualizo trabajando en esta organización a largo plazo.', false, false, 3),
  ('c1000002-0000-0000-0000-000000000037', 'c1000001-0000-0000-0000-000000000008',
   'A menudo pienso en buscar oportunidades laborales fuera de esta organización.', true, false, 4);

-- ============================================================
-- Seed: ClimaLab Pulso v2.0 (pulse instrument — 1 anchor per dimension)
-- ============================================================

INSERT INTO instruments (id, name, slug, description, mode, target_size, version)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'ClimaLab Pulso',
  'climalab-pulso',
  'Versión rápida con 1 ítem ancla por dimensión (8 ítems). Ideal para seguimiento frecuente entre mediciones completas.',
  'pulse',
  'all',
  '2.0'
);

-- 8 Dimensions for ClimaLab Pulso
INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order) VALUES
  ('c1000003-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
   'Liderazgo y Supervisión', 'LID',
   'Calidad de la relación supervisor-subordinado.', 1),
  ('c1000003-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'Justicia Organizacional', 'JUS',
   'Equidad percibida en procesos y trato.', 2),
  ('c1000003-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
   'Sentido de Pertenencia', 'PER',
   'Orgullo e identificación organizacional.', 3),
  ('c1000003-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002',
   'Innovación y Cambio', 'INN',
   'Apertura a nuevas ideas y gestión del cambio.', 4),
  ('c1000003-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002',
   'Bienestar y Equilibrio', 'BIE',
   'Carga manejable y equilibrio vida-trabajo.', 5),
  ('c1000003-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002',
   'Claridad y Desarrollo', 'CLA',
   'Expectativas claras y oportunidades de crecimiento.', 6),
  ('c1000003-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002',
   'Comunicación y Participación', 'COM',
   'Información oportuna y participación en decisiones.', 7),
  ('c1000003-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002',
   'Engagement y Compromiso', 'ENG',
   'Vigor, dedicación y compromiso organizacional.', 8);

-- Anchor items for ClimaLab Pulso (1 per dimension, same text as Core anchors)
INSERT INTO items (id, dimension_id, text, is_anchor, sort_order) VALUES
  ('c1000004-0000-0000-0000-000000000001', 'c1000003-0000-0000-0000-000000000001',
   'Mi supervisor me brinda retroalimentación específica que me ayuda a mejorar.', true, 1),
  ('c1000004-0000-0000-0000-000000000002', 'c1000003-0000-0000-0000-000000000002',
   'Los criterios para evaluar mi desempeño son claros y se aplican de manera consistente.', true, 1),
  ('c1000004-0000-0000-0000-000000000003', 'c1000003-0000-0000-0000-000000000003',
   'Me siento orgulloso de decir que trabajo en esta organización.', true, 1),
  ('c1000004-0000-0000-0000-000000000004', 'c1000003-0000-0000-0000-000000000004',
   'Me siento seguro al proponer ideas nuevas, aunque no resulten como se esperaba.', true, 1),
  ('c1000004-0000-0000-0000-000000000005', 'c1000003-0000-0000-0000-000000000005',
   'Mi carga de trabajo me permite cumplir con mis responsabilidades sin estrés excesivo.', true, 1),
  ('c1000004-0000-0000-0000-000000000006', 'c1000003-0000-0000-0000-000000000006',
   'Tengo claro qué se espera de mí y cómo se mide mi desempeño.', true, 1),
  ('c1000004-0000-0000-0000-000000000007', 'c1000003-0000-0000-0000-000000000007',
   'Recibo información oportuna sobre las decisiones y cambios que afectan mi trabajo.', true, 1),
  ('c1000004-0000-0000-0000-000000000008', 'c1000003-0000-0000-0000-000000000008',
   'Me siento entusiasmado y con energía al realizar mi trabajo diario.', true, 1);
