-- Schema para el Sistema Eléctrico Municipal de Curimana

-- 1. municipality_config
CREATE TABLE IF NOT EXISTS municipality_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruc VARCHAR(11) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT,
    billing_cut_day INTEGER DEFAULT 26,
    payment_grace_days INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY, -- 'admin', 'cashier', 'meter_reader'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2b. profiles (extensión de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT REFERENCES roles(id),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. tariffs
CREATE TABLE IF NOT EXISTS tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    connection_type TEXT CHECK (connection_type IN ('monofásico', 'trifásico')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. tariff_tiers
CREATE TABLE IF NOT EXISTS tariff_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tariff_id UUID REFERENCES tariffs(id) ON DELETE CASCADE,
    min_kwh NUMERIC NOT NULL,
    max_kwh NUMERIC, -- NULL significa sin límite superior
    price_per_kwh NUMERIC NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. billing_concepts
CREATE TABLE IF NOT EXISTS billing_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('fixed', 'percentage', 'per_kwh')),
    applies_to_tariff_id UUID REFERENCES tariffs(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    supply_number VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    sector TEXT,
    tariff_id UUID REFERENCES tariffs(id) ON DELETE RESTRICT,
    connection_type TEXT CHECK (connection_type IN ('monofásico', 'trifásico')),
    phone TEXT,
    document_number VARCHAR(15),
    current_debt NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. billing_periods
CREATE TABLE IF NOT EXISTS billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Ej: 'JUNIO 2025'
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. readings
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    billing_period_id UUID REFERENCES billing_periods(id) ON DELETE RESTRICT,
    meter_reader_id UUID, -- Referencia a auth.users.id (se implementará en Fase 2)
    previous_reading NUMERIC NOT NULL,
    current_reading NUMERIC NOT NULL,
    consumption NUMERIC GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
    reading_date DATE DEFAULT CURRENT_DATE,
    photo_url TEXT,
    is_synced BOOLEAN DEFAULT false,
    sync_id TEXT,
    notes TEXT,
    is_estimated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. receipts
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number BIGINT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    reading_id UUID REFERENCES readings(id) ON DELETE SET NULL,
    billing_period_id UUID REFERENCES billing_periods(id) ON DELETE RESTRICT,
    previous_reading NUMERIC NOT NULL,
    current_reading NUMERIC NOT NULL,
    consumption_kwh NUMERIC NOT NULL,
    energy_amount NUMERIC NOT NULL,
    fixed_charges NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    previous_debt NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')) DEFAULT 'pending',
    paid_amount NUMERIC DEFAULT 0,
    paid_at TIMESTAMPTZ,
    payment_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID REFERENCES receipts(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    amount NUMERIC NOT NULL,
    method TEXT CHECK (method IN ('cash')) DEFAULT 'cash',
    reference TEXT,
    cashier_id UUID, -- Referencia a auth.users.id
    payment_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. cash_closures
CREATE TABLE IF NOT EXISTS cash_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID,
    closure_date DATE DEFAULT CURRENT_DATE,
    opening_amount NUMERIC NOT NULL,
    total_collected NUMERIC DEFAULT 0,
    total_receipts INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    user_role TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_customers_supply_number ON customers(supply_number);
CREATE INDEX IF NOT EXISTS idx_receipts_customer_status ON receipts(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_readings_period ON readings(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_readings_date ON readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- FUNCION: calculate_energy_amount
CREATE OR REPLACE FUNCTION calculate_energy_amount(p_consumption NUMERIC, p_tariff_id UUID)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql;

-- Habilitar RLS
ALTER TABLE municipality_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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

-- Politicas para profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin can manage all profiles" ON profiles FOR ALL TO authenticated USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- Politicas de RLS por Rol - Basadas en la tabla profiles
-- Función auxiliar para verificar el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clientes: Admin tiene acceso total, Cajero y Lector solo lectura
CREATE POLICY "Admin CRUD customers" ON customers FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read customers" ON customers FOR SELECT TO authenticated 
  USING (get_user_role() IN ('admin', 'cashier', 'meter_reader'));

-- Recibos: Admin tiene acceso total, Cajero actualiza para pagos
CREATE POLICY "Admin CRUD receipts" ON receipts FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read receipts" ON receipts FOR SELECT TO authenticated 
  USING (get_user_role() IN ('admin', 'cashier', 'meter_reader'));

CREATE POLICY "Cashier update receipts" ON receipts FOR UPDATE TO authenticated 
  USING (get_user_role() IN ('admin', 'cashier'));

-- Pagos: Admin y Cajero pueden crear y leer
CREATE POLICY "Admin CRUD payments" ON payments FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read payments" ON payments FOR SELECT TO authenticated 
  USING (get_user_role() IN ('admin', 'cashier'));

CREATE POLICY "Cashier insert payments" ON payments FOR INSERT TO authenticated 
  WITH CHECK (get_user_role() IN ('admin', 'cashier'));

-- Auditoría: Solo Admin lee, sistema inserta
CREATE POLICY "Admin read logs" ON audit_logs FOR SELECT TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "System insert logs" ON audit_logs FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Lecturas: Admin CRUD, Lector inserta, todos leen
CREATE POLICY "Admin CRUD readings" ON readings FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read readings" ON readings FOR SELECT TO authenticated 
  USING (get_user_role() IN ('admin', 'cashier', 'meter_reader'));

CREATE POLICY "Reader insert readings" ON readings FOR INSERT TO authenticated 
  WITH CHECK (get_user_role() IN ('admin', 'meter_reader'));

-- Tarifas: Admin CRUD, todos leen
CREATE POLICY "Admin CRUD tariffs" ON tariffs FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read tariffs" ON tariffs FOR SELECT TO authenticated 
  USING (true);

-- Tramos de tarifa: Admin CRUD, todos leen
CREATE POLICY "Admin CRUD tariff_tiers" ON tariff_tiers FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read tariff_tiers" ON tariff_tiers FOR SELECT TO authenticated 
  USING (true);

-- Conceptos de cobro: Admin CRUD, todos leen
CREATE POLICY "Admin CRUD billing_concepts" ON billing_concepts FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read billing_concepts" ON billing_concepts FOR SELECT TO authenticated 
  USING (true);

-- Periodos de facturación: Admin CRUD, todos leen
CREATE POLICY "Admin CRUD billing_periods" ON billing_periods FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Users read billing_periods" ON billing_periods FOR SELECT TO authenticated 
  USING (true);

-- Cierres de caja: Admin ve todo, Cajero solo los suyos
CREATE POLICY "Admin CRUD cash_closures" ON cash_closures FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Cashier read own closures" ON cash_closures FOR SELECT TO authenticated 
  USING (cashier_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Cashier insert closures" ON cash_closures FOR INSERT TO authenticated 
  WITH CHECK (cashier_id = auth.uid() AND get_user_role() IN ('admin', 'cashier'));

-- Configuración municipal: Solo Admin
CREATE POLICY "Admin CRUD municipality_config" ON municipality_config FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');
