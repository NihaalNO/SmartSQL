import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { CannotAnswerError, extractIntent, generateInsight, generateSQL } from "../services/ai.service";
import { logQuery, validateSQL } from "../services/query.service";
import { getConnector } from "../connectors/registry";
import { ConnectorError } from "../connectors/types";
import type { QueryIntent } from "../types/query.types";

function handleConnectorError(err: unknown): never {
  if (err instanceof ConnectorError) {
    throw new ApiError(err.statusCode, err.message);
  }
  throw err;
}

export async function testConnection(req: Request, res: Response): Promise<void> {
  try {
    const connector = getConnector(req.body.dbType);
    const config = connector.validateConfig(req.body.config);
    const result = await connector.testConnection(config);
    res.json({ ...result, config: connector.maskConfig(config) });
  } catch (err) {
    handleConnectorError(err);
  }
}

export async function schema(req: Request, res: Response): Promise<void> {
  try {
    const connector = getConnector(req.body.dbType);
    const config = connector.validateConfig(req.body.config);
    const visualization = await connector.getColumns(config);
    res.json({ visualization, config: connector.maskConfig(config) });
  } catch (err) {
    handleConnectorError(err);
  }
}

export async function stats(req: Request, res: Response): Promise<void> {
  try {
    const connector = getConnector(req.body.dbType);
    const config = connector.validateConfig(req.body.config);
    const result = await connector.getDatabaseStats(config);
    res.json({ stats: result, config: connector.maskConfig(config) });
  } catch (err) {
    handleConnectorError(err);
  }
}

export async function sampleRows(req: Request, res: Response): Promise<void> {
  try {
    const connector = getConnector(req.body.dbType);
    const config = connector.validateConfig(req.body.config);
    const result = await connector.getSampleRows(config, req.body.tableName);
    res.json(result);
  } catch (err) {
    handleConnectorError(err);
  }
}

export async function runQuery(req: Request, res: Response): Promise<void> {
  try {
    const connector = getConnector(req.body.dbType);
    const config = connector.validateConfig(req.body.config);
    const provider = req.body.model_provider || null;
    const includeInsight = req.body.include_insight ?? true;
    const question = req.body.question as string | undefined;
    let sql = req.body.query as string | undefined;
    let intent: QueryIntent | null = null;

    if (!sql && question) {
      const schemaText = await connector.getSchemaText(config);
      try {
        intent = await extractIntent(question, provider ?? undefined, req.body.model_name);
      } catch {
        // Non-fatal.
      }
      try {
        sql = await generateSQL(schemaText, question, provider ?? undefined, req.body.model_name);
      } catch (err) {
        if (err instanceof CannotAnswerError) {
          const logId = await logQuery(req.user!.id, question, "", { error: err.message, row_count: 0, execution_time_ms: 0 }, `live_${connector.dbType}`, provider);
          res.json({
            natural_language_query: question,
            generated_sql: "",
            columns: [],
            rows: [],
            row_count: 0,
            execution_time_ms: 0,
            log_id: logId,
            insight: null,
            error: err.message,
            status: "blocked",
            intent,
          });
          return;
        }
        throw ApiError.badGateway(`AI generation failed: ${err}`);
      }
    }

    if (!sql) {
      throw ApiError.badRequest("query or question is required");
    }

    const validation = validateSQL(sql);
    if (!validation.isSafe) {
      const logId = question
        ? await logQuery(req.user!.id, question, sql, { error: validation.reason, row_count: 0, execution_time_ms: 0 }, `live_${connector.dbType}`, provider)
        : 0;
      res.json({
        natural_language_query: question ?? sql,
        generated_sql: sql,
        columns: [],
        rows: [],
        row_count: 0,
        execution_time_ms: 0,
        log_id: logId,
        insight: null,
        error: validation.reason,
        status: "blocked",
        intent,
      });
      return;
    }

    const execResult = await connector.runQuery(config, sql);
    const logId = question
      ? await logQuery(req.user!.id, question, sql, execResult, `live_${connector.dbType}`, provider)
      : 0;

    let insight: string | null = null;
    if (question && includeInsight && execResult.rows.length > 0 && !execResult.error) {
      insight = await generateInsight(question, JSON.stringify(execResult.rows.slice(0, 20), null, 2), provider ?? undefined, req.body.model_name);
    }

    res.json({
      natural_language_query: question ?? sql,
      generated_sql: sql,
      columns: execResult.columns,
      rows: execResult.rows,
      row_count: execResult.row_count,
      execution_time_ms: execResult.execution_time_ms,
      log_id: logId,
      insight,
      error: execResult.error,
      status: execResult.error ? "failed" : "success",
      intent,
      bytes_scanned: execResult.bytes_scanned ?? null,
    });
  } catch (err) {
    handleConnectorError(err);
  }
}
