-- ============================================================
-- Fix ClimaLab Core v4.0 instrument description
-- Corrects the item count stated in the description text.
-- Actual inserted items: 107 regular + 2 attention checks = 109.
-- Previous description (set in 000016) said "~109 ítems + 2 verificaciones".
-- ============================================================

UPDATE instruments
SET description = 'Instrumento completo de medición de clima organizacional. 22 dimensiones en 4 categorías + Engagement, 107 ítems + 2 verificaciones de atención. Diseño basado en evidencia psicométrica.'
WHERE id = 'b0000000-0000-0000-0000-000000000001';
