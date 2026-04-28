-- ============================================================================
-- CARE TEAM CHAT (PARENT + CAREGIVER + DOCTOR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.care_team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('parent', 'doctor', 'caregiver', 'admin', 'member')),
  message_text TEXT NOT NULL CHECK (char_length(trim(message_text)) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_team_messages_baby_id ON public.care_team_messages(baby_id);
CREATE INDEX IF NOT EXISTS idx_care_team_messages_sender_id ON public.care_team_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_care_team_messages_created_at ON public.care_team_messages(created_at DESC);

ALTER TABLE public.care_team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Care team members can read chat" ON public.care_team_messages;
CREATE POLICY "Care team members can read chat"
ON public.care_team_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = care_team_messages.baby_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_sharing_invites fsi
    WHERE fsi.baby_id = care_team_messages.baby_id
      AND fsi.accepted_at IS NOT NULL
      AND (
        fsi.accepted_by = auth.uid()
        OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.doctor_baby_assignments dba
    WHERE dba.baby_id = care_team_messages.baby_id
      AND dba.doctor_id = auth.uid()
      AND dba.status = 'active'
  )
);

DROP POLICY IF EXISTS "Care team members can send chat messages" ON public.care_team_messages;
CREATE POLICY "Care team members can send chat messages"
ON public.care_team_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.babies b
      WHERE b.id = care_team_messages.baby_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.family_sharing_invites fsi
      WHERE fsi.baby_id = care_team_messages.baby_id
        AND fsi.accepted_at IS NOT NULL
        AND fsi.role IN ('owner', 'editor', 'caregiver', 'doctor')
        AND (
          fsi.accepted_by = auth.uid()
          OR lower(fsi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.doctor_baby_assignments dba
      WHERE dba.baby_id = care_team_messages.baby_id
        AND dba.doctor_id = auth.uid()
        AND dba.status = 'active'
    )
  )
);
