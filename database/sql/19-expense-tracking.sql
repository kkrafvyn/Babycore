-- ============================================================================
-- BABY EXPENSE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS baby_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('formula', 'diapers', 'clothing', 'toys', 'medical', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  quantity INT DEFAULT 1,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('formula', 'diapers', 'clothing', 'toys', 'medical', 'other')),
  monthly_budget DECIMAL(10,2) NOT NULL,
  alert_threshold INT DEFAULT 80,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(baby_id, category)
);

CREATE TABLE IF NOT EXISTS expense_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  total_spent DECIMAL(10,2),
  budget_remaining DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_baby_expenses_baby_id ON baby_expenses(baby_id);
CREATE INDEX IF NOT EXISTS idx_baby_expenses_date ON baby_expenses(purchase_date);
CREATE INDEX IF NOT EXISTS idx_baby_expenses_category ON baby_expenses(category);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_baby_id ON expense_budgets(baby_id);
CREATE INDEX IF NOT EXISTS idx_expense_summary_baby_month ON expense_summary(baby_id, month);
