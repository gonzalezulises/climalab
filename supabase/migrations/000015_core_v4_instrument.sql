-- ============================================================
-- ClimaLab Core v4.0 — Instrument Redesign
-- Adds 3 new dimensions (ROL, DEM, APR), 26 new items to
-- existing + new dimensions, Pulso v4.0 anchors, and
-- 3 optional module instruments.
--
-- NOTE: Wrapped in conditional block because seed.sql already
-- contains v4.0 data. This migration only executes on production
-- where v3.0 instruments already exist. On `db reset`, seed.sql
-- provides all data directly.
-- ============================================================

DO $$ BEGIN

-- Only run if Core instrument exists (production) and is not yet v4.0
IF EXISTS (SELECT 1 FROM instruments WHERE id = 'b0000000-0000-0000-0000-000000000001' AND version = '3.0') THEN

  -- 1. Update Core instrument to v4.0
  UPDATE instruments
  SET version = '4.0',
      description = 'Instrumento completo de medición de clima organizacional. 21 dimensiones en 4 categorías + Engagement, ~105 ítems + 2 verificaciones de atención. Diseño basado en evidencia psicométrica.'
  WHERE id = 'b0000000-0000-0000-0000-000000000001';

  -- 2. Update Pulso instrument to v4.0
  UPDATE instruments
  SET version = '4.0',
      description = 'Instrumento de pulso para seguimiento frecuente. 1 ítem ancla por dimensión = 21 ítems.'
  WHERE id = 'b0000000-0000-0000-0000-000000000002';

  -- 3. New Core dimensions (ROL, DEM, APR)
  INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order, category, theoretical_basis) VALUES
  ('d3000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000001',
   'Claridad de Rol', 'ROL',
   'Claridad sobre responsabilidades, expectativas y contribución estratégica del puesto.', 19,
   'liderazgo', 'Role Clarity (Rizzo 1970), Role Ambiguity & Conflict'),
  ('d3000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000001',
   'Demandas Laborales', 'DEM',
   'Carga de trabajo, presión de plazos y adecuación de procesos y recursos.', 20,
   'bienestar', 'JD-R Model (Bakker & Demerouti 2007), Job Demands'),
  ('d3000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000001',
   'Aprendizaje Organizacional', 'APR',
   'Aprendizaje de errores, compartir conocimiento, mejora continua de procesos.', 21,
   'cultura', 'Organizational Learning (Senge 1990), Learning Organization (Garvin 1993)');

  -- 4. New Core items — Extensions to existing dimensions

  -- LID extensions (sorts 82-84)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000082', 'd3000000-0000-0000-0000-000000000006',
   'Mi supervisor organiza y coordina el trabajo del equipo de manera eficaz.', false, false, false, 82),
  ('e3000000-0000-0000-0000-000000000083', 'd3000000-0000-0000-0000-000000000006',
   'Mi supervisor cumple los compromisos que adquiere con el equipo.', false, false, false, 83),
  ('e3000000-0000-0000-0000-000000000084', 'd3000000-0000-0000-0000-000000000006',
   'Mi supervisor nos involucra en las decisiones que afectan nuestro trabajo.', false, false, false, 84);

  -- SEG extension (sort 85)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000085', 'd3000000-0000-0000-0000-000000000003',
   'Las instalaciones y el entorno físico facilitan un buen ambiente de trabajo.', false, false, false, 85);

  -- CUI extension (sort 86)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000086', 'd3000000-0000-0000-0000-000000000005',
   'Confío en la honestidad y buenas intenciones de mis compañeros de trabajo.', false, false, false, 86);

  -- COM extension (sort 87)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000087', 'd3000000-0000-0000-0000-000000000008',
   'En esta organización, dar y recibir retroalimentación constructiva es algo normal y valorado.', false, false, false, 87);

  -- EQA extensions (sorts 88-90)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000088', 'd3000000-0000-0000-0000-000000000013',
   'Todas las personas son tratadas con respeto independientemente de su nivel jerárquico.', false, false, false, 88),
  ('e3000000-0000-0000-0000-000000000089', 'd3000000-0000-0000-0000-000000000013',
   'Si considero que he sido tratado/a injustamente, confío en que existe un proceso justo para ser escuchado/a.', false, false, false, 89),
  ('e3000000-0000-0000-0000-000000000090', 'd3000000-0000-0000-0000-000000000013',
   'En general, las oportunidades y recompensas se distribuyen de forma justa en relación con el aporte de cada persona.', false, false, false, 90);

  -- COH extensions (sorts 91-92)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000091', 'd3000000-0000-0000-0000-000000000014',
   'Cuando alguien se integra al equipo, nos aseguramos de que se sienta bienvenido/a y apoyado/a.', false, false, false, 91),
  ('e3000000-0000-0000-0000-000000000092', 'd3000000-0000-0000-0000-000000000014',
   'En esta organización celebramos los logros y momentos especiales como equipo.', false, false, false, 92);

  -- INN extension (sort 93)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000093', 'd3000000-0000-0000-0000-000000000015',
   'En mi equipo, expresar una opinión diferente a la mayoría es visto como una contribución valiosa.', false, false, false, 93);

  -- PRO extension (sort 94)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000094', 'd3000000-0000-0000-0000-000000000002',
   'Siento que mi trabajo contribuye positivamente a la vida de otras personas o a la comunidad.', false, false, false, 94);

  -- ENG extension (sort 95)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000095', 'd3000000-0000-0000-0000-000000000018',
   'Resulta estimulante y desafiante trabajar en esta organización.', false, false, false, 95);

  -- 5. ROL items (sorts 96-99)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000096', 'd3000000-0000-0000-0000-000000000019',
   'Tengo claridad sobre mis responsabilidades y los límites de mi rol.', false, true, false, 96),
  ('e3000000-0000-0000-0000-000000000097', 'd3000000-0000-0000-0000-000000000019',
   'Sé exactamente lo que se espera de mí en mi puesto de trabajo.', false, false, false, 97),
  ('e3000000-0000-0000-0000-000000000098', 'd3000000-0000-0000-0000-000000000019',
   'Comprendo cómo mi área contribuye a la dirección estratégica de la organización.', false, false, false, 98),
  ('e3000000-0000-0000-0000-000000000099', 'd3000000-0000-0000-0000-000000000019',
   'Las expectativas sobre mi desempeño son confusas o contradictorias.', true, false, false, 99);

  -- 6. DEM items (sorts 100-103)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000100', 'd3000000-0000-0000-0000-000000000020',
   'Mi carga de trabajo es manejable y razonable.', false, true, false, 100),
  ('e3000000-0000-0000-0000-000000000101', 'd3000000-0000-0000-0000-000000000020',
   'Los procesos y sistemas de la organización facilitan mi trabajo en lugar de obstaculizarlo.', false, false, false, 101),
  ('e3000000-0000-0000-0000-000000000102', 'd3000000-0000-0000-0000-000000000020',
   'La presión por cumplir plazos en mi puesto es excesiva.', true, false, false, 102),
  ('e3000000-0000-0000-0000-000000000103', 'd3000000-0000-0000-0000-000000000020',
   'Frecuentemente debo realizar tareas que no corresponden a mi rol por falta de personal o recursos.', true, false, false, 103);

  -- 7. APR items (sorts 104-107)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000104', 'd3000000-0000-0000-0000-000000000021',
   'En esta organización aprendemos de nuestros errores y aplicamos esas lecciones para mejorar.', false, true, false, 104),
  ('e3000000-0000-0000-0000-000000000105', 'd3000000-0000-0000-0000-000000000021',
   'El conocimiento y las mejores prácticas se comparten efectivamente entre equipos.', false, false, false, 105),
  ('e3000000-0000-0000-0000-000000000106', 'd3000000-0000-0000-0000-000000000021',
   'La organización invierte en la mejora continua de sus procesos y prácticas.', false, false, false, 106),
  ('e3000000-0000-0000-0000-000000000107', 'd3000000-0000-0000-0000-000000000021',
   'Los errores se ocultan en lugar de usarse como oportunidades de mejora.', true, false, false, 107);

  -- 8. New Pulso dimensions (ROL, DEM, APR)
  INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order, category, theoretical_basis) VALUES
  ('d4000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000002', 'Claridad de Rol', 'ROL', 'Pulso: Claridad de Rol', 19, 'liderazgo', 'Rizzo 1970'),
  ('d4000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000002', 'Demandas Laborales', 'DEM', 'Pulso: Demandas Laborales', 20, 'bienestar', 'JD-R Model'),
  ('d4000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000002', 'Aprendizaje Organizacional', 'APR', 'Pulso: Aprendizaje Organizacional', 21, 'cultura', 'Senge 1990');

  -- 9. New Pulso anchor items (ROL, DEM, APR)
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e4000000-0000-0000-0000-000000000019', 'd4000000-0000-0000-0000-000000000019', 'Tengo claridad sobre mis responsabilidades y los límites de mi rol.', false, true, false, 19),
  ('e4000000-0000-0000-0000-000000000020', 'd4000000-0000-0000-0000-000000000020', 'Mi carga de trabajo es manejable y razonable.', false, true, false, 20),
  ('e4000000-0000-0000-0000-000000000021', 'd4000000-0000-0000-0000-000000000021', 'En esta organización aprendemos de nuestros errores y aplicamos esas lecciones para mejorar.', false, true, false, 21);

END IF;

-- 10-12. Optional modules (always create if not existing)

-- Module: Gestión del Cambio
IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = 'b0000000-0000-0000-0000-000000000003') THEN
  INSERT INTO instruments (id, name, slug, description, mode, target_size, version)
  VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'Módulo: Gestión del Cambio',
    'modulo-gestion-cambio',
    'Módulo opcional de 8 ítems para evaluar la disposición y actitud frente al cambio organizacional.',
    'full', 'all', '1.0'
  );

  INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order, category, theoretical_basis) VALUES
  ('d5000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'Gestión del Cambio', 'CAM',
   'Disposición, actitud y proactividad frente al cambio organizacional.', 1,
   NULL, 'Change Readiness (Armenakis 1993), Resistance to Change (Oreg 2003)');

  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e5000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001',
   'Frente a los procesos de cambio, tengo ciertas resistencias cuando se trata de aprender nuevas formas de trabajo.', true, false, false, 1),
  ('e5000000-0000-0000-0000-000000000002', 'd5000000-0000-0000-0000-000000000001',
   'Frente a los cambios organizacionales, no me siento del todo cómodo/a.', true, false, false, 2),
  ('e5000000-0000-0000-0000-000000000003', 'd5000000-0000-0000-0000-000000000001',
   'Prefiero seguir las instrucciones establecidas en lugar de participar activamente en los procesos de cambio.', true, false, false, 3),
  ('e5000000-0000-0000-0000-000000000004', 'd5000000-0000-0000-0000-000000000001',
   'Me siento cómodo/a manteniendo una postura neutral frente a los nuevos cambios que se presentan.', true, false, false, 4),
  ('e5000000-0000-0000-0000-000000000005', 'd5000000-0000-0000-0000-000000000001',
   'Me gustan los nuevos desafíos y siempre busco comprometerme desde mi rol para aportar al cambio organizacional.', false, true, false, 5),
  ('e5000000-0000-0000-0000-000000000006', 'd5000000-0000-0000-0000-000000000001',
   'Considero que soy proactivo/a frente a los cambios y procuro exponer mi punto de vista e iniciativas.', false, false, false, 6),
  ('e5000000-0000-0000-0000-000000000007', 'd5000000-0000-0000-0000-000000000001',
   'Mis mayores fortalezas aparecen cuando me toca liderar el cambio.', false, false, false, 7),
  ('e5000000-0000-0000-0000-000000000008', 'd5000000-0000-0000-0000-000000000001',
   'Tengo claridad sobre los beneficios del cambio y me motiva acompañar a mis colegas en este camino.', false, false, false, 8);
END IF;

-- Module: Orientación al Cliente
IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = 'b0000000-0000-0000-0000-000000000004') THEN
  INSERT INTO instruments (id, name, slug, description, mode, target_size, version)
  VALUES (
    'b0000000-0000-0000-0000-000000000004',
    'Módulo: Orientación al Cliente',
    'modulo-orientacion-cliente',
    'Módulo opcional de 4 ítems para evaluar el enfoque y compromiso organizacional con el cliente.',
    'full', 'all', '1.0'
  );

  INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order, category, theoretical_basis) VALUES
  ('d5000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004',
   'Orientación al Cliente', 'CLI',
   'Enfoque estratégico, compromiso y cultura centrada en el cliente.', 1,
   NULL, 'Customer Orientation (Narver & Slater 1990), Service Climate (Schneider 1998)');

  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e5000000-0000-0000-0000-000000000009', 'd5000000-0000-0000-0000-000000000002',
   'La organización demuestra un enfoque claro y estratégico para mejorar la experiencia de sus clientes.', false, true, false, 1),
  ('e5000000-0000-0000-0000-000000000010', 'd5000000-0000-0000-0000-000000000002',
   'El compromiso con la resolución efectiva de los problemas de los clientes es claro y compartido por todas las áreas.', false, false, false, 2),
  ('e5000000-0000-0000-0000-000000000011', 'd5000000-0000-0000-0000-000000000002',
   'Las decisiones que toma la organización reflejan una comprensión profunda de las necesidades del cliente.', false, false, false, 3),
  ('e5000000-0000-0000-0000-000000000012', 'd5000000-0000-0000-0000-000000000002',
   'La organización pone al cliente en el centro de sus estrategias y procesos.', false, false, false, 4);
END IF;

-- Module: Preparación Digital
IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = 'b0000000-0000-0000-0000-000000000005') THEN
  INSERT INTO instruments (id, name, slug, description, mode, target_size, version)
  VALUES (
    'b0000000-0000-0000-0000-000000000005',
    'Módulo: Preparación Digital',
    'modulo-preparacion-digital',
    'Módulo opcional de 4 ítems para evaluar la preparación y adopción tecnológica de la organización.',
    'full', 'all', '1.0'
  );

  INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order, category, theoretical_basis) VALUES
  ('d5000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005',
   'Preparación Digital', 'DIG',
   'Comprensión, capacitación y adopción de nuevas tecnologías.', 1,
   NULL, 'Technology Acceptance Model (Davis 1989), Digital Readiness (Parasuraman 2000)');

  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e5000000-0000-0000-0000-000000000013', 'd5000000-0000-0000-0000-000000000003',
   'Comprendo cómo las nuevas tecnologías pueden mejorar mi trabajo diario en mi área.', false, true, false, 1),
  ('e5000000-0000-0000-0000-000000000014', 'd5000000-0000-0000-0000-000000000003',
   'La organización me ha proporcionado información y capacitación sobre el impacto de las nuevas tecnologías.', false, false, false, 2),
  ('e5000000-0000-0000-0000-000000000015', 'd5000000-0000-0000-0000-000000000003',
   'Me siento entusiasmado/a con las herramientas tecnológicas que la organización implementa.', false, false, false, 3),
  ('e5000000-0000-0000-0000-000000000016', 'd5000000-0000-0000-0000-000000000003',
   'La organización invierte adecuadamente en tecnología que facilita nuestro trabajo.', false, false, false, 4);
END IF;

END $$;
