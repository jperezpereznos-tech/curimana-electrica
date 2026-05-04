-- Add received_amount, change_amount, cash_closure_id to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS received_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_closure_id UUID REFERENCES cash_closures(id);

-- Add CHECK constraint for method values
ALTER TABLE payments
  ADD CONSTRAINT payments_method_check CHECK (method IN ('cash', 'transfer', 'card'));

-- Index for querying payments by cash closure
CREATE INDEX IF NOT EXISTS idx_payments_cash_closure_id ON payments(cash_closure_id);
