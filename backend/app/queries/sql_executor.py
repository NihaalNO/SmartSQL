import time
from typing import Any, Dict, List
from sqlalchemy import text
from sqlalchemy.orm import Session


def execute_sql(db: Session, sql: str, limit: int = 500) -> Dict[str, Any]:
    """Execute a read-only SQL query and return columns + rows."""
    # Append LIMIT if not present to guard against huge result sets
    sql_lower = sql.lower()
    if "limit" not in sql_lower:
        sql = f"{sql.rstrip(';')} LIMIT {limit}"

    start = time.time()
    try:
        result = db.execute(text(sql))
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "execution_time_ms": elapsed_ms,
            "error": None,
        }
    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_time_ms": elapsed_ms,
            "error": str(exc),
        }


def execute_sql_on_external(connection_string: str, sql: str, limit: int = 500) -> Dict[str, Any]:
    """Execute read-only SQL on an external (Supabase/Postgres) database."""
    from sqlalchemy import create_engine

    if "limit" not in sql.lower():
        sql = f"{sql.rstrip(';')} LIMIT {limit}"

    start = time.time()
    try:
        engine = create_engine(connection_string, pool_pre_ping=True, connect_args={"connect_timeout": 10})
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "execution_time_ms": elapsed_ms,
            "error": None,
        }
    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_time_ms": elapsed_ms,
            "error": str(exc),
        }
