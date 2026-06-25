import type { SchemaVisualization } from "../types/query.types";

export type DbType =
  | "postgres"
  | "mysql"
  | "mariadb"
  | "sqlserver"
  | "oracle"
  | "sqlite"
  | "snowflake"
  | "bigquery"
  | "redshift"
  | "clickhouse"
  | "duckdb";

export type DatabaseCategory = "Relational" | "Analytics/Warehouse" | "Embedded";

export interface LiveDbRequest<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  dbType: DbType;
  config: TConfig;
}

export interface QueryExecutionResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
  error: string | null;
  error_code?: string | null;
  bytes_scanned?: number | null;
}

export interface DatabaseStats {
  table_count: number;
  view_count?: number;
  row_count_estimate?: number | null;
  database_size?: string | null;
  warehouse?: string | null;
  execution_time_ms?: number;
  notes?: string[];
}

export interface ConnectionTestResult {
  status: "ok" | "error";
  message: string;
  table_count?: number;
  tables?: string[];
  diagnostics?: string[];
  database?: string;
  dbType?: DbType;
}

export interface TableRef {
  schema?: string;
  name: string;
}

export interface LiveDbConnector<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  readonly dbType: DbType;
  readonly displayName: string;
  readonly category: DatabaseCategory;
  validateConfig(config: unknown): TConfig;
  maskConfig(config: TConfig): Record<string, unknown>;
  testConnection(config: TConfig): Promise<ConnectionTestResult>;
  getSchemas(config: TConfig): Promise<string[]>;
  getTables(config: TConfig, schema?: string): Promise<TableRef[]>;
  getColumns(config: TConfig, tableName?: string): Promise<SchemaVisualization>;
  getRelationships(config: TConfig): Promise<SchemaVisualization["foreign_keys"]>;
  runQuery(config: TConfig, sql: string): Promise<QueryExecutionResult>;
  getDatabaseStats(config: TConfig): Promise<DatabaseStats>;
  getSampleRows(config: TConfig, tableName: string): Promise<QueryExecutionResult>;
  getSchemaText(config: TConfig): Promise<string>;
}

export class ConnectorError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
  }
}
