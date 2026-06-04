-- ============================================================================
-- CURIMANA ELECTRICA - Migracion: FOR UPDATE on RPC SELECTs + UNIQUE constraints
-- Fecha: 2026-05-06
-- Descripcion:
--   1. process_payment/void_payment: SELECT ... FOR UPDATE to prevent concurrent races
--   2. UNIQUE on receipts(customer_id, billing_period_id) to prevent duplicates
--   3. UNIQUE on readings(customer_id, billing_period_id) to prevent duplicates
--   4. Storage bucket reading-photos: restrict public access
-- ============================================================================

-- 1. Rewrite process_payment with FOR UPDATE
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
  FROM receipts WHERE id = p_receipt_id FOR UPDATE;

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

  IF NOT EXISTS (SELECT 1 FROM cash_closures WHERE id = p_cash_closure_id AND status = 'open' FOR UPDATE) THEN
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

-- 2. Rewrite void_payment with FOR UPDATE
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
  FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado';
  END IF;

  IF v_payment.status = 'voided' THEN
    RAISE EXCEPTION 'El pago ya esta anulado';
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

-- 3. Unique constraint on receipts(customer_id, billing_period_id)
-- Skip if duplicates exist (generate_period_receipts already handles per-row exceptions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipts_customer_period_unique'
  ) THEN
    ALTER TABLE receipts ADD CONSTRAINT receipts_customer_period_unique
      UNIQUE (customer_id, billing_period_id);
  END IF;
END $$;

-- 4. Unique constraint on readings(customer_id, billing_period_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'readings_customer_period_unique'
  ) THEN
    ALTER TABLE readings ADD CONSTRAINT readings_customer_period_unique
      UNIQUE (customer_id, billing_period_id);
  END IF;
END $$;

-- 5. Storage: restrict reading-photos bucket to authenticated users only
-- Remove any existing public policy, add authenticated-only policy
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reading-photos', 'reading-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS reading_photos_public_select ON storage.objects;
  DROP POLICY IF EXISTS reading_photos_authenticated_select ON storage.objects;
  DROP POLICY IF EXISTS reading_photos_authenticated_insert ON storage.objects;
END $$;

-- Allow authenticated users to read photos
CREATE POLICY reading_photos_authenticated_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reading-photos');

-- Allow authenticated users to upload photos
CREATE POLICY reading_photos_authenticated_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reading-photos');
