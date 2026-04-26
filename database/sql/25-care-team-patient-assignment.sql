-- ============================================================================
-- CARE TEAM PATIENT ASSIGNMENT (DOCTOR + CAREGIVER)
-- ============================================================================
-- Enables:
-- 1) Doctor role in family_sharing_invites
-- 2) Baby snapshot metadata on invites for recipient patient list UI
-- 3) RLS so invited users can view and accept invites sent to their email

ALTER TABLE family_sharing_invites
  ADD COLUMN IF NOT EXISTS baby_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS baby_photo_url_snapshot TEXT;

DO $$
DECLARE
  role_constraint_name TEXT;
BEGIN
  SELECT conname
  INTO role_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'family_sharing_invites'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role IN%';

  IF role_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE family_sharing_invites DROP CONSTRAINT %I', role_constraint_name);
  END IF;
END $$;

ALTER TABLE family_sharing_invites
  DROP CONSTRAINT IF EXISTS family_sharing_invites_role_check;

ALTER TABLE family_sharing_invites
  ADD CONSTRAINT family_sharing_invites_role_check
  CHECK (role IN ('owner', 'editor', 'viewer', 'caregiver', 'doctor'));

ALTER TABLE family_sharing_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sharing invites" ON family_sharing_invites;
DROP POLICY IF EXISTS "Users can select invites they created or received" ON family_sharing_invites;
DROP POLICY IF EXISTS "Invite creators can insert invites" ON family_sharing_invites;
DROP POLICY IF EXISTS "Invite creators can update invites" ON family_sharing_invites;
DROP POLICY IF EXISTS "Invite recipients can accept invites" ON family_sharing_invites;
DROP POLICY IF EXISTS "Invite creators can delete invites" ON family_sharing_invites;

CREATE POLICY "Users can select invites they created or received"
ON family_sharing_invites
FOR SELECT
USING (
  created_by = auth.uid()
  OR lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "Invite creators can insert invites"
ON family_sharing_invites
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Invite creators can update invites"
ON family_sharing_invites
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Invite recipients can accept invites"
ON family_sharing_invites
FOR UPDATE
USING (lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
WITH CHECK (lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "Invite creators can delete invites"
ON family_sharing_invites
FOR DELETE
USING (created_by = auth.uid());
