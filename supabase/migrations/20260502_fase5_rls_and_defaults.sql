-- ============================================================================
-- CURIMANA ELÉCTRICA - Migración Fase 5
-- Aplicar sobre la base de datos existente en Supabase
-- Cambios: profiles RLS (sin recursión), cash_closures DEFAULT + UPDATE policy,
--          close_billing_period admin check, readings FK, billing_concepts CHECK
-- ============================================================================

-- ============================================================================
-- 1. PROFILES RLS: Eliminar políticas que causan recursión y crear las nuevas
--    (Las políticas FOR ALL que usan get_user_role() causan recursión infinita
--     porque get_user_role() consulta profiles, que a su vez evalúa las RLS)
-- ============================================================================

-- Drop old policies (IF EXISTS para idempotencia)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin delete profiles" ON profiles;

-- También eliminar la vieja política "Admin can manage all profiles" si existe
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;

-- Crear políticas nuevas (sin usar get_user_role() para evitar recursión)
-- SELECT: cualquier usuario autenticado puede leer todos los profiles
-- (necesario para JOINs en receipts, payments, etc.)
CREATE POLICY "Authenticated read all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- UPDATE: usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- INSERT: solo admin (usando auth.users.raw_app_meta_data en vez de get_user_role)
CREATE POLICY "Admin insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_app_meta_data->>'role' = 'admin'
  ));

-- UPDATE: admin puede actualizar cualquier perfil
CREATE POLICY "Admin update all profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_app_meta_data->>'role' = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_app_meta_data->>'role' = 'admin'
  ));

-- DELETE: solo admin
CREATE POLICY "Admin delete profiles" ON profiles
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_app_meta_data->>'role' = 'admin'
  ));

-- ============================================================================
-- 2. CASH_CLOSURES: Agregar DEFAULT auth.uid() en cashier_id
-- ============================================================================

-- Cambiar el DEFAULT de cashier_id para que use auth.uid() automáticamente
ALTER TABLE cash_closures
  ALTER COLUMN cashier_id SET DEFAULT auth.uid();

-- ============================================================================
-- 3. CASH_CLOSURES: Agregar política UPDATE para cajeros (sus propios cierres)
-- ============================================================================

DROP POLICY IF EXISTS "Cashier update own closures" ON cash_closures;

CREATE POLICY "Cashier update own closures" ON cash_closures
  FOR UPDATE TO authenticated
  USING (cashier_id = (SELECT auth.uid()))
  WITH CHECK (cashier_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. CLOSE_BILLING_PERIOD: Agregar verificación de rol admin
--    (La función actual no verifica quién la ejecuta)
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
  -- Verificar que el usuario es admin
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  IF v_user_role != 'admin' THEN
    RETURN QUERY SELECT false, p_period_id::uuid;
    RETURN;
  END IF;

  -- Verificar que el periodo existe y no está cerrado
  SELECT is_closed INTO v_is_closed FROM billing_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, p_period_id::uuid;
    RETURN;
  END IF;

  IF v_is_closed THEN
    RETURN QUERY SELECT false, p_period_id::uuid;
    RETURN;
  END IF;

  -- Cerrar el periodo atómicamente
  UPDATE billing_periods
  SET is_closed = true, closed_at = now()
  WHERE id = p_period_id;

  RETURN QUERY SELECT true, p_period_id::uuid;
END;
$$;

-- ============================================================================
-- 5. READINGS: Agregar FK en meter_reader_id -> profiles(id)
-- ============================================================================

-- Primero verificar que no exista ya la constraint
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
