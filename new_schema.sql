-- SmartSQL role-system removal migration.
-- Based on the current public tables:
-- admin_credentials, roles, users, saved_queries, query_logs, feedback.
-- Supabase auth.users is intentionally untouched.

BEGIN;

-- Keep users as the single application profile table.
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Remove role dependency from user profiles before dropping the roles table.
ALTER TABLE IF EXISTS public.users
  DROP CONSTRAINT IF EXISTS users_role_id_fkey;

ALTER TABLE IF EXISTS public.users
  DROP COLUMN IF EXISTS role_id;

-- Remove tables that exist only for the old role/admin model.
DROP TABLE IF EXISTS public.admin_credentials CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- Preserve user data and activity tables, with ownership-based access.
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (supabase_uid = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (supabase_uid = auth.uid())
  WITH CHECK (supabase_uid = auth.uid());

DROP POLICY IF EXISTS "Users can read own saved queries" ON public.saved_queries;
CREATE POLICY "Users can read own saved queries"
  ON public.saved_queries
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own saved queries" ON public.saved_queries;
CREATE POLICY "Users can insert own saved queries"
  ON public.saved_queries
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

DROP POLICY IF EXISTS "Users can update own saved queries" ON public.saved_queries;
CREATE POLICY "Users can update own saved queries"
  ON public.saved_queries
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own saved queries" ON public.saved_queries;
CREATE POLICY "Users can delete own saved queries"
  ON public.saved_queries
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

DROP POLICY IF EXISTS "Users can read own query logs" ON public.query_logs;
CREATE POLICY "Users can read own query logs"
  ON public.query_logs
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own query logs" ON public.query_logs;
CREATE POLICY "Users can insert own query logs"
  ON public.query_logs
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;
CREATE POLICY "Users can read own feedback"
  ON public.feedback
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
CREATE POLICY "Users can insert own feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    AND query_log_id IN (
      SELECT id
      FROM public.query_logs
      WHERE user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
CREATE POLICY "Users can update own feedback"
  ON public.feedback
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()))
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    AND query_log_id IN (
      SELECT id
      FROM public.query_logs
      WHERE user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own feedback" ON public.feedback;
CREATE POLICY "Users can delete own feedback"
  ON public.feedback
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

COMMIT;
