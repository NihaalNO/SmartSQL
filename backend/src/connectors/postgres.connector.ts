import { Client } from "pg";
import { z } from "zod";
import { getSslConfig } from "../utils/ssl";
import { validateSQL } from "../services/query.service";
import type { SchemaVisualization, ColumnInfo, ForeignKeyInfo, IndexInfo, TableInfo } from "../types/query.types";
import { maskConfig, portSchema, withTimeout } from "./base";
import { ConnectorError, type ConnectionTestResult, type DatabaseCategory, type DatabaseStats, type DbType, type LiveDbConnector, type QueryExecutionResult, type TableRef } from "./types";

const postgresConfigSchema = z.object({
  host: z.string().min(1),
  port: portSchema.default(5432),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().default(true),
});

export type PostgresConfig = z.infer<typeof postgresConfigSchema>;

const PG_CODE_HINTS: Record<string, string> = {
  "42P01": "The table does not exist in the database.",
  "42703": "A column referenced in the query does not exist.",
  "42601": "The generated SQL has a syntax error.",
  "42501": "The database role cannot access this table or column.",
};

function applyLimit(sql: string, limit: number): string {
  if (!/limit\s+\d+\s*;?$/i.test(sql.trim())) {
    return `${sql.trim().replace(/;$/, "")} LIMIT ${limit}`;
  }
  return sql;
}

function humanizePgError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : null;
  return code && PG_CODE_HINTS[code] ? `${message}. ${PG_CODE_HINTS[code]}` : message;
}

export class PostgresConnector implements LiveDbConnector<PostgresConfig> {
  public readonly dbType: DbType;
  public readonly displayName: string;
  public readonly category: DatabaseCategory;

  constructor(options: { dbType?: DbType; displayName?: string; category?: DatabaseCategory } = {}) {
    this.dbType = options.dbType ?? "postgres";
    this.displayName = options.displayName ?? "PostgreSQL";
    this.category = options.category ?? "Relational";
  }

  validateConfig(config: unknown): PostgresConfig {
    return postgresConfigSchema.parse(config);
  }

  maskConfig(config: PostgresConfig): Record<string, unknown> {
    return maskConfig(config);
  }

  private createClient(config: PostgresConfig): Client {
    return new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: getSslConfig(config.ssl),
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
    });
  }

  private async withClient<T>(config: PostgresConfig, fn: (client: Client) => Promise<T>): Promise<T> {
    const client = this.createClient(config);
    try {
      await withTimeout(client.connect(), 10000, `${this.displayName} connection`);
      return await fn(client);
    } finally {
      await client.end().catch(() => {});
    }
  }

  async testConnection(config: PostgresConfig): Promise<ConnectionTestResult> {
    try {
      const result = await this.withClient(config, async (client) => {
        const tablesRes = await client.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
          ["public"]
        );
        return tablesRes.rows.map((row: { table_name: string }) => row.table_name);
      });

      return {
        status: "ok",
        message: `Connected to ${this.displayName}. Found ${result.length} table(s) in the public schema.`,
        table_count: result.length,
        tables: result.slice(0, 50),
        database: config.database,
        dbType: this.dbType,
      };
    } catch (err) {
      return {
        status: "error",
        message: this.connectionHint(err),
        diagnostics: [humanizePgError(err)],
        database: config.database,
        dbType: this.dbType,
      };
    }
  }

  async getSchemas(config: PostgresConfig): Promise<string[]> {
    return this.withClient(config, async (client) => {
      const res = await client.query(
        `SELECT schema_name FROM information_schema.schemata
         WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
         ORDER BY schema_name`
      );
      return res.rows.map((row: { schema_name: string }) => row.schema_name);
    });
  }

  async getTables(config: PostgresConfig, schema = "public"): Promise<TableRef[]> {
    return this.withClient(config, async (client) => {
      const res = await client.query(
        `SELECT table_schema, table_name
         FROM information_schema.tables
         WHERE table_schema = $1
         ORDER BY table_name`,
        [schema]
      );
      return res.rows.map((row: { table_schema: string; table_name: string }) => ({
        schema: row.table_schema,
        name: row.table_name,
      }));
    });
  }

  async getColumns(config: PostgresConfig): Promise<SchemaVisualization> {
    return this.withClient(config, async (client) => this.fetchVisualization(client));
  }

  async getRelationships(config: PostgresConfig): Promise<ForeignKeyInfo[]> {
    const viz = await this.getColumns(config);
    return viz.foreign_keys;
  }

  async runQuery(config: PostgresConfig, sql: string): Promise<QueryExecutionResult> {
    const validation = validateSQL(sql);
    if (!validation.isSafe) {
      throw new ConnectorError(validation.reason, 400);
    }

    const limited = applyLimit(sql, 500);
    const startedAt = Date.now();

    try {
      return await this.withClient(config, async (client) => {
        const result = await withTimeout(client.query(limited), 30000, `${this.displayName} query`);
        return {
          columns: result.fields.map((field) => field.name),
          rows: result.rows as Record<string, unknown>[],
          row_count: result.rows.length,
          execution_time_ms: Date.now() - startedAt,
          error: null,
        };
      });
    } catch (err) {
      const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : null;
      return {
        columns: [],
        rows: [],
        row_count: 0,
        execution_time_ms: Date.now() - startedAt,
        error: humanizePgError(err),
        error_code: code,
      };
    }
  }

  async getDatabaseStats(config: PostgresConfig): Promise<DatabaseStats> {
    return this.withClient(config, async (client) => {
      const startedAt = Date.now();
      const res = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE table_type = 'BASE TABLE')::int AS table_count,
          COUNT(*) FILTER (WHERE table_type = 'VIEW')::int AS view_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      const rowEstimate = await client.query(`
        SELECT COALESCE(SUM(reltuples), 0)::bigint AS rows
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      `);
      return {
        table_count: res.rows[0]?.table_count ?? 0,
        view_count: res.rows[0]?.view_count ?? 0,
        row_count_estimate: Number(rowEstimate.rows[0]?.rows ?? 0),
        execution_time_ms: Date.now() - startedAt,
      };
    });
  }

  async getSampleRows(config: PostgresConfig, tableName: string): Promise<QueryExecutionResult> {
    const safeTable = tableName.replace(/"/g, "");
    return this.runQuery(config, `SELECT * FROM "${safeTable}" LIMIT 25`);
  }

  async getSchemaText(config: PostgresConfig): Promise<string> {
    const viz = await this.getColumns(config);
    return viz.tables
      .map((table) => {
        const cols = table.columns.map((col) => `  ${col.name} ${col.type}${col.nullable ? "" : " NOT NULL"}`);
        return `Table: ${table.schema ?? "public"}.${table.name}\nColumns:\n${cols.join("\n")}`;
      })
      .join("\n\n");
  }

  private async fetchVisualization(client: Client): Promise<SchemaVisualization> {
    const tablesRes = await client.query(`
      SELECT t.table_schema, t.table_name, t.table_type, COALESCE(c.reltuples::bigint, 0) AS row_estimate
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = (quote_ident(t.table_schema)::regnamespace)
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `);

    const columnsRes = await client.query(`
      SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default,
             CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk,
             CASE WHEN uc.column_name IS NOT NULL THEN true ELSE false END AS is_unique
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON pk.table_schema = c.table_schema AND pk.table_name = c.table_name AND pk.column_name = c.column_name
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
      ) uc ON uc.table_schema = c.table_schema AND uc.table_name = c.table_name AND uc.column_name = c.column_name
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const fkRes = await client.query(`
      SELECT tc.constraint_name, kcu.table_name AS source_table, kcu.column_name AS source_column,
             ccu.table_name AS target_table, ccu.column_name AS target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `);

    const idxRes = await client.query(`
      SELECT indexname AS name, tablename AS table_name, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const colMap: Record<string, ColumnInfo[]> = {};
    for (const row of columnsRes.rows) {
      if (!colMap[row.table_name]) colMap[row.table_name] = [];
      colMap[row.table_name].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES",
        is_pk: row.is_pk,
        is_unique: row.is_unique,
        default_value: row.column_default,
      });
    }

    const tables: TableInfo[] = tablesRes.rows.map((row) => ({
      name: row.table_name,
      schema: row.table_schema,
      type: row.table_type === "VIEW" ? "view" : "table",
      columns: colMap[row.table_name] ?? [],
      row_estimate: row.row_estimate,
    }));

    const foreign_keys: ForeignKeyInfo[] = fkRes.rows.map((row) => ({
      constraint_name: row.constraint_name,
      source_table: row.source_table,
      source_column: row.source_column,
      target_table: row.target_table,
      target_column: row.target_column,
    }));

    const indexes: IndexInfo[] = idxRes.rows.map((row) => ({
      name: row.name,
      table: row.table_name,
      columns: [],
      unique: /CREATE UNIQUE INDEX/i.test(row.indexdef),
      index_type: row.indexdef.match(/USING\s+(\w+)/i)?.[1] ?? "btree",
    }));

    return {
      tables,
      foreign_keys,
      indexes,
      health_score: Math.max(0, 100 - tables.filter((table) => !table.columns.some((col) => col.is_pk)).length * 5),
      health_issues: tables
        .filter((table) => table.type === "table" && !table.columns.some((col) => col.is_pk))
        .map((table) => `Table "${table.name}" has no primary key.`),
    };
  }

  private connectionHint(err: unknown): string {
    const msg = humanizePgError(err);
    if (msg.includes("could not translate host name") || msg.includes("Name or service not known")) {
      return "Cannot resolve the hostname. Verify the host in your database provider's connection details.";
    }
    if (msg.includes("connect timeout") || msg.includes("Connection refused") || msg.includes("timed out")) {
      return "Connection refused or timed out. Check the host, port, network allowlist, and database availability.";
    }
    if (msg.includes("password authentication failed")) {
      return "Authentication failed. Check the database username and password.";
    }
    if (msg.toLowerCase().includes("ssl") || msg.toLowerCase().includes("certificate")) {
      return "SSL connection failed. Try the SSL option required by your database provider.";
    }
    return "Could not connect to the database. Check credentials and connection details.";
  }
}
