-- ============================================================================
-- CURIMANA ELÉCTRICA - Schema Completo Actualizado
-- Última actualización: 2026-04-30
-- Base de datos: Supabase (PostgreSQL)
-- ============================================================================

-- ============================================================================
-- 1. FUNCIONES AUXILIARES (deben existir antes de las políticas)
-- ============================================================================

-- Función para obtener el rol del usuario actual (usada en políticas RLS)
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

-- Función alias (compatibilidad)
CREATE OR REPLACE FUNCTION public."current_role"()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.get_user_sector_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid());
END;
$$;

-- Revocar acceso anónimo y público a funciones sensibles
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
REVOKE EXECUTE ON FUNCTION public."current_role"() FROM anon, public;
GRANT EXECUTE ON FUNCTION public."current_role"() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_sector_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_sector_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_energy_amount(NUMERIC, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.calculate_energy_amount(NUMERIC, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.close_billing_period(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.close_billing_period(UUID) TO authenticated;

-- ============================================================================
-- 2. TABLAS
-- ============================================================================

-- Roles del sistema
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sectores del distrito (para rutas de lectura)
CREATE TABLE IF NOT EXISTS sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles de usuario (vinculados a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'meter_reader' REFERENCES roles(id),
  assigned_sector_id UUID REFERENCES sectors(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuración municipal
CREATE TABLE IF NOT EXISTS municipality_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ruc TEXT NOT NULL,
  om_number TEXT,
  address TEXT NOT NULL,
  logo_url TEXT,
  billing_cut_day INT DEFAULT 25,
  payment_grace_days INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tarifas eléctricas
CREATE TABLE IF NOT EXISTS tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  connection_type TEXT DEFAULT 'monofásico' CHECK (connection_type IN ('monofásico', 'trifásico')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tramos tarifarios (escalonado por consumo)
CREATE TABLE IF NOT EXISTS tariff_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id UUID REFERENCES tariffs(id) ON DELETE CASCADE,
  min_kwh NUMERIC NOT NULL,
  max_kwh NUMERIC,
  price_per_kwh NUMERIC NOT NULL,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de versiones de tramos tarifarios (para facturación histórica)
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

-- Conceptos de cobro adicionales
CREATE TABLE IF NOT EXISTS billing_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  type TEXT DEFAULT 'fixed' CHECK (type IN ('fixed', 'percentage', 'per_kwh')),
  applies_to_tariff_id UUID REFERENCES tariffs(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes / suministros
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  document_number TEXT,
  address TEXT NOT NULL,
  sector TEXT,
  sector_id UUID REFERENCES sectors(id),
  phone TEXT,
  tariff_id UUID REFERENCES tariffs(id),
  connection_type TEXT DEFAULT 'monofásico' CHECK (connection_type IN ('monofásico', 'trifásico')),
  is_active BOOLEAN DEFAULT true,
  current_debt NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Periodos de facturación
CREATE TABLE IF NOT EXISTS billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, month)
);

-- Lecturas de medidor
CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  billing_period_id UUID NOT NULL REFERENCES billing_periods(id),
  previous_reading NUMERIC NOT NULL CHECK (previous_reading >= 0),
  current_reading NUMERIC NOT NULL CHECK (current_reading >= 0),
  consumption NUMERIC NOT NULL DEFAULT 0 CHECK (consumption >= 0),
  needs_review BOOLEAN DEFAULT false,
  reading_date DATE DEFAULT CURRENT_DATE,
  photo_url TEXT,
  notes TEXT,
  is_estimated BOOLEAN DEFAULT false,
  meter_reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sync_id TEXT,
  is_synced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, billing_period_id)
);

-- Secuencia para números de recibo
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- Recibos de pago
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number BIGINT NOT NULL UNIQUE DEFAULT nextval('receipt_number_seq'),
  customer_id UUID NOT NULL REFERENCES customers(id),
  reading_id UUID REFERENCES readings(id),
  billing_period_id UUID NOT NULL REFERENCES billing_periods(id),
  previous_reading NUMERIC NOT NULL CHECK (previous_reading >= 0),
  current_reading NUMERIC NOT NULL CHECK (current_reading >= 0),
  consumption_kwh NUMERIC NOT NULL CHECK (consumption_kwh >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  energy_amount NUMERIC NOT NULL CHECK (energy_amount >= 0),
  fixed_charges NUMERIC NOT NULL CHECK (fixed_charges >= 0),
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  igv NUMERIC DEFAULT 0,
  previous_debt NUMERIC DEFAULT 0 CHECK (previous_debt >= 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_amount NUMERIC DEFAULT 0 CHECK (paid_amount >= 0),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, billing_period_id)
);

-- Cierre de caja
CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  closure_date DATE DEFAULT CURRENT_DATE,
  opening_amount NUMERIC NOT NULL CHECK (opening_amount >= 0),
  total_collected NUMERIC DEFAULT 0,
  total_receipts INT DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pagos registrados
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT DEFAULT 'cash' CHECK (method = 'cash'),
  reference TEXT,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cash_closure_id UUID REFERENCES cash_closures(id),
  received_amount NUMERIC DEFAULT 0 CHECK (received_amount >= 0),
  change_amount NUMERIC DEFAULT 0 CHECK (change_amount >= 0),
  payment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_role TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. FUNCIÓN DE CÁLCULO TARIFARIO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_energy_amount(p_consumption NUMERIC, p_tariff_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
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

-- Función para cerrar un periodo de forma atómica (evita doble cierre)
CREATE OR REPLACE FUNCTION public.close_billing_period(p_period_id UUID)
RETURNS TABLE(success BOOLEAN, period_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_is_closed BOOLEAN;
v_user_role TEXT;
BEGIN
SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

IF v_user_role != 'admin' THEN
RETURN QUERY SELECT false, p_period_id::uuid;
RETURN;
END IF;

SELECT is_closed INTO v_is_closed FROM billing_periods WHERE id = p_period_id;

IF NOT FOUND THEN
RETURN QUERY SELECT false, p_period_id::uuid;
RETURN;
END IF;

IF v_is_closed THEN
RETURN QUERY SELECT false, p_period_id::uuid;
RETURN;
END IF;

UPDATE billing_periods SET is_closed = true, closed_at = now() WHERE id = p_period_id;

RETURN QUERY SELECT true, p_period_id::uuid;
END;
$$;

-- Actualización atómica de deuda de cliente
CREATE OR REPLACE FUNCTION public.adjust_customer_debt(
  p_customer_id UUID,
  p_amount NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_debt NUMERIC;
BEGIN
  UPDATE customers
  SET current_debt = GREATEST(0, COALESCE(current_debt, 0) + p_amount),
      updated_at = now()
  WHERE id = p_customer_id
  RETURNING current_debt INTO v_new_debt;

  RETURN v_new_debt;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_customer_debt(UUID, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.adjust_customer_debt(UUID, NUMERIC) TO authenticated;

-- Recalcular deuda total del cliente sumando todos los recibos pendientes
CREATE OR REPLACE FUNCTION public.recalculate_customer_debt(
  p_customer_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_debt NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
  INTO v_total_debt
  FROM receipts
  WHERE customer_id = p_customer_id
  AND status NOT IN ('cancelled', 'paid');

  UPDATE customers
  SET current_debt = v_total_debt,
      updated_at = now()
  WHERE id = p_customer_id;

  RETURN v_total_debt;
END;
$$;

-- ============================================================================
-- 3.1 FUNCIONES RPC ATÓMICAS (Procesamiento de pagos y generación)
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

CREATE OR REPLACE FUNCTION public.generate_period_receipts(
  p_period_id UUID,
  p_receipts JSONB
)
RETURNS TABLE (generated_count INTEGER, skipped_count INTEGER, errors TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_receipt JSONB;
  v_receipt_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors TEXT := '';
  v_customer_id UUID;
  v_err_msg TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM billing_periods WHERE id = p_period_id AND is_closed = true) THEN
    RAISE EXCEPTION 'El periodo ya esta cerrado';
  END IF;

  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    BEGIN
      v_customer_id := (v_receipt->>'customer_id')::UUID;

      IF EXISTS (SELECT 1 FROM receipts WHERE customer_id = v_customer_id AND billing_period_id = p_period_id) THEN
        v_skipped := v_skipped + 1;
        v_errors := v_errors || format('Cliente %s ya tiene recibo para este periodo. ', v_customer_id);
        CONTINUE;
      END IF;

      INSERT INTO receipts (
        customer_id, billing_period_id, reading_id,
        previous_reading, current_reading, consumption_kwh,
        period_start, period_end,
        energy_amount, fixed_charges, subtotal, igv, previous_debt,
        total_amount, paid_amount, status,
        issue_date, due_date
      ) VALUES (
        v_customer_id,
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
        v_customer_id,
        COALESCE((v_receipt->>'total_amount')::NUMERIC, 0)
      );

      v_count := v_count + 1;
    EXCEPTION
      WHEN unique_violation THEN
        v_skipped := v_skipped + 1;
        v_errors := v_errors || format('Recibo duplicado para cliente %s. ', v_customer_id);
      WHEN foreign_key_violation THEN
        v_skipped := v_skipped + 1;
        v_errors := v_errors || format('FK invalida para cliente %s. ', v_customer_id);
      WHEN check_violation THEN
        v_skipped := v_skipped + 1;
        v_errors := v_errors || format('CHECK violation para cliente %s. ', v_customer_id);
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        v_err_msg := SQLERRM;
        v_errors := v_errors || format('Error cliente %s: %s. ', v_customer_id, v_err_msg);
        RAISE WARNING 'generate_period_receipts error for customer %: %', v_customer_id, v_err_msg;
    END;
  END LOOP;

  generated_count := v_count;
  skipped_count := v_skipped;
  errors := v_errors;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_payment(UUID, UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_period_receipts(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_period_receipts(UUID, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.recalculate_customer_debt(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recalculate_customer_debt(UUID) TO authenticated;

-- Dashboard RPC — single call replaces 5 sequential queries
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

-- Trigger: Registrar historial de cambios en tramos tarifarios
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

-- ============================================================================
-- 4. TRIGGER: Auto-crear perfil cuando se registra un usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'meter_reader'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. ÍNDICES
-- ============================================================================

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER sectors_updated_at BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tariffs_updated_at BEFORE UPDATE ON tariffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tariff_tier_history_updated_at BEFORE UPDATE ON tariff_tier_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER billing_concepts_updated_at BEFORE UPDATE ON billing_concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER municipality_config_updated_at BEFORE UPDATE ON municipality_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_supply_number ON customers(supply_number);
CREATE INDEX IF NOT EXISTS idx_customers_tariff_id ON customers(tariff_id);
CREATE INDEX IF NOT EXISTS idx_readings_customer_id ON readings(customer_id);
CREATE INDEX IF NOT EXISTS idx_readings_period ON readings(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_readings_date ON readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_receipts_customer_status ON receipts(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_receipts_billing_period_id ON receipts(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_receipts_reading_id ON receipts(reading_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_id ON payments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_billing_concepts_applies_to_tariff_id ON billing_concepts(applies_to_tariff_id);
CREATE INDEX IF NOT EXISTS idx_tariff_tiers_tariff_id ON tariff_tiers(tariff_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_cashier_status ON cash_closures(cashier_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_cashier_id ON payments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_customers_sector ON customers(sector);
CREATE INDEX IF NOT EXISTS idx_customers_sector_id ON customers(sector_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_sector_id ON profiles(assigned_sector_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_customer_date ON readings(customer_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_readings_customer_period ON readings(customer_id, billing_period_id);
CREATE INDEX IF NOT EXISTS idx_readings_meter_reader_id ON readings(meter_reader_id);
CREATE INDEX IF NOT EXISTS idx_payments_cash_closure_id ON payments(cash_closure_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_status ON cash_closures(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active_sector ON customers(is_active, sector_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_due_date ON receipts(due_date);
CREATE INDEX IF NOT EXISTS idx_receipts_period_status ON receipts(billing_period_id, status);
CREATE INDEX IF NOT EXISTS idx_readings_needs_review ON readings(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_customers_active_sector_name ON customers(is_active, sector_id, full_name);
CREATE INDEX IF NOT EXISTS idx_payments_closure_status ON payments(cash_closure_id, status);
CREATE INDEX IF NOT EXISTS idx_receipts_due_date_status ON receipts(due_date, status) WHERE status IN ('pending', 'partial');

-- ============================================================================
-- 6. RLS (Row Level Security) - Activar en todas las tablas
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipality_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_tier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. POLÍTICAS RLS (conjunto limpio, sin duplicados)
-- ============================================================================

-- ── roles ──
CREATE POLICY "roles_select_authenticated" ON roles
FOR SELECT TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'cashier', 'meter_reader'));

CREATE POLICY "Admin insert roles" ON roles
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Admin update roles" ON roles
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Admin delete roles" ON roles
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── sectors ──
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

CREATE POLICY "Users read sectors" ON sectors
FOR SELECT TO authenticated
USING (true);

-- ── profiles ──
CREATE POLICY "Authenticated read profiles (restricted)" ON profiles
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR id = auth.uid()
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND assigned_sector_id = (SELECT public.get_user_sector_id())
  )
);

CREATE POLICY "Users can update own profile (no role)" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT public.get_user_role())
);

CREATE POLICY "Admin insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Trigger insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admin update all profiles" ON profiles
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Admin delete profiles" ON profiles
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

-- ── municipality_config ──
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

CREATE POLICY "Users read municipality_config" ON municipality_config
FOR SELECT TO authenticated
USING (true);

-- ── tariffs ──
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

CREATE POLICY "Users read tariffs" ON tariffs
FOR SELECT TO authenticated
USING (true);

-- ── tariff_tiers ──
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

CREATE POLICY "Users read tariff_tiers" ON tariff_tiers
FOR SELECT TO authenticated
USING (true);

-- ── tariff_tier_history ──
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

-- ── billing_concepts ──
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

CREATE POLICY "Users read billing_concepts" ON billing_concepts
FOR SELECT TO authenticated
USING (true);

-- ── customers ──
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

CREATE POLICY "Cashier read customers" ON customers
FOR SELECT TO authenticated
USING ((SELECT public.get_user_role()) = 'cashier');

CREATE POLICY "Reader read assigned sector customers" ON customers
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND sector_id = (SELECT public.get_user_sector_id())
  )
);

-- ── billing_periods ──
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

CREATE POLICY "Users read billing_periods" ON billing_periods
  FOR SELECT TO authenticated
  USING (true);

-- ── readings ──
CREATE POLICY "Admin write readings" ON readings
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete readings" ON readings
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Reader insert readings" ON readings
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.get_user_role()) IN ('admin', 'meter_reader')
  AND (
    (SELECT public.get_user_role()) = 'admin'
    OR (SELECT sector_id FROM customers WHERE id = readings.customer_id) = (SELECT public.get_user_sector_id())
  )
);

CREATE POLICY "Reader update own readings" ON readings
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'meter_reader') AND meter_reader_id = auth.uid())
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'meter_reader'));

CREATE POLICY "Users read readings" ON readings
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND (SELECT sector_id FROM customers WHERE id = readings.customer_id) = (SELECT public.get_user_sector_id())
  )
);

-- ── receipts ──
CREATE POLICY "Admin insert receipts" ON receipts
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');
CREATE POLICY "Admin delete receipts" ON receipts
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Cashier update receipts" ON receipts
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'cashier'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Cashier insert receipts" ON receipts
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Users read receipts" ON receipts
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND (SELECT sector_id FROM customers WHERE id = receipts.customer_id) = (SELECT public.get_user_sector_id())
  )
);

-- ── payments ──
CREATE POLICY "Admin delete payments" ON payments
FOR DELETE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Cashier insert payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Cashier update payments" ON payments
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'cashier'))
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Users read payments" ON payments
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

-- ── cash_closures ──
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

CREATE POLICY "Cashier insert closures" ON cash_closures
FOR INSERT TO authenticated
WITH CHECK (cashier_id = (SELECT auth.uid()) AND (SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Cashier update own closures" ON cash_closures
FOR UPDATE TO authenticated
USING (cashier_id = (SELECT auth.uid()))
WITH CHECK (cashier_id = (SELECT auth.uid()));

CREATE POLICY "Cashier read own closures" ON cash_closures
FOR SELECT TO authenticated
USING (cashier_id = (SELECT auth.uid()) OR (SELECT public.get_user_role()) = 'admin');

-- ── audit_logs ──
CREATE POLICY "Admin read logs" ON audit_logs
FOR SELECT TO authenticated
USING ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "System insert logs" ON audit_logs
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier', 'meter_reader'));

-- ============================================================================
-- 6. STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('reading-photos', 'reading-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated upload reading photos" ON storage.objects;
CREATE POLICY "Authenticated upload reading photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reading-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated read reading photos" ON storage.objects;
CREATE POLICY "Authenticated read reading photos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'reading-photos');
