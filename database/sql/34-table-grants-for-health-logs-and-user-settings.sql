-- ============================================================================
-- TABLE GRANTS FOR HEALTH LOGS + USER SETTINGS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.health_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_settings TO authenticated;
