-- ============================================================================
-- CURIMANA ELÉCTRICA - Migración: Sectores + sector_id en customers/profiles
-- Aplicar sobre la base de datos existente en Supabase
-- ============================================================================

-- 1. Crear tabla sectors si no existe
CREATE TABLE IF NOT EXISTS sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Agregar assigned_sector_id a profiles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assigned_sector_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN assigned_sector_id UUID REFERENCES sectors(id);
  END IF;
END $$;

-- 3. Agregar sector_id a customers si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'sector_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN sector_id UUID REFERENCES sectors(id);
  END IF;
END $$;

-- 4. Insertar sectores por defecto
INSERT INTO sectors (name, code, description) VALUES
  ('Sector 1 Centro', 'S1', 'Zona centro del distrito'),
  ('Sector 2 Comercio', 'S2', 'Zona comercial'),
  ('Sector 3 Residencial', 'S3', 'Zona residencial'),
  ('Sector 4 Rural', 'S4', 'Zona rural')
ON CONFLICT (name) DO NOTHING;

-- 5. Backfill sector_id basándose en el campo de texto sector
UPDATE customers c
SET sector_id = s.id
FROM sectors s
WHERE c.sector_id IS NULL
  AND c.sector IS NOT NULL
  AND (
    s.name ILIKE '%' || c.sector || '%'
    OR s.code ILIKE c.sector
    OR c.sector ILIKE '%' || s.code || '%'
  );

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_customers_sector_id ON customers(sector_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_sector_id ON profiles(assigned_sector_id);

-- 7. RLS en sectors
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin CRUD sectors" ON sectors;
CREATE POLICY "Admin CRUD sectors" ON sectors
FOR ALL TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Users read sectors" ON sectors;
CREATE POLICY "Users read sectors" ON sectors
FOR SELECT TO authenticated
USING (true);
