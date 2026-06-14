-- =============================================================================
-- SmartSQL — Drop unused tables, views, triggers, and functions
--
-- Tables compared against:
--   • backend Python code  (grep for .table("..."))
--   • documents/supabase_schema.sql
--   • documents/supabase_roles_schema.sql
--   • documents/supabase_functions.sql
--
-- KEPT  : roles, users, query_logs, saved_queries, feedback, admin_credentials
-- UNUSED: everything below
--
-- Run in Supabase SQL Editor.  Safe to re-run (all statements are idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the unified view (references the role-profile tables we are dropping)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_user_profile;

-- ---------------------------------------------------------------------------
-- 2. Drop the auto-provision trigger + function BEFORE removing the tables
--    it tries to INSERT into (admin_users / analyst_users / viewer_users).
--    Leaving the trigger in place would break every future user registration.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_provision_role_profile ON public.users;
DROP FUNCTION IF EXISTS public.provision_role_profile();

-- ---------------------------------------------------------------------------
-- 3. Remove dataset_id foreign-key constraints from the tables we are KEEPING.
--    This lets us drop `datasets` without touching saved_queries / query_logs.
--    The dataset_id columns remain (always NULL); the FK is gone.
-- ---------------------------------------------------------------------------
ALTER TABLE public.saved_queries
    DROP CONSTRAINT IF EXISTS saved_queries_dataset_id_fkey;

ALTER TABLE public.query_logs
    DROP CONSTRAINT IF EXISTS query_logs_dataset_id_fkey;

-- ---------------------------------------------------------------------------
-- 4. Drop unused tables (CASCADE cleans up their own indexes / policies)
-- ---------------------------------------------------------------------------

-- 4a. admin_accounts — superseded by admin_credentials in the current auth flow
DROP TABLE IF EXISTS public.admin_accounts CASCADE;

-- 4b. Role-specific profile tables — defined in supabase_roles_schema.sql but
--     never queried by any backend route; auth now uses the users table directly
DROP TABLE IF EXISTS public.admin_users    CASCADE;
DROP TABLE IF EXISTS public.analyst_users  CASCADE;
DROP TABLE IF EXISTS public.viewer_users   CASCADE;

-- 4c. chart_preferences — defined in supabase_schema.sql / roles_schema.sql;
--     no backend endpoint reads or writes it
DROP TABLE IF EXISTS public.chart_preferences CASCADE;

-- 4d. live_db_sessions — credentials for live-DB connections are passed
--     ephemerally per request; no session state is persisted
DROP TABLE IF EXISTS public.live_db_sessions CASCADE;

-- 4e. datasets — dataset_id appears as a nullable column in saved_queries and
--     query_logs but no backend route ever creates, reads, or filters by a
--     dataset row; FK constraints removed above in step 3
DROP TABLE IF EXISTS public.datasets CASCADE;

-- ---------------------------------------------------------------------------
-- 5. Verify what remains
-- ---------------------------------------------------------------------------
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_type   = 'BASE TABLE'
 ORDER BY table_name;
