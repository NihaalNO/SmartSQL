import ast
import re
import time
from typing import Any, Dict

# Map PostgreSQL error codes to friendly messages
_PG_CODE_HINTS: dict[str, str] = {
    "42P01": "The table does not exist in the database. The generated query may reference a table name not present in your schema.",
    "42703": "A column referenced in the query does not exist in the table.",
    "42601": "The generated SQL has a syntax error.",
    "42501": "Permission denied — the database role cannot access this table or column.",
    "23505": "A unique constraint violation occurred.",
    "22P02": "An invalid value was passed (type mismatch).",
}


def _extract_pg_code(exc: Exception) -> str | None:
    """Return the PostgreSQL error code from a PostgREST exception, or None."""
    raw = str(exc)
    try:
        data = ast.literal_eval(raw)
        if isinstance(data, dict):
            return data.get("code")
    except (ValueError, SyntaxError):
        pass
    m = re.search(r"'code'\s*:\s*'([^']+)'", raw)
    return m.group(1) if m else None


def _humanize_error(exc: Exception) -> str:
    """
    Extract a readable error message from a Supabase/PostgREST or SQLAlchemy exception.

    PostgREST wraps PostgreSQL errors as a dict string, e.g.:
      {'code': '42P01', 'details': None, 'hint': None, 'message': 'relation "x" does not exist'}
    """
    raw = str(exc)

    # Try to parse as a Python dict literal (PostgREST error format)
    try:
        data = ast.literal_eval(raw)
        if isinstance(data, dict):
            msg = data.get("message") or raw
            code = data.get("code", "")
            hint = _PG_CODE_HINTS.get(code, "")
            return f"{msg}. {hint}".strip(" .") + "." if hint else msg
    except (ValueError, SyntaxError):
        pass

    # Fallback: try regex to pull 'message' value from a stringified dict
    m = re.search(r"'message'\s*:\s*'([^']+)'", raw)
    if m:
        return m.group(1)

    return raw


def _apply_limit(sql: str, limit: int) -> str:
    if "limit" not in sql.lower():
        return f"{sql.rstrip(';')} LIMIT {limit}"
    return sql


def execute_sql(sb, sql: str, limit: int = 500) -> Dict[str, Any]:
    """
    Execute a read-only SQL query against the internal Supabase database
    via the execute_safe_select RPC function (HTTPS — no direct TCP needed).

    Requires supabase_functions.sql → public.execute_safe_select(query_text TEXT)
    """
    sql = _apply_limit(sql, limit)
    start = time.time()
    try:
        result = sb.rpc("execute_safe_select", {"query_text": sql}).execute()
        elapsed_ms = int((time.time() - start) * 1000)
        rows = result.data or []
        if not rows:
            return {"columns": [], "rows": [], "row_count": 0,
                    "execution_time_ms": elapsed_ms, "error": None}
        columns = list(rows[0].keys())
        return {
            "columns": columns, "rows": rows,
            "row_count": len(rows), "execution_time_ms": elapsed_ms, "error": None,
        }
    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "columns": [], "rows": [], "row_count": 0,
            "execution_time_ms": elapsed_ms,
            "error": _humanize_error(exc),
            "error_code": _extract_pg_code(exc),
        }


def execute_sql_on_external(
    connection_string: str,
    sql: str,
    limit: int = 500,
    ssl_required: bool = True,
) -> Dict[str, Any]:
    """
    Execute a read-only SQL query on an external PostgreSQL database.

    ssl_required=True  → sslmode=require (Supabase-hosted)
    ssl_required=False → sslmode=prefer  (local / self-hosted without SSL)
    """
    from sqlalchemy import create_engine, text

    sql = _apply_limit(sql, limit)
    sslmode = "require" if ssl_required else "prefer"
    start = time.time()
    engine = None
    try:
        engine = create_engine(
            connection_string,
            connect_args={"connect_timeout": 10, "sslmode": sslmode},
        )
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "columns": columns, "rows": rows,
            "row_count": len(rows), "execution_time_ms": elapsed_ms, "error": None,
        }
    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "columns": [], "rows": [], "row_count": 0,
            "execution_time_ms": elapsed_ms,
            "error": _humanize_error(exc),
            "error_code": None,  # SQLAlchemy exceptions don't carry PG codes the same way
        }
    finally:
        if engine is not None:
            engine.dispose()   # always release the connection pool
