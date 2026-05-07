-- ============================================================================
-- Migration: DB constraints, indexes, RLS policies, ON DELETE, triggers
-- Date: 2026-05-07
-- ============================================================================

-- ============================================================================
-- 1. CHECK CONSTRAINTS
-- ============================================================================

-- connection_type enum on customers
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_connection_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_connection_type_check
  CHECK (connection_type IN ('monofásico', 'trifásico'));

-- connection_type enum on tariffs
ALTER TABLE tariffs DROP CONSTRAINT IF EXISTS tariffs_connection_type_check;
ALTER TABLE tariffs ADD CONSTRAINT tariffs_connection_type_check
  CHECK (connection_type IN ('monofásico', 'trifásico'));

-- amount > 0 on payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_positive;
ALTER TABLE payments ADD CONSTRAINT payments_amount_positive
  CHECK (amount > 0);

-- total_amount >= 0 on receipts
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_total_amount_positive;
ALTER TABLE receipts ADD CONSTRAINT receipts_total_amount_positive
  CHECK (total_amount >= 0);

-- opening_amount >= 0 on cash_closures
ALTER TABLE cash_closures DROP CONSTRAINT IF EXISTS cash_closures_opening_amount_positive;
ALTER TABLE cash_closures ADD CONSTRAINT cash_closures_opening_amount_positive
  CHECK (opening_amount >= 0);

-- energy_amount >= 0 on receipts
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_energy_amount_positive;
ALTER TABLE receipts ADD CONSTRAINT receipts_energy_amount_positive
  CHECK (energy_amount >= 0);

-- consumption >= 0 on readings
ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_consumption_non_negative;
ALTER TABLE readings ADD CONSTRAINT readings_consumption_non_negative
  CHECK (consumption >= 0);

-- current_reading >= 0 on readings
ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_current_reading_non_negative;
ALTER TABLE readings ADD CONSTRAINT readings_current_reading_non_negative
  CHECK (current_reading >= 0);

-- previous_reading >= 0 on readings
ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_previous_reading_non_negative;
ALTER TABLE readings ADD CONSTRAINT readings_previous_reading_non_negative
  CHECK (previous_reading >= 0);

-- ============================================================================
-- 2. MISSING INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_readings_customer_period ON readings(customer_id, billing_period_id);
CREATE INDEX IF NOT EXISTS idx_readings_meter_reader_id ON readings(meter_reader_id);
CREATE INDEX IF NOT EXISTS idx_payments_cash_closure_id ON payments(cash_closure_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_status ON cash_closures(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active_sector ON customers(is_active, sector_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_due_date ON receipts(due_date);

-- ============================================================================
-- 3. ON DELETE BEHAVIOR
-- ============================================================================

-- customers.meter_reader_id → profiles (SET NULL when reader deleted)
-- Note: meter_reader_id column doesn't exist on customers, it's on readings
-- readings.meter_reader_id → profiles (SET NULL when reader deleted)
ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_meter_reader_id_fkey;
ALTER TABLE readings ADD CONSTRAINT readings_meter_reader_id_fkey
  FOREIGN KEY (meter_reader_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- cash_closures.cashier_id → profiles (SET NULL when cashier deleted)
ALTER TABLE cash_closures DROP CONSTRAINT IF EXISTS cash_closures_cashier_id_fkey;
ALTER TABLE cash_closures ADD CONSTRAINT cash_closures_cashier_id_fkey
  FOREIGN KEY (cashier_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- payments.cashier_id → profiles (SET NULL when cashier deleted)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_cashier_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_cashier_id_fkey
  FOREIGN KEY (cashier_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. MISSING RLS POLICIES
-- ============================================================================

-- roles: admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admin insert roles" ON roles;
CREATE POLICY "Admin insert roles" ON roles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

DROP POLICY IF EXISTS "Admin update roles" ON roles;
CREATE POLICY "Admin update roles" ON roles
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

DROP POLICY IF EXISTS "Admin delete roles" ON roles;
CREATE POLICY "Admin delete roles" ON roles
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin');

-- payments: meter_reader can read own sector payments (via receipt customer)
DROP POLICY IF EXISTS "Reader read payments" ON payments;
CREATE POLICY "Reader read payments" ON payments
  FOR SELECT TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'cashier')
    OR (
      (SELECT public.get_user_role()) = 'meter_reader'
      AND EXISTS (
        SELECT 1 FROM receipts
        WHERE receipts.id = payments.receipt_id
        AND (SELECT sector_id FROM customers WHERE customers.id = receipts.customer_id) = (SELECT public.get_user_sector_id())
      )
    )
  );

-- ============================================================================
-- 5. UPDATED_AT AUTO-UPDATE TRIGGERS (missing tables)
-- ============================================================================

CREATE TRIGGER sectors_updated_at BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tariffs_updated_at BEFORE UPDATE ON tariffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER billing_concepts_updated_at BEFORE UPDATE ON billing_concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER municipality_config_updated_at BEFORE UPDATE ON municipality_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 6. IMPROVE void_payment() RPC ERROR MESSAGES
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
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;

  IF v_user_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Permiso denegado: solo administradores o cajeros pueden anular pagos';
  END IF;

  SELECT id, receipt_id, amount, status INTO v_payment
  FROM payments WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado (id: %)', p_payment_id;
  END IF;

  IF v_payment.status = 'voided' THEN
    RAISE EXCEPTION 'El pago ya esta anulado (id: %)', p_payment_id;
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
