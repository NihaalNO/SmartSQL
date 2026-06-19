/**
 * Query request/response types mirroring the original Python Pydantic schemas.
 */

export interface QueryIntent {
  query_type: string;
  table: string | null;
  action: string;
  attributes: string[];
}

export interface QueryRequest {
  question: string;
  dataset_id?: number;
  model_provider?: string;
  model_name?: string;
  include_insight?: boolean;
}

export interface LiveQueryRequest {
  question: string;
  db_host: string;
  db_port?: number;
  db_name: string;
  db_user: string;
  db_password: string;
  model_provider?: string;
  model_name?: string;
  include_insight?: boolean;
  ssl_required?: boolean;
}

export interface QueryResult {
  natural_language_query: string;
  generated_sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
  log_id: number | null;
  insight: string | null;
  error: string | null;
  status: string;
  intent: QueryIntent | null;
}

export interface SaveQueryRequest {
  log_id: number;
  title: string;
  chart_type?: string;
  is_favorite?: boolean;
}

export interface FeedbackRequest {
  log_id: number;
  rating: number;
  comments?: string;
}

export interface SavedQueryOut {
  id: number;
  title: string;
  natural_language_query: string;
  generated_sql: string;
  chart_type: string | null;
  is_favorite: boolean;
  created_at: string | Date;
}

export interface QueryLogOut {
  id: number;
  natural_language_query: string;
  generated_sql: string | null;
  execution_status: string;
  execution_time_ms: number | null;
  row_count: number | null;
  model_provider: string | null;
  created_at: string | Date;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableSchema {
  table: string;
  columns: TableColumn[];
}

// ---------------------------------------------------------------------------
// Schema Visualization types
// ---------------------------------------------------------------------------

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  is_pk: boolean;
  is_unique: boolean;
  default_value: string | null;
}

export interface TableInfo {
  name: string;
  schema: string;
  type: "table" | "view";
  columns: ColumnInfo[];
  row_estimate: number | null;
}

export interface ForeignKeyInfo {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  index_type: string;
}

export interface SchemaVisualization {
  tables: TableInfo[];
  foreign_keys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  health_score: number;
  health_issues: string[];
}

export interface SchemaHealthIssue {
  severity: "error" | "warning" | "info";
  table: string;
  message: string;
  recommendation: string;
}
