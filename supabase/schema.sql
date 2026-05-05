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
SECURITY DEFINER
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

-- Revocar acceso anónimo a funciones sensibles
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public."current_role"() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_energy_amount(NUMERIC, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_billing_period(UUID) FROM anon;

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
  address TEXT NOT NULL,
  logo_url TEXT,
  billing_cut_day INT DEFAULT 25,
  payment_grace_days INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tarifas eléctricas
CREATE TABLE IF NOT EXISTS tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  connection_type TEXT DEFAULT 'monofásico',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
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
  connection_type TEXT DEFAULT 'monofásico',
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
  customer_id UUID REFERENCES customers(id),
  billing_period_id UUID REFERENCES billing_periods(id),
  previous_reading NUMERIC NOT NULL,
  current_reading NUMERIC NOT NULL,
  consumption NUMERIC NOT NULL DEFAULT 0,
  needs_review BOOLEAN DEFAULT false,
  reading_date DATE DEFAULT CURRENT_DATE,
  photo_url TEXT,
  notes TEXT,
  is_estimated BOOLEAN DEFAULT false,
  meter_reader_id UUID REFERENCES profiles(id),
  sync_id TEXT,
  is_synced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Secuencia para números de recibo
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- Recibos de pago
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number BIGINT NOT NULL UNIQUE DEFAULT nextval('receipt_number_seq'),
  customer_id UUID REFERENCES customers(id),
  reading_id UUID REFERENCES readings(id),
  billing_period_id UUID REFERENCES billing_periods(id),
  previous_reading NUMERIC NOT NULL,
  current_reading NUMERIC NOT NULL,
  consumption_kwh NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  energy_amount NUMERIC NOT NULL,
  fixed_charges NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  igv NUMERIC DEFAULT 0,
  previous_debt NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pagos registrados
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id),
  customer_id UUID REFERENCES customers(id),
  amount NUMERIC NOT NULL,
  method TEXT DEFAULT 'cash' CHECK (method = 'cash'),
  reference TEXT,
  cashier_id UUID REFERENCES profiles(id),
  cash_closure_id UUID REFERENCES cash_closures(id),
  received_amount NUMERIC DEFAULT 0,
  change_amount NUMERIC DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cierre de caja
CREATE TABLE IF NOT EXISTS cash_closures (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
cashier_id UUID REFERENCES profiles(id) DEFAULT auth.uid(),
closure_date DATE DEFAULT CURRENT_DATE,
opening_amount NUMERIC NOT NULL,
total_collected NUMERIC DEFAULT 0,
total_receipts INT DEFAULT 0,
status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
closed_at TIMESTAMPTZ,
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
  v_remaining NUMERIC := p_consumption;
  v_tier_consumption NUMERIC;
BEGIN
  FOR v_tier IN
    SELECT min_kwh, max_kwh, price_per_kwh
    FROM tariff_tiers
    WHERE tariff_id = p_tariff_id
    ORDER BY order_index ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    IF v_tier.max_kwh IS NULL THEN
      v_tier_consumption := v_remaining;
    ELSE
      v_tier_consumption := LEAST(v_remaining, v_tier.max_kwh - v_tier.min_kwh);
    END IF;

    v_total := v_total + (v_tier_consumption * v_tier.price_per_kwh);
    v_remaining := v_remaining - v_tier_consumption;
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
  FROM receipts WHERE id = p_receipt_id;

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

  IF NOT EXISTS (SELECT 1 FROM cash_closures WHERE id = p_cash_closure_id AND status = 'open') THEN
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
  FROM payments WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado';
  END IF;

  IF v_payment.status = 'voided' THEN
    RAISE EXCEPTION 'El pago ya esta anulado';
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

CREATE OR REPLACE FUNCTION public.generate_period_receipts(
  p_period_id UUID,
  p_receipts JSONB
)
RETURNS TABLE (generated_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_receipt JSONB;
  v_receipt_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM billing_periods WHERE id = p_period_id AND is_closed = true) THEN
    RAISE EXCEPTION 'El periodo ya esta cerrado';
  END IF;

  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    BEGIN
      INSERT INTO receipts (
        customer_id, billing_period_id, reading_id,
        previous_reading, current_reading, consumption_kwh,
        period_start, period_end,
        energy_amount, fixed_charges, subtotal, igv, previous_debt,
        total_amount, paid_amount, status,
        issue_date, due_date
      ) VALUES (
        (v_receipt->>'customer_id')::UUID,
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
        (v_receipt->>'customer_id')::UUID,
        COALESCE((v_receipt->>'total_amount')::NUMERIC, 0)
      );

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  generated_count := v_count;
  skipped_count := v_skipped;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_payment(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_period_receipts(UUID, JSONB) FROM anon;

REVOKE EXECUTE ON FUNCTION public.recalculate_customer_debt(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recalculate_customer_debt(UUID) TO authenticated;

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

-- ── sectors ──
CREATE POLICY "Admin CRUD sectors" ON sectors
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

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
    AND (
      (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid()) IS NULL
      OR assigned_sector_id = (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update own profile (no role)" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Admin update all profiles" ON profiles
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

-- ── municipality_config ──
CREATE POLICY "Admin CRUD municipality_config" ON municipality_config
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Users read municipality_config" ON municipality_config
  FOR SELECT TO authenticated
  USING (true);

-- ── tariffs ──
CREATE POLICY "Admin CRUD tariffs" ON tariffs
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Users read tariffs" ON tariffs
  FOR SELECT TO authenticated
  USING (true);

-- ── tariff_tiers ──
CREATE POLICY "Admin CRUD tariff_tiers" ON tariff_tiers
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Users read tariff_tiers" ON tariff_tiers
  FOR SELECT TO authenticated
  USING (true);

-- ── billing_concepts ──
CREATE POLICY "Admin CRUD billing_concepts" ON billing_concepts
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Users read billing_concepts" ON billing_concepts
  FOR SELECT TO authenticated
  USING (true);

-- ── customers ──
CREATE POLICY "Admin CRUD customers" ON customers
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Cashier read customers" ON customers
FOR SELECT TO authenticated
USING ((SELECT public.get_user_role()) = 'cashier');

CREATE POLICY "Reader read assigned sector customers" ON customers
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) = 'meter_reader'
  AND (
    SELECT assigned_sector_id FROM profiles WHERE id = auth.uid()
  ) IS NULL
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND sector_id = (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid())
  )
);

-- ── billing_periods ──
CREATE POLICY "Admin CRUD billing_periods" ON billing_periods
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Users read billing_periods" ON billing_periods
  FOR SELECT TO authenticated
  USING (true);

-- ── readings ──
CREATE POLICY "Admin CRUD readings" ON readings
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Reader insert readings" ON readings
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.get_user_role()) = 'admin'
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND (
      (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid()) IS NULL
      OR EXISTS (
        SELECT 1 FROM customers c
        WHERE c.id = readings.customer_id
        AND c.sector_id = (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid())
      )
    )
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
    AND (
      (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid()) IS NULL
      OR EXISTS (
        SELECT 1 FROM customers c
        WHERE c.id = readings.customer_id
        AND c.sector_id = (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid())
      )
    )
  )
);

-- ── receipts ──
CREATE POLICY "Admin CRUD receipts" ON receipts
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Cashier update receipts" ON receipts
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Cashier insert receipts" ON receipts
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Users read receipts" ON receipts
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND (
      (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid()) IS NULL
      OR EXISTS (
        SELECT 1 FROM customers c
        WHERE c.id = receipts.customer_id
        AND c.sector_id = (SELECT assigned_sector_id FROM profiles WHERE id = auth.uid())
      )
    )
  )
);

-- ── payments ──
CREATE POLICY "Admin CRUD payments" ON payments
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Cashier insert payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Cashier update payments" ON payments
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'cashier'))
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

CREATE POLICY "Users read payments" ON payments
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

-- ── cash_closures ──
CREATE POLICY "Admin CRUD cash_closures" ON cash_closures
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

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

DROP POLICY IF EXISTS "Public read reading photos" ON storage.objects;
CREATE POLICY "Public read reading photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'reading-photos');
