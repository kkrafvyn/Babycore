-- ============================================================================
-- DOCTOR INTEGRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  report_url TEXT NOT NULL,
  storage_key TEXT,
  report_type TEXT,
  date_range_start DATE,
  date_range_end DATE,
  shared_token TEXT UNIQUE,
  shared_with TEXT[],
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pediatrician_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  clinic_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  specialty TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctor_reports_baby_id ON doctor_reports(baby_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reports_shared_token ON doctor_reports(shared_token);
