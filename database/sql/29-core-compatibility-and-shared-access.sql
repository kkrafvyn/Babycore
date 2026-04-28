-- ============================================================================
-- CORE COMPATIBILITY + SHARED ACCESS HARDENING
-- ============================================================================
-- This migration closes remaining production gaps:
-- 1) Creates core tables still referenced by API/services.
-- 2) Adds compatibility tables for legacy routes.
-- 3) Extends RLS so invited caregivers/doctors can read/write assigned baby data.

-- ----------------------------------------------------------------------------
-- Missing core data tables used by sync/export/journal features
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  text TEXT NOT NULL,
  photo_url TEXT,
  is_milestone BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  prompt TEXT,
  text TEXT NOT NULL,
  mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_milestones_baby_date ON public.milestones(baby_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_baby_timestamp ON public.memories(baby_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_baby_date ON public.journal_entries(baby_id, date DESC);

-- ----------------------------------------------------------------------------
-- Legacy compatibility tables still referenced in existing API surface
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'stripe', 'manual')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);

CREATE TABLE IF NOT EXISTS public.email_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_send_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, report_type)
);

CREATE TABLE IF NOT EXISTS public.family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'caregiver',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  baby_id UUID REFERENCES public.babies(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'caregiver',
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Community compatibility
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.playdate_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playdate_id UUID NOT NULL REFERENCES public.playdate_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(playdate_id, user_id)
);

ALTER TABLE public.playdate_events
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS datetime TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS baby_age_range TEXT,
  ADD COLUMN IF NOT EXISTS current_attendees INT DEFAULT 0;

UPDATE public.playdate_events
SET created_by = COALESCE(created_by, user_id),
    datetime = COALESCE(datetime, event_date),
    baby_age_range = COALESCE(baby_age_range, age_range);

CREATE INDEX IF NOT EXISTS idx_post_replies_post_id ON public.post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_playdate_attendees_playdate_id ON public.playdate_attendees(playdate_id);

-- ----------------------------------------------------------------------------
-- Utility RPC used by community route
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_attendees(playdate_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_count INT;
BEGIN
  UPDATE public.playdate_events
  SET current_attendees = COALESCE(current_attendees, 0) + 1,
      updated_at = NOW()
  WHERE id = playdate_id
  RETURNING current_attendees INTO next_count;

  RETURN COALESCE(next_count, 0);
END;
$$;

-- ----------------------------------------------------------------------------
-- Shared access RLS extensions
-- ----------------------------------------------------------------------------
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diaper_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shared babies" ON public.babies;
CREATE POLICY "Users can view shared babies"
ON public.babies
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = babies.id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = babies.id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

CREATE POLICY "Shared users can insert sleep logs"
ON public.sleep_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = sleep_logs.baby_id
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
    WHERE dba.baby_id = sleep_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

CREATE POLICY "Shared users can view sleep logs"
ON public.sleep_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = sleep_logs.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = sleep_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

CREATE POLICY "Shared users can update sleep logs"
ON public.sleep_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = sleep_logs.baby_id
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
    WHERE dba.baby_id = sleep_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

CREATE POLICY "Shared users can delete sleep logs"
ON public.sleep_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = sleep_logs.baby_id
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
    WHERE dba.baby_id = sleep_logs.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

-- Replicate shared policies for other baby-linked tables
DO $$
DECLARE
  table_name TEXT;
  p_view TEXT;
  p_insert TEXT;
  p_update TEXT;
  p_delete TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'feed_logs',
    'diaper_logs',
    'growth_measurements',
    'vaccination_records',
    'milestones',
    'memories',
    'journal_entries'
  ]
  LOOP
    p_view := format('Shared users can view %s rows', table_name);
    p_insert := format('Shared users can insert %s rows', table_name);
    p_update := format('Shared users can update %s rows', table_name);
    p_delete := format('Shared users can delete %s rows', table_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_view, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_insert, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_update, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_delete, table_name);

    EXECUTE format(
      'CREATE POLICY %2$I ON public.%1$I FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.family_sharing_invites fsi
          WHERE fsi.baby_id = %1$I.baby_id
            AND fsi.accepted_at IS NOT NULL
            AND (
              fsi.accepted_by = auth.uid()
              OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.doctor_baby_assignments dba
          WHERE dba.baby_id = %1$I.baby_id
            AND dba.doctor_id = auth.uid()
            AND dba.status = ''active''
        )
      )',
      table_name, p_view
    );

    EXECUTE format(
      'CREATE POLICY %2$I ON public.%1$I FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.family_sharing_invites fsi
          WHERE fsi.baby_id = %1$I.baby_id
            AND fsi.accepted_at IS NOT NULL
            AND fsi.role IN (''owner'', ''editor'', ''caregiver'', ''doctor'')
            AND (
              fsi.accepted_by = auth.uid()
              OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.doctor_baby_assignments dba
          WHERE dba.baby_id = %1$I.baby_id
            AND dba.doctor_id = auth.uid()
            AND dba.status = ''active''
        )
      )',
      table_name, p_insert
    );

    EXECUTE format(
      'CREATE POLICY %2$I ON public.%1$I FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.family_sharing_invites fsi
          WHERE fsi.baby_id = %1$I.baby_id
            AND fsi.accepted_at IS NOT NULL
            AND fsi.role IN (''owner'', ''editor'', ''caregiver'', ''doctor'')
            AND (
              fsi.accepted_by = auth.uid()
              OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.doctor_baby_assignments dba
          WHERE dba.baby_id = %1$I.baby_id
            AND dba.doctor_id = auth.uid()
            AND dba.status = ''active''
        )
      )',
      table_name, p_update
    );

    EXECUTE format(
      'CREATE POLICY %2$I ON public.%1$I FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.family_sharing_invites fsi
          WHERE fsi.baby_id = %1$I.baby_id
            AND fsi.accepted_at IS NOT NULL
            AND fsi.role IN (''owner'', ''editor'', ''caregiver'', ''doctor'')
            AND (
              fsi.accepted_by = auth.uid()
              OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.doctor_baby_assignments dba
          WHERE dba.baby_id = %1$I.baby_id
            AND dba.doctor_id = auth.uid()
            AND dba.status = ''active''
        )
      )',
      table_name, p_delete
    );
  END LOOP;
END $$;
