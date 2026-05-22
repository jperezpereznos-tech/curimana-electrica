-- =====================================================
-- Fix all audit data issues from real receipt comparison
-- Supply 608132425, JUNIO 2025 receipt vs live DB
-- =====================================================

-- 0. Fix orphan triggers: tables with update_updated_at trigger but no updated_at column
DROP TRIGGER IF EXISTS tariff_tier_history_updated_at ON tariff_tier_history;
DROP TRIGGER IF EXISTS billing_concepts_updated_at ON billing_concepts;
DROP TRIGGER IF EXISTS sectors_updated_at ON sectors;

-- 1. Fix tier 2 min_kwh: 31 → 30 (closes the kWh 30-31 billing gap)
UPDATE tariff_tiers
SET min_kwh = 30
WHERE id = '1a9427f8-4978-448d-a73d-05fe576dbf3e';

-- 2. Fix tier 2 price: 0.63 → 0.62
UPDATE tariff_tiers
SET price_per_kwh = 0.62
WHERE id = '1a9427f8-4978-448d-a73d-05fe576dbf3e';

-- 3. Add missing tier 3 (100+ kWh @ S/0.64)
INSERT INTO tariff_tiers (tariff_id, min_kwh, max_kwh, price_per_kwh, order_index)
VALUES ('3bb5ec7b-1e54-4c6e-8fd7-9d0036250409', 100, NULL, 0.64, 3);

-- 4. Fix Alumbrado Público: S/ 3.00 → S/ 1.68
UPDATE billing_concepts
SET amount = 1.68
WHERE code = 'AP';

-- 5. Add missing Cargo Fijo: S/ 4.37, fixed (monofásico only)
INSERT INTO billing_concepts (code, name, amount, type, applies_to_tariff_id, is_active)
VALUES ('CF', 'Cargo Fijo', 4.37, 'fixed', '3bb5ec7b-1e54-4c6e-8fd7-9d0036250409', true)
ON CONFLICT (code) DO NOTHING;

-- 6. Add missing billing concepts (at S/ 0, needed for receipt display)
INSERT INTO billing_concepts (code, name, amount, type, applies_to_tariff_id, is_active) VALUES
('RRS', 'Recolección Residuos Sólidos', 0, 'fixed', NULL, true),
('SE', 'Serenazgo', 0, 'fixed', NULL, true),
('BC', 'Barrido de Calles', 0, 'fixed', NULL, true),
('PJ', 'Parques y Jardines', 0, 'fixed', NULL, true)
ON CONFLICT (code) DO NOTHING;

-- 7. Add missing trifásica tariff with 3 tiers (BT5B-RESIDENCIAL - TRIFÁSICO)
INSERT INTO tariffs (id, name, connection_type, is_active)
VALUES ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'BT5B-RESIDENCIAL - TRIFÁSICO', 'trifásico', true);

INSERT INTO tariff_tiers (tariff_id, min_kwh, max_kwh, price_per_kwh, order_index) VALUES
('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 0, 30, 0.39, 1),
('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 30, 100, 0.70, 2),
('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 100, NULL, 0.76, 3);

-- Add Cargo Fijo for trifásica
INSERT INTO billing_concepts (code, name, amount, type, applies_to_tariff_id, is_active)
VALUES ('CF3', 'Cargo Fijo Trifásico', 5.20, 'fixed', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', true)
ON CONFLICT (code) DO NOTHING;

-- 8. Rename tariff: "residencial" → "BT5B-RESIDENCIAL - MONOFÁSICO"
UPDATE tariffs
SET name = 'BT5B-RESIDENCIAL - MONOFÁSICO'
WHERE id = '3bb5ec7b-1e54-4c6e-8fd7-9d0036250409';

-- 9. Add real sectors (PLAZA MAYOR from receipt + additional districts)
INSERT INTO sectors (name, code) VALUES
('PLAZA MAYOR', 'S2'),
('CENTRO', 'S3'),
('SAN JUAN', 'S4'),
('NUEVO CURIMANA', 'S5'),
('SAN MIGUEL', 'S6'),
('SANTA ROSA', 'S7'),
('LA FLORIDA', 'S8'),
('EL PORVENIR', 'S9'),
('BUENOS AIRES', 'S10')
ON CONFLICT (name) DO NOTHING;

-- 10. Remove "2026" from municipality name
UPDATE municipality_config
SET name = 'Municipalidad Distrital de Curimana'
WHERE id = '495b5428-a020-4d94-abd5-7398592b2bb5';
