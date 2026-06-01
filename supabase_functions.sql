-- =============================================================================
-- SmartSQL – Supabase RPC helper functions
-- Run this in the Supabase SQL Editor AFTER supabase_schema.sql.
--
-- These two functions let the FastAPI backend execute SQL queries and inspect
-- the schema entirely over HTTPS (PostgREST), with no direct TCP connection
-- to the PostgreSQL port required.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. execute_safe_select
--    Executes a caller-supplied SELECT statement and returns all rows as JSON.
--    The validator in the backend already blocks non-SELECT statements; this
--    function adds a second guard at the DB level.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_safe_select(query_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result     JSON;
    safe_query TEXT;
    trimmed    TEXT := lower(trim(query_text));
BEGIN
    -- Only allow SELECT / WITH (CTE) statements
    IF NOT (trimmed LIKE 'select%' OR trimmed LIKE 'with%') THEN
        RAISE EXCEPTION 'Only SELECT queries are permitted';
    END IF;

    -- Block obvious injection patterns
    IF trimmed ~ ';\s*(drop|alter|insert|update|delete|truncate|create|grant|revoke)' THEN
        RAISE EXCEPTION 'Potentially unsafe query rejected';
    END IF;

    -- Add LIMIT if missing to guard against enormous result sets
    IF position('limit' IN trimmed) = 0 THEN
        safe_query := rtrim(query_text, '; ') || ' LIMIT 500';
    ELSE
        safe_query := query_text;
    END IF;

    EXECUTE format(
        'SELECT json_agg(row_to_json(___t)) FROM (%s) ___t',
        safe_query
    ) INTO result;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Grant execute to authenticated users (backend uses service-role, which bypasses this)
GRANT EXECUTE ON FUNCTION public.execute_safe_select(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. get_public_schema
--    Returns column metadata for all user tables in the public schema.
--    Used by the schema explorer and as context for the AI SQL generator.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_schema()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(t ORDER BY t.table_name, t.ordinal_position)
    INTO result
    FROM (
        SELECT
            table_name,
            column_name,
            data_type,
            is_nullable,
            ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name NOT IN (
              -- Exclude SmartSQL app meta-tables (not relevant AI query context)
              'roles', 'users', 'admin_users', 'analyst_users', 'viewer_users',
              'saved_queries', 'query_logs', 'feedback', 'chart_preferences',
              'live_db_sessions', 'datasets',
              -- Exclude internal Supabase / PostgREST tables
              'schema_migrations', 'pg_stat_statements'
          )
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_schema() TO authenticated;
