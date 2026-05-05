import re
from typing import Tuple

# Disallowed statement prefixes
BLOCKED_PATTERNS = re.compile(
    r"^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|GRANT|REVOKE"
    r"|RENAME|LOCK|UNLOCK|CALL|EXEC|EXECUTE|LOAD|IMPORT|EXPORT|ATTACH|DETACH"
    r"|PRAGMA|VACUUM|ANALYZE|EXPLAIN\s+ANALYZE)\b",
    re.IGNORECASE,
)

# Allow only SELECT and SHOW/DESCRIBE
ALLOWED_PREFIXES = re.compile(
    r"^\s*(SELECT|SHOW|DESCRIBE|DESC|WITH\s+\w+\s+AS)\b",
    re.IGNORECASE,
)

# Dangerous functions
DANGEROUS_FUNCTIONS = re.compile(
    r"\b(SLEEP|BENCHMARK|LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE|USER\(\)|SYSTEM_USER"
    r"|SESSION_USER|CURRENT_USER)\b",
    re.IGNORECASE,
)


def validate_sql(sql: str) -> Tuple[bool, str]:
    """
    Returns (is_safe, reason).
    A query is safe only if it's a read-only SELECT/SHOW/DESCRIBE
    and contains no dangerous patterns.
    """
    sql = sql.strip()

    if not sql:
        return False, "Empty query"

    # Strip trailing semicolons for multi-statement detection
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    if len(statements) > 1:
        return False, "Multiple statements are not allowed"

    if BLOCKED_PATTERNS.search(sql):
        return False, "Write operations (INSERT, UPDATE, DELETE, etc.) are not allowed"

    if not ALLOWED_PREFIXES.match(sql):
        return False, "Only SELECT, SHOW, and DESCRIBE statements are permitted"

    if DANGEROUS_FUNCTIONS.search(sql):
        return False, "Query contains a disallowed function"

    return True, "OK"
