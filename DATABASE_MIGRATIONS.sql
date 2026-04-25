-- ============================================================================
-- COMPREHENSIVE BABYLOG FEATURE MIGRATIONS
-- All new tables for planned features
-- ============================================================================

-- 0. USER ROLES & PERMISSIONS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user', 'caregiver', 'viewer')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_role TEXT,
  new_role TEXT NOT NULL CHECK (new_role IN ('admin', 'manager', 'user', 'caregiver', 'viewer')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'user_created', 'user_deleted', 'role_changed', etc.
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manager_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  metrics JSONB,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_role_assignment_logs_user_id ON role_assignment_logs(user_id);
CREATE INDEX idx_role_assignment_logs_created_at ON role_assignment_logs(created_at);
CREATE INDEX idx_admin_actions_log_admin_id ON admin_actions_log(admin_id);
CREATE INDEX idx_admin_actions_log_target_user_id ON admin_actions_log(target_user_id);
CREATE INDEX idx_manager_reports_manager_id ON manager_reports(manager_id);

-- 1. HEALTH ALERTS SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('epidemic', 'seasonal', 'outbreak', 'warning')),
  disease_name TEXT NOT NULL,
  regions TEXT[] NOT NULL, -- Array of country codes
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  description TEXT,
  prevention_tips TEXT,
  affected_age_groups TEXT[] NOT NULL, -- e.g., ['0-6', '6-12', '12-24', '24+']
  source TEXT, -- WHO, CDC, local health ministry
  data_source_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_health_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alerts_enabled BOOLEAN DEFAULT true,
  alert_types TEXT[] DEFAULT ARRAY['epidemic', 'seasonal', 'outbreak'],
  notification_frequency TEXT DEFAULT 'immediate', -- immediate, daily
  primary_region TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_health_alerts_dismissed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES health_alerts(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, alert_id)
);

-- 2. PHOTO MANAGEMENT SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS baby_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT, -- CloudFlare/AWS key
  description TEXT,
  photo_date DATE NOT NULL,
  age_days INT, -- Baby's age in days when photo taken
  tags TEXT[] DEFAULT '{}', -- e.g., ['milestone', 'monthly', 'silly']
  is_monthly_milestone BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photo_collages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM format
  collage_url TEXT,
  photos UUID[] NOT NULL, -- Array of baby_photos IDs
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. DOCTOR INTEGRATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  report_url TEXT NOT NULL,
  storage_key TEXT,
  report_type TEXT, -- pediatrician, vaccination, health_summary
  date_range_start DATE,
  date_range_end DATE,
  shared_token TEXT UNIQUE, -- QR code token
  shared_with TEXT[], -- Array of email addresses
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pediatrician_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  clinic_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  specialty TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. FAMILY SHARING ENHANCEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_sharing_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer', 'caregiver')),
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caregiver_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_type TEXT CHECK (access_type IN ('read_only', 'log_only', 'full')),
  session_token TEXT UNIQUE,
  pin_code TEXT, -- 4-digit PIN for quick handoff
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  activity_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sharing_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT, -- 'viewed', 'logged_feed', 'logged_sleep', etc.
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. ADVANCED SLEEP ANALYTICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS sleep_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_sleep_minutes INT,
  sleep_quality_score DECIMAL(3,1), -- 0-10
  night_sleep_continuous BOOLEAN, -- was it one stretch or multiple?
  nap_count INT,
  sleep_regression_detected BOOLEAN DEFAULT false,
  sleep_debt_minutes INT, -- vs age-appropriate needs
  longest_stretch_minutes INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(baby_id, date)
);

-- 6. ADVANCED FEEDING ANALYTICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS feeding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_feeds INT,
  total_duration_minutes INT,
  breast_milk_sessions INT,
  bottle_sessions INT,
  solids_sessions INT,
  average_feed_duration INT,
  supply_sufficiency DECIMAL(3,1), -- Parent perception 0-10
  solids_introduced BOOLEAN DEFAULT false,
  solids_types TEXT[], -- e.g., ['rice_cereal', 'puree_apple']
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(baby_id, date)
);

-- 7. HEALTH RECORDS SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('doctor_visit', 'vaccine', 'medication', 'allergy', 'condition', 'test')),
  title TEXT NOT NULL,
  description TEXT,
  date_recorded DATE NOT NULL,
  file_url TEXT,
  storage_key TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  reaction_description TEXT,
  photo_url TEXT,
  discovered_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  reason TEXT,
  start_date DATE,
  end_date DATE,
  effectiveness_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. PARENTING CONTENT HUB
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT CHECK (content_type IN ('article', 'video', 'tip', 'guide', 'podcast')),
  age_groups TEXT[] NOT NULL, -- e.g., ['0-6', '6-12']
  category TEXT, -- sleep, feeding, health, development, etc.
  content_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INT,
  is_premium BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_content_ids UUID[] DEFAULT '{}',
  read_content_ids UUID[] DEFAULT '{}',
  preferred_topics TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 9. WEARABLE INTEGRATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS wearable_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT CHECK (device_type IN ('apple_health', 'fitbit', 'oura_ring', 'garmin')),
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
  data_type TEXT, -- heart_rate, temperature, activity, sleep
  value DECIMAL(10,2),
  unit TEXT,
  recorded_at TIMESTAMP NOT NULL,
  source TEXT, -- device type
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. VOICE LOGGING SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS voice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  storage_key TEXT,
  transcription TEXT,
  duration_seconds INT,
  log_type TEXT, -- memory, feed, sleep, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_recognition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_log_id UUID NOT NULL REFERENCES voice_logs(id) ON DELETE CASCADE,
  cry_type TEXT, -- hunger, tired, diaper, pain, etc.
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. SUBSCRIPTION ADD-ONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_name TEXT NOT NULL,
  addon_type TEXT CHECK (addon_type IN ('content_course', 'consultant_chat', 'doctor_qa', 'premium_reports')),
  price DECIMAL(10,2),
  currency TEXT,
  description TEXT,
  content_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_addon_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES subscription_addons(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, addon_id)
);

-- 12. PARENTING COMMUNITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_name TEXT NOT NULL,
  age_group TEXT, -- 0-6, 6-12, 12-24, 24+
  description TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  member_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID NOT NULL REFERENCES community_forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes_count INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playdate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  event_date TIMESTAMP NOT NULL,
  age_range TEXT,
  description TEXT,
  max_attendees INT,
  attendee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. ADVANCED REPORTING
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('weekly_digest', 'monthly_newsletter', 'milestone_announcement')),
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  email_html TEXT,
  recipient_email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestone_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  milestone_type TEXT, -- first_smile, rolling, sitting, walking, etc.
  milestone_date DATE,
  social_media_card_url TEXT,
  shared_to TEXT[] DEFAULT '{}', -- facebook, instagram, twitter, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- 14. ANALYTICS & INSIGHTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE,
  screen_name TEXT,
  duration_seconds INT,
  actions_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. CACHING & SYNC
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_alert_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT UNIQUE,
  cached_alerts JSONB,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT,
  action TEXT, -- insert, update, delete
  record_data JSONB,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_health_alerts_regions ON health_alerts USING GIN (regions);
CREATE INDEX idx_health_alerts_severity ON health_alerts(severity);
CREATE INDEX idx_health_alerts_dates ON health_alerts(start_date, end_date);

CREATE INDEX idx_baby_photos_baby_id ON baby_photos(baby_id);
CREATE INDEX idx_baby_photos_date ON baby_photos(photo_date);

CREATE INDEX idx_doctor_reports_baby_id ON doctor_reports(baby_id);
CREATE INDEX idx_doctor_reports_shared_token ON doctor_reports(shared_token);

CREATE INDEX idx_family_sharing_baby_id ON family_sharing_invites(baby_id);
CREATE INDEX idx_family_sharing_email ON family_sharing_invites(invited_email);
CREATE INDEX idx_sharing_activity_baby_id ON sharing_activity_log(baby_id);

CREATE INDEX idx_sleep_analytics_baby_date ON sleep_analytics(baby_id, date);
CREATE INDEX idx_feeding_analytics_baby_date ON feeding_analytics(baby_id, date);

CREATE INDEX idx_health_records_baby_id ON health_records(baby_id);
CREATE INDEX idx_health_records_type ON health_records(record_type);

CREATE INDEX idx_community_posts_forum_id ON community_posts(forum_id);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);

CREATE INDEX idx_wearable_data_baby_id ON wearable_data(baby_id);
CREATE INDEX idx_voice_logs_baby_id ON voice_logs(baby_id);

CREATE INDEX idx_app_usage_user_date ON app_usage_analytics(user_id, session_date);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_reports ENABLE ROW LEVEL SECURITY;
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

-- Baby Data: Users can access their own babies and shared babies
CREATE POLICY "Users can access own baby data" ON baby_photos
  USING (
    baby_id IN (
      SELECT id FROM babies WHERE user_id = auth.uid()
    )
  );

-- Doctor Reports: Users can access own baby reports or shared reports
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

-- User Roles: Users can view own role, admins can manage all
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON user_roles
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );

-- Role Assignment Logs: Admins can view
CREATE POLICY "Admins can view role assignment logs" ON role_assignment_logs
  FOR SELECT USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) IN ('admin', 'manager')
  );

-- Admin Actions Log: Admins can view
CREATE POLICY "Admins can view admin actions" ON admin_actions_log
  FOR SELECT USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) IN ('admin', 'manager')
  );

-- Manager Reports: Managers and admins can view
CREATE POLICY "Managers and admins can view reports" ON manager_reports
  FOR SELECT USING (
    auth.uid() = manager_id OR
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Managers can create reports" ON manager_reports
  FOR INSERT WITH CHECK (
    auth.uid() = manager_id AND
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'manager'
  );

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

-- ============================================================================
-- STORAGE BUCKET CONFIGURATION (Manual setup required in Supabase Console)
-- ============================================================================
-- Run these SQL commands in Supabase SQL Editor:

/*
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('baby_photos', 'baby_photos', true),
  ('doctor_reports', 'doctor_reports', false),
  ('voice_memos', 'voice_memos', false),
  ('user_avatars', 'user_avatars', true),
  ('community_media', 'community_media', true);

-- Set up storage policies
-- Baby Photos: Users can upload and read own baby photos
CREATE POLICY "Users can upload baby photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'baby_photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view baby photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'baby_photos');

-- Doctor Reports: Users can upload own reports
CREATE POLICY "Users can upload doctor reports" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'doctor_reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'doctor_reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Voice Memos: Users can upload and read own
CREATE POLICY "Users can upload voice memos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice_memos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own voice memos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice_memos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- User Avatars: Users can upload own avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user_avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Everyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'user_avatars');

-- Community Media: Authenticated users can upload
CREATE POLICY "Users can upload community media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community_media');

CREATE POLICY "Everyone can view community media" ON storage.objects
  FOR SELECT USING (bucket_id = 'community_media');
*/

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
CREATE TRIGGER update_health_alerts_updated_at
  BEFORE UPDATE ON health_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_health_preferences_updated_at
  BEFORE UPDATE ON user_health_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_baby_photos_updated_at
  BEFORE UPDATE ON baby_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_reports_updated_at
  BEFORE UPDATE ON doctor_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_analytics_updated_at
  BEFORE UPDATE ON sleep_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feeding_analytics_updated_at
  BEFORE UPDATE ON feeding_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_records_updated_at
  BEFORE UPDATE ON health_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_logs_updated_at
  BEFORE UPDATE ON voice_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOGGING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to log audit events
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, table_name, action, old_values)
    VALUES (auth.uid(), TG_TABLE_NAME, 'DELETE', row_to_json(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, table_name, action, old_values, new_values)
    VALUES (auth.uid(), TG_TABLE_NAME, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, table_name, action, new_values)
    VALUES (auth.uid(), TG_TABLE_NAME, 'INSERT', row_to_json(NEW));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_baby_photos AFTER INSERT OR UPDATE OR DELETE ON baby_photos
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_doctor_reports AFTER INSERT OR UPDATE OR DELETE ON doctor_reports
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_health_records AFTER INSERT OR UPDATE OR DELETE ON health_records
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
