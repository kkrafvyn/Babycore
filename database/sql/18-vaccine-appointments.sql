-- ============================================================================
-- VACCINE REMINDERS & DOCTOR APPOINTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vaccine_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  vaccine_id TEXT NOT NULL,
  vaccine_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'rescheduled')),
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('checkup', 'vaccination', 'consultation', 'emergency')),
  scheduled_datetime TIMESTAMP NOT NULL,
  completed_datetime TIMESTAMP,
  location TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES doctor_appointments(id) ON DELETE CASCADE,
  reminder_type TEXT CHECK (reminder_type IN ('day_before', 'hour_before', 'week_before')),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vaccine_schedules_baby_id ON vaccine_schedules(baby_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_schedules_scheduled_date ON vaccine_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_doctor_appointments_baby_id ON doctor_appointments(baby_id);
CREATE INDEX IF NOT EXISTS idx_doctor_appointments_datetime ON doctor_appointments(scheduled_datetime);
