-- ============================================================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- 1. Make get_user_role() STABLE (eliminates per-row re-evaluation in RLS)
-- 2. Add missing composite indexes for common query patterns
-- 3. Simplify overlapping RLS policies (remove redundant get_user_role()
--    calls where USING(true) already grants SELECT to all authenticated)
-- ============================================================================

-- ── 1. Make get_user_role() STABLE ──
-- PostgreSQL caches STABLE function results within a single query,
-- so RLS policies calling this function N times per N rows will now
-- evaluate it only ONCE per statement.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$;

-- ── 2. Missing composite indexes ──
-- Receipts: filtered by period + status (dashboard pending count, cashier search)
CREATE INDEX IF NOT EXISTS idx_receipts_period_status ON receipts(billing_period_id, status);

-- Readings: reviewer filter (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_readings_needs_review ON readings(needs_review) WHERE needs_review = true;

-- Customers: active list with sector + name ordering (reader customer list)
CREATE INDEX IF NOT EXISTS idx_customers_active_sector_name ON customers(is_active, sector_id, full_name);

-- Payments: cash closure reconciliation
CREATE INDEX IF NOT EXISTS idx_payments_closure_status ON payments(cash_closure_id, status);

-- Receipts: due date + status for overdue detection
CREATE INDEX IF NOT EXISTS idx_receipts_due_date_status ON receipts(due_date, status) WHERE status IN ('pending', 'partial');

-- ── 3. Simplify overlapping RLS policies ──
-- Several tables have both an "Admin CRUD" policy (ALL, get_user_role()='admin')
-- AND a "Users read" policy (SELECT, USING(true)). The SELECT from the ALL
-- policy is redundant because USING(true) already allows all authenticated
-- users to SELECT. This means get_user_role() is called unnecessarily for
-- every SELECT on these tables. We split the Admin ALL into INSERT/UPDATE/DELETE
-- and remove the redundant SELECT component.

-- ── sectors ──
DROP POLICY IF EXISTS "Admin CRUD sectors" ON sectors;
CREATE POLICY "Admin write sectors" ON sectors
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update sectors" ON sectors
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete sectors" ON sectors
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── municipality_config ──
DROP POLICY IF EXISTS "Admin CRUD municipality_config" ON municipality_config;
CREATE POLICY "Admin write municipality_config" ON municipality_config
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update municipality_config" ON municipality_config
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete municipality_config" ON municipality_config
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── tariffs ──
DROP POLICY IF EXISTS "Admin CRUD tariffs" ON tariffs;
CREATE POLICY "Admin write tariffs" ON tariffs
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update tariffs" ON tariffs
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete tariffs" ON tariffs
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── tariff_tiers ──
DROP POLICY IF EXISTS "Admin CRUD tariff_tiers" ON tariff_tiers;
CREATE POLICY "Admin write tariff_tiers" ON tariff_tiers
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update tariff_tiers" ON tariff_tiers
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete tariff_tiers" ON tariff_tiers
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── billing_concepts ──
DROP POLICY IF EXISTS "Admin CRUD billing_concepts" ON billing_concepts;
CREATE POLICY "Admin write billing_concepts" ON billing_concepts
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update billing_concepts" ON billing_concepts
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete billing_concepts" ON billing_concepts
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── customers ──
DROP POLICY IF EXISTS "Admin CRUD customers" ON customers;
CREATE POLICY "Admin write customers" ON customers
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update customers" ON customers
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete customers" ON customers
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── billing_periods ──
DROP POLICY IF EXISTS "Admin CRUD billing_periods" ON billing_periods;
CREATE POLICY "Admin write billing_periods" ON billing_periods
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update billing_periods" ON billing_periods
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete billing_periods" ON billing_periods
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── readings ──
DROP POLICY IF EXISTS "Admin CRUD readings" ON readings;
CREATE POLICY "Admin write readings" ON readings
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete readings" ON readings
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');
-- (readings already has "Reader insert readings" and "Reader update own readings" policies)

-- ── receipts ──
DROP POLICY IF EXISTS "Admin CRUD receipts" ON receipts;
CREATE POLICY "Admin insert receipts" ON receipts
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete receipts" ON receipts
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');
-- (receipts already has "Cashier update receipts" and "Cashier insert receipts" for write;
--  "Users read receipts" covers SELECT for all roles)

-- ── payments ──
DROP POLICY IF EXISTS "Admin CRUD payments" ON payments;
CREATE POLICY "Admin delete payments" ON payments
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');
-- (payments already has "Cashier insert payments" and "Cashier update payments";
--  "Users read payments" covers SELECT for all roles)

-- ── cash_closures ──
DROP POLICY IF EXISTS "Admin CRUD cash_closures" ON cash_closures;
CREATE POLICY "Admin insert closures" ON cash_closures
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin update closures" ON cash_closures
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete closures" ON cash_closures
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ============================================================================
-- 4. DASHBOARD RPC — single call replaces 5 sequential HTTP round-trips
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_of_month TIMESTAMPTZ := date_trunc('month', now());
  v_total_collected NUMERIC;
  v_total_debt NUMERIC;
  v_active_customers BIGINT;
  v_pending_receipts BIGINT;
  v_current_period_id UUID;
  v_revenue JSONB;
  v_sectors JSONB;
BEGIN
  SELECT COALESCE(SUM(p.amount), 0) INTO v_total_collected
  FROM payments p
  WHERE p.status = 'completed'
    AND p.created_at >= v_start_of_month;

  SELECT COALESCE(SUM(c.current_debt), 0) INTO v_total_debt
  FROM customers c
  WHERE c.is_active = true;

  SELECT COUNT(*) INTO v_active_customers
  FROM customers c
  WHERE c.is_active = true;

  SELECT id INTO v_current_period_id
  FROM billing_periods
  WHERE is_closed = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_current_period_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_pending_receipts
    FROM receipts
    WHERE billing_period_id = v_current_period_id
      AND status IN ('pending', 'partial');
  ELSE
    SELECT COUNT(*) INTO v_pending_receipts
    FROM receipts
    WHERE status IN ('pending', 'partial', 'overdue');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', bp.name,
      'total', COALESCE(SUM(r.paid_amount), 0)
    )
    ORDER BY bp.year ASC, bp.month ASC
  ), '[]'::jsonb) INTO v_revenue
  FROM billing_periods bp
  LEFT JOIN receipts r ON r.billing_period_id = bp.id AND r.status = 'paid'
  GROUP BY bp.id, bp.name, bp.year, bp.month
  ORDER BY bp.year ASC, bp.month ASC
  LIMIT 6;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('name', s.name, 'value', COALESCE(SUM(rd.consumption), 0))
  ), '[]'::jsonb) INTO v_sectors
  FROM readings rd
  JOIN customers c ON c.id = rd.customer_id
  JOIN sectors s ON s.id = c.sector_id
  GROUP BY s.id, s.name;

  RETURN jsonb_build_object(
    'total_collected', v_total_collected,
    'total_debt', v_total_debt,
    'active_customers', v_active_customers,
    'pending_receipts', v_pending_receipts,
    'revenue_history', v_revenue,
    'sector_consumption', v_sectors
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_kpis() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis() TO authenticated;
