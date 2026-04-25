-- Subscriptions table (add to DATABASE_SCHEMA.sql)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending')) DEFAULT 'pending',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  auto_renewal BOOLEAN NOT NULL DEFAULT true,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments table (add to DATABASE_SCHEMA.sql)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Family sharing table (for shared baby profiles)
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  permissions TEXT[] DEFAULT ARRAY['view'],
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider);
CREATE INDEX IF NOT EXISTS idx_family_members_baby_id ON public.family_members(baby_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON public.analytics_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for family_members
CREATE POLICY "Users can view family members for their babies"
  ON public.family_members FOR SELECT
  USING (
    baby_id IN (SELECT id FROM public.babies WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can manage family members for their babies"
  ON public.family_members FOR INSERT
  WITH CHECK (
    baby_id IN (SELECT id FROM public.babies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update family member permissions"
  ON public.family_members FOR UPDATE
  USING (
    baby_id IN (SELECT id FROM public.babies WHERE user_id = auth.uid())
  );

-- RLS Policies for analytics_events
CREATE POLICY "Users can insert their own analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics events"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_id UUID)
RETURNS TABLE (
  status TEXT,
  plan_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  is_premium BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.status,
    s.plan_id,
    s.current_period_end,
    (s.status = 'active' AND s.current_period_end > NOW()) AS is_premium
  FROM public.subscriptions s
  WHERE s.user_id = $1
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire old subscriptions
CREATE OR REPLACE FUNCTION expire_old_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND current_period_end < NOW();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to log analytics event
CREATE OR REPLACE FUNCTION log_analytics_event(
  user_id UUID,
  event_type TEXT,
  event_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.analytics_events (user_id, event_type, event_data)
  VALUES (user_id, event_type, event_data)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;
