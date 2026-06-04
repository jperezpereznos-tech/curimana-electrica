-- Install pg_trgm extension for ILIKE search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for customer ILIKE search
CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm
  ON customers USING GIN (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_supply_number_trgm
  ON customers USING GIN (supply_number gin_trgm_ops);

-- Index for getCurrentPeriod() — filters by is_closed
CREATE INDEX IF NOT EXISTS idx_billing_periods_is_closed
  ON billing_periods (is_closed) WHERE is_closed = false;

-- Change calculate_energy_amount from VOLATILE to STABLE (pure function, no side effects)
CREATE OR REPLACE FUNCTION calculate_energy_amount(
  p_consumption numeric,
  p_tariff_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_total numeric := 0;
  v_tier_consumption numeric;
  v_tier record;
BEGIN
  FOR v_tier IN
    SELECT min_kwh, max_kwh, price_per_kwh
    FROM tariff_tiers
    WHERE tariff_id = p_tariff_id
    ORDER BY min_kwh ASC
  LOOP
    IF p_consumption <= v_tier.min_kwh THEN
      CONTINUE;
    END IF;

    IF v_tier.max_kwh IS NULL THEN
      v_tier_consumption := p_consumption - v_tier.min_kwh;
    ELSE
      v_tier_consumption := LEAST(p_consumption, v_tier.max_kwh) - v_tier.min_kwh;
    END IF;

    v_total := v_total + (v_tier_consumption * v_tier.price_per_kwh);
  END LOOP;

  RETURN ROUND(v_total, 2);
END;
$$;
