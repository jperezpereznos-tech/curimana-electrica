-- ============================================================================
-- CURIMANA ELECTRICA - Security Hardening Migration
-- 1. Add role checks to SECURITY DEFINER functions
-- 2. Add explicit deny policies on audit_logs
-- 3. Fix storage bucket policies for reading-photos
-- 4. Fix readings UPDATE WITH CHECK
-- 5. Fix process_payment REVOKE to include public
-- ============================================================================

-- 1a. process_payment: add role check (admin, cashier only)
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
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_receipt RECORD;
  v_new_paid_amount NUMERIC;
  v_new_status TEXT;
  v_is_fully_paid BOOLEAN;
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de cajero o administrador';
  END IF;

  SELECT total_amount, paid_amount, status
  INTO v_receipt
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

-- 1b. generate_period_receipts: add role check (admin only)
CREATE OR REPLACE FUNCTION public.generate_period_receipts(
  p_period_id UUID,
  p_receipts JSONB
)
RETURNS void
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
    id, customer_id, billing_period_id, tariff_id,
    previous_reading, current_reading, consumption_kwh,
    energy_amount, fixed_charges, subtotal,
    previous_debt, total_amount, status, issue_date, due_date,
    period_start, period_end, reading_id
  )
  SELECT
    (r->>'id')::UUID,
    (r->>'customer_id')::UUID,
    (r->>'billing_period_id')::UUID,
    (r->>'tariff_id')::UUID,
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
END;
$$;

-- 1c. adjust_customer_debt: add role check (admin, cashier only)
CREATE OR REPLACE FUNCTION public.adjust_customer_debt(
  p_customer_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de cajero o administrador';
  END IF;

  UPDATE customers
  SET current_debt = GREATEST(0, current_debt + p_amount)
  WHERE id = p_customer_id;
END;
$$;

-- 1d. recalculate_customer_debt: add role check (admin, cashier only)
CREATE OR REPLACE FUNCTION public.recalculate_customer_debt(
  p_customer_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_debt NUMERIC;
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de cajero o administrador';
  END IF;

  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
  INTO v_total_debt
  FROM receipts
  WHERE customer_id = p_customer_id
    AND status IN ('pending', 'partial', 'overdue');

  UPDATE customers
  SET current_debt = v_total_debt
  WHERE id = p_customer_id;

  RETURN v_total_debt;
END;
$$;

-- 1e. get_dashboard_kpis: add role check (admin, cashier only)
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_total_collected NUMERIC;
  v_total_debt NUMERIC;
  v_active_customers BIGINT;
  v_total_receipts BIGINT;
  v_pending_receipts BIGINT;
  v_paid_receipts BIGINT;
  v_revenue_history JSONB;
  v_sector_consumption JSONB;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de cajero o administrador';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_collected
  FROM payments WHERE status = 'completed';

  SELECT COALESCE(SUM(current_debt), 0) INTO v_total_debt
  FROM customers WHERE is_active = true;

  SELECT COUNT(*) INTO v_active_customers
  FROM customers WHERE is_active = true;

  SELECT COUNT(*) INTO v_total_receipts FROM receipts;
  SELECT COUNT(*) INTO v_pending_receipts FROM receipts WHERE status IN ('pending', 'partial', 'overdue');
  SELECT COUNT(*) INTO v_paid_receipts FROM receipts WHERE status = 'paid';

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'period_id', bp.id,
      'period_name', bp.name,
      'year', bp.year,
      'month', bp.month,
      'total', r.total
    )
  ), '[]'::jsonb) INTO v_revenue_history
  FROM billing_periods bp
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(r.amount), 0) as total
    FROM receipts r
    JOIN payments p ON p.receipt_id = r.id AND p.status = 'completed'
    WHERE r.billing_period_id = bp.id
  ) r ON true
  WHERE bp.is_closed = true
  ORDER BY bp.year DESC, bp.month DESC
  LIMIT 12;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'sector_id', s.id,
      'sector_name', s.name,
      'total_consumption', sc.total_kwh
    )
  ), '[]'::jsonb) INTO v_sector_consumption
  FROM sectors s
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(rd.consumption_kwh), 0) as total_kwh
    FROM readings rd
    JOIN customers c ON c.id = rd.customer_id
    WHERE c.sector_id = s.id
  ) sc ON true
  WHERE s.is_active = true;

  RETURN jsonb_build_object(
    'totalCollected', v_total_collected,
    'totalDebt', v_total_debt,
    'activeCustomers', v_active_customers,
    'totalReceipts', v_total_receipts,
    'pendingReceipts', v_pending_receipts,
    'paidReceipts', v_paid_receipts,
    'revenueHistory', v_revenue_history,
    'sectorConsumption', v_sector_consumption
  );
END;
$$;

-- 1f. get_session_total: add role check (admin, cashier; cashier can only query own session)
CREATE OR REPLACE FUNCTION public.get_session_total(
  p_cashier_id UUID,
  p_from TIMESTAMPTZ,
  p_cash_closure_id UUID DEFAULT NULL
)
RETURNS TABLE(total NUMERIC, count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  IF v_user_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de cajero o administrador';
  END IF;

  IF v_user_role = 'cashier' AND p_cashier_id != auth.uid() THEN
    RAISE EXCEPTION 'Permiso denegado: solo puedes consultar tu propia sesion';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.amount), 0) as total,
    COUNT(*) as count
  FROM payments p
  WHERE p.cashier_id = p_cashier_id
    AND p.payment_date >= p_from
    AND p.status = 'completed'
    AND (p_cash_closure_id IS NULL OR p.cash_closure_id = p_cash_closure_id);
END;
$$;

-- 2. Add explicit deny policies on audit_logs
CREATE POLICY "No one can update audit_logs"
  ON public.audit_logs FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No one can delete audit_logs"
  ON public.audit_logs FOR DELETE
  TO authenticated
  USING (false);

-- 3. Fix storage bucket policies for reading-photos
-- 3a. Restrict INSERT to admin and meter_reader only
DROP POLICY IF EXISTS "Authenticated upload reading photos" ON storage.objects;
CREATE POLICY "Admin and reader upload reading photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reading-photos'
    AND (SELECT public.get_user_role()) IN ('admin', 'meter_reader')
  );

-- 3b. Add DELETE policy (admin only)
CREATE POLICY "Admin delete reading photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reading-photos'
    AND (SELECT public.get_user_role()) = 'admin'
  );

-- 3c. Add UPDATE policy (admin only)
CREATE POLICY "Admin update reading photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reading-photos'
    AND (SELECT public.get_user_role()) = 'admin'
  )
  WITH CHECK (
    bucket_id = 'reading-photos'
    AND (SELECT public.get_user_role()) = 'admin'
  );

-- 4. Fix readings UPDATE WITH CHECK: enforce meter_reader_id = auth.uid()
DROP POLICY IF EXISTS "Reader update own readings" ON public.readings;
CREATE POLICY "Reader update own readings"
  ON public.readings FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'meter_reader')
    AND (
      (SELECT public.get_user_role()) = 'admin'
      OR meter_reader_id = auth.uid()
    )
  )
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'meter_reader')
    AND (
      (SELECT public.get_user_role()) = 'admin'
      OR meter_reader_id = auth.uid()
    )
  );

-- 5. Fix process_payment REVOKE to include public
REVOKE EXECUTE ON FUNCTION public.process_payment(
  UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID
) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.process_payment(
  UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID
) TO authenticated;
