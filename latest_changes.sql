-- =============================================================================
-- SmartSQL — Admin Credentials Schema
-- Applied to Supabase via MCP migration "admin_credentials"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- admin_credentials table
-- Stores admin_name + bcrypt(admin_code) pairs linked to a users row.
-- Admin accounts are never created through the public registration flow.
-- The backend /api/auth/admin-login fetches from this table and verifies
-- the submitted code against the stored bcrypt hash — no values are
-- hardcoded anywhere in the application or config files.
-- ---------------------------------------------------------------------------

CREATE TABLE public.admin_credentials (
    id           SERIAL PRIMARY KEY,
    admin_name   VARCHAR(100) UNIQUE NOT NULL,
    code_hash    TEXT         NOT NULL,   -- bcrypt hash of the admin code
    user_id      INTEGER      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_credentials_admin_name ON public.admin_credentials(admin_name);

CREATE TRIGGER trg_admin_credentials_updated_at
    BEFORE UPDATE ON public.admin_credentials
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: deny all direct public access; service-role key bypasses RLS
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_public" ON public.admin_credentials FOR ALL USING (false);


-- =============================================================================
-- How to create an admin account
-- =============================================================================
--
-- Step 1 — Create a Supabase Auth user for the admin via the Supabase dashboard
--           or dashboard SQL editor (use a strong internal password; it is never used).
--           Note the user's UUID (e.g. 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx').
--
-- Step 2 — Insert a users row (replace values):
--
--   INSERT INTO public.users (supabase_uid, full_name, email, role_id)
--   VALUES (
--       'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
--       'Super Admin',
--       'admin@internal.yourdomain.com',
--       (SELECT id FROM public.roles WHERE name = 'admin')
--   );
--
-- Step 3 — Generate a bcrypt hash for the admin code using Python:
--
--   python -c "
--   from passlib.context import CryptContext
--   ctx = CryptContext(schemes=['bcrypt'])
--   print(ctx.hash('YOUR_CHOSEN_ADMIN_CODE'))
--   "
--
-- Step 4 — Insert the admin credential row (replace values):
--
--   INSERT INTO public.admin_credentials (admin_name, code_hash, user_id)
--   VALUES (
--       'superadmin',
--       '$2b$12$<paste bcrypt hash here>',
--       (SELECT id FROM public.users WHERE email = 'admin@internal.yourdomain.com')
--   );
--
-- Step 5 — Sign in at localhost:3000/moderator/login using:
--           Admin Name: superadmin
--           Admin Code: YOUR_CHOSEN_ADMIN_CODE
--
-- =============================================================================
-- How to rotate an admin code
-- =============================================================================
--
-- 1. Generate a new bcrypt hash (Step 3 above).
-- 2. Run:
--
--   UPDATE public.admin_credentials
--      SET code_hash = '$2b$12$<new hash>'
--    WHERE admin_name = 'superadmin';
--
-- =============================================================================
