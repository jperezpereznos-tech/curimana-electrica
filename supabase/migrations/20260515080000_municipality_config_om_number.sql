ALTER TABLE municipality_config ADD COLUMN IF NOT EXISTS om_number TEXT;

UPDATE municipality_config SET om_number = 'OM N° 006-2019-MDC' WHERE om_number IS NULL;

UPDATE municipality_config SET ruc = '20232953421' WHERE ruc = '20123456789';
