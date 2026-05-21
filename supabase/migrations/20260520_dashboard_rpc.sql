-- Dashboard RPC — single call replaces 5 sequential HTTP round-trips

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
