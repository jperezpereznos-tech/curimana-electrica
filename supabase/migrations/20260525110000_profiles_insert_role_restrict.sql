-- ============================================================================
-- CURIMANA ELECTRICA - Migracion: profiles INSERT role restrict
-- Fecha: 2026-05-25
-- Descripcion:
--   La policy "Trigger insert profiles" permitia que cualquier usuario
--   autenticado insertara su propio profile con cualquier rol.
--   Ahora restringe a role = 'meter_reader' para que coincida con el
--   comportamiento del trigger handle_new_user().
-- ============================================================================

DROP POLICY IF EXISTS "Trigger insert profiles" ON profiles;

CREATE POLICY "Trigger insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()) AND role = 'meter_reader');