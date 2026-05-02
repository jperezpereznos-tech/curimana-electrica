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

-- Perfiles de usuario (vinculados a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'meter_reader' REFERENCES roles(id),
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
  method TEXT DEFAULT 'cash',
  reference TEXT,
  cashier_id UUID REFERENCES profiles(id),
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
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_customer_date ON readings(customer_id, reading_date DESC);

-- ============================================================================
-- 6. RLS (Row Level Security) - Activar en todas las tablas
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
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

-- ── profiles ──
CREATE POLICY "Authenticated read all profiles" ON profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

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

CREATE POLICY "Users read customers" ON customers
FOR SELECT TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'cashier', 'meter_reader'));

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
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'meter_reader'));

CREATE POLICY "Reader update own readings" ON readings
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'meter_reader') AND meter_reader_id = auth.uid())
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'meter_reader'));

CREATE POLICY "Users read readings" ON readings
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) IN ('admin', 'cashier', 'meter_reader'));

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
  USING ((SELECT public.get_user_role()) IN ('admin', 'cashier', 'meter_reader'));

-- ── payments ──
CREATE POLICY "Admin CRUD payments" ON payments
FOR ALL TO authenticated
USING ((SELECT public.get_user_role()) = 'admin')
WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "Cashier insert payments" ON payments
  FOR INSERT TO authenticated
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

CREATE POLICY "Authenticated upload reading photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reading-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Public read reading photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'reading-photos');
