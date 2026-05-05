-- ============================================================================
-- CURIMANA ELÉCTRICA - Migración: Cash-only payments
-- Fecha: 2026-05-05
-- Descripción: Restringe método de pago a solo efectivo
-- ============================================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method = 'cash');

ALTER TABLE payments ALTER COLUMN method SET DEFAULT 'cash';
