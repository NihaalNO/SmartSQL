import type { DbType } from "./databases"

export type LiveDbConfig = Record<string, unknown>

export interface FormField {
  name: string
  label: string
  type: "text" | "number" | "password" | "checkbox" | "select" | "textarea" | "file"
  required?: boolean
  placeholder?: string
  options?: string[]
  accept?: string
  devOnly?: boolean
}

export const formSchemas: Record<DbType, { defaults: LiveDbConfig; fields: FormField[] }> = {
  postgres: {
    defaults: { port: 5432, ssl: true },
    fields: [
      { name: "host", label: "Host", type: "text", required: true, placeholder: "db.example.supabase.co" },
      { name: "port", label: "Port", type: "number", required: true },
      { name: "database", label: "Database", type: "text", required: true, placeholder: "postgres" },
      { name: "user", label: "User", type: "text", required: true, placeholder: "postgres" },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "ssl", label: "Require SSL", type: "checkbox" },
    ],
  },
  mysql: {
    defaults: { port: 3306, ssl: false },
    fields: [
      { name: "host", label: "Host", type: "text", required: true },
      { name: "port", label: "Port", type: "number", required: true },
      { name: "database", label: "Database", type: "text", required: true },
      { name: "user", label: "User", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "ssl", label: "Use SSL", type: "checkbox" },
    ],
  },
  mariadb: {
    defaults: { port: 3306, ssl: false },
    fields: [
      { name: "host", label: "Host", type: "text", required: true },
      { name: "port", label: "Port", type: "number", required: true },
      { name: "database", label: "Database", type: "text", required: true },
      { name: "user", label: "User", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "ssl", label: "Use SSL", type: "checkbox" },
    ],
  },
  sqlserver: {
    defaults: { port: 1433, encrypt: true, trustServerCertificate: false },
    fields: [
      { name: "host", label: "Server / Host", type: "text", required: true },
      { name: "port", label: "Port", type: "number", required: true },
      { name: "database", label: "Database", type: "text", required: true },
      { name: "user", label: "User", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "encrypt", label: "Encrypt connection", type: "checkbox" },
      { name: "trustServerCertificate", label: "Trust server certificate", type: "checkbox" },
    ],
  },
  oracle: {
    defaults: { port: 1521 },
    fields: [
      { name: "host", label: "Host", type: "text", required: true },
      { name: "port", label: "Port", type: "number", required: true },
      { name: "serviceName", label: "Service name or SID", type: "text", required: true },
      { name: "user", label: "User", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
    ],
  },
  sqlite: {
    defaults: {},
    fields: [
      { name: "file", label: "SQLite file", type: "file", accept: ".db,.sqlite,.sqlite3" },
      { name: "path", label: "Local file path", type: "text", placeholder: "Development only", devOnly: true },
    ],
  },
  snowflake: {
    defaults: {},
    fields: [
      { name: "account", label: "Account", type: "text", required: true },
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "warehouse", label: "Warehouse", type: "text", required: true },
      { name: "database", label: "Database", type: "text", required: true },
      { name: "schema", label: "Schema", type: "text", required: true },
      { name: "role", label: "Role", type: "text" },
    ],
  },
  bigquery: {
    defaults: {},
    fields: [
      { name: "projectId", label: "Project ID", type: "text", required: true },
      { name: "dataset", label: "Dataset", type: "text" },
      { name: "serviceAccountJson", label: "Service account JSON", type: "textarea", required: true },
      { name: "location", label: "Location", type: "text", placeholder: "US" },
    ],
  },
  redshift: {
    defaults: { port: 5439, ssl: true },
    fields: [
      { name: "host", label: "Host", type: "text", required: true },
      { name: "port", label: "Port", type: "number", required: true },
      { name: "database", label: "Database", type: "text", required: true },
      { name: "user", label: "User", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "ssl", label: "Use SSL", type: "checkbox" },
    ],
  },
  clickhouse: {
    defaults: { port: 8443, protocol: "https", ssl: true },
    fields: [
      { name: "host", label: "Host", type: "text", required: true },
      { name: "port", label: "Port", type: "number", required: true },
      { name: "database", label: "Database", type: "text", required: true },
      { name: "user", label: "User", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "protocol", label: "Protocol", type: "select", options: ["https", "http"], required: true },
      { name: "ssl", label: "Use SSL", type: "checkbox" },
    ],
  },
  duckdb: {
    defaults: { mode: "memory" },
    fields: [
      { name: "file", label: "DuckDB file", type: "file", accept: ".duckdb" },
      { name: "mode", label: "Mode", type: "select", options: ["memory", "file"], required: true },
      { name: "path", label: "Local file path", type: "text", placeholder: "Development only", devOnly: true },
    ],
  },
}

export function normalizeConfig(values: LiveDbConfig): LiveDbConfig {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (value === "") return [key, undefined]
      if (key === "port" && typeof value === "string") return [key, Number(value)]
      return [key, value]
    }).filter(([, value]) => value !== undefined)
  )
}
