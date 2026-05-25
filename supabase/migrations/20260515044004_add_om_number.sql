ALTER TABLE public.municipality_config
ADD COLUMN IF NOT EXISTS om_number text DEFAULT 'OM N° 006-2019-MDC';

UPDATE public.municipality_config
SET om_number = 'OM N° 006-2019-MDC'
WHERE om_number IS NULL;
