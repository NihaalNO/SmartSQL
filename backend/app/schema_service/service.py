from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, List


def get_internal_schema(db: Session) -> str:
    """Return a text description of all tables and columns in the connected MySQL DB."""
    # Get all tables
    tables_result = db.execute(text("SHOW TABLES")).fetchall()
    table_names = [row[0] for row in tables_result]

    schema_parts = []
    for table in table_names:
        cols_result = db.execute(text(f"DESCRIBE `{table}`")).fetchall()
        col_defs = []
        for col in cols_result:
            name, col_type, nullable, key, default, extra = col
            col_defs.append(f"  {name} {col_type}" + (" NOT NULL" if nullable == "NO" else ""))
        schema_parts.append(f"Table: {table}\nColumns:\n" + "\n".join(col_defs))

    return "\n\n".join(schema_parts)


def get_external_schema(connection_string: str) -> str:
    """Return schema description for an external Postgres/Supabase DB."""
    from sqlalchemy import create_engine, inspect

    try:
        engine = create_engine(connection_string, pool_pre_ping=True, connect_args={"connect_timeout": 10})
        inspector = inspect(engine)
        schema_parts = []
        for table_name in inspector.get_table_names():
            cols = inspector.get_columns(table_name)
            col_defs = [f"  {c['name']} {c['type']}" for c in cols]
            schema_parts.append(f"Table: {table_name}\nColumns:\n" + "\n".join(col_defs))
        return "\n\n".join(schema_parts)
    except Exception as exc:
        return f"Error reading schema: {exc}"


def get_schema_as_dict(db: Session) -> List[Dict]:
    """Return structured table metadata for the frontend schema explorer."""
    tables_result = db.execute(text("SHOW TABLES")).fetchall()
    table_names = [row[0] for row in tables_result]

    result = []
    for table in table_names:
        cols_result = db.execute(text(f"DESCRIBE `{table}`")).fetchall()
        columns = []
        for col in cols_result:
            name, col_type, nullable, key, default, extra = col
            columns.append({
                "name": name,
                "type": col_type,
                "nullable": nullable == "YES",
                "key": key,
            })
        result.append({"table": table, "columns": columns})

    return result
