-- ============================================================================
-- 20260521: Audit fixes — items 1-6
-- ============================================================================

-- 1. Dashboard RPC: strip year/month from revenue_history output
--    (kept in subquery for ORDER BY, stripped in outer jsonb_build_object)
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', sub.rw->>'name', 'total', sub.rw->>'total') ORDER BY sub.rw->>'year' ASC, sub.rw->>'month' ASC), '[]'::jsonb)
  INTO v_revenue
  FROM (
    SELECT jsonb_build_object(
      'name', bp.name,
      'total', COALESCE(SUM(r.paid_amount), 0),
      'year', bp.year,
      'month', bp.month
    ) AS rw
    FROM billing_periods bp
    LEFT JOIN receipts r ON r.billing_period_id = bp.id AND r.status = 'paid'
    GROUP BY bp.id, bp.name, bp.year, bp.month
    ORDER BY bp.year ASC, bp.month ASC
    LIMIT 6
  ) sub;

  SELECT COALESCE(jsonb_agg(sw), '[]'::jsonb)
  INTO v_sectors
  FROM (
    SELECT jsonb_build_object('name', s.name, 'value', COALESCE(SUM(rd.consumption), 0)) AS sw
    FROM readings rd
    JOIN customers c ON c.id = rd.customer_id
    JOIN sectors s ON s.id = c.sector_id
    GROUP BY s.id, s.name
  ) sub;

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

-- 2. Drop orphan function is_admin (uses raw_app_meta_data, no longer needed)
DROP FUNCTION IF EXISTS public.is_admin();

-- 3. Keep ensure_rls event trigger (Supabase-managed, not in schema.sql — no action needed)
--    This is a Supabase platform feature that auto-enables RLS on new tables.

-- 4. Convert calculate_energy_amount to SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.calculate_energy_amount(p_consumption NUMERIC, p_tariff_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC := 0;
  v_tier RECORD;
  v_tier_consumption NUMERIC;
BEGIN
  FOR v_tier IN
    SELECT min_kwh, max_kwh, price_per_kwh
    FROM tariff_tiers
    WHERE tariff_id = p_tariff_id
    ORDER BY order_index ASC
  LOOP
    IF p_consumption <= v_tier.min_kwh THEN
      CONTINUE;
    END IF;

    IF v_tier.max_kwh IS NULL THEN
      v_tier_consumption := p_consumption - v_tier.min_kwh;
    ELSE
      v_tier_consumption := LEAST(p_consumption, v_tier.max_kwh) - v_tier.min_kwh;
    END IF;

    v_total := v_total + (v_tier_consumption * v_tier.price_per_kwh);
  END LOOP;

  RETURN ROUND(v_total, 2);
END;
$$;

-- 5. Add UNIQUE constraint on billing_periods(year, month) if not exists
--    (schema.sql has it but live DB was missing it — belt-and-suspenders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'billing_periods'::regclass
    AND conname = 'billing_periods_year_month_key'
  ) THEN
    ALTER TABLE billing_periods ADD CONSTRAINT billing_periods_year_month_key UNIQUE (year, month);
  END IF;
END $$;

-- 6. Add index on payments.created_at for dashboard RPC date filter
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
