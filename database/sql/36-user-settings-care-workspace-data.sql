-- Sync account-level care workspace data across devices.
-- This keeps local-only coordination features available after sign-in on another device.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS care_workspace_data JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.user_settings.care_workspace_data IS
  'Account-scoped synced payload for shared care tasks, parent wellness check-ins, and offline emergency snapshots.';
