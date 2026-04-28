-- ============================================================================
-- HEALTH LOGS + USER SETTINGS CLOUD PARITY
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Health logs for temperature and medication quick logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'temperature',
  value TEXT,
  unit TEXT,
  name TEXT,
  dose TEXT,
  next_dose_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.health_logs
  ADD COLUMN IF NOT EXISTS value TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS dose TEXT,
  ADD COLUMN IF NOT EXISTS next_dose_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'health_logs_type_check'
      AND conrelid = 'public.health_logs'::regclass
  ) THEN
    ALTER TABLE public.health_logs
      ADD CONSTRAINT health_logs_type_check
      CHECK (type IN ('temperature', 'medication'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_health_logs_baby_id
  ON public.health_logs(baby_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp
  ON public.health_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_logs_type
  ON public.health_logs(type);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_health_logs_updated_at ON public.health_logs;
    CREATE TRIGGER update_health_logs_updated_at
      BEFORE UPDATE ON public.health_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS health_logs_select_access ON public.health_logs;
CREATE POLICY health_logs_select_access
ON public.health_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = health_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = health_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = health_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS health_logs_insert_access ON public.health_logs;
CREATE POLICY health_logs_insert_access
ON public.health_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = health_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = health_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = health_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS health_logs_update_access ON public.health_logs;
CREATE POLICY health_logs_update_access
ON public.health_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = health_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = health_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = health_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = health_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = health_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = health_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS health_logs_delete_access ON public.health_logs;
CREATE POLICY health_logs_delete_access
ON public.health_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = health_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = health_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = health_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

-- ----------------------------------------------------------------------------
-- Cloud-backed user settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  units TEXT NOT NULL DEFAULT 'metric',
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  feeding_interval INTEGER,
  reminder_preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  theme TEXT NOT NULL DEFAULT 'system',
  subscription_plan TEXT,
  subscription_status TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  subscription_currency TEXT,
  biometric_lock_enabled BOOLEAN NOT NULL DEFAULT false,
  privacy_lock_delay INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS units TEXT NOT NULL DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feeding_interval INTEGER,
  ADD COLUMN IF NOT EXISTS reminder_preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_currency TEXT,
  ADD COLUMN IF NOT EXISTS biometric_lock_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_lock_delay INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_units_check'
      AND conrelid = 'public.user_settings'::regclass
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_units_check
      CHECK (units IN ('metric', 'imperial'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_theme_check'
      AND conrelid = 'public.user_settings'::regclass
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_theme_check
      CHECK (theme IN ('light', 'dark', 'system'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
    CREATE TRIGGER update_user_settings_updated_at
      BEFORE UPDATE ON public.user_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_select_own ON public.user_settings;
CREATE POLICY user_settings_select_own
ON public.user_settings
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_settings_insert_own ON public.user_settings;
CREATE POLICY user_settings_insert_own
ON public.user_settings
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_settings_update_own ON public.user_settings;
CREATE POLICY user_settings_update_own
ON public.user_settings
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
