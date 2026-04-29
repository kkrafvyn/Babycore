-- ============================================================================
-- HEALTH CONNECT WEARABLE TYPE
-- ============================================================================

ALTER TABLE public.wearable_integrations
  DROP CONSTRAINT IF EXISTS wearable_integrations_device_type_check;

ALTER TABLE public.wearable_integrations
  ADD CONSTRAINT wearable_integrations_device_type_check
  CHECK (device_type IN ('apple_health', 'health_connect', 'fitbit', 'oura_ring', 'garmin'));
