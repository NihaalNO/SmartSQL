-- =============================================================================
-- SmartSQL – Supabase / PostgreSQL Schema
-- Run this in the Supabase SQL Editor to bootstrap the application database.
-- Supabase Auth handles user authentication; this schema stores app metadata.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom ENUM types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_status     AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE dataset_source  AS ENUM ('internal_pg', 'supabase_live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE query_mode_type AS ENUM ('internal', 'live_supabase');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE exec_status     AS ENUM ('success', 'failed', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE db_provider     AS ENUM ('supabase');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name) VALUES ('admin'), ('analyst'), ('viewer')
    ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. users
--    supabase_uid references auth.users(id) managed by Supabase Auth.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    supabase_uid UUID        UNIQUE,           -- FK to Supabase auth.users
    full_name    VARCHAR(120) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    role_id      INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status       user_status NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current on every row update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. datasets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datasets (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    source_type dataset_source NOT NULL DEFAULT 'internal_pg',
    schema_name VARCHAR(120),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. saved_queries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_queries (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dataset_id            INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    title                 VARCHAR(150) NOT NULL,
    natural_language_query TEXT NOT NULL,
    generated_sql          TEXT NOT NULL,
    chart_type             VARCHAR(50),
    is_favorite            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_saved_queries_updated_at ON saved_queries;
CREATE TRIGGER trg_saved_queries_updated_at
    BEFORE UPDATE ON saved_queries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. query_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS query_logs (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                INTEGER REFERENCES users(id) ON DELETE SET NULL,
    dataset_id             INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    query_mode             query_mode_type NOT NULL DEFAULT 'internal',
    natural_language_query TEXT NOT NULL,
    generated_sql          TEXT,
    execution_status       exec_status NOT NULL DEFAULT 'success',
    error_message          TEXT,
    execution_time_ms      INTEGER,
    row_count              INTEGER,
    model_provider         VARCHAR(50),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 7. feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
    id            SERIAL PRIMARY KEY,
    query_log_id  BIGINT NOT NULL REFERENCES query_logs(id) ON DELETE CASCADE,
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comments      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. chart_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chart_preferences (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    default_chart_type VARCHAR(50),
    theme             VARCHAR(20) NOT NULL DEFAULT 'light',
    show_sql_preview  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_chart_prefs_updated_at ON chart_preferences;
CREATE TRIGGER trg_chart_prefs_updated_at
    BEFORE UPDATE ON chart_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. live_db_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_db_sessions (
    id               BIGSERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         db_provider NOT NULL DEFAULT 'supabase',
    project_ref      VARCHAR(120),
    db_host          VARCHAR(255),
    db_port          INTEGER DEFAULT 5432,
    db_name          VARCHAR(120),
    db_user          VARCHAR(120),
    connection_label VARCHAR(120),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at         TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- 10. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role_id            ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid       ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id    ON saved_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id       ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_dataset_id    ON query_logs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at    ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_query_log_id    ON feedback(query_log_id);
CREATE INDEX IF NOT EXISTS idx_live_db_sessions_user_id ON live_db_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_db_sessions_active  ON live_db_sessions(user_id) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 11. Row-Level Security
--     Enable RLS so each user can only see their own rows via the Supabase
--     anon/authenticated roles.  The service-role key bypasses RLS entirely,
--     so the FastAPI backend (using service-role key) always has full access.
-- ---------------------------------------------------------------------------
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_queries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_db_sessions ENABLE ROW LEVEL SECURITY;

-- Helper: resolve the app users.id from the Supabase JWT sub (UUID)
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS INTEGER LANGUAGE sql STABLE AS $$
    SELECT id FROM users WHERE supabase_uid = auth.uid();
$$;

-- Users: can read/update their own row
DROP POLICY IF EXISTS "users_self_select" ON users;
CREATE POLICY "users_self_select" ON users
    FOR SELECT USING (supabase_uid = auth.uid());

DROP POLICY IF EXISTS "users_self_update" ON users;
CREATE POLICY "users_self_update" ON users
    FOR UPDATE USING (supabase_uid = auth.uid());

-- Saved queries
DROP POLICY IF EXISTS "saved_queries_owner" ON saved_queries;
CREATE POLICY "saved_queries_owner" ON saved_queries
    FOR ALL USING (user_id = current_app_user_id());

-- Query logs
DROP POLICY IF EXISTS "query_logs_owner" ON query_logs;
CREATE POLICY "query_logs_owner" ON query_logs
    FOR ALL USING (user_id = current_app_user_id());

-- Feedback
DROP POLICY IF EXISTS "feedback_owner" ON feedback;
CREATE POLICY "feedback_owner" ON feedback
    FOR ALL USING (user_id = current_app_user_id());

-- Chart preferences
DROP POLICY IF EXISTS "chart_prefs_owner" ON chart_preferences;
CREATE POLICY "chart_prefs_owner" ON chart_preferences
    FOR ALL USING (user_id = current_app_user_id());

-- Live DB sessions
DROP POLICY IF EXISTS "live_db_sessions_owner" ON live_db_sessions;
CREATE POLICY "live_db_sessions_owner" ON live_db_sessions
    FOR ALL USING (user_id = current_app_user_id());
