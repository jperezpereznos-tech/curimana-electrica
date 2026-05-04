-- ============================================================================
-- CURIMANA ELÉCTRICA - Migración: RLS por sector para lecturadores
-- Fecha: 2026-05-04
-- Descripción: Restringe meter_reader a solo ver/lecturar clientes de su sector
-- asignado. Si assigned_sector_id es NULL, el lecturador puede ver todos los
-- clientes (compatibilidad hacia atrás).
-- ============================================================================

-- ── customers: Reemplazar política "Users read customers" con políticas por rol ──

DROP POLICY IF EXISTS "Users read customers" ON customers;

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

-- ── readings: Reemplazar políticas para restringir INSERT y SELECT por sector ──

DROP POLICY IF EXISTS "Reader insert readings" ON readings;

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

DROP POLICY IF EXISTS "Users read readings" ON readings;

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
