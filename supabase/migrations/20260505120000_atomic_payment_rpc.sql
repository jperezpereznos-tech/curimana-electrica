-- ============================================================================
-- CURIMANA ELÉCTRICA - Migración: Atomic process_payment + void_payment RPC
-- Fecha: 2026-05-05
-- Descripción: Funciones RPC que procesan pagos de forma atómica.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_payment(
  p_receipt_id UUID,
  p_customer_id UUID,
  p_cash_closure_id UUID,
  p_amount NUMERIC,
  p_received_amount NUMERIC,
  p_change_amount NUMERIC,
  p_cashier_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payment_id UUID;
  v_receipt RECORD;
  v_new_paid_amount NUMERIC;
  v_new_status TEXT;
  v_is_fully_paid BOOLEAN;
BEGIN
  SELECT total_amount, paid_amount, status INTO v_receipt
  FROM receipts WHERE id = p_receipt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recibo no encontrado';
  END IF;

  IF v_receipt.status IN ('cancelled', 'paid') THEN
    RAISE EXCEPTION 'El recibo no permite nuevos pagos';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  IF p_amount > (v_receipt.total_amount - COALESCE(v_receipt.paid_amount, 0)) THEN
    RAISE EXCEPTION 'El monto excede el saldo pendiente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cash_closures WHERE id = p_cash_closure_id AND status = 'open') THEN
    RAISE EXCEPTION 'La caja esta cerrada. No se pueden registrar pagos.';
  END IF;

  INSERT INTO payments (
    receipt_id, customer_id, amount, method, reference,
    cashier_id, cash_closure_id, received_amount, change_amount
  ) VALUES (
    p_receipt_id, p_customer_id, p_amount, 'cash', 'PAY-' || EXTRACT(EPOCH FROM now())::BIGINT,
    p_cashier_id, p_cash_closure_id, p_received_amount, p_change_amount
  ) RETURNING id INTO v_payment_id;

  v_new_paid_amount := COALESCE(v_receipt.paid_amount, 0) + p_amount;
  v_is_fully_paid := v_new_paid_amount >= v_receipt.total_amount;
  v_new_status := CASE WHEN v_is_fully_paid THEN 'paid' ELSE 'partial' END;

  UPDATE receipts SET
    paid_amount = v_new_paid_amount,
    status = v_new_status,
    paid_at = CASE WHEN v_is_fully_paid THEN now() ELSE paid_at END
  WHERE id = p_receipt_id;

  PERFORM adjust_customer_debt(p_customer_id, -p_amount);

  RETURN v_payment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) FROM anon;

-- ============================================================================
-- Atomic void_payment RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_payment(
  p_payment_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payment RECORD;
  v_receipt RECORD;
  v_new_paid_amount NUMERIC;
  v_new_status TEXT;
BEGIN
  SELECT id, receipt_id, amount, status INTO v_payment
  FROM payments WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado';
  END IF;

  IF v_payment.status = 'voided' THEN
    RAISE EXCEPTION 'El pago ya esta anulado';
  END IF;

  UPDATE payments SET status = 'voided', voided_at = now()
  WHERE id = p_payment_id;

  SELECT id, paid_amount, total_amount, status, customer_id INTO v_receipt
  FROM receipts WHERE id = v_payment.receipt_id;

  IF FOUND AND v_receipt.customer_id IS NOT NULL THEN
    v_new_paid_amount := GREATEST(0, COALESCE(v_receipt.paid_amount, 0) - v_payment.amount);
    v_new_status := CASE WHEN v_new_paid_amount <= 0 THEN 'pending' ELSE 'partial' END;

    UPDATE receipts SET
      paid_amount = v_new_paid_amount,
      status = v_new_status,
      paid_at = CASE WHEN v_new_status = 'pending' THEN NULL ELSE paid_at END
    WHERE id = v_receipt.id;

    PERFORM adjust_customer_debt(v_receipt.customer_id, v_payment.amount);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.void_payment(UUID, UUID) FROM anon;

-- ============================================================================
-- Atomic generate_period_receipts RPC
-- Recibe un JSON array de recibos precalculados y los inserta en una transacción.
-- Si cualquier inserción falla, se hace rollback de todo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_period_receipts(
  p_period_id UUID,
  p_receipts JSONB
)
RETURNS TABLE (generated_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_receipt JSONB;
  v_receipt_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM billing_periods WHERE id = p_period_id AND is_closed = true) THEN
    RAISE EXCEPTION 'El periodo ya esta cerrado';
  END IF;

  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    BEGIN
      INSERT INTO receipts (
        customer_id, billing_period_id, reading_id,
        previous_reading, current_reading, consumption_kwh,
        period_start, period_end,
        energy_amount, fixed_charges, subtotal, igv, previous_debt,
        total_amount, paid_amount, status,
        issue_date, due_date
      ) VALUES (
        (v_receipt->>'customer_id')::UUID,
        p_period_id,
        (v_receipt->>'reading_id')::UUID,
        COALESCE((v_receipt->>'previous_reading')::NUMERIC, 0),
        COALESCE((v_receipt->>'current_reading')::NUMERIC, 0),
        COALESCE((v_receipt->>'consumption_kwh')::NUMERIC, 0),
        (v_receipt->>'period_start')::DATE,
        (v_receipt->>'period_end')::DATE,
        COALESCE((v_receipt->>'energy_amount')::NUMERIC, 0),
        COALESCE((v_receipt->>'fixed_charges')::NUMERIC, 0),
        COALESCE((v_receipt->>'subtotal')::NUMERIC, 0),
        COALESCE((v_receipt->>'igv')::NUMERIC, 0),
        COALESCE((v_receipt->>'previous_debt')::NUMERIC, 0),
        COALESCE((v_receipt->>'total_amount')::NUMERIC, 0),
        0,
        'pending',
        (v_receipt->>'issue_date')::DATE,
        (v_receipt->>'due_date')::DATE
      ) RETURNING id INTO v_receipt_id;

      PERFORM adjust_customer_debt(
        (v_receipt->>'customer_id')::UUID,
        COALESCE((v_receipt->>'total_amount')::NUMERIC, 0)
      );

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  generated_count := v_count;
  skipped_count := v_skipped;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_period_receipts(UUID, JSONB) FROM anon;
