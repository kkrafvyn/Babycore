-- ============================================================================
-- DOCTOR ROLE & MEDICAL MANAGEMENT SYSTEM
-- Complete schema for doctor functionality
-- ============================================================================

-- 0. DOCTOR ROLE ADDITION TO USER_ROLES
-- ============================================================================
-- ALTER TABLE user_roles ADD CHECK (role IN ('admin', 'manager', 'user', 'caregiver', 'viewer', 'doctor'));
-- The above should be updated in existing migrations

-- 1. DOCTOR PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL, -- e.g., 'pediatrician', 'general_practitioner'
  license_number TEXT NOT NULL UNIQUE,
  medical_board TEXT, -- e.g., 'Medical Council of Nigeria'
  qualification TEXT NOT NULL, -- e.g., 'MD, Pediatrics'
  clinic_name TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  clinic_email TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  is_verified BOOLEAN DEFAULT false, -- Admin verification status
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES auth.users(id),
  years_of_experience INTEGER,
  languages_spoken TEXT[] DEFAULT ARRAY['English'],
  consultation_fee NUMERIC,
  availability_hours JSONB, -- e.g., {"monday": "09:00-17:00", "tuesday": null}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. DOCTOR-BABY ASSIGNMENT TABLE
-- ============================================================================
-- Links doctors to babies they monitor (with parental consent)
CREATE TABLE IF NOT EXISTS doctor_baby_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_reason TEXT, -- e.g., "Regular checkup", "Treatment"
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  parent_consent BOOLEAN DEFAULT true, -- Parent approval for doctor access
  consent_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(doctor_id, baby_id) -- One doctor-baby pair per record
);

-- 3. DIAGNOSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis_text TEXT NOT NULL,
  icd10_code TEXT, -- International Classification of Diseases code
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  onset_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'under_investigation')) DEFAULT 'active',
  notes TEXT,
  attachments TEXT[], -- URLs to medical documents
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. MEDICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL, -- e.g., "5ml", "1 tablet"
  unit TEXT NOT NULL CHECK (unit IN ('ml', 'mg', 'tablet', 'capsule', 'drop', 'spray', 'injection')),
  frequency TEXT NOT NULL CHECK (frequency IN ('as_needed', 'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_6_hours', 'every_8_hours', 'every_12_hours', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means ongoing
  reason_for_prescription TEXT,
  instructions TEXT, -- e.g., "Take with food"
  possible_side_effects TEXT,
  contraindications TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'discontinued')) DEFAULT 'active',
  prescribed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. MEDICATION ADHERENCE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS medication_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  given_at TIMESTAMP NOT NULL,
  given_by UUID REFERENCES auth.users(id), -- Parent or caregiver
  dose_taken BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. APPOINTMENT REMINDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_type TEXT NOT NULL, -- 'checkup', 'follow_up', 'review', 'vaccination'
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'reminded', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP,
  parent_acknowledged BOOLEAN DEFAULT false,
  parent_acknowledged_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. MEDICAL REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('consultation', 'checkup', 'lab_results', 'immunization', 'growth_assessment', 'developmental_screening', 'other')),
  title TEXT NOT NULL,
  report_content TEXT,
  visit_date DATE NOT NULL,
  findings TEXT,
  recommendations TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  pdf_url TEXT, -- Generated PDF report
  shared_with_parents BOOLEAN DEFAULT true,
  shared_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. MEDICAL HISTORY SUMMARY (Cached view-like table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_history_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL UNIQUE REFERENCES public.babies(id) ON DELETE CASCADE,
  allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  chronic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
  past_surgeries TEXT[] DEFAULT ARRAY[]::TEXT[],
  family_medical_history TEXT,
  current_medications TEXT[] DEFAULT ARRAY[]::TEXT[],
  immunization_status TEXT,
  last_checkup_date DATE,
  next_scheduled_checkup DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. DOCTOR CONSULTATION NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_date TIMESTAMP NOT NULL,
  chief_complaint TEXT,
  patient_history TEXT,
  physical_examination TEXT,
  assessment TEXT,
  plan TEXT,
  follow_up_recommendations TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. GROWTH & DEVELOPMENT TRACKING (Doctor-recorded)
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_growth_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  height NUMERIC,
  height_percentile NUMERIC,
  weight NUMERIC,
  weight_percentile NUMERIC,
  head_circumference NUMERIC,
  head_circumference_percentile NUMERIC,
  developmental_milestones TEXT,
  developmental_concerns TEXT,
  nutritional_status TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_is_verified ON doctor_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_doctor_baby_assignments_doctor_id ON doctor_baby_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_baby_assignments_baby_id ON doctor_baby_assignments(baby_id);
CREATE INDEX IF NOT EXISTS idx_doctor_baby_assignments_parent_id ON doctor_baby_assignments(parent_id);
CREATE INDEX IF NOT EXISTS idx_doctor_baby_assignments_status ON doctor_baby_assignments(status);
CREATE INDEX IF NOT EXISTS idx_diagnoses_baby_id ON diagnoses(baby_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_doctor_id ON diagnoses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_status ON diagnoses(status);
CREATE INDEX IF NOT EXISTS idx_medications_baby_id ON medications(baby_id);
CREATE INDEX IF NOT EXISTS idx_medications_doctor_id ON medications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medications_status ON medications(status);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_medication_id ON medication_adherence(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_given_at ON medication_adherence(given_at);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_baby_id ON appointment_reminders(baby_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_doctor_id ON appointment_reminders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_scheduled_date ON appointment_reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_status ON appointment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_medical_reports_baby_id ON medical_reports(baby_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_doctor_id ON medical_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_notes_baby_id ON consultation_notes(baby_id);
CREATE INDEX IF NOT EXISTS idx_consultation_notes_doctor_id ON consultation_notes(doctor_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_baby_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_adherence ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_growth_assessment ENABLE ROW LEVEL SECURITY;

-- Doctor can view/manage own profile
CREATE POLICY "Doctors can view own profile"
  ON doctor_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Doctor can update own profile
CREATE POLICY "Doctors can update own profile"
  ON doctor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Doctor can view babies assigned to them
CREATE POLICY "Doctors can view assigned babies"
  ON doctor_baby_assignments FOR SELECT
  USING (auth.uid() = doctor_id OR auth.uid() = parent_id);

-- Doctor can insert diagnoses for assigned babies
CREATE POLICY "Doctors can create diagnoses for assigned babies"
  ON diagnoses FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id AND
    baby_id IN (
      SELECT baby_id FROM doctor_baby_assignments 
      WHERE doctor_id = auth.uid() AND status = 'active'
    )
  );

-- Doctor and parents can view diagnoses
CREATE POLICY "Doctors and parents can view diagnoses"
  ON diagnoses FOR SELECT
  USING (
    auth.uid() = doctor_id OR
    baby_id IN (SELECT id FROM public.babies WHERE user_id = auth.uid())
  );

-- Similar policies for medications, appointments, etc.
CREATE POLICY "Doctors can create medications for assigned babies"
  ON medications FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id AND
    baby_id IN (
      SELECT baby_id FROM doctor_baby_assignments 
      WHERE doctor_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Doctors and parents can view medications"
  ON medications FOR SELECT
  USING (
    auth.uid() = doctor_id OR
    baby_id IN (SELECT id FROM public.babies WHERE user_id = auth.uid())
  );

-- ============================================================================
-- USEFUL FUNCTIONS & PROCEDURES
-- ============================================================================

-- Function to get doctor's assigned babies
CREATE OR REPLACE FUNCTION get_doctor_assigned_babies(doctor_user_id UUID)
RETURNS TABLE (
  baby_id UUID,
  baby_name TEXT,
  parent_id UUID,
  parent_email TEXT,
  status TEXT,
  assignment_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dba.baby_id,
    b.name as baby_name,
    dba.parent_id,
    u.email as parent_email,
    dba.status,
    dba.assignment_reason
  FROM doctor_baby_assignments dba
  JOIN public.babies b ON dba.baby_id = b.id
  JOIN auth.users u ON dba.parent_id = u.id
  WHERE dba.doctor_id = doctor_user_id
  AND dba.status = 'active'
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming appointments for a doctor
CREATE OR REPLACE FUNCTION get_doctor_upcoming_appointments(doctor_user_id UUID, days_ahead INT DEFAULT 7)
RETURNS TABLE (
  appointment_id UUID,
  baby_id UUID,
  baby_name TEXT,
  parent_id UUID,
  scheduled_date DATE,
  scheduled_time TIME,
  appointment_type TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id as appointment_id,
    ar.baby_id,
    b.name as baby_name,
    ar.parent_id,
    ar.scheduled_date,
    ar.scheduled_time,
    ar.appointment_type,
    ar.status
  FROM appointment_reminders ar
  JOIN public.babies b ON ar.baby_id = b.id
  WHERE ar.doctor_id = doctor_user_id
  AND ar.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + days_ahead
  AND ar.status IN ('pending', 'reminded')
  ORDER BY ar.scheduled_date, ar.scheduled_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get baby's active medications
CREATE OR REPLACE FUNCTION get_baby_active_medications(baby_id_param UUID)
RETURNS TABLE (
  medication_id UUID,
  medication_name TEXT,
  dosage TEXT,
  frequency TEXT,
  doctor_name TEXT,
  prescribed_at TIMESTAMP,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.medication_name,
    m.dosage,
    m.frequency,
    dp.full_name as doctor_name,
    m.prescribed_at,
    m.status
  FROM medications m
  JOIN doctor_profiles dp ON m.doctor_id = dp.user_id
  WHERE m.baby_id = baby_id_param
  AND m.status = 'active'
  AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
  ORDER BY m.prescribed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get doctor's patient count
CREATE OR REPLACE FUNCTION get_doctor_patient_count(doctor_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  patient_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT baby_id) INTO patient_count
  FROM doctor_baby_assignments
  WHERE doctor_id = doctor_user_id
  AND status = 'active';
  
  RETURN patient_count;
END;
$$ LANGUAGE plpgsql;
