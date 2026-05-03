-- ============================================================================
-- CURIMANA ELÉCTRICA - Datos Iniciales (Seed)
-- Ejecutar después de schema.sql
-- ============================================================================

-- 1. Roles
INSERT INTO roles (id, description) VALUES
('admin', 'Administrador del sistema'),
('cashier', 'Cajero - Cobros y cierres de caja'),
('meter_reader', 'Lecturista - Registro de consumos en campo')
ON CONFLICT (id) DO NOTHING;

-- 2. Sectores del distrito de Curimaná
INSERT INTO sectors (name, code, description) VALUES
('Sector 1 - Centro', 'S1', 'Zona central del distrito'),
('Sector 2 - Comercio', 'S2', 'Zona comercial'),
('Sector 3 - Residencial', 'S3', 'Zona residencial'),
('Sector 4 - Rural', 'S4', 'Zona rural y anexos')
ON CONFLICT (code) DO NOTHING;

-- 3. Configuración Municipal
INSERT INTO municipality_config (ruc, name, address, billing_cut_day, payment_grace_days)
SELECT '20123456789', 'Municipalidad Distrital de Curimana', 'Plaza de Armas S/N, Curimana', 26, 20
WHERE NOT EXISTS (SELECT 1 FROM municipality_config);

-- 3. Tarifas
INSERT INTO tariffs (name, connection_type, is_active)
SELECT 'BTSB - Monofásico', 'monofásico', true
WHERE NOT EXISTS (SELECT 1 FROM tariffs WHERE name = 'BTSB - Monofásico');

-- Insertar tramos tarifarios, conceptos y clientes de prueba
DO $$
DECLARE
    v_tariff_id UUID;
BEGIN
    SELECT id INTO v_tariff_id FROM tariffs WHERE name = 'BTSB - Monofásico' LIMIT 1;

    -- 4. Tramos de Tarifa (escalonado)
    IF NOT EXISTS (SELECT 1 FROM tariff_tiers WHERE tariff_id = v_tariff_id) THEN
      INSERT INTO tariff_tiers (tariff_id, min_kwh, max_kwh, price_per_kwh, order_index) VALUES
      (v_tariff_id, 0, 30, 0.31, 1),
      (v_tariff_id, 31, 100, 0.62, 2),
      (v_tariff_id, 101, NULL, 0.64, 3);
    END IF;

    -- 5. Conceptos de Cobro
    INSERT INTO billing_concepts (code, name, amount, type, applies_to_tariff_id) VALUES
    ('CF', 'Cargo Fijo', 3.50, 'fixed', v_tariff_id),
    ('AP', 'Alumbrado Público', 4.20, 'fixed', NULL),
    ('MT', 'Mantenimiento y Reposición', 1.50, 'fixed', NULL),
    ('IGV', 'IGV (18%)', 18.00, 'percentage', NULL)
    ON CONFLICT (code) DO NOTHING;

-- 6. Clientes de Prueba
  INSERT INTO customers (full_name, supply_number, address, sector, sector_id, tariff_id, connection_type)
  SELECT c.full_name, c.supply_number, c.address, c.sector, s.id, c.tariff_id, c.connection_type
  FROM (VALUES
    ('Juan Perez Garcia', '100000001', 'Jr. Lima 123', 'Sector 1', v_tariff_id, 'monofásico'),
    ('Maria Rodriguez Soto', '100000002', 'Av. Ucayali 456', 'Sector 1', v_tariff_id, 'monofásico'),
    ('Carlos Mendoza Ruiz', '100000003', 'Calle Comercio 789', 'Sector 2', v_tariff_id, 'monofásico'),
    ('Ana Torres Vila', '100000004', 'Jr. Iquitos 321', 'Sector 2', v_tariff_id, 'monofásico'),
    ('Luis Quispe Huaman', '100000005', 'Av. Principal 101', 'Sector 3', v_tariff_id, 'monofásico')
  ) AS c(full_name, supply_number, address, sector, tariff_id, connection_type)
  JOIN sectors s ON s.code = CASE c.sector
    WHEN 'Sector 1' THEN 'S1'
    WHEN 'Sector 2' THEN 'S2'
    WHEN 'Sector 3' THEN 'S3'
    ELSE 'S1'
  END
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE supply_number = c.supply_number);

END $$;

-- 7. Periodo de Facturación actual
INSERT INTO billing_periods (name, year, month, start_date, end_date, is_closed)
SELECT 'ABRIL 2026', 2026, 4, '2026-03-26', '2026-04-25', false
WHERE NOT EXISTS (SELECT 1 FROM billing_periods WHERE year = 2026 AND month = 4);

-- ============================================================================
-- NOTA: Los usuarios se crean desde el dashboard de Supabase Auth
-- (Authentication → Users → New User)
-- El trigger on_auth_user_created creará automáticamente el perfil.
-- Luego, para asignar rol de admin:
--   UPDATE profiles SET role = 'admin' WHERE email = 'admin@curimana.gob.pe';
-- ============================================================================
