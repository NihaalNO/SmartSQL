export interface QueryIntent {
  query_type: string
  table: string | null
  action: string
  attributes: string[]
}

export interface QueryResult {
  natural_language_query: string
  generated_sql: string
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  execution_time_ms: number
  log_id?: number
  insight?: string
  error?: string
  status: "success" | "failed" | "blocked" | "need_context" | "template"
  intent?: QueryIntent
}

export interface SavedQuery {
  id: number
  title: string
  natural_language_query: string
  generated_sql: string
  chart_type?: string
  is_favorite: boolean
  created_at: string
}

export interface QueryLog {
  id: number
  natural_language_query: string
  generated_sql?: string
  execution_status: "success" | "failed" | "blocked"
  execution_time_ms?: number
  row_count?: number
  model_provider?: string
  created_at: string
}

export interface TableColumn {
  name: string
  type: string
  nullable: boolean
  key: string
}

export interface TableSchema {
  table: string
  columns: TableColumn[]
}

export type ChartType = "bar" | "line" | "pie" | "area" | "none"

// ── Schema Visualization ──────────────────────────────────────────────────────

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  is_pk: boolean
  is_unique: boolean
  default_value: string | null
}

export interface TableInfo {
  name: string
  schema: string
  type: "table" | "view"
  columns: ColumnInfo[]
  row_estimate: number | null
}

export interface ForeignKeyInfo {
  constraint_name: string
  source_table: string
  source_column: string
  target_table: string
  target_column: string
}

export interface IndexInfo {
  name: string
  table: string
  columns: string[]
  unique: boolean
  index_type: string
}

export interface SchemaVisualization {
  tables: TableInfo[]
  foreign_keys: ForeignKeyInfo[]
  indexes: IndexInfo[]
  health_score: number
  health_issues: string[]
}

export interface SchemaAnalysis {
  purpose: string
  core_entities: string[]
  lookup_tables: string[]
  primary_workflow: string
  relationship_clusters: string[]
  complexity: string
  architecture_notes: string
}

export interface SchemaDocumentation {
  markdown: string
  generated_at: string
  table_count: number
  relationship_count: number
  index_count: number
}

export interface SchemaAnalyzeResponse {
  visualization: SchemaVisualization
  analysis: SchemaAnalysis
  documentation: SchemaDocumentation
}
