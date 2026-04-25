-- ============================================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DROP TRIGGER IF EXISTS update_health_alerts_updated_at ON health_alerts;
CREATE TRIGGER update_health_alerts_updated_at
  BEFORE UPDATE ON health_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_health_preferences_updated_at ON user_health_preferences;
CREATE TRIGGER update_user_health_preferences_updated_at
  BEFORE UPDATE ON user_health_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_baby_photos_updated_at ON baby_photos;
CREATE TRIGGER update_baby_photos_updated_at
  BEFORE UPDATE ON baby_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctor_reports_updated_at ON doctor_reports;
CREATE TRIGGER update_doctor_reports_updated_at
  BEFORE UPDATE ON doctor_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sleep_analytics_updated_at ON sleep_analytics;
CREATE TRIGGER update_sleep_analytics_updated_at
  BEFORE UPDATE ON sleep_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feeding_analytics_updated_at ON feeding_analytics;
CREATE TRIGGER update_feeding_analytics_updated_at
  BEFORE UPDATE ON feeding_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_health_records_updated_at ON health_records;
CREATE TRIGGER update_health_records_updated_at
  BEFORE UPDATE ON health_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_voice_logs_updated_at ON voice_logs;
CREATE TRIGGER update_voice_logs_updated_at
  BEFORE UPDATE ON voice_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
