import snowflake from "snowflake-sdk";
import { z } from "zod";
import { validateSQL } from "../services/query.service";
import type { ColumnInfo, ForeignKeyInfo, SchemaVisualization, TableInfo } from "../types/query.types";
import { logger } from "../utils/logger";
import { maskConfig, withTimeout } from "./base";
import {
  ConnectorError,
  type ConnectionTestResult,
  type DatabaseStats,
  type LiveDbConnector,
  type QueryExecutionResult,
  type TableRef,
} from "./types";

const snowflakeConfigSchema = z.object({
  account: z.string().min(1, "account is required"),
  username: z.string().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
  warehouse: z.string().min(1, "warehouse is required"),
  database: z.string().min(1, "database is required"),
  schema: z.string().min(1, "schema is required"),
  role: z.string().min(1).optional(),
});

export type SnowflakeConfig = z.infer<typeof snowflakeConfigSchema>;

type SnowflakeConnection = ReturnType<typeof snowflake.createConnection>;
const QUERY_TIMEOUT_MS = 30000;
const CONNECT_TIMEOUT_MS = 15000;

function applyLimit(sql: string, limit: number): string {
  if (!/limit\s+\d+\s*;?$/i.test(sql.trim())) {
    return `${sql.trim().replace(/;$/, "")} LIMIT ${limit}`;
  }
  return sql;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function cleanSnowflakeError(err: unknown): string {
  const details = getSnowflakeErrorDetails(err);
  const withoutPassword = details.message;
  const snowflakeCode = details.code ? ` (${details.code})` : "";

  if (/incorrect username or password|authentication/i.test(withoutPassword)) {
    return `Snowflake authentication failed${snowflakeCode}: Check the account, username, password, and role.`;
  }
  if (/could not connect|network|timeout|ENOTFOUND|ECONN/i.test(withoutPassword)) {
    return `Could not connect to Snowflake${snowflakeCode}: Check the account identifier, network access, and warehouse availability.`;
  }
  if (/warehouse/i.test(withoutPassword) && /does not exist|not authorized|not found/i.test(withoutPassword)) {
    return `Snowflake warehouse discovery failed${snowflakeCode}: ${withoutPassword}`;
  }
  if (/database/i.test(withoutPassword) && /does not exist|not authorized|not found/i.test(withoutPassword)) {
    return `Snowflake database discovery failed${snowflakeCode}: ${withoutPassword}`;
  }
  if (/schema/i.test(withoutPassword) && /does not exist|not authorized|not found/i.test(withoutPassword)) {
    return `Snowflake schema discovery failed${snowflakeCode}: ${withoutPassword}`;
  }

  return `Snowflake operation failed${snowflakeCode}: ${withoutPassword}`;
}

function sanitizeSnowflakeMessage(message: string): string {
  return message
    .replace(/password\s*=\s*[^,\s)]+/gi, "password=********")
    .replace(/password["']?\s*:\s*["'][^"']+["']/gi, 'password:"********"');
}

function getSnowflakeErrorDetails(err: unknown): { code?: string; message: string; stack?: string } {
  const maybeError = err as { code?: unknown; errno?: unknown; sqlState?: unknown; message?: unknown; stack?: unknown };
  const code = [maybeError.code, maybeError.errno, maybeError.sqlState].find((value) => value !== undefined);
  const rawMessage = err instanceof Error ? err.message : String(err);

  return {
    code: code ? String(code) : undefined,
    message: sanitizeSnowflakeMessage(rawMessage),
    stack: typeof maybeError.stack === "string" ? sanitizeSnowflakeMessage(maybeError.stack) : undefined,
  };
}

export class SnowflakeConnector implements LiveDbConnector<SnowflakeConfig> {
  public readonly dbType = "snowflake" as const;
  public readonly displayName = "Snowflake";
  public readonly category = "Analytics/Warehouse" as const;

  validateConfig(config: unknown): SnowflakeConfig {
    return snowflakeConfigSchema.parse(config);
  }

  maskConfig(config: SnowflakeConfig): Record<string, unknown> {
    return maskConfig(config);
  }

  private createConnection(config: SnowflakeConfig): SnowflakeConnection {
    return snowflake.createConnection({
      account: config.account,
      username: config.username,
      password: config.password,
      warehouse: config.warehouse,
      database: config.database,
      schema: config.schema,
      role: config.role,
      application: "SmartSQL",
    });
  }

  private connect(connection: SnowflakeConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private destroy(connection: SnowflakeConnection): Promise<void> {
    return new Promise((resolve) => {
      connection.destroy(() => resolve());
    });
  }

  private execute(
    connection: SnowflakeConnection,
    sqlText: string,
    binds?: snowflake.Binds
  ): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
    return new Promise((resolve, reject) => {
      connection.execute({
        sqlText,
        binds,
        complete: (
          err: snowflake.SnowflakeError | undefined,
          stmt: snowflake.RowStatement | snowflake.FileAndStageBindStatement,
          rows?: unknown[]
        ) => {
          if (err) {
            reject(err);
            return;
          }

          const normalizedRows = (rows ?? []) as Record<string, unknown>[];
          const columns = stmt.getColumns()?.map((column) => column.getName()).filter(Boolean) ??
            (normalizedRows[0] ? Object.keys(normalizedRows[0]) : []);

          resolve({ rows: normalizedRows, columns });
        },
      });
    });
  }

  private async withConnection<T>(config: SnowflakeConfig, fn: (connection: SnowflakeConnection) => Promise<T>): Promise<T> {
    const connection = this.createConnection(config);
    try {
      await withTimeout(this.connect(connection), CONNECT_TIMEOUT_MS, "Snowflake connection");
      await this.initializeSession(connection, config);
      return await fn(connection);
    } catch (err) {
      if (err instanceof ConnectorError) throw err;
      logger.error("Snowflake connector error:", {
        config: this.maskConfig(config),
        error: getSnowflakeErrorDetails(err),
      });
      throw new ConnectorError(cleanSnowflakeError(err), 400);
    } finally {
      await this.destroy(connection).catch(() => {});
    }
  }

  private async initializeSession(connection: SnowflakeConnection, config: SnowflakeConfig): Promise<void> {
    if (config.role) {
      await withTimeout(
        this.execute(connection, `USE ROLE ${quoteIdentifier(config.role)}`),
        QUERY_TIMEOUT_MS,
        "Snowflake role selection"
      );
    }

    await withTimeout(
      this.execute(connection, `USE WAREHOUSE ${quoteIdentifier(config.warehouse)}`),
      QUERY_TIMEOUT_MS,
      "Snowflake warehouse selection"
    );
    await withTimeout(
      this.execute(connection, `USE DATABASE ${quoteIdentifier(config.database)}`),
      QUERY_TIMEOUT_MS,
      "Snowflake database selection"
    );
    await withTimeout(
      this.execute(connection, `USE SCHEMA ${quoteIdentifier(config.schema)}`),
      QUERY_TIMEOUT_MS,
      "Snowflake schema selection"
    );

    const context = await withTimeout(
      this.execute(
        connection,
        `SELECT
           CURRENT_ROLE() AS ROLE,
           CURRENT_WAREHOUSE() AS WAREHOUSE,
           CURRENT_DATABASE() AS DATABASE,
           CURRENT_SCHEMA() AS SCHEMA`
      ),
      QUERY_TIMEOUT_MS,
      "Snowflake session context"
    );

    logger.info("Snowflake session initialized:", {
      context: context.rows[0] ?? {},
    });
  }

  async testConnection(config: SnowflakeConfig): Promise<ConnectionTestResult> {
    const result = await this.withConnection(config, async (connection) => {
      await withTimeout(this.execute(connection, "SELECT 1 AS TEST_CONNECTION"), QUERY_TIMEOUT_MS, "Snowflake test query");
      const tables = await this.getTablesWithConnection(connection, config);
      return tables;
    });

    return {
      status: "ok",
      message: `Connected to Snowflake. Found ${result.length} table(s) visible in ${config.database}.`,
      table_count: result.length,
      tables: result.slice(0, 50).map((table) => `${table.schema}.${table.name}`),
      database: config.database,
      dbType: this.dbType,
    };
  }

  async getSchemas(config: SnowflakeConfig): Promise<string[]> {
    return this.withConnection(config, async (connection) => {
      const result = await withTimeout(
        this.execute(
          connection,
          `SELECT SCHEMA_NAME
           FROM INFORMATION_SCHEMA.SCHEMATA
           WHERE CATALOG_NAME = ?
           ORDER BY SCHEMA_NAME`,
          [config.database]
        ),
        QUERY_TIMEOUT_MS,
        "Snowflake schema discovery"
      );
      return result.rows.map((row) => String(row.SCHEMA_NAME ?? row.schema_name)).filter(Boolean);
    });
  }

  async getTables(config: SnowflakeConfig): Promise<TableRef[]> {
    return this.withConnection(config, async (connection) => this.getTablesWithConnection(connection, config));
  }

  async getColumns(config: SnowflakeConfig): Promise<SchemaVisualization> {
    return this.withConnection(config, async (connection) => this.getVisualization(connection, config));
  }

  async getRelationships(config: SnowflakeConfig): Promise<ForeignKeyInfo[]> {
    const visualization = await this.getColumns(config);
    return visualization.foreign_keys;
  }

  async runQuery(config: SnowflakeConfig, sql: string): Promise<QueryExecutionResult> {
    const validation = validateSQL(sql);
    if (!validation.isSafe) {
      throw new ConnectorError(validation.reason, 400);
    }

    const start = Date.now();
    const limited = applyLimit(sql, 500);

    try {
      return await this.withConnection(config, async (connection) => {
        const result = await withTimeout(this.execute(connection, limited), QUERY_TIMEOUT_MS, "Snowflake query");
        return {
          columns: result.columns,
          rows: result.rows,
          row_count: result.rows.length,
          execution_time_ms: Date.now() - start,
          error: null,
          bytes_scanned: null,
        };
      });
    } catch (err) {
      if (err instanceof ConnectorError) {
        return {
          columns: [],
          rows: [],
          row_count: 0,
          execution_time_ms: Date.now() - start,
          error: err.message,
          error_code: null,
        };
      }
      throw err;
    }
  }

  async getDatabaseStats(config: SnowflakeConfig): Promise<DatabaseStats> {
    const start = Date.now();
    return this.withConnection(config, async (connection) => {
      const result = await withTimeout(
        this.execute(
          connection,
          `SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT, BYTES
           FROM INFORMATION_SCHEMA.TABLES
           WHERE TABLE_CATALOG = ?`,
          [config.database]
        ),
        QUERY_TIMEOUT_MS,
        "Snowflake stats discovery"
      );

      const totalRows = result.rows.reduce((sum, row) => sum + Number(row.ROW_COUNT ?? 0), 0);
      const totalBytes = result.rows.reduce((sum, row) => sum + Number(row.BYTES ?? 0), 0);

      return {
        table_count: result.rows.length,
        row_count_estimate: totalRows,
        database_size: totalBytes > 0 ? `${totalBytes} bytes` : null,
        warehouse: config.warehouse,
        execution_time_ms: Date.now() - start,
        notes: ["Snowflake bytes scanned is reported per query when exposed by the driver."],
      };
    });
  }

  async getSampleRows(config: SnowflakeConfig, tableName: string): Promise<QueryExecutionResult> {
    const [schemaPart, tablePart] = tableName.includes(".")
      ? tableName.split(".", 2)
      : [config.schema, tableName];
    return this.runQuery(config, `SELECT * FROM ${quoteIdentifier(schemaPart)}.${quoteIdentifier(tablePart)} LIMIT 25`);
  }

  async getSchemaText(config: SnowflakeConfig): Promise<string> {
    const visualization = await this.getColumns(config);
    return visualization.tables
      .map((table) => {
        const columns = table.columns.map((column) => `  ${column.name} ${column.type}${column.nullable ? "" : " NOT NULL"}`);
        return `Table: ${table.schema}.${table.name}\nColumns:\n${columns.join("\n")}`;
      })
      .join("\n\n");
  }

  private async getTablesWithConnection(connection: SnowflakeConnection, config: SnowflakeConfig): Promise<TableRef[]> {
    const result = await withTimeout(
      this.execute(
        connection,
        `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_CATALOG = ?
         ORDER BY TABLE_SCHEMA, TABLE_NAME`,
        [config.database]
      ),
      QUERY_TIMEOUT_MS,
      "Snowflake table discovery"
    );

    return result.rows.map((row) => ({
      schema: String(row.TABLE_SCHEMA ?? row.table_schema),
      name: String(row.TABLE_NAME ?? row.table_name),
    }));
  }

  private async getVisualization(connection: SnowflakeConnection, config: SnowflakeConfig): Promise<SchemaVisualization> {
    const selectedSchema = config.schema;
    const [columnsResult, statsResult] = await Promise.all([
      withTimeout(
        this.execute(
          connection,
          `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
           FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_CATALOG = ?
           ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`,
          [config.database]
        ),
        QUERY_TIMEOUT_MS,
        "Snowflake column discovery"
      ),
      withTimeout(
        this.execute(
          connection,
          `SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT, BYTES, TABLE_TYPE
           FROM INFORMATION_SCHEMA.TABLES
           WHERE TABLE_CATALOG = ?`,
          [config.database]
        ),
        QUERY_TIMEOUT_MS,
        "Snowflake table stats discovery"
      ),
    ]);

    const columnMap: Record<string, ColumnInfo[]> = {};
    for (const row of columnsResult.rows) {
      const schema = String(row.TABLE_SCHEMA ?? selectedSchema);
      const table = String(row.TABLE_NAME);
      const key = `${schema}.${table}`;
      if (!columnMap[key]) columnMap[key] = [];
      columnMap[key].push({
        name: String(row.COLUMN_NAME),
        type: String(row.DATA_TYPE),
        nullable: String(row.IS_NULLABLE).toUpperCase() === "YES",
        is_pk: false,
        is_unique: false,
        default_value: null,
      });
    }

    const tables: TableInfo[] = statsResult.rows.map((row) => {
      const schema = String(row.TABLE_SCHEMA ?? selectedSchema);
      const name = String(row.TABLE_NAME);
      return {
        name,
        schema,
        type: String(row.TABLE_TYPE).toUpperCase().includes("VIEW") ? "view" : "table",
        columns: columnMap[`${schema}.${name}`] ?? [],
        row_estimate: Number(row.ROW_COUNT ?? 0),
      };
    });

    // Snowflake does not expose MySQL-style referenced table/column fields in
    // INFORMATION_SCHEMA.KEY_COLUMN_USAGE. Keep FK discovery non-blocking until
    // a Snowflake-specific relationship query is added.
    const foreignKeys: ForeignKeyInfo[] = [];

    const healthIssues = tables
      .filter((table) => table.type === "table" && table.columns.length === 0)
      .map((table) => `Table "${table.schema}.${table.name}" has no visible columns.`);

    return {
      tables,
      foreign_keys: foreignKeys,
      indexes: [],
      health_score: Math.max(0, 100 - healthIssues.length * 5),
      health_issues: healthIssues,
    };
  }
}
