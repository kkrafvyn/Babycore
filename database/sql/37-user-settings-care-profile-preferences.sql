ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS care_profile_preferences JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.user_settings.care_profile_preferences IS
'Stores onboarding personalization choices such as baby stage, feeding style, priorities, and care-team focus.';
