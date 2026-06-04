-- ============================================================================
-- CURIMANA ELECTRICA - Migracion: atomic close_period_full RPC
-- Fecha: 2026-06-01
-- Descripcion:
--   closePeriod era 2 RPCs separados (generate_period_receipts +
--   close_billing_period). Si el segundo fallaba, el rollback era
--   incompleto. Esta funcion atomica genera recibos y cierra el periodo
--   en una sola transaccion DB.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.close_period_full(
  p_period_id UUID,
  p_receipts JSONB
)
RETURNS TABLE(generated_count INTEGER, skipped_count INTEGER, period_closed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_is_closed BOOLEAN;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de administrador';
  END IF;

  SELECT is_closed INTO v_is_closed FROM billing_periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periodo no encontrado (id: %)', p_period_id;
  END IF;
  IF v_is_closed THEN
    RAISE EXCEPTION 'El periodo ya esta cerrado (id: %)', p_period_id;
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

  UPDATE billing_periods SET is_closed = true, closed_at = now() WHERE id = p_period_id;

  RETURN QUERY SELECT
    (SELECT count(*)::INTEGER FROM receipts WHERE billing_period_id = p_period_id),
    0::INTEGER,
    true;
END;
$$;

REVOKE ALL ON FUNCTION public.close_period_full(UUID, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.close_period_full(UUID, JSONB) TO authenticated;
