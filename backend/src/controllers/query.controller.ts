import { Request, Response } from "express";
import { getSupabase } from "../config/supabase";
import { ApiError } from "../utils/ApiError";
import { extractIntent, generateSQL, generateInsight, CannotAnswerError } from "../services/ai.service";
import { validateSQL, executeSQL, executeSQLOnExternal, logQuery } from "../services/query.service";
import { getInternalSchema, getExternalSchema } from "../services/schema.service";
import type { QueryResult, QueryIntent } from "../types/query.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQueryResult(data: {
  naturalLanguageQuery: string;
  generatedSql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  logId: number | null;
  insight: string | null;
  error: string | null;
  status: string;
  intent: QueryIntent | null;
}): QueryResult {
  return {
    natural_language_query: data.naturalLanguageQuery,
    generated_sql: data.generatedSql,
    columns: data.columns,
    rows: data.rows,
    row_count: data.rowCount,
    execution_time_ms: data.executionTimeMs,
    log_id: data.logId,
    insight: data.insight,
    error: data.error,
    status: data.status,
    intent: data.intent,
  };
}

// ---------------------------------------------------------------------------
// Run query (internal database)
// ---------------------------------------------------------------------------

export async function runQuery(req: Request, res: Response): Promise<void> {
  const {
    question,
    dataset_id,
    model_provider,
    model_name,
    include_insight = true,
  } = req.body as {
    question: string;
    dataset_id?: number;
    model_provider?: string;
    model_name?: string;
    include_insight?: boolean;
  };

  const sb = getSupabase();
  const provider = model_provider || null;
  const schemaText = await getInternalSchema(sb);

  // Step 1 — extract intent
  let intent: QueryIntent | null = null;
  try {
    intent = await extractIntent(question, provider ?? undefined, model_name);
  } catch {
    // intent extraction failure is non-fatal; proceed to SQL generation
  }

  // Step 2 — generate SQL
  let sql: string;
  try {
    sql = await generateSQL(schemaText, question, provider ?? undefined, model_name);
  } catch (err) {
    if (err instanceof CannotAnswerError) {
      const result = { error: err.message, row_count: 0, execution_time_ms: 0 };
      const logId = await logQuery(
        req.user!.id,
        question,
        "",
        result,
        "internal",
        provider,
        dataset_id
      );
      res.json(
        buildQueryResult({
          naturalLanguageQuery: question,
          generatedSql: "",
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          logId,
          insight: null,
          error: err.message,
          status: "blocked",
          intent,
        })
      );
      return;
    }
    throw ApiError.badGateway(`AI generation failed: ${err}`);
  }

  // Step 3 — validate SQL safety
  const validation = validateSQL(sql);
  if (!validation.isSafe) {
    const result = { error: validation.reason, row_count: 0, execution_time_ms: 0 };
    const logId = await logQuery(
      req.user!.id,
      question,
      sql,
      result,
      "internal",
      provider,
      dataset_id
    );
    res.json(
      buildQueryResult({
        naturalLanguageQuery: question,
        generatedSql: sql,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        logId,
        insight: null,
        error: validation.reason,
        status: "blocked",
        intent,
      })
    );
    return;
  }

  // Step 4 — execute
  const execResult = await executeSQL(sb, sql);
  const logId = await logQuery(
    req.user!.id,
    question,
    sql,
    execResult,
    "internal",
    provider,
    dataset_id
  );

  // 42P01 = table does not exist — return as template without error
  if (execResult.error_code === "42P01") {
    res.json(
      buildQueryResult({
        naturalLanguageQuery: question,
        generatedSql: sql,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: execResult.execution_time_ms,
        logId,
        insight: null,
        error: null,
        status: "template",
        intent,
      })
    );
    return;
  }

  // Generate insight if requested
  let insight: string | null = null;
  if (include_insight && execResult.rows.length > 0 && !execResult.error) {
    const preview = JSON.stringify(execResult.rows.slice(0, 20), null, 2);
    insight = await generateInsight(question, preview, provider ?? undefined, model_name);
  }

  res.json(
    buildQueryResult({
      naturalLanguageQuery: question,
      generatedSql: sql,
      columns: execResult.columns,
      rows: execResult.rows,
      rowCount: execResult.row_count,
      executionTimeMs: execResult.execution_time_ms,
      logId,
      insight,
      error: execResult.error,
      status: execResult.error ? "failed" : "success",
      intent,
    })
  );
}

// ---------------------------------------------------------------------------
// Run live query (external database)
// ---------------------------------------------------------------------------

export async function runLiveQuery(req: Request, res: Response): Promise<void> {
  const {
    question,
    db_host,
    db_port = 5432,
    db_name,
    db_user,
    db_password,
    model_provider,
    model_name,
    ssl_required = true,
    include_insight = true,
  } = req.body as {
    question: string;
    db_host: string;
    db_port?: number;
    db_name: string;
    db_user: string;
    db_password: string;
    model_provider?: string;
    model_name?: string;
    ssl_required?: boolean;
    include_insight?: boolean;
  };

  // Build connection string
  const connStr = `postgresql://${encodeURIComponent(db_user)}:${encodeURIComponent(
    db_password
  )}@${encodeURIComponent(db_host)}:${encodeURIComponent(String(db_port))}/${encodeURIComponent(
    db_name
  )}`;

  const schemaText = await getExternalSchema(connStr, ssl_required);
  if (schemaText.startsWith("Error reading schema:")) {
    throw ApiError.badGateway(`Could not connect to database — ${schemaText}`);
  }

  const provider = model_provider || null;

  // Step 1 — extract intent
  let intent: QueryIntent | null = null;
  try {
    intent = await extractIntent(question, provider ?? undefined, model_name);
  } catch {
    // non-fatal
  }

  // Step 2 — generate SQL
  let sql: string;
  try {
    sql = await generateSQL(schemaText, question, provider ?? undefined, model_name);
  } catch (err) {
    if (err instanceof CannotAnswerError) {
      const result = { error: err.message, row_count: 0, execution_time_ms: 0 };
      const logId = await logQuery(
        req.user!.id,
        question,
        "",
        result,
        "live_supabase",
        provider
      );
      res.json(
        buildQueryResult({
          naturalLanguageQuery: question,
          generatedSql: "",
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          logId,
          insight: null,
          error: err.message,
          status: "blocked",
          intent,
        })
      );
      return;
    }
    throw ApiError.badGateway(`AI generation failed: ${err}`);
  }

  // Step 3 — validate SQL safety
  const validation = validateSQL(sql);
  if (!validation.isSafe) {
    const result = { error: validation.reason, row_count: 0, execution_time_ms: 0 };
    const logId = await logQuery(
      req.user!.id,
      question,
      sql,
      result,
      "live_supabase",
      provider
    );
    res.json(
      buildQueryResult({
        naturalLanguageQuery: question,
        generatedSql: sql,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        logId,
        insight: null,
        error: validation.reason,
        status: "blocked",
        intent,
      })
    );
    return;
  }

  // Step 4 — execute on external DB
  const execResult = await executeSQLOnExternal(connStr, sql, 500, ssl_required);
  const logId = await logQuery(
    req.user!.id,
    question,
    sql,
    execResult,
    "live_supabase",
    provider
  );

  if (execResult.error_code === "42P01") {
    res.json(
      buildQueryResult({
        naturalLanguageQuery: question,
        generatedSql: sql,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: execResult.execution_time_ms,
        logId,
        insight: null,
        error: null,
        status: "template",
        intent,
      })
    );
    return;
  }

  // Generate insight
  let insight: string | null = null;
  if (include_insight && execResult.rows.length > 0 && !execResult.error) {
    const preview = JSON.stringify(execResult.rows.slice(0, 20), null, 2);
    insight = await generateInsight(question, preview, provider ?? undefined, model_name);
  }

  res.json(
    buildQueryResult({
      naturalLanguageQuery: question,
      generatedSql: sql,
      columns: execResult.columns,
      rows: execResult.rows,
      rowCount: execResult.row_count,
      executionTimeMs: execResult.execution_time_ms,
      logId,
      insight,
      error: execResult.error,
      status: execResult.error ? "failed" : "success",
      intent,
    })
  );
}

// ---------------------------------------------------------------------------
// Save query
// ---------------------------------------------------------------------------

export async function saveQuery(req: Request, res: Response): Promise<void> {
  const { log_id, title, chart_type, is_favorite } = req.body as {
    log_id: number;
    title: string;
    chart_type?: string;
    is_favorite?: boolean;
  };

  const sb = getSupabase();

  const logRes = await sb
    .from("query_logs")
    .select("natural_language_query, generated_sql, dataset_id")
    .eq("id", log_id)
    .eq("user_id", req.user!.id)
    .limit(1);

  if (!logRes.data || logRes.data.length === 0) {
    throw new ApiError(404, "Query log not found");
  }

  const log = logRes.data[0] as {
    natural_language_query: string;
    generated_sql: string;
    dataset_id: number | null;
  };

  const { data, error } = await sb
    .from("saved_queries")
    .insert({
      user_id: req.user!.id,
      dataset_id: log.dataset_id,
      title,
      natural_language_query: log.natural_language_query,
      generated_sql: log.generated_sql || "",
      chart_type: chart_type || null,
      is_favorite: is_favorite ?? false,
    })
    .select("id")
    .limit(1);

  if (error || !data) {
    throw new ApiError(500, `Failed to save query: ${error?.message}`);
  }

  res.json({ id: (data[0] as { id: number }).id, message: "Query saved" });
}

// ---------------------------------------------------------------------------
// List saved queries
// ---------------------------------------------------------------------------

export async function listSaved(req: Request, res: Response): Promise<void> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("saved_queries")
    .select("*")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(500, `Failed to list saved queries: ${error.message}`);
  }

  res.json(data ?? []);
}

// ---------------------------------------------------------------------------
// Delete saved query
// ---------------------------------------------------------------------------

export async function deleteSaved(req: Request, res: Response): Promise<void> {
  const savedId = parseInt(req.params.savedId, 10);
  if (isNaN(savedId)) {
    throw ApiError.badRequest("Invalid saved query ID");
  }

  const sb = getSupabase();

  const { data: existing } = await sb
    .from("saved_queries")
    .select("id")
    .eq("id", savedId)
    .eq("user_id", req.user!.id)
    .limit(1);

  if (!existing || existing.length === 0) {
    throw new ApiError(404, "Not found");
  }

  await sb.from("saved_queries").delete().eq("id", savedId);

  res.json({ message: "Deleted" });
}

// ---------------------------------------------------------------------------
// Query history
// ---------------------------------------------------------------------------

export async function queryHistory(req: Request, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const sb = getSupabase();

  const { data, error } = await sb
    .from("query_logs")
    .select("*")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new ApiError(500, `Failed to fetch history: ${error.message}`);
  }

  res.json(data ?? []);
}

// ---------------------------------------------------------------------------
// Submit feedback
// ---------------------------------------------------------------------------

export async function submitFeedback(req: Request, res: Response): Promise<void> {
  const { log_id, rating, comments } = req.body as {
    log_id: number;
    rating: number;
    comments?: string;
  };

  const logRes = await getSupabase()
    .from("query_logs")
    .select("id")
    .eq("id", log_id)
    .limit(1);

  if (!logRes.data || logRes.data.length === 0) {
    throw new ApiError(404, "Query log not found");
  }

  const { error } = await getSupabase().from("feedback").insert({
    query_log_id: log_id,
    user_id: req.user!.id,
    rating,
    comments: comments || null,
  });

  if (error) {
    throw new ApiError(500, `Failed to submit feedback: ${error.message}`);
  }

  res.json({ message: "Feedback submitted" });
}
