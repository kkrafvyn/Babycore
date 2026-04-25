-- ============================================================================
-- SLEEP COACHING PROGRAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sleep_coaching_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('ferber', 'cio', 'gentling', 'pick_up_put_down', 'shush_pat')),
  target_bedtime TEXT NOT NULL,
  current_challenges TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES sleep_coaching_programs(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  session_date DATE NOT NULL,
  bedtime_achieved BOOLEAN,
  night_wakings INT,
  total_sleep_minutes INT,
  notes TEXT,
  parent_fatigue INT CHECK (parent_fatigue BETWEEN 1 AND 10),
  success_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep_coaching_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES sleep_coaching_programs(id) ON DELETE CASCADE,
  week_number INT,
  avg_sleep_minutes INT,
  nights_improved INT,
  parent_confidence INT,
  weekly_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sleep_programs_baby_id ON sleep_coaching_programs(baby_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_program_id ON sleep_coaching_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_date ON sleep_coaching_sessions(session_date);
