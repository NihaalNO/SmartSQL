from typing import Dict, List


def get_internal_schema(sb) -> str:
    """
    Return a text description of all public tables via the get_public_schema
    RPC (HTTP — no direct TCP connection needed).

    Requires the helper function installed from supabase_functions.sql:
        public.get_public_schema() RETURNS JSON
    """
    try:
        result = sb.rpc("get_public_schema", {}).execute()
        rows = result.data or []
    except Exception as exc:
        return f"Error reading schema: {exc}"

    # Group columns by table
    tables: Dict[str, list] = {}
    for col in rows:
        tname = col["table_name"]
        tables.setdefault(tname, []).append(col)

    parts = []
    for table, cols in sorted(tables.items()):
        col_defs = [
            f"  {c['column_name']} {c['data_type']}"
            + (" NOT NULL" if c["is_nullable"] == "NO" else "")
            for c in cols
        ]
        parts.append(f"Table: {table}\nColumns:\n" + "\n".join(col_defs))

    return "\n\n".join(parts)


def get_external_schema(connection_string: str, ssl_required: bool = True) -> str:
    """Return schema description for an external PostgreSQL database via direct connection."""
    from sqlalchemy import create_engine, inspect

    sslmode = "require" if ssl_required else "prefer"
    engine = None
    try:
        engine = create_engine(
            connection_string,
            connect_args={"connect_timeout": 10, "sslmode": sslmode},
        )
        parts = []
        # Use a single connection for all reflection calls to avoid the overhead
        # of opening a new connection per method when using inspect(engine).
        with engine.connect() as conn:
            inspector = inspect(conn)
            for table_name in inspector.get_table_names(schema="public"):
                cols = inspector.get_columns(table_name, schema="public")
                col_defs = [f"  {c['name']} {c['type']}" for c in cols]
                parts.append(f"Table: {table_name}\nColumns:\n" + "\n".join(col_defs))
        return "\n\n".join(parts)
    except Exception as exc:
        msg = str(exc)
        # Translate low-level errors into actionable guidance
        if "could not translate host name" in msg or "Name or service not known" in msg:
            return (
                "Error reading schema: Cannot resolve the Neon database hostname. "
                "Verify the host in Neon Console → your project → Connection Details. "
                "The host should look like: ep-<name>-<id>.<region>.aws.neon.tech. "
                "For local PostgreSQL, use 'localhost'."
            )
        if "endpoint is disabled" in msg or "project is in restricted state" in msg:
            return (
                "Error reading schema: The Neon compute endpoint is disabled or the project is restricted. "
                "Open Neon Console → your project and check the compute status. "
                "Free-tier computes suspend automatically after 5 minutes of inactivity but wake on reconnect — "
                "wait a moment and try again."
            )
        if "Connection refused" in msg or "connect timeout" in msg.lower():
            return (
                "Error reading schema: Connection refused or timed out. "
                "Check the host, port (5432), and that your Neon compute is active. "
                "For local PostgreSQL, confirm the server is running."
            )
        if "password authentication failed" in msg or "authentication failed" in msg:
            return (
                "Error reading schema: Authentication failed — "
                "check your DB User and password. "
                "The default Neon role is typically 'neondb_owner'; "
                "find yours in Neon Console → Roles."
            )
        if "role" in msg and "does not exist" in msg:
            return (
                "Error reading schema: The specified database role does not exist. "
                "Check DB User — it must match a role in Neon Console → Roles. "
                "The default role is typically 'neondb_owner'."
            )
        if "SSL" in msg or "ssl" in msg:
            return (
                "Error reading schema: SSL is required for Neon databases. "
                "Enable the 'Require SSL' checkbox and try again."
            )
        return f"Error reading schema: {exc}"
    finally:
        if engine is not None:
            engine.dispose()


def get_schema_as_dict(sb) -> List[Dict]:
    """Return structured table metadata for the frontend schema explorer."""
    try:
        result = sb.rpc("get_public_schema", {}).execute()
        rows = result.data or []
    except Exception:
        return []

    tables: Dict[str, list] = {}
    for col in rows:
        tname = col["table_name"]
        tables.setdefault(tname, []).append(col)

    return [
        {
            "table": table,
            "columns": [
                {
                    "name": c["column_name"],
                    "type": c["data_type"],
                    "nullable": c["is_nullable"] == "YES",
                }
                for c in cols
            ],
        }
        for table, cols in sorted(tables.items())
    ]
