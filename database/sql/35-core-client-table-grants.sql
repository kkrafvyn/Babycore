-- ============================================================================
-- CORE CLIENT TABLE GRANTS
-- ============================================================================
-- Ensures authenticated browser sessions can use RLS-protected tables.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.babies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sleep_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feed_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.diaper_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.growth_measurements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vaccination_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.memories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.health_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.family_sharing_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.doctor_baby_assignments TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
