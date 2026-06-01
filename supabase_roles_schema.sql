-- =============================================================================
-- SmartSQL – Role-Specific Profile Tables (additive migration)
-- Run AFTER supabase_schema.sql.
--
-- Design: users is kept as the single identity table so all existing FKs
-- (saved_queries, query_logs, feedback, etc.) remain untouched.
-- Each role gets a dedicated 1:1 profile table keyed on users.id that stores
-- role-specific settings and capabilities.
-- A database trigger auto-provisions the correct profile row whenever a new
-- user is inserted, so the application layer needs no extra logic.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_users
--    Full platform managers – can see all users, configure data sources, etc.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    user_id                  INTEGER PRIMARY KEY
                             REFERENCES users(id) ON DELETE CASCADE,

    -- Organisational context
    department               VARCHAR(120),

    -- Capability flags (individual overrides; all TRUE by default for admins)
    can_manage_users         BOOLEAN NOT NULL DEFAULT TRUE,
    can_configure_datasources BOOLEAN NOT NULL DEFAULT TRUE,
    see_all_query_logs       BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_datasets      BOOLEAN NOT NULL DEFAULT TRUE,

    -- Activity tracking
    last_dashboard_visit_at  TIMESTAMPTZ,
    total_users_managed      INTEGER NOT NULL DEFAULT 0,

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_users IS
    'Extended profile for admin-role users. 1:1 with users(id).';

-- ---------------------------------------------------------------------------
-- 2. analyst_users
--    Data explorers – run queries, save results, connect live databases.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyst_users (
    user_id                  INTEGER PRIMARY KEY
                             REFERENCES users(id) ON DELETE CASCADE,

    -- AI / query preferences
    preferred_model_provider VARCHAR(50)  NOT NULL DEFAULT 'groq',
    preferred_model_name     VARCHAR(100) NOT NULL DEFAULT 'llama-3.3-70b-versatile',

    -- Operational limits
    max_saved_queries        INTEGER NOT NULL DEFAULT 100,
    can_use_live_db          BOOLEAN NOT NULL DEFAULT TRUE,

    -- Usage stats (denormalised counters for fast display)
    total_queries_run        INTEGER NOT NULL DEFAULT 0,
    total_saved_queries      INTEGER NOT NULL DEFAULT 0,

    -- Activity tracking
    last_query_at            TIMESTAMPTZ,

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE analyst_users IS
    'Extended profile for analyst-role users. 1:1 with users(id).';

-- ---------------------------------------------------------------------------
-- 3. viewer_users
--    Read-only consumers – browse shared results and history.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viewer_users (
    user_id              INTEGER PRIMARY KEY
                         REFERENCES users(id) ON DELETE CASCADE,

    -- Capability flags (all restrictive by default for viewers)
    read_only            BOOLEAN NOT NULL DEFAULT TRUE,
    can_export_results   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Activity tracking
    last_viewed_at       TIMESTAMPTZ,
    total_views          INTEGER NOT NULL DEFAULT 0,

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE viewer_users IS
    'Extended profile for viewer-role users. 1:1 with users(id).';

-- ---------------------------------------------------------------------------
-- 4. Auto-provision trigger
--    Fires AFTER every INSERT on users and creates the matching role-profile
--    row (and a default chart_preferences row) automatically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION provision_role_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_role_name TEXT;
BEGIN
    -- Resolve role name from the roles lookup table
    SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id;

    CASE v_role_name
        WHEN 'admin' THEN
            INSERT INTO admin_users   (user_id) VALUES (NEW.id)
                ON CONFLICT (user_id) DO NOTHING;

        WHEN 'analyst' THEN
            INSERT INTO analyst_users (user_id) VALUES (NEW.id)
                ON CONFLICT (user_id) DO NOTHING;

        WHEN 'viewer' THEN
            INSERT INTO viewer_users  (user_id) VALUES (NEW.id)
                ON CONFLICT (user_id) DO NOTHING;

        ELSE
            -- Unknown role: log a notice but do not raise an error
            RAISE NOTICE 'provision_role_profile: unknown role "%" for user_id %',
                         v_role_name, NEW.id;
    END CASE;

    -- Always create a default chart-preferences row
    INSERT INTO chart_preferences (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_role_profile ON users;
CREATE TRIGGER trg_provision_role_profile
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION provision_role_profile();

-- ---------------------------------------------------------------------------
-- 5. Unified read-only view  v_user_profile
--    Joins users with whichever role table is populated.
--    Useful for the admin dashboard and API introspection.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_profile AS
SELECT
    u.id,
    u.supabase_uid,
    u.full_name,
    u.email,
    r.name                          AS role,
    u.status,
    u.created_at,
    u.updated_at,

    -- Admin fields (NULL for non-admin users)
    au.department,
    au.can_manage_users,
    au.can_configure_datasources,
    au.see_all_query_logs,
    au.can_manage_datasets,
    au.last_dashboard_visit_at,
    au.total_users_managed,

    -- Analyst fields (NULL for non-analyst users)
    anu.preferred_model_provider,
    anu.preferred_model_name,
    anu.max_saved_queries,
    anu.can_use_live_db,
    anu.total_queries_run,
    anu.total_saved_queries,
    anu.last_query_at,

    -- Viewer fields (NULL for non-viewer users)
    vu.read_only,
    vu.can_export_results,
    vu.last_viewed_at,
    vu.total_views

FROM users              u
JOIN  roles             r   ON r.id   = u.role_id
LEFT JOIN admin_users   au  ON au.user_id  = u.id
LEFT JOIN analyst_users anu ON anu.user_id = u.id
LEFT JOIN viewer_users  vu  ON vu.user_id  = u.id;

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id
    ON admin_users(user_id);

CREATE INDEX IF NOT EXISTS idx_analyst_users_user_id
    ON analyst_users(user_id);

CREATE INDEX IF NOT EXISTS idx_analyst_users_last_query_at
    ON analyst_users(last_query_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_viewer_users_user_id
    ON viewer_users(user_id);

-- ---------------------------------------------------------------------------
-- 7. Row-Level Security
--    Backend uses service-role key (bypasses RLS).
--    Users can only read/update their own role-profile row via anon/authenticated.
-- ---------------------------------------------------------------------------
ALTER TABLE admin_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_users  ENABLE ROW LEVEL SECURITY;

-- admin_users
DROP POLICY IF EXISTS "admin_users_self_select" ON admin_users;
CREATE POLICY "admin_users_self_select" ON admin_users
    FOR SELECT USING (user_id = current_app_user_id());

DROP POLICY IF EXISTS "admin_users_self_update" ON admin_users;
CREATE POLICY "admin_users_self_update" ON admin_users
    FOR UPDATE USING (user_id = current_app_user_id());

-- analyst_users
DROP POLICY IF EXISTS "analyst_users_self_select" ON analyst_users;
CREATE POLICY "analyst_users_self_select" ON analyst_users
    FOR SELECT USING (user_id = current_app_user_id());

DROP POLICY IF EXISTS "analyst_users_self_update" ON analyst_users;
CREATE POLICY "analyst_users_self_update" ON analyst_users
    FOR UPDATE USING (user_id = current_app_user_id());

-- viewer_users
DROP POLICY IF EXISTS "viewer_users_self_select" ON viewer_users;
CREATE POLICY "viewer_users_self_select" ON viewer_users
    FOR SELECT USING (user_id = current_app_user_id());

DROP POLICY IF EXISTS "viewer_users_self_update" ON viewer_users;
CREATE POLICY "viewer_users_self_update" ON viewer_users
    FOR UPDATE USING (user_id = current_app_user_id());
