-- ============================================================================
-- DOCTOR ROLE & MEDICAL MANAGEMENT SYSTEM
-- Complete schema for doctor functionality
-- Run BEFORE other doctor-related migrations
-- ============================================================================

-- 1. DOCTOR PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  medical_board TEXT,
  qualification TEXT NOT NULL,
  clinic_name TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  clinic_email TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES auth.users(id),
  years_of_experience INTEGER,
  languages_spoken TEXT[] DEFAULT ARRAY['English'],
  consultation_fee NUMERIC,
  availability_hours JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. DOCTOR-BABY ASSIGNMENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_baby_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  parent_consent BOOLEAN DEFAULT true,
  consent_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(doctor_id, baby_id)
);

-- 3. DIAGNOSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
  diagnosis_text TEXT NOT NULL,
  icd10_code TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  onset_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'under_investigation')) DEFAULT 'active',
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. MEDICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('ml', 'mg', 'tablet', 'capsule', 'drop', 'spray', 'injection')),
  frequency TEXT NOT NULL CHECK (frequency IN ('as_needed', 'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_6_hours', 'every_8_hours', 'every_12_hours', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE,
  reason_for_prescription TEXT,
  instructions TEXT,
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
  given_by UUID REFERENCES auth.users(id),
  dose_taken BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. APPOINTMENT REMINDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_type TEXT NOT NULL,
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
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('consultation', 'checkup', 'lab_results', 'immunization', 'growth_assessment', 'developmental_screening', 'other')),
  title TEXT NOT NULL,
  report_content TEXT,
  visit_date DATE NOT NULL,
  findings TEXT,
  recommendations TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  pdf_url TEXT,
  shared_with_parents BOOLEAN DEFAULT true,
  shared_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. MEDICAL HISTORY SUMMARY
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
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
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
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
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
