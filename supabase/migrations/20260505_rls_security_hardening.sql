-- ============================================================================
-- CURIMANA ELÉCTRICA - Migración: Security Hardening (RLS)
-- Fecha: 2026-05-05
-- Descripción:
--   1. Prevenir escalada de roles: profiles UPDATE propio no puede cambiar columna role
--   2. Cashier puede UPDATE payments (para void)
--   3. Meter_reader solo ve receipts de su sector
--   4. Profiles SELECT restringido (no exponer emails a meter_reader)
-- ============================================================================

-- ── 1. Profiles: Prevenir escalada de roles ──
-- Reemplazar "Users can update own profile" con versión que excluye columna role

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile (no role)" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM profiles WHERE id = auth.uid())
);

-- ── 2. Payments: Cashier puede UPDATE (para void) ──

CREATE POLICY "Cashier update payments" ON payments
FOR UPDATE TO authenticated
USING ((SELECT public.get_user_role()) IN ('admin', 'cashier'))
WITH CHECK ((SELECT public.get_user_role()) IN ('admin', 'cashier'));

-- ── 3. Receipts: Meter_reader solo ve receipts de clientes en su sector ──

DROP POLICY IF EXISTS "Users read receipts" ON receipts;

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

-- ── 4. Profiles: Meter_reader solo ve profiles de su sector (o propio) ──

DROP POLICY IF EXISTS "Authenticated read all profiles" ON profiles;

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
