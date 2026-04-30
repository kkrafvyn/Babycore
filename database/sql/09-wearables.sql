-- ============================================================================
-- WEARABLE INTEGRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS wearable_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT CHECK (device_type IN ('apple_health', 'health_connect', 'fitbit', 'oura_ring', 'garmin')),
  access_token TEXT,
  refresh_token TEXT,
  last_synced TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, device_type)
);

CREATE TABLE IF NOT EXISTS wearable_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  data_type TEXT,
  value DECIMAL(10,2),
  unit TEXT,
  recorded_at TIMESTAMP NOT NULL,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wearable_data_baby_id ON wearable_data(baby_id);
