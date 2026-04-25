-- ============================================================================
-- MEAL PLANNING & NUTRITION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  age_in_months INT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('solids_intro', 'finger_foods', 'mixed', 'toddler')),
  start_date DATE NOT NULL,
  end_date DATE,
  weekly_plan JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meals_logged (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_name TEXT NOT NULL,
  ingredients TEXT[] NOT NULL,
  calories INT,
  allergens TEXT[],
  baby_reaction TEXT,
  reaction_severity TEXT CHECK (reaction_severity IN ('none', 'mild', 'moderate', 'severe')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL UNIQUE,
  category TEXT,
  calories_per_100g INT,
  protein_g DECIMAL(5,2),
  fat_g DECIMAL(5,2),
  carbs_g DECIMAL(5,2),
  common_allergen BOOLEAN DEFAULT false,
  allergen_group TEXT,
  introduction_age_months INT,
  preparation_tips TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  list_date DATE NOT NULL,
  items JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  estimated_cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_baby_id ON meal_plans(baby_id);
CREATE INDEX IF NOT EXISTS idx_meals_logged_baby_id ON meals_logged(baby_id);
CREATE INDEX IF NOT EXISTS idx_meals_logged_date ON meals_logged(meal_date);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_baby_id ON shopping_lists(baby_id);
