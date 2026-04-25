-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_health_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_health_alerts_dismissed ENABLE ROW LEVEL SECURITY;
ALTER TABLE baby_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_collages ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pediatrician_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_sharing_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_recognition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addon_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE playdate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Health Alerts: Public read, user can update own preferences
CREATE POLICY "Health alerts are public" ON health_alerts FOR SELECT USING (true);
CREATE POLICY "Users can manage own health preferences" ON user_health_preferences 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Baby Data: Users can access their own babies
CREATE POLICY "Users can access own baby data" ON baby_photos
  USING (
    baby_id IN (
      SELECT id FROM babies WHERE user_id = auth.uid()
    )
  );

-- Doctor Reports: Users can access own baby reports
CREATE POLICY "Users can access own doctor reports" ON doctor_reports
  USING (
    baby_id IN (
      SELECT id FROM babies WHERE user_id = auth.uid()
    )
  );

-- Family Sharing: Users can access own invites
CREATE POLICY "Users can view own sharing invites" ON family_sharing_invites
  USING (created_by = auth.uid());

-- Caregiver Sessions: Users can manage own sessions
CREATE POLICY "Users can manage caregiver sessions" ON caregiver_sessions
  USING (user_id = auth.uid());

-- Sleep & Feeding Analytics: Users can access own baby data
CREATE POLICY "Users can access own sleep data" ON sleep_analytics
  USING (
    baby_id IN (
      SELECT id FROM babies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access own feeding data" ON feeding_analytics
  USING (
    baby_id IN (
      SELECT id FROM babies WHERE user_id = auth.uid()
    )
  );

-- Health Records: Users can access own baby health records
CREATE POLICY "Users can access own health records" ON health_records
  USING (
    baby_id IN (
      SELECT id FROM babies WHERE user_id = auth.uid()
    )
  );

-- Community: Public read, authenticated write
CREATE POLICY "Community forums public read" ON community_forums FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON community_posts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users can update own posts" ON community_posts 
  FOR UPDATE USING (auth.uid() = user_id);

-- Voice Logs: Users can access own baby voice data
CREATE POLICY "Users can access own voice logs" ON voice_logs
  USING (
    baby_id IN (
      SELECT id FROM babies WHERE user_id = auth.uid()
    )
  );

-- Content Preferences: Users can manage own preferences
CREATE POLICY "Users can manage content preferences" ON user_content_preferences
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Wearable Integration: Users can manage own integrations
CREATE POLICY "Users can manage own wearable integrations" ON wearable_integrations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Email Reports: Users can access own reports
CREATE POLICY "Users can access own email reports" ON email_reports
  USING (auth.uid() = user_id);
