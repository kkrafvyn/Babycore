-- ============================================================================
-- NOTIFICATIONS INFRASTRUCTURE
-- ============================================================================
-- Adds push subscriptions + scheduled notifications + reminder schedules.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- Push subscriptions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth TEXT NOT NULL DEFAULT '',
  p256dh TEXT NOT NULL DEFAULT '',
  device_token TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS auth TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS p256dh TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_token TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.push_subscriptions
  ALTER COLUMN auth SET DEFAULT '',
  ALTER COLUMN p256dh SET DEFAULT '';

UPDATE public.push_subscriptions
SET platform = 'web'
WHERE platform IS NULL OR btrim(platform) = '';

DELETE FROM public.push_subscriptions a
USING public.push_subscriptions b
WHERE a.ctid < b.ctid
  AND a.endpoint = b.endpoint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'push_subscriptions_platform_check'
      AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_platform_check
      CHECK (platform IN ('web', 'android', 'ios'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint_unique
  ON public.push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_token
  ON public.push_subscriptions(device_token)
  WHERE device_token IS NOT NULL;

-- --------------------------------------------------------------------------
-- Scheduled notifications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID REFERENCES public.babies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tag TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.scheduled_notifications
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS baby_id UUID REFERENCES public.babies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tag TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

UPDATE public.scheduled_notifications
SET status = 'pending'
WHERE status IS NULL OR btrim(status) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scheduled_notifications_status_check'
      AND conrelid = 'public.scheduled_notifications'::regclass
  ) THEN
    ALTER TABLE public.scheduled_notifications
      ADD CONSTRAINT scheduled_notifications_status_check
      CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id
  ON public.scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status
  ON public.scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for
  ON public.scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due_pending
  ON public.scheduled_notifications(scheduled_for, status);

-- --------------------------------------------------------------------------
-- Reminder schedules
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  scheduled_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, baby_id, reminder_type)
);

ALTER TABLE public.reminder_schedules
  ADD COLUMN IF NOT EXISTS reminder_type TEXT NOT NULL DEFAULT 'feeding',
  ADD COLUMN IF NOT EXISTS scheduled_time TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  DELETE FROM public.reminder_schedules a
  USING public.reminder_schedules b
  WHERE a.ctid < b.ctid
    AND a.user_id = b.user_id
    AND a.baby_id = b.baby_id
    AND a.reminder_type = b.reminder_type;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_schedules_user_baby_type_key'
      AND conrelid = 'public.reminder_schedules'::regclass
  ) THEN
    ALTER TABLE public.reminder_schedules
      ADD CONSTRAINT reminder_schedules_user_baby_type_key
      UNIQUE (user_id, baby_id, reminder_type);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_schedules_type_check'
      AND conrelid = 'public.reminder_schedules'::regclass
  ) THEN
    ALTER TABLE public.reminder_schedules
      ADD CONSTRAINT reminder_schedules_type_check
      CHECK (reminder_type IN ('feeding', 'sleep', 'medication', 'diaper', 'custom'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user_id
  ON public.reminder_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_baby_id
  ON public.reminder_schedules(baby_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_enabled
  ON public.reminder_schedules(enabled);

-- Keep updated_at in sync where shared trigger helper exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
    CREATE TRIGGER update_push_subscriptions_updated_at
      BEFORE UPDATE ON public.push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_scheduled_notifications_updated_at ON public.scheduled_notifications;
    CREATE TRIGGER update_scheduled_notifications_updated_at
      BEFORE UPDATE ON public.scheduled_notifications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_reminder_schedules_updated_at ON public.reminder_schedules;
    CREATE TRIGGER update_reminder_schedules_updated_at
      BEFORE UPDATE ON public.reminder_schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- RLS policies
-- --------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS scheduled_notifications_select_own ON public.scheduled_notifications;
CREATE POLICY scheduled_notifications_select_own
  ON public.scheduled_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS scheduled_notifications_insert_own ON public.scheduled_notifications;
CREATE POLICY scheduled_notifications_insert_own
  ON public.scheduled_notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS scheduled_notifications_update_own ON public.scheduled_notifications;
CREATE POLICY scheduled_notifications_update_own
  ON public.scheduled_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS scheduled_notifications_delete_own ON public.scheduled_notifications;
CREATE POLICY scheduled_notifications_delete_own
  ON public.scheduled_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_schedules_select_own ON public.reminder_schedules;
CREATE POLICY reminder_schedules_select_own
  ON public.reminder_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_schedules_insert_own ON public.reminder_schedules;
CREATE POLICY reminder_schedules_insert_own
  ON public.reminder_schedules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_schedules_update_own ON public.reminder_schedules;
CREATE POLICY reminder_schedules_update_own
  ON public.reminder_schedules
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_schedules_delete_own ON public.reminder_schedules;
CREATE POLICY reminder_schedules_delete_own
  ON public.reminder_schedules
  FOR DELETE
  USING (auth.uid() = user_id);
