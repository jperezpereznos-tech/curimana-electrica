-- ============================================================================
-- Phase 3: CHECK constraints, redundant RLS cleanup, legacy column removal
-- ============================================================================

-- 1. Add missing CHECK constraints
ALTER TABLE tariff_tiers ADD CONSTRAINT tariff_tiers_price_positive CHECK (price_per_kwh >= 0);
ALTER TABLE tariff_tiers ADD CONSTRAINT tariff_tiers_min_less_than_max CHECK (min_kwh < max_kwh OR max_kwh IS NULL);
ALTER TABLE billing_periods ADD CONSTRAINT billing_periods_month_valid CHECK (month >= 1 AND month <= 12);
ALTER TABLE billing_periods ADD CONSTRAINT billing_periods_date_order CHECK (start_date < end_date);
ALTER TABLE billing_concepts ADD CONSTRAINT billing_concepts_amount_non_negative CHECK (amount >= 0);
ALTER TABLE receipts ADD CONSTRAINT receipts_fixed_charges_non_negative CHECK (fixed_charges >= 0);
ALTER TABLE receipts ADD CONSTRAINT receipts_subtotal_non_negative CHECK (subtotal >= 0);
ALTER TABLE receipts ADD CONSTRAINT receipts_paid_amount_non_negative CHECK (paid_amount >= 0);
ALTER TABLE receipts ADD CONSTRAINT receipts_previous_debt_non_negative CHECK (previous_debt >= 0);
ALTER TABLE payments ADD CONSTRAINT payments_received_amount_non_negative CHECK (received_amount >= 0);
ALTER TABLE payments ADD CONSTRAINT payments_change_amount_non_negative CHECK (change_amount >= 0);
ALTER TABLE cash_closures ADD CONSTRAINT cash_closures_total_collected_non_negative CHECK (total_collected >= 0);
ALTER TABLE customers ADD CONSTRAINT customers_current_debt_non_negative CHECK (current_debt >= 0);

-- 2. Fix redundant RLS policies on payments
-- Drop both overlapping SELECT policies and recreate a single canonical one
DROP POLICY IF EXISTS "Reader read payments" ON payments;
DROP POLICY IF EXISTS "Users read payments" ON payments;
CREATE POLICY "Users read payments" ON payments
FOR SELECT TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'cashier')
  OR (
    (SELECT public.get_user_role()) = 'meter_reader'
    AND EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = payments.receipt_id
      AND (SELECT sector_id FROM customers WHERE customers.id = receipts.customer_id) = (SELECT public.get_user_sector_id())
    )
  )
);

-- 3. Remove legacy customers.sector column and its index
DROP INDEX IF EXISTS idx_customers_sector;
ALTER TABLE customers DROP COLUMN IF EXISTS sector;
