-- ============================================================================
-- ADVANCED CARE FEATURES
-- Medication tracker/refill alerts + approval workflows + clinic templates
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Medication schedule and refill tracking
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  route TEXT,
  frequency TEXT,
  interval_hours INTEGER,
  doses_per_day INTEGER,
  reminder_times TIME[] DEFAULT ARRAY[]::TIME[],
  instructions TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  stock_quantity NUMERIC,
  stock_unit TEXT,
  refill_threshold NUMERIC DEFAULT 0,
  last_refill_at TIMESTAMPTZ,
  next_refill_due_date DATE,
  requires_confirmation BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.medication_dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  planned_for TIMESTAMPTZ,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dose_status TEXT NOT NULL DEFAULT 'taken' CHECK (dose_status IN ('taken', 'missed', 'skipped')),
  quantity_used NUMERIC,
  notes TEXT,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  caregiver_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  caregiver_confirmed_at TIMESTAMPTZ,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_schedules_baby_id
  ON public.medication_schedules(baby_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_status
  ON public.medication_schedules(status);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_next_refill_due_date
  ON public.medication_schedules(next_refill_due_date);

CREATE INDEX IF NOT EXISTS idx_medication_dose_logs_baby_id
  ON public.medication_dose_logs(baby_id);
CREATE INDEX IF NOT EXISTS idx_medication_dose_logs_schedule_id
  ON public.medication_dose_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_medication_dose_logs_logged_at
  ON public.medication_dose_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_medication_dose_logs_dose_status
  ON public.medication_dose_logs(dose_status);

-- ----------------------------------------------------------------------------
-- Parent approval flow for sensitive updates
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.care_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (
    request_type IN (
      'medication_edit',
      'medication_log',
      'health_record_edit',
      'growth_edit',
      'vaccination_edit',
      'profile_edit',
      'other'
    )
  ),
  target_table TEXT,
  target_record_id UUID,
  requested_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  reason TEXT,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by_role TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.care_approval_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES public.care_approval_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'cancelled', 'updated')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_approval_requests_baby_id
  ON public.care_approval_requests(baby_id);
CREATE INDEX IF NOT EXISTS idx_care_approval_requests_status
  ON public.care_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_care_approval_requests_requested_by
  ON public.care_approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_care_approval_requests_created_at
  ON public.care_approval_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_care_approval_audit_logs_request_id
  ON public.care_approval_audit_logs(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_care_approval_audit_logs_created_at
  ON public.care_approval_audit_logs(created_at DESC);

-- Optional reference from dose logs back to approval request
ALTER TABLE public.medication_dose_logs
  ADD COLUMN IF NOT EXISTS approval_request_id UUID REFERENCES public.care_approval_requests(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Clinic panel: doctor report templates
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clinic_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'health_summary',
  include_data TEXT[] NOT NULL DEFAULT ARRAY['sleep', 'feeding', 'diaper', 'growth', 'vaccinations', 'health']::TEXT[],
  prompt_notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_report_templates_doctor_id
  ON public.clinic_report_templates(doctor_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.medication_schedules') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_medication_schedules_updated_at ON public.medication_schedules;
    CREATE TRIGGER trg_medication_schedules_updated_at
      BEFORE UPDATE ON public.medication_schedules
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
  END IF;

  IF to_regclass('public.care_approval_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_care_approval_requests_updated_at ON public.care_approval_requests;
    CREATE TRIGGER trg_care_approval_requests_updated_at
      BEFORE UPDATE ON public.care_approval_requests
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
  END IF;

  IF to_regclass('public.clinic_report_templates') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_clinic_report_templates_updated_at ON public.clinic_report_templates;
    CREATE TRIGGER trg_clinic_report_templates_updated_at
      BEFORE UPDATE ON public.clinic_report_templates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Approval audit trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_care_approval_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  action_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    INSERT INTO public.care_approval_audit_logs (
      approval_request_id,
      action,
      actor_id,
      actor_role,
      details
    )
    VALUES (
      NEW.id,
      action_type,
      NEW.requested_by,
      NEW.requested_by_role,
      jsonb_build_object('status', NEW.status, 'request_type', NEW.request_type)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' THEN
      action_type := 'approved';
    ELSIF NEW.status = 'rejected' THEN
      action_type := 'rejected';
    ELSIF NEW.status = 'cancelled' THEN
      action_type := 'cancelled';
    ELSE
      action_type := 'updated';
    END IF;

    INSERT INTO public.care_approval_audit_logs (
      approval_request_id,
      action,
      actor_id,
      actor_role,
      details
    )
    VALUES (
      NEW.id,
      action_type,
      COALESCE(NEW.decided_by, NEW.requested_by),
      NEW.requested_by_role,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'decision_notes', NEW.decision_notes
      )
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.care_approval_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_care_approval_change ON public.care_approval_requests;
    CREATE TRIGGER trg_care_approval_change
      AFTER INSERT OR UPDATE ON public.care_approval_requests
      FOR EACH ROW EXECUTE FUNCTION public.log_care_approval_change();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_approval_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_report_templates ENABLE ROW LEVEL SECURITY;

-- Access helper condition used inline in policies:
-- 1) baby owner
-- 2) accepted family share recipient
-- 3) assigned active doctor

DROP POLICY IF EXISTS medication_schedules_select_access ON public.medication_schedules;
CREATE POLICY medication_schedules_select_access
ON public.medication_schedules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = medication_schedules.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = medication_schedules.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = medication_schedules.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS medication_schedules_write_access ON public.medication_schedules;
CREATE POLICY medication_schedules_write_access
ON public.medication_schedules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = medication_schedules.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = medication_schedules.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = medication_schedules.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = medication_schedules.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = medication_schedules.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = medication_schedules.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS medication_dose_logs_select_access ON public.medication_dose_logs;
CREATE POLICY medication_dose_logs_select_access
ON public.medication_dose_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = medication_dose_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = medication_dose_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = medication_dose_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS medication_dose_logs_write_access ON public.medication_dose_logs;
CREATE POLICY medication_dose_logs_write_access
ON public.medication_dose_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = medication_dose_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = medication_dose_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = medication_dose_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = medication_dose_logs.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = medication_dose_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = medication_dose_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS care_approval_requests_select_access ON public.care_approval_requests;
CREATE POLICY care_approval_requests_select_access
ON public.care_approval_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = care_approval_requests.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = care_approval_requests.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = care_approval_requests.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS care_approval_requests_insert_access ON public.care_approval_requests;
CREATE POLICY care_approval_requests_insert_access
ON public.care_approval_requests
FOR INSERT
WITH CHECK (
  requested_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.babies b
      WHERE b.id = care_approval_requests.baby_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.family_sharing_invites fsi
      WHERE fsi.baby_id = care_approval_requests.baby_id
        AND fsi.accepted_at IS NOT NULL
        AND fsi.role IN ('editor', 'caregiver', 'doctor', 'owner')
        AND (
          fsi.accepted_by = auth.uid()
          OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.doctor_baby_assignments dba
      WHERE dba.baby_id = care_approval_requests.baby_id
        AND dba.doctor_id = auth.uid()
        AND dba.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS care_approval_requests_update_by_requester ON public.care_approval_requests;
CREATE POLICY care_approval_requests_update_by_requester
ON public.care_approval_requests
FOR UPDATE
USING (requested_by = auth.uid() AND status = 'pending')
WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS care_approval_requests_update_by_parent ON public.care_approval_requests;
CREATE POLICY care_approval_requests_update_by_parent
ON public.care_approval_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = care_approval_requests.baby_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.babies b
    WHERE b.id = care_approval_requests.baby_id
      AND b.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS care_approval_audit_select_access ON public.care_approval_audit_logs;
CREATE POLICY care_approval_audit_select_access
ON public.care_approval_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.care_approval_requests car
    JOIN public.babies b ON b.id = car.baby_id
    WHERE car.id = care_approval_audit_logs.approval_request_id
      AND (
        b.user_id = auth.uid()
        OR car.requested_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.family_sharing_invites fsi
          WHERE fsi.baby_id = b.id
            AND fsi.accepted_at IS NOT NULL
            AND (
              fsi.accepted_by = auth.uid()
              OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.doctor_baby_assignments dba
          WHERE dba.baby_id = b.id
            AND dba.doctor_id = auth.uid()
            AND dba.status = 'active'
        )
      )
  )
);

DROP POLICY IF EXISTS clinic_report_templates_select_own ON public.clinic_report_templates;
CREATE POLICY clinic_report_templates_select_own
ON public.clinic_report_templates
FOR SELECT
USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS clinic_report_templates_write_own ON public.clinic_report_templates;
CREATE POLICY clinic_report_templates_write_own
ON public.clinic_report_templates
FOR ALL
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

