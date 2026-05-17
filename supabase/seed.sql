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

-- 4. Tarifas (Monofásico + Trifásico)
INSERT INTO tariffs (name, connection_type, is_active) VALUES
('BTSB - Monofásico', 'monofásico', true),
('BTSB - Trifásico', 'trifásico', true)
ON CONFLICT DO NOTHING;

-- Insertar tramos tarifarios, conceptos y clientes de prueba
DO $$
DECLARE
    v_mono_id UUID;
    v_tri_id UUID;
BEGIN
    SELECT id INTO v_mono_id FROM tariffs WHERE name = 'BTSB - Monofásico' LIMIT 1;
    SELECT id INTO v_tri_id FROM tariffs WHERE name = 'BTSB - Trifásico' LIMIT 1;

    -- 5. Tramos de Tarifa Monofásico (escalonado BT-1)
    IF NOT EXISTS (SELECT 1 FROM tariff_tiers WHERE tariff_id = v_mono_id) THEN
      INSERT INTO tariff_tiers (tariff_id, min_kwh, max_kwh, price_per_kwh, order_index) VALUES
      (v_mono_id, 0, 30, 0.31, 1),
      (v_mono_id, 30, 100, 0.62, 2),
      (v_mono_id, 100, NULL, 0.64, 3);
    END IF;

    -- 6. Tramos de Tarifa Trifásico (escalonado BT-3)
    IF NOT EXISTS (SELECT 1 FROM tariff_tiers WHERE tariff_id = v_tri_id) THEN
      INSERT INTO tariff_tiers (tariff_id, min_kwh, max_kwh, price_per_kwh, order_index) VALUES
      (v_tri_id, 0, 30, 0.39, 1),
      (v_tri_id, 30, 100, 0.70, 2),
      (v_tri_id, 100, NULL, 0.76, 3);
    END IF;

    -- 7. Conceptos de Cobro
    INSERT INTO billing_concepts (code, name, amount, type, applies_to_tariff_id, is_active) VALUES
      ('CF', 'Cargo Fijo Monofásico', 3.50, 'fixed', v_mono_id, true),
      ('CF3', 'Cargo Fijo Trifásico', 5.20, 'fixed', v_tri_id, true),
      ('AP', 'Alumbrado Público', 4.20, 'fixed', NULL, true),
      ('MT', 'Mantenimiento y Reposición', 1.50, 'fixed', NULL, true),
      ('IGV', 'IGV (18%)', 18.00, 'percentage', NULL, false)
    ON CONFLICT (code) DO NOTHING;

    -- 8. Clientes de Prueba (agregado trifásico)
    INSERT INTO customers (full_name, supply_number, address, sector, sector_id, tariff_id, connection_type)
    SELECT c.full_name, c.supply_number, c.address, c.sector, s.id, c.tariff_id, c.connection_type
    FROM (VALUES
      ('Juan Perez Garcia', '100000001', 'Jr. Lima 123', 'Sector 1', v_mono_id, 'monofásico'),
      ('Maria Rodriguez Soto', '100000002', 'Av. Ucayali 456', 'Sector 1', v_mono_id, 'monofásico'),
      ('Carlos Mendoza Ruiz', '100000003', 'Calle Comercio 789', 'Sector 2', v_mono_id, 'monofásico'),
      ('Ana Torres Vila', '100000004', 'Jr. Iquitos 321', 'Sector 2', v_mono_id, 'monofásico'),
      ('Luis Quispe Huaman', '100000005', 'Av. Principal 101', 'Sector 3', v_mono_id, 'monofásico'),
      ('Comercial Curimana S.A.C.', '100000006', 'Av. Comercio 555', 'Sector 2', v_tri_id, 'trifásico'),
      ('Hotel El Mirador', '100000007', 'Jr. Lima 999', 'Sector 1', v_tri_id, 'trifásico')
    ) AS c(full_name, supply_number, address, sector, tariff_id, connection_type)
    JOIN sectors s ON s.code = CASE c.sector
      WHEN 'Sector 1' THEN 'S1'
      WHEN 'Sector 2' THEN 'S2'
      WHEN 'Sector 3' THEN 'S3'
      ELSE 'S1'
    END
    WHERE NOT EXISTS (SELECT 1 FROM customers WHERE supply_number = c.supply_number);

END $$;

-- 9. Periodos de Facturación
INSERT INTO billing_periods (name, year, month, start_date, end_date, is_closed)
SELECT 'ABRIL 2026', 2026, 4, '2026-03-26', '2026-04-25', false
WHERE NOT EXISTS (SELECT 1 FROM billing_periods WHERE year = 2026 AND month = 4);

INSERT INTO billing_periods (name, year, month, start_date, end_date, is_closed)
SELECT 'MAYO 2026', 2026, 5, '2026-04-26', '2026-05-25', false
WHERE NOT EXISTS (SELECT 1 FROM billing_periods WHERE year = 2026 AND month = 5);

-- ============================================================================
-- NOTA: Los usuarios se crean desde el dashboard de Supabase Auth
-- (Authentication → Users → New User)
-- El trigger on_auth_user_created creará automáticamente el perfil.
-- Luego, para asignar rol de admin:
--   UPDATE profiles SET role = 'admin' WHERE email = 'admin@curimana.gob.pe';
-- ============================================================================
