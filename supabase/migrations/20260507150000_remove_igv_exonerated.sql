-- ============================================================================
-- Remove IGV from billing calculations (Ucayali is exonerated)
-- IGV can be re-enabled in the future by activating the IGV billing concept
-- from the admin UI (Conceptos de Cobro).
-- ============================================================================

-- 1. Recalculate receipts that had IGV baked into total_amount
-- total_amount was: subtotal + igv + previous_debt
-- total_amount now: subtotal + previous_debt
UPDATE receipts
SET total_amount = subtotal + COALESCE(previous_debt, 0),
    igv = 0
WHERE igv > 0;

-- 2. Recalculate customer debts based on corrected receipt totals
-- This uses the existing RPC function
DO $$
DECLARE
  customer_record RECORD;
BEGIN
  FOR customer_record IN
    SELECT DISTINCT customer_id FROM receipts WHERE customer_id IS NOT NULL
  LOOP
    PERFORM recalculate_customer_debt(customer_record.customer_id);
  END LOOP;
END $$;

-- 3. Deactivate IGV billing concept if it exists
UPDATE billing_concepts SET is_active = false WHERE code = 'IGV';
