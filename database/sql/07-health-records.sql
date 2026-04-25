-- ============================================================================
-- HEALTH RECORDS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('doctor_visit', 'vaccine', 'medication', 'allergy', 'condition', 'test')),
  title TEXT NOT NULL,
  description TEXT,
  date_recorded DATE NOT NULL,
  file_url TEXT,
  storage_key TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  reaction_description TEXT,
  photo_url TEXT,
  discovered_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  reason TEXT,
  start_date DATE,
  end_date DATE,
  effectiveness_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_records_baby_id ON health_records(baby_id);
CREATE INDEX IF NOT EXISTS idx_health_records_type ON health_records(record_type);
