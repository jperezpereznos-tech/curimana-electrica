-- ============================================================================
-- CURIMANA ELÉCTRICA - Migración Fase 5
-- Aplicar sobre la base de datos existente en Supabase
-- Cambios: profiles RLS (sin recursión), cash_closures DEFAULT + UPDATE policy,
--          close_billing_period admin check, readings FK, billing_concepts CHECK
-- ============================================================================

-- ============================================================================
-- 1. PROFILES RLS: Simplificar a solo 2 políticas seguras
--
--    PROBLEMA: Las políticas anteriores causaban recursión infinita porque:
--    a) Usaban get_user_role() que hace SELECT sobre profiles (ciclo RLS)
--    b) Consultaban auth.users (tabla oculta, sin permiso para authenticated)
--
--    SOLUCIÓN: La app no tiene UI para que admins gestionen perfiles de otros
--    usuarios (se hace vía triggers de auth y superusuario). Solo necesitamos:
--    - SELECT para todos (necesario para JOINs: nombres de cajeros en recibos, etc.)
--    - UPDATE solo para el propio usuario
-- ============================================================================

-- Eliminar TODAS las políticas existentes en profiles (incluidas las recursivas)
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Polísticas finales (4, sin recursión posible — get_user_role es SECURITY DEFINER)
CREATE POLICY "Authenticated read all profiles" ON profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admin insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin update all profiles" ON profiles
FOR UPDATE TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- ============================================================================
-- 2. CASH_CLOSURES: DEFAULT auth.uid() en cashier_id
-- ============================================================================

ALTER TABLE cash_closures
  ALTER COLUMN cashier_id SET DEFAULT auth.uid();

-- ============================================================================
-- 3. CASH_CLOSURES: Policy UPDATE para cajeros (sus propios cierres)
-- ============================================================================

DROP POLICY IF EXISTS "Cashier update own closures" ON cash_closures;

CREATE POLICY "Cashier update own closures" ON cash_closures
  FOR UPDATE TO authenticated
  USING (cashier_id = (SELECT auth.uid()))
  WITH CHECK (cashier_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. CLOSE_BILLING_PERIOD: Verificación de rol admin
-- ============================================================================

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

  UPDATE billing_periods
  SET is_closed = true, closed_at = now()
  WHERE id = p_period_id;

  RETURN QUERY SELECT true, p_period_id::uuid;
END;
$$;

-- ============================================================================
-- 5. READINGS: Agregar FK meter_reader_id -> profiles(id)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'readings_meter_reader_id_fkey'
    AND table_name = 'readings'
  ) THEN
    ALTER TABLE readings
      ADD CONSTRAINT readings_meter_reader_id_fkey
      FOREIGN KEY (meter_reader_id) REFERENCES profiles(id);
  END IF;
END $$;

-- ============================================================================
-- 6. BILLING_CONCEPTS: Agregar CHECK constraint en type
-- ============================================================================

ALTER TABLE billing_concepts
  DROP CONSTRAINT IF EXISTS billing_concepts_type_check;

ALTER TABLE billing_concepts
  ADD CONSTRAINT billing_concepts_type_check
  CHECK (type IN ('fixed', 'percentage', 'per_kwh'));

-- ============================================================================
-- 7. RECEIPTS: Agregar columna igv
-- ============================================================================

ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS igv NUMERIC DEFAULT 0;

-- ============================================================================
-- 8. PAYMENTS: Agregar columna status y voided_at
-- ============================================================================

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided'));

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- ============================================================================
-- 9. STORAGE: Crear bucket reading-photos si no existe
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

-- ============================================================================
-- 10. READINGS: Policy UPDATE para lectores (sus propias lecturas)
-- ============================================================================

DROP POLICY IF EXISTS "Reader update own readings" ON readings;
CREATE POLICY "Reader update own readings" ON readings
FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin', 'meter_reader') AND meter_reader_id = auth.uid())
WITH CHECK (get_user_role() IN ('admin', 'meter_reader'));

-- ============================================================================
-- 12. ATOMIC DEBT FUNCTIONS: Evitar race condition en current_debt
-- ============================================================================

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

REVOKE EXECUTE ON FUNCTION public.recalculate_customer_debt(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recalculate_customer_debt(UUID) TO authenticated;

-- ============================================================================
-- 11. RECEIPTS: Drop orphan payment_id column (no FK, never used)
-- ============================================================================

ALTER TABLE receipts DROP COLUMN IF EXISTS payment_id;
