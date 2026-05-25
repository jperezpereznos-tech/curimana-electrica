-- ============================================================================
-- CURIMANA ELECTRICA - Migration 20260525
-- RLS auth.uid() caching + partial indexes + covering index + session RPC
-- ============================================================================

-- ============================================================================
-- 1. RLS: Wrap auth.uid() in (SELECT auth.uid()) for per-query caching
--    PostgreSQL caches subselect results within a single query execution,
--    eliminating per-row re-evaluation on large tables.
-- ============================================================================

-- profiles: SELECT policy
DROP POLICY IF EXISTS "Authenticated read profiles (restricted)" ON profiles;
CREATE POLICY "Authenticated read profiles (restricted)" ON profiles
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR id = (SELECT auth.uid())
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND assigned_sector_id = (SELECT public.get_user_sector_id())
  )
);

-- profiles: UPDATE own profile
DROP POLICY IF EXISTS "Users can update own profile (no role)" ON profiles;
CREATE POLICY "Users can update own profile (no role)" ON profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (
  id = (SELECT auth.uid())
  AND role = (SELECT public.get_user_role())
);

-- profiles: INSERT trigger policy
DROP POLICY IF EXISTS "Trigger insert profiles" ON profiles;
CREATE POLICY "Trigger insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- readings: UPDATE own readings
DROP POLICY IF EXISTS "Reader update own readings" ON readings;
CREATE POLICY "Reader update own readings" ON readings
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'meter_reader') AND meter_reader_id = (SELECT auth.uid()))
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'meter_reader'));

-- ============================================================================
-- 2. Partial indexes for filtered queries
-- ============================================================================

-- sectors: is_active = true (used by getActiveSectors)
CREATE INDEX IF NOT EXISTS idx_sectors_is_active ON sectors(is_active) WHERE is_active = true;

-- billing_concepts: is_active = true (used by getAllActive)
CREATE INDEX IF NOT EXISTS idx_billing_concepts_is_active ON billing_concepts(is_active) WHERE is_active = true;

-- customers: is_active = true AND current_debt > 0 (used by getTopDebtors / getCustomersWithDebt)
CREATE INDEX IF NOT EXISTS idx_customers_active_debt ON customers(current_debt DESC) WHERE is_active = true AND current_debt > 0;

-- payments: status = 'completed' (used by dashboard KPIs, getSessionTotal)
CREATE INDEX IF NOT EXISTS idx_payments_status_completed ON payments(created_at DESC) WHERE status = 'completed';

-- receipts: status IN ('pending', 'partial') — standalone status index for status-only filters
CREATE INDEX IF NOT EXISTS idx_receipts_status_pending ON receipts(billing_period_id, status) WHERE status IN ('pending', 'partial');

-- billing_periods: is_closed = false (used by getCurrentPeriod)
CREATE INDEX IF NOT EXISTS idx_billing_periods_is_closed ON billing_periods(year DESC, month DESC) WHERE is_closed = false;

-- ============================================================================
-- 3. Covering index for getSessionTotal query
--    Covers: WHERE cashier_id = ? AND created_at >= ? AND status != 'voided'
--    Includes: amount (selected column) to avoid heap lookup
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_cashier_session
  ON payments(cashier_id, created_at DESC)
  INCLUDE (amount, status)
  WHERE status != 'voided';

-- ============================================================================
-- 4. RPC: get_session_total() — single DB call replaces client-side SUM
--    Used by cash-closure-repository.getSessionTotal()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_session_total(
  p_cashier_id UUID,
  p_from TIMESTAMPTZ,
  p_cash_closure_id UUID DEFAULT NULL
)
RETURNS TABLE(total NUMERIC, count BIGINT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_cash_closure_id IS NOT NULL THEN
    RETURN QUERY
    SELECT COALESCE(SUM(p.amount), 0)::NUMERIC AS total,
           COUNT(*)::BIGINT AS count
    FROM payments p
    WHERE p.cashier_id = p_cashier_id
      AND p.created_at >= p_from
      AND p.status != 'voided'
      AND p.cash_closure_id = p_cash_closure_id;
  ELSE
    RETURN QUERY
    SELECT COALESCE(SUM(p.amount), 0)::NUMERIC AS total,
           COUNT(*)::BIGINT AS count
    FROM payments p
    WHERE p.cashier_id = p_cashier_id
      AND p.created_at >= p_from
      AND p.status != 'voided';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_session_total(UUID, TIMESTAMPTZ, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_session_total(UUID, TIMESTAMPTZ, UUID) TO authenticated;
