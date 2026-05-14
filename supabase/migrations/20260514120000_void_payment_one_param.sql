-- ============================================================================
-- CURIMANA ELECTRICA - Migracion: void_payment 1 parametro + role check
-- Fecha: 2026-05-14
-- Descripcion:
-- 1. void_payment: firma de 1 parametro (p_payment_id), usa auth.uid() para rol
-- 2. Alinea schema.sql con el codigo TypeScript
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_payment(
  p_payment_id UUID
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
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  IF v_user_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Permiso denegado: solo administradores o cajeros pueden anular pagos';
  END IF;

  SELECT id, receipt_id, amount, status INTO v_payment
  FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado (id: %)', p_payment_id;
  END IF;

  IF v_payment.status = 'voided' THEN
    RAISE EXCEPTION 'El pago ya esta anulado (id: %)', p_payment_id;
  END IF;

  UPDATE payments SET status = 'voided', voided_at = now()
  WHERE id = p_payment_id;

  SELECT id, paid_amount, total_amount, status, customer_id INTO v_receipt
  FROM receipts WHERE id = v_payment.receipt_id FOR UPDATE;

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

REVOKE ALL ON FUNCTION public.void_payment(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.void_payment(UUID) TO authenticated;
