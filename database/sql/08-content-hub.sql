-- ============================================================================
-- PARENTING CONTENT HUB
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT CHECK (content_type IN ('article', 'video', 'tip', 'guide', 'podcast')),
  age_groups TEXT[] NOT NULL,
  category TEXT,
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
