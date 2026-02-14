-- ============================================================
-- ClimaLab Core v4.0 — Instrument Corrections
-- 6 psychometric corrections based on post-launch evaluation.
-- Wrapped in conditional block for idempotency.
-- ============================================================

DO $$ BEGIN

-- Only run if Core instrument is v4.0 and NDI dimension doesn't exist yet
IF EXISTS (SELECT 1 FROM instruments WHERE id = 'b0000000-0000-0000-0000-000000000001' AND version = '4.0')
   AND NOT EXISTS (SELECT 1 FROM dimensions WHERE id = 'd3000000-0000-0000-0000-000000000022')
THEN

  -- ==========================================================
  -- Correction 1: Desaggregate EQA → EQA (6) + NDI (6)
  -- ==========================================================

  -- 1a. Update EQA description
  UPDATE dimensions SET description = 'Transparencia en promociones, justicia procedimental y distributiva en oportunidades.'
  WHERE id = 'd3000000-0000-0000-0000-000000000013';

  -- 1b. Create NDI dimension in Core
  INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order, category, theoretical_basis) VALUES
  ('d3000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000001',
   'No Discriminación', 'NDI',
   'Trato equitativo independientemente de características personales: edad, raza, género, orientación sexual y condición socioeconómica.', 22,
   'compensacion', 'Interactional Justice (Colquitt 2001), Equal Employment Opportunity');

  -- 1c. Move items 54-58 to NDI and reformulate
  UPDATE items SET
    dimension_id = 'd3000000-0000-0000-0000-000000000022',
    text = 'Las personas son tratadas con justicia independientemente de su edad.',
    is_anchor = true
  WHERE id = 'e3000000-0000-0000-0000-000000000054';

  UPDATE items SET
    dimension_id = 'd3000000-0000-0000-0000-000000000022',
    text = 'Las personas son tratadas con justicia independientemente de su raza o etnia.'
  WHERE id = 'e3000000-0000-0000-0000-000000000055';

  UPDATE items SET
    dimension_id = 'd3000000-0000-0000-0000-000000000022',
    text = 'Las personas son tratadas con justicia independientemente de su género.'
  WHERE id = 'e3000000-0000-0000-0000-000000000056';

  UPDATE items SET
    dimension_id = 'd3000000-0000-0000-0000-000000000022',
    text = 'Las personas son tratadas con justicia independientemente de su orientación sexual.'
  WHERE id = 'e3000000-0000-0000-0000-000000000057';

  UPDATE items SET
    dimension_id = 'd3000000-0000-0000-0000-000000000022',
    text = 'Las personas son tratadas con justicia independientemente de su condición socioeconómica.'
  WHERE id = 'e3000000-0000-0000-0000-000000000058';

  -- 1d. Add NDI reverse item
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000110', 'd3000000-0000-0000-0000-000000000022',
   'He presenciado situaciones en las que alguien fue tratado de forma diferente por sus características personales.', true, false, false, 110);

  -- 1e. Move item 88 from EQA to CON
  UPDATE items SET dimension_id = 'd3000000-0000-0000-0000-000000000009'
  WHERE id = 'e3000000-0000-0000-0000-000000000088';

  -- 1f. Create NDI in Pulso
  INSERT INTO dimensions (id, instrument_id, name, code, description, sort_order, category, theoretical_basis) VALUES
  ('d4000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000002',
   'No Discriminación', 'NDI', 'Pulso: No Discriminación', 22, 'compensacion', 'Colquitt 2001');

  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e4000000-0000-0000-0000-000000000022', 'd4000000-0000-0000-0000-000000000022',
   'Las personas son tratadas con justicia independientemente de su edad.', false, true, false, 22);

  -- ==========================================================
  -- Correction 2: Reduce LID from 8 to 6 items
  -- ==========================================================

  -- 2a. Delete item 82 (overlaps with item 23)
  DELETE FROM items WHERE id = 'e3000000-0000-0000-0000-000000000082';

  -- 2b. Move item 84 from LID to AUT
  UPDATE items SET dimension_id = 'd3000000-0000-0000-0000-000000000007'
  WHERE id = 'e3000000-0000-0000-0000-000000000084';

  -- ==========================================================
  -- Correction 3: Fix DEM — remove duplicate reverse
  -- ==========================================================

  -- 3a. Move item 103 from DEM to ROL, reformulate as positive
  UPDATE items SET
    dimension_id = 'd3000000-0000-0000-0000-000000000019',
    text = 'Las tareas que realizo corresponden a lo que se espera de mi rol.',
    is_reverse = false
  WHERE id = 'e3000000-0000-0000-0000-000000000103';

  -- 3b. Add new DEM item to maintain 4 items
  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000111', 'd3000000-0000-0000-0000-000000000020',
   'Cuento con el tiempo suficiente para realizar mi trabajo con calidad.', false, false, false, 111);

  -- ==========================================================
  -- Correction 4: Fix SEG double-barreled anchor
  -- ==========================================================

  -- Core anchor
  UPDATE items SET text = 'Me siento seguro/a emocional y psicológicamente en mi lugar de trabajo.'
  WHERE id = 'e3000000-0000-0000-0000-000000000009';

  -- Pulso anchor
  UPDATE items SET text = 'Me siento seguro/a emocional y psicológicamente en mi lugar de trabajo.'
  WHERE dimension_id = 'd4000000-0000-0000-0000-000000000003' AND is_anchor = true;

  -- ==========================================================
  -- Correction 5: Reclassify category liderazgo → direccion
  -- ==========================================================

  UPDATE dimensions SET category = 'direccion'
  WHERE instrument_id = 'b0000000-0000-0000-0000-000000000001'
  AND category = 'liderazgo';

  UPDATE dimensions SET category = 'direccion'
  WHERE instrument_id = 'b0000000-0000-0000-0000-000000000002'
  AND category = 'liderazgo';

  -- ==========================================================
  -- Correction 6: Add client orientation item to RES
  -- ==========================================================

  INSERT INTO items (id, dimension_id, text, is_reverse, is_anchor, is_attention_check, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000112', 'd3000000-0000-0000-0000-000000000016',
   'En esta organización, el compromiso con la satisfacción de nuestros clientes o usuarios es claro y compartido.', false, false, false, 112);

  -- ==========================================================
  -- Update instrument descriptions
  -- ==========================================================

  UPDATE instruments
  SET description = 'Instrumento completo de medición de clima organizacional. 22 dimensiones en 4 categorías + Engagement, ~109 ítems + 2 verificaciones de atención. Diseño basado en evidencia psicométrica.'
  WHERE id = 'b0000000-0000-0000-0000-000000000001';

  UPDATE instruments
  SET description = 'Instrumento de pulso para seguimiento frecuente. 1 ítem ancla por dimensión = 22 ítems.'
  WHERE id = 'b0000000-0000-0000-0000-000000000002';

END IF;

END $$;
