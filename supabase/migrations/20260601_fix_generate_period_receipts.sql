-- ============================================================================
-- CURIMANA ELECTRICA - Migracion: fix generate_period_receipts
-- Fecha: 2026-06-01
-- Descripcion:
--   1. Elimina referencia a columna inexistente tariff_id en INSERT
--   2. Cambia retorno de void a TABLE(generated_count INT, skipped_count INT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_period_receipts(
  p_period_id UUID,
  p_receipts JSONB
)
RETURNS TABLE(generated_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de administrador';
  END IF;

  INSERT INTO receipts (
    id, customer_id, billing_period_id,
    previous_reading, current_reading, consumption_kwh,
    energy_amount, fixed_charges, subtotal,
    previous_debt, total_amount, status, issue_date, due_date,
    period_start, period_end, reading_id
  )
  SELECT
    (r->>'id')::UUID,
    (r->>'customer_id')::UUID,
    (r->>'billing_period_id')::UUID,
    (r->>'previous_reading')::INTEGER,
    (r->>'current_reading')::INTEGER,
    (r->>'consumption_kwh')::INTEGER,
    (r->>'energy_amount')::NUMERIC,
    (r->>'fixed_charges')::NUMERIC,
    (r->>'subtotal')::NUMERIC,
    (r->>'previous_debt')::NUMERIC,
    (r->>'total_amount')::NUMERIC,
    (r->>'status')::TEXT,
    (r->>'issue_date')::DATE,
    (r->>'due_date')::DATE,
    (r->>'period_start')::DATE,
    (r->>'period_end')::DATE,
    (r->>'reading_id')::UUID
  FROM jsonb_array_elements(p_receipts) AS r;

  RETURN QUERY SELECT
    (SELECT count(*)::INTEGER FROM receipts WHERE billing_period_id = p_period_id),
    0::INTEGER;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_period_receipts(UUID, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_period_receipts(UUID, JSONB) TO authenticated;
