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

-- 2. Configuración Municipal
INSERT INTO municipality_config (ruc, name, address, billing_cut_day, payment_grace_days)
VALUES ('20123456789', 'Municipalidad Distrital de Curimana', 'Plaza de Armas S/N, Curimana', 26, 20)
ON CONFLICT DO NOTHING;

-- 3. Tarifas
INSERT INTO tariffs (name, connection_type, is_active)
VALUES ('BTSB - Monofásico', 'monofásico', true)
ON CONFLICT DO NOTHING;

-- Insertar tramos tarifarios, conceptos y clientes de prueba
DO $$
DECLARE
    v_tariff_id UUID;
BEGIN
    SELECT id INTO v_tariff_id FROM tariffs WHERE name = 'BTSB - Monofásico' LIMIT 1;

    -- 4. Tramos de Tarifa (escalonado)
    INSERT INTO tariff_tiers (tariff_id, min_kwh, max_kwh, price_per_kwh, order_index) VALUES
    (v_tariff_id, 0, 30, 0.31, 1),
    (v_tariff_id, 30, 100, 0.62, 2),
    (v_tariff_id, 100, NULL, 0.64, 3)
    ON CONFLICT DO NOTHING;

    -- 5. Conceptos de Cobro
    INSERT INTO billing_concepts (code, name, amount, type, applies_to_tariff_id) VALUES
    ('CF', 'Cargo Fijo', 3.50, 'fixed', v_tariff_id),
    ('AP', 'Alumbrado Público', 4.20, 'fixed', NULL),
    ('MT', 'Mantenimiento y Reposición', 1.50, 'fixed', NULL),
    ('IGV', 'IGV (18%)', 18.00, 'percentage', NULL)
    ON CONFLICT (code) DO NOTHING;

    -- 6. Clientes de Prueba
    INSERT INTO customers (full_name, supply_number, address, sector, tariff_id, connection_type) VALUES
    ('Juan Perez Garcia', '100000001', 'Jr. Lima 123', 'Sector 1', v_tariff_id, 'monofásico'),
    ('Maria Rodriguez Soto', '100000002', 'Av. Ucayali 456', 'Sector 1', v_tariff_id, 'monofásico'),
    ('Carlos Mendoza Ruiz', '100000003', 'Calle Comercio 789', 'Sector 2', v_tariff_id, 'monofásico'),
    ('Ana Torres Vila', '100000004', 'Jr. Iquitos 321', 'Sector 2', v_tariff_id, 'monofásico'),
    ('Luis Quispe Huaman', '100000005', 'Av. Principal 101', 'Sector 3', v_tariff_id, 'monofásico')
    ON CONFLICT (supply_number) DO NOTHING;

END $$;

-- 7. Periodo de Facturación actual
INSERT INTO billing_periods (name, year, month, start_date, end_date, is_closed)
VALUES ('ABRIL 2026', 2026, 4, '2026-03-26', '2026-04-25', false)
ON CONFLICT (year, month) DO NOTHING;

-- ============================================================================
-- NOTA: Los usuarios se crean desde el dashboard de Supabase Auth
-- (Authentication → Users → New User)
-- El trigger on_auth_user_created creará automáticamente el perfil.
-- Luego, para asignar rol de admin:
--   UPDATE profiles SET role = 'admin' WHERE email = 'admin@curimana.gob.pe';
-- ============================================================================
