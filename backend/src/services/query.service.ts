import { Client } from "pg";
import { getSslConfig } from "../utils/ssl";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../config/supabase";
import { logger } from "../utils/logger";

// ============================================================================
// SQL Validation (converted from Python sql_validator.py)
// ============================================================================

const BLOCKED_PATTERNS = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|GRANT|REVOKE|RENAME|LOCK|UNLOCK|CALL|EXEC|EXECUTE|LOAD|IMPORT|EXPORT|ATTACH|DETACH|PRAGMA|VACUUM|ANALYZE|EXPLAIN\s+ANALYZE)\b/i;

const ALLOWED_PREFIXES = /^\s*(SELECT|WITH\b)/i;

const DANGEROUS_FUNCTIONS = /\b(SLEEP|BENCHMARK|LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE|USER\(\)|SYSTEM_USER|SESSION_USER|CURRENT_USER)\b/i;

export function validateSQL(sql: string): { isSafe: boolean; reason: string } {
  const trimmed = sql.trim();

  if (!trimmed) {
    return { isSafe: false, reason: "Empty query" };
  }

  // Detect multi-statement injection (semicolon-separated)
  const statements = trimmed
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (statements.length > 1) {
    return { isSafe: false, reason: "Multiple statements are not allowed" };
  }

  if (BLOCKED_PATTERNS.test(trimmed)) {
    return {
      isSafe: false,
      reason:
        "Write operations (INSERT, UPDATE, DELETE, etc.) are not allowed",
    };
  }

  if (!ALLOWED_PREFIXES.test(trimmed)) {
    return {
      isSafe: false,
      reason: "Only SELECT and CTE (WITH …) statements are permitted",
    };
  }

  if (DANGEROUS_FUNCTIONS.test(trimmed)) {
    return { isSafe: false, reason: "Query contains a disallowed function" };
  }

  return { isSafe: true, reason: "OK" };
}

// ============================================================================
// SQL Execution (converted from Python sql_executor.py)
// ============================================================================

interface SQLResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
  error: string | null;
  error_code?: string | null;
}

const PG_CODE_HINTS: Record<string, string> = {
  "42P01":
    "The table does not exist in the database. The generated query may reference a table name not present in your schema.",
  "42703":
    "A column referenced in the query does not exist in the table.",
  "42601": "The generated SQL has a syntax error.",
  "42501":
    "Permission denied — the database role cannot access this table or column.",
  "23505": "A unique constraint violation occurred.",
  "22P02": "An invalid value was passed (type mismatch).",
};

function extractPGCode(err: unknown): string | null {
  const raw = String(err);
  // Try to parse PostgREST error format: {"code": "42P01", ...}
  const match = raw.match(/'code'\s*:\s*'([^']+)'/);
  return match ? match[1] : null;
}

function humanizeError(err: unknown): string {
  const raw = String(err);

  // Try to extract message from PostgREST dict format
  const msgMatch = raw.match(/'message'\s*:\s*'([^']+)'/);
  if (msgMatch) {
    const msg = msgMatch[1];
    const codeMatch = raw.match(/'code'\s*:\s*'([^']+)'/);
    if (codeMatch) {
      const code = codeMatch[1];
      const hint = PG_CODE_HINTS[code];
      return hint ? `${msg}. ${hint}`.trim() : msg;
    }
    return msg;
  }

  // Fallback
  return raw;
}

function applyLimit(sql: string, limit: number): string {
  if (!/limit\s+\d+$/i.test(sql.trim())) {
    return `${sql.trim().replace(/;$/, "")} LIMIT ${limit}`;
  }
  return sql;
}

/**
 * Execute a read-only SQL query against the internal database
 * via the execute_safe_select RPC function.
 */
export async function executeSQL(
  sb: SupabaseClient,
  sql: string,
  limit = 500
): Promise<SQLResult> {
  const limited = applyLimit(sql, limit);
  const start = Date.now();

  try {
    const result = await sb.rpc("execute_safe_select", {
      query_text: limited,
    });

    if (result.error) {
      throw result.error;
    }

    const elapsed = Date.now() - start;
    const rows = (result.data ?? []) as Record<string, unknown>[];

    if (!rows.length) {
      return {
        columns: [],
        rows: [],
        row_count: 0,
        execution_time_ms: elapsed,
        error: null,
      };
    }

    const columns = Object.keys(rows[0]);
    return {
      columns,
      rows,
      row_count: rows.length,
      execution_time_ms: elapsed,
      error: null,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return {
      columns: [],
      rows: [],
      row_count: 0,
      execution_time_ms: elapsed,
      error: humanizeError(err),
      error_code: extractPGCode(err),
    };
  }
}

/**
 * Execute a read-only SQL query on an external PostgreSQL database.
 */
export async function executeSQLOnExternal(
  connectionString: string,
  sql: string,
  limit = 500,
  sslRequired = true
): Promise<SQLResult> {
  const limited = applyLimit(sql, limit);
  const start = Date.now();

  let client: Client | null = null;
  try {
    const sslMode = getSslConfig(sslRequired);
    // Build connection from the connection string, keeping SSL behaviour
    client = new Client({
      connectionString,
      ssl: sslMode,
      connectionTimeoutMillis: 10000, // 10s
    });

    await client.connect();
    const result = await client.query(limited);
    const elapsed = Date.now() - start;

    const columns = result.fields.map((f) => f.name);
    const rows = result.rows as Record<string, unknown>[];

    return {
      columns,
      rows,
      row_count: rows.length,
      execution_time_ms: elapsed,
      error: null,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return {
      columns: [],
      rows: [],
      row_count: 0,
      execution_time_ms: elapsed,
      error: humanizeError(err),
      error_code: null,
    };
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

// ============================================================================
// Query Logging
// ============================================================================

export async function logQuery(
  userId: number,
  question: string,
  sql: string,
  result: { error?: string | null; row_count?: number; execution_time_ms?: number } | SQLResult,
  mode: string,
  provider: string | null,
  datasetId: number | null = null
): Promise<number> {
  const sb = getSupabase();

  let execStatus: string;
  if (result.error && !sql) {
    execStatus = "blocked";
  } else if (result.error) {
    execStatus = "failed";
  } else {
    execStatus = "success";
  }

  const logData = {
    user_id: userId,
    dataset_id: datasetId,
    query_mode: mode,
    natural_language_query: question,
    generated_sql: sql,
    execution_status: execStatus,
    error_message: result.error ?? null,
    execution_time_ms:
      "execution_time_ms" in result
        ? result.execution_time_ms ?? null
        : null,
    row_count: "row_count" in result ? result.row_count ?? null : null,
    model_provider: provider,
  };

  const res = await sb.from("query_logs").insert(logData).select("id").single();

  if (res.error || !res.data) {
    logger.error("Failed to log query:", res.error);
    return 0;
  }

  return (res.data as { id: number }).id;
}
