-- ============================================================================
-- MIGRATION: Sync remote DB with local schema.sql changes
-- ============================================================================

-- 1. Create tariff_tier_history table
CREATE TABLE IF NOT EXISTS tariff_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL,
  tariff_id UUID NOT NULL,
  min_kwh NUMERIC NOT NULL,
  max_kwh NUMERIC,
  price_per_kwh NUMERIC NOT NULL,
  order_index INT NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT now() NOT NULL,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tariff_tier_history_tariff_id ON tariff_tier_history(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_tier_history_validity ON tariff_tier_history(valid_from, valid_until);

-- 2. Enable RLS on tariff_tier_history
ALTER TABLE tariff_tier_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read tariff_tier_history" ON tariff_tier_history
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "System insert tariff_tier_history" ON tariff_tier_history
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Admin update tariff_tier_history" ON tariff_tier_history
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Admin delete tariff_tier_history" ON tariff_tier_history
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin');

-- 3. Create trigger function and trigger for tariff_tier_history
CREATE OR REPLACE FUNCTION public.log_tariff_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE tariff_tier_history
    SET valid_until = now()
    WHERE tier_id = OLD.id
    AND valid_until IS NULL;
    RETURN OLD;
  END IF;

  UPDATE tariff_tier_history
  SET valid_until = now()
  WHERE tier_id = NEW.id
  AND valid_until IS NULL;

  INSERT INTO tariff_tier_history (
    tier_id, tariff_id, min_kwh, max_kwh, price_per_kwh, order_index, valid_from, valid_until
  ) VALUES (
    NEW.id, NEW.tariff_id, NEW.min_kwh, NEW.max_kwh, NEW.price_per_kwh, NEW.order_index, now(), NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_tariff_tier_change ON tariff_tiers;
CREATE TRIGGER trg_log_tariff_tier_change
AFTER INSERT OR UPDATE OR DELETE ON tariff_tiers
FOR EACH ROW EXECUTE FUNCTION public.log_tariff_tier_change();

-- 4. Trigger for updated_at on tariff_tier_history
CREATE TRIGGER tariff_tier_history_updated_at BEFORE UPDATE ON tariff_tier_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Update void_payment: add DEFAULT NULL to p_user_id + COALESCE + FOR UPDATE locks
CREATE OR REPLACE FUNCTION public.void_payment(
  p_payment_id UUID,
  p_user_id UUID DEFAULT NULL
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
  v_voiding_user UUID;
BEGIN
  v_voiding_user := COALESCE(p_user_id, auth.uid());

  SELECT role INTO v_user_role FROM profiles WHERE id = v_voiding_user;

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

-- 6. Fix REVOKE/GRANT for void_payment with correct signature
REVOKE EXECUTE ON FUNCTION public.void_payment(UUID, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.void_payment(UUID, UUID) TO authenticated;
