-- ============================================================================
-- EMERGENCY SHARE LINKS + BILLING EVENTS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep existing environments compatible with newer approval request types.
DO $$
DECLARE
  request_type_constraint_name TEXT;
BEGIN
  ALTER TABLE public.care_approval_requests
    DROP CONSTRAINT IF EXISTS care_approval_requests_request_type_check;

  FOR request_type_constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.care_approval_requests'::regclass
      AND contype = 'c'
      AND (
        conname <> 'care_approval_requests_request_type_check'
        AND pg_get_constraintdef(oid) ILIKE '%request_type%'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.care_approval_requests DROP CONSTRAINT %I',
      request_type_constraint_name
    );
  END LOOP;

  ALTER TABLE public.care_approval_requests
    ADD CONSTRAINT care_approval_requests_request_type_check
    CHECK (
      request_type IN (
        'medication_edit',
        'medication_schedule_edit',
        'medication_log',
        'health_record_edit',
        'growth_edit',
        'vaccination_edit',
        'profile_edit',
        'other'
      )
    );
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Expiring emergency share links
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE,
  token_hash TEXT,
  token_prefix TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  last_accessed_at TIMESTAMPTZ,
  last_access_result TEXT NOT NULL DEFAULT 'pending',
  view_count INTEGER NOT NULL DEFAULT 0,
  max_views INTEGER,
  requires_pin BOOLEAN NOT NULL DEFAULT false,
  access_pin_hash TEXT,
  preset_key TEXT NOT NULL DEFAULT 'custom',
  allowed_sections TEXT[] NOT NULL DEFAULT ARRAY[
    'demographics',
    'allergies',
    'medications',
    'growth',
    'vaccines',
    'doctor_contacts'
  ]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.emergency_share_links
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS token_prefix TEXT,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_access_result TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_views INTEGER,
  ADD COLUMN IF NOT EXISTS requires_pin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS preset_key TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS allowed_sections TEXT[] NOT NULL DEFAULT ARRAY[
    'demographics',
    'allergies',
    'medications',
    'growth',
    'vaccines',
    'doctor_contacts'
  ]::TEXT[];

ALTER TABLE public.emergency_share_links
  ALTER COLUMN token DROP NOT NULL,
  ALTER COLUMN last_access_result SET DEFAULT 'pending',
  ALTER COLUMN view_count SET DEFAULT 0,
  ALTER COLUMN requires_pin SET DEFAULT false,
  ALTER COLUMN preset_key SET DEFAULT 'custom',
  ALTER COLUMN allowed_sections SET DEFAULT ARRAY[
    'demographics',
    'allergies',
    'medications',
    'growth',
    'vaccines',
    'doctor_contacts'
  ]::TEXT[];

UPDATE public.emergency_share_links
SET token_hash = encode(digest(token, 'sha256'), 'hex'),
    token_prefix = COALESCE(NULLIF(token_prefix, ''), left(token, 8))
WHERE token IS NOT NULL
  AND (token_hash IS NULL OR btrim(token_hash) = '');

UPDATE public.emergency_share_links
SET last_access_result = 'pending'
WHERE last_access_result IS NULL
   OR btrim(last_access_result) = '';

UPDATE public.emergency_share_links
SET view_count = 0
WHERE view_count IS NULL
   OR view_count < 0;

UPDATE public.emergency_share_links
SET preset_key = 'custom'
WHERE preset_key IS NULL
   OR btrim(preset_key) = '';

UPDATE public.emergency_share_links
SET allowed_sections = ARRAY[
  'demographics',
  'allergies',
  'medications',
  'growth',
  'vaccines',
  'doctor_contacts'
]::TEXT[]
WHERE allowed_sections IS NULL
   OR cardinality(allowed_sections) = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_links_expiry_window_check'
      AND conrelid = 'public.emergency_share_links'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_links
      ADD CONSTRAINT emergency_share_links_expiry_window_check
      CHECK (expires_at > created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_links_last_access_result_check'
      AND conrelid = 'public.emergency_share_links'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_links
      ADD CONSTRAINT emergency_share_links_last_access_result_check
      CHECK (
        last_access_result IN (
          'pending',
          'success',
          'not_found',
          'expired',
          'revoked',
          'pin_required',
          'pin_failed',
          'view_limit_reached'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_links_view_count_check'
      AND conrelid = 'public.emergency_share_links'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_links
      ADD CONSTRAINT emergency_share_links_view_count_check
      CHECK (view_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_links_max_views_check'
      AND conrelid = 'public.emergency_share_links'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_links
      ADD CONSTRAINT emergency_share_links_max_views_check
      CHECK (max_views IS NULL OR max_views > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_links_pin_consistency_check'
      AND conrelid = 'public.emergency_share_links'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_links
      ADD CONSTRAINT emergency_share_links_pin_consistency_check
      CHECK (requires_pin = false OR access_pin_hash IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_links_preset_key_check'
      AND conrelid = 'public.emergency_share_links'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_links
      ADD CONSTRAINT emergency_share_links_preset_key_check
      CHECK (
        preset_key IN (
          'clinic_visit',
          'travel',
          'caregiver_handoff',
          'custom'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_links_allowed_sections_check'
      AND conrelid = 'public.emergency_share_links'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_links
      ADD CONSTRAINT emergency_share_links_allowed_sections_check
      CHECK (
        allowed_sections <@ ARRAY[
          'demographics',
          'allergies',
          'medications',
          'growth',
          'vaccines',
          'doctor_contacts'
        ]::TEXT[]
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_emergency_share_links_baby_id
  ON public.emergency_share_links(baby_id);
CREATE INDEX IF NOT EXISTS idx_emergency_share_links_created_by
  ON public.emergency_share_links(created_by);
CREATE INDEX IF NOT EXISTS idx_emergency_share_links_expires_at
  ON public.emergency_share_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_emergency_share_links_token
  ON public.emergency_share_links(token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_share_links_token_hash
  ON public.emergency_share_links(token_hash)
  WHERE token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emergency_share_links_active_lookup
  ON public.emergency_share_links(expires_at, view_count, max_views)
  WHERE revoked_at IS NULL;

ALTER TABLE public.emergency_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emergency_share_links_select_access ON public.emergency_share_links;
CREATE POLICY emergency_share_links_select_access
ON public.emergency_share_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = emergency_share_links.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = emergency_share_links.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = emergency_share_links.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS emergency_share_links_insert_access ON public.emergency_share_links;
CREATE POLICY emergency_share_links_insert_access
ON public.emergency_share_links
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.babies b
      WHERE b.id = emergency_share_links.baby_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.family_sharing_invites fsi
      WHERE fsi.baby_id = emergency_share_links.baby_id
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
      WHERE dba.baby_id = emergency_share_links.baby_id
        AND dba.doctor_id = auth.uid()
        AND dba.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS emergency_share_links_update_creator ON public.emergency_share_links;
CREATE POLICY emergency_share_links_update_creator
ON public.emergency_share_links
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS emergency_share_links_delete_creator ON public.emergency_share_links;
CREATE POLICY emergency_share_links_delete_creator
ON public.emergency_share_links
FOR DELETE
USING (created_by = auth.uid());

-- ----------------------------------------------------------------------------
-- Emergency share access logs + cleanup helpers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_share_link_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES public.emergency_share_links(id) ON DELETE CASCADE,
  baby_id UUID REFERENCES public.babies(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT NOT NULL DEFAULT 'success',
  ip_hash TEXT,
  user_agent TEXT,
  device_summary TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  risk_level TEXT NOT NULL DEFAULT 'info',
  risk_reason TEXT,
  viewer_label TEXT,
  request_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.emergency_share_link_access_logs
  ADD COLUMN IF NOT EXISTS device_summary TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS risk_reason TEXT;

ALTER TABLE public.emergency_share_link_access_logs
  ALTER COLUMN risk_level SET DEFAULT 'info';

UPDATE public.emergency_share_link_access_logs
SET risk_level = 'info'
WHERE risk_level IS NULL
   OR btrim(risk_level) = '';

CREATE INDEX IF NOT EXISTS idx_emergency_share_link_access_logs_link_id
  ON public.emergency_share_link_access_logs(link_id);
CREATE INDEX IF NOT EXISTS idx_emergency_share_link_access_logs_baby_id
  ON public.emergency_share_link_access_logs(baby_id);
CREATE INDEX IF NOT EXISTS idx_emergency_share_link_access_logs_accessed_at
  ON public.emergency_share_link_access_logs(accessed_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_link_access_logs_result_check'
      AND conrelid = 'public.emergency_share_link_access_logs'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_link_access_logs
      ADD CONSTRAINT emergency_share_link_access_logs_result_check
      CHECK (
        result IN (
          'success',
          'not_found',
          'expired',
          'revoked',
          'pin_required',
          'pin_failed',
          'view_limit_reached'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_share_link_access_logs_risk_level_check'
      AND conrelid = 'public.emergency_share_link_access_logs'::regclass
  ) THEN
    ALTER TABLE public.emergency_share_link_access_logs
      ADD CONSTRAINT emergency_share_link_access_logs_risk_level_check
      CHECK (risk_level IN ('info', 'warning', 'critical'));
  END IF;
END $$;

ALTER TABLE public.emergency_share_link_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emergency_share_link_access_logs_select_access ON public.emergency_share_link_access_logs;
CREATE POLICY emergency_share_link_access_logs_select_access
ON public.emergency_share_link_access_logs
FOR SELECT
USING (
  baby_id IS NOT NULL
  AND (
    EXISTS (
      SELECT 1
      FROM public.babies b
      WHERE b.id = emergency_share_link_access_logs.baby_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.family_sharing_invites fsi
      WHERE fsi.baby_id = emergency_share_link_access_logs.baby_id
        AND fsi.accepted_at IS NOT NULL
        AND (
          fsi.accepted_by = auth.uid()
          OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.doctor_baby_assignments dba
      WHERE dba.baby_id = emergency_share_link_access_logs.baby_id
        AND dba.doctor_id = auth.uid()
        AND dba.status = 'active'
    )
  )
);

CREATE OR REPLACE FUNCTION public.cleanup_expired_emergency_share_links()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_count INTEGER := 0;
BEGIN
  UPDATE public.emergency_share_links
  SET revoked_at = NOW(),
      revoked_reason = COALESCE(revoked_reason, 'expired_auto_cleanup'),
      last_access_result = CASE
        WHEN last_access_result = 'success' THEN 'expired'
        ELSE last_access_result
      END
  WHERE revoked_at IS NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.prune_old_emergency_share_link_access_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  removed_count INTEGER := 0;
BEGIN
  DELETE FROM public.emergency_share_link_access_logs
  WHERE accessed_at < NOW() - make_interval(days => GREATEST(retention_days, 1));

  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RETURN removed_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- Payment/billing events for reconciliation + history
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_event_id TEXT,
  event_type TEXT NOT NULL DEFAULT 'payment_attempt',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'reconciled', 'cancelled')),
  amount NUMERIC,
  currency TEXT,
  plan_id TEXT,
  plan_name TEXT,
  country_code TEXT,
  customer_email TEXT,
  subscription_id TEXT,
  invoice_id TEXT,
  gateway_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  error_message TEXT,
  failure_code TEXT,
  failure_source TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reconciliation_notes TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  recovery_status TEXT NOT NULL DEFAULT 'not_needed',
  last_transition_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS provider_event_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS failure_code TEXT,
  ADD COLUMN IF NOT EXISTS failure_source TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_status TEXT NOT NULL DEFAULT 'not_needed',
  ADD COLUMN IF NOT EXISTS last_transition_at TIMESTAMPTZ;

ALTER TABLE public.payment_events
  ALTER COLUMN retry_count SET DEFAULT 0,
  ALTER COLUMN recovery_status SET DEFAULT 'not_needed';

UPDATE public.payment_events
SET retry_count = 0
WHERE retry_count IS NULL
   OR retry_count < 0;

UPDATE public.payment_events
SET recovery_status = CASE
  WHEN status = 'failed' THEN 'eligible'
  WHEN status = 'reconciled' THEN 'recovered'
  ELSE 'not_needed'
END
WHERE recovery_status IS NULL
   OR btrim(recovery_status) = '';

UPDATE public.payment_events
SET last_transition_at = COALESCE(last_transition_at, updated_at, attempted_at, created_at, NOW())
WHERE last_transition_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_events_retry_count_check'
      AND conrelid = 'public.payment_events'::regclass
  ) THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_retry_count_check
      CHECK (retry_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_events_recovery_status_check'
      AND conrelid = 'public.payment_events'::regclass
  ) THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_recovery_status_check
      CHECK (
        recovery_status IN (
          'not_needed',
          'eligible',
          'retry_scheduled',
          'retrying',
          'recovered',
          'abandoned'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_events_user_id
  ON public.payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_status
  ON public.payment_events(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_attempted_at
  ON public.payment_events(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event_id
  ON public.payment_events(provider_event_id)
  WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_subscription_id
  ON public.payment_events(subscription_id)
  WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_invoice_id
  ON public.payment_events(invoice_id)
  WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_next_retry_at
  ON public.payment_events(next_retry_at)
  WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_last_transition_at
  ON public.payment_events(last_transition_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_payment_events_updated_at ON public.payment_events;
    CREATE TRIGGER update_payment_events_updated_at
      BEFORE UPDATE ON public.payment_events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_events_select_own ON public.payment_events;
CREATE POLICY payment_events_select_own
ON public.payment_events
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS payment_events_insert_own ON public.payment_events;
CREATE POLICY payment_events_insert_own
ON public.payment_events
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS payment_events_update_own ON public.payment_events;
CREATE POLICY payment_events_update_own
ON public.payment_events
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Immutable payment transition history
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_event_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_event_id UUID NOT NULL REFERENCES public.payment_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'paystack',
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT,
  error_message TEXT,
  gateway_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,
  recovery_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_event_transitions_payment_event_id
  ON public.payment_event_transitions(payment_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_event_transitions_user_id
  ON public.payment_event_transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_event_transitions_reference
  ON public.payment_event_transitions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_event_transitions_created_at
  ON public.payment_event_transitions(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_event_transitions_retry_count_check'
      AND conrelid = 'public.payment_event_transitions'::regclass
  ) THEN
    ALTER TABLE public.payment_event_transitions
      ADD CONSTRAINT payment_event_transitions_retry_count_check
      CHECK (retry_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_event_transitions_recovery_status_check'
      AND conrelid = 'public.payment_event_transitions'::regclass
  ) THEN
    ALTER TABLE public.payment_event_transitions
      ADD CONSTRAINT payment_event_transitions_recovery_status_check
      CHECK (
        recovery_status IS NULL
        OR recovery_status IN (
          'not_needed',
          'eligible',
          'retry_scheduled',
          'retrying',
          'recovered',
          'abandoned'
        )
      );
  END IF;
END $$;

ALTER TABLE public.payment_event_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_event_transitions_select_own ON public.payment_event_transitions;
CREATE POLICY payment_event_transitions_select_own
ON public.payment_event_transitions
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS payment_event_transitions_insert_own ON public.payment_event_transitions;
CREATE POLICY payment_event_transitions_insert_own
ON public.payment_event_transitions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prune_old_payment_event_transitions(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  removed_count INTEGER := 0;
BEGIN
  DELETE FROM public.payment_event_transitions
  WHERE created_at < NOW() - make_interval(days => GREATEST(retention_days, 1));

  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RETURN removed_count;
END;
$$;
