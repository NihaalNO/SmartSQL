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
  status: "success" | "failed" | "blocked"
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
