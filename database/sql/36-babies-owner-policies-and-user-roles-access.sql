-- ============================================================================
-- BABIES OWNER POLICIES + USER ROLE ACCESS
-- ============================================================================

ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.user_roles TO authenticated;

DROP POLICY IF EXISTS babies_select_own ON public.babies;
CREATE POLICY babies_select_own
ON public.babies
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS babies_insert_own ON public.babies;
CREATE POLICY babies_insert_own
ON public.babies
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS babies_update_own ON public.babies;
CREATE POLICY babies_update_own
ON public.babies
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS babies_delete_own ON public.babies;
CREATE POLICY babies_delete_own
ON public.babies
FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());
