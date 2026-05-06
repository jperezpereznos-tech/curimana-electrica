DROP POLICY IF EXISTS "Reader read assigned sector customers" ON customers;
CREATE POLICY "Reader read assigned sector customers" ON customers
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND sector_id = (SELECT public.get_user_sector_id())
  )
);

DROP POLICY IF EXISTS "Authenticated read profiles (restricted)" ON profiles;
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

DROP POLICY IF EXISTS "Reader insert readings" ON readings;
CREATE POLICY "Reader insert readings" ON readings
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.get_user_role()) IN ('admin', 'meter_reader')
  AND (
    (SELECT public.get_user_role()) = 'admin'
    OR (SELECT sector_id FROM customers WHERE id = readings.customer_id) = (SELECT public.get_user_sector_id())
  )
);

DROP POLICY IF EXISTS "Users read readings" ON readings;
CREATE POLICY "Users read readings" ON readings
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND (SELECT sector_id FROM customers WHERE id = readings.customer_id) = (SELECT public.get_user_sector_id())
  )
);

DROP POLICY IF EXISTS "Users read receipts" ON receipts;
CREATE POLICY "Users read receipts" ON receipts
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND (SELECT sector_id FROM customers WHERE id = receipts.customer_id) = (SELECT public.get_user_sector_id())
  )
);
