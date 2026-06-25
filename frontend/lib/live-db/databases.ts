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
  | "duckdb"

export type DatabaseCategory = "Relational" | "Analytics/Warehouse" | "Embedded"

export interface DatabaseMetadata {
  id: DbType
  name: string
  category: DatabaseCategory
  description: string
  defaultPort?: number
  iconPath: string
  formType: DbType
  supportsSchemaVisualizer: boolean
  supportsERDiagram: boolean
  supportsAnalyticsFeatures: boolean
  status: "available"
}

export const databases: DatabaseMetadata[] = [
  {
    id: "postgres",
    name: "PostgreSQL",
    category: "Relational",
    description: "Open-source relational database for transactional and analytic workloads.",
    defaultPort: 5432,
    iconPath: "/icons/databases/postgresql.svg",
    formType: "postgres",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: false,
    status: "available",
  },
  {
    id: "mysql",
    name: "MySQL",
    category: "Relational",
    description: "Popular relational engine for product data, apps, and reporting.",
    defaultPort: 3306,
    iconPath: "/icons/databases/mysql.svg",
    formType: "mysql",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: false,
    status: "available",
  },
  {
    id: "mariadb",
    name: "MariaDB",
    category: "Relational",
    description: "MySQL-compatible relational database with open-source extensions.",
    defaultPort: 3306,
    iconPath: "/icons/databases/mariadb.svg",
    formType: "mariadb",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: false,
    status: "available",
  },
  {
    id: "sqlserver",
    name: "Microsoft SQL Server",
    category: "Relational",
    description: "Enterprise relational database for Microsoft data platforms.",
    defaultPort: 1433,
    iconPath: "/icons/databases/sqlserver.svg",
    formType: "sqlserver",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: false,
    status: "available",
  },
  {
    id: "oracle",
    name: "Oracle Database",
    category: "Relational",
    description: "Enterprise database for mission-critical relational systems.",
    defaultPort: 1521,
    iconPath: "/icons/databases/oracle.svg",
    formType: "oracle",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: false,
    status: "available",
  },
  {
    id: "sqlite",
    name: "SQLite",
    category: "Embedded",
    description: "Portable file-based database for local development and small apps.",
    iconPath: "/icons/databases/sqlite.svg",
    formType: "sqlite",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: false,
    status: "available",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    category: "Analytics/Warehouse",
    description: "Cloud warehouse for large-scale analytics and governed datasets.",
    iconPath: "/icons/databases/snowflake.svg",
    formType: "snowflake",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: true,
    status: "available",
  },
  {
    id: "bigquery",
    name: "Google BigQuery",
    category: "Analytics/Warehouse",
    description: "Serverless analytics warehouse with dataset and bytes-scanned metrics.",
    iconPath: "/icons/databases/bigquery.svg",
    formType: "bigquery",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: true,
    status: "available",
  },
  {
    id: "redshift",
    name: "Amazon Redshift",
    category: "Analytics/Warehouse",
    description: "AWS data warehouse compatible with PostgreSQL-style connections.",
    defaultPort: 5439,
    iconPath: "/icons/databases/redshift.svg",
    formType: "redshift",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: true,
    status: "available",
  },
  {
    id: "clickhouse",
    name: "ClickHouse",
    category: "Analytics/Warehouse",
    description: "Columnar OLAP database for fast event and metrics analysis.",
    defaultPort: 8443,
    iconPath: "/icons/databases/clickhouse.svg",
    formType: "clickhouse",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: true,
    status: "available",
  },
  {
    id: "duckdb",
    name: "DuckDB",
    category: "Embedded",
    description: "In-process analytical database for local files and notebooks.",
    iconPath: "/icons/databases/duckdb.svg",
    formType: "duckdb",
    supportsSchemaVisualizer: true,
    supportsERDiagram: true,
    supportsAnalyticsFeatures: true,
    status: "available",
  },
]

export function getDatabase(id: DbType): DatabaseMetadata {
  return databases.find((database) => database.id === id) ?? databases[0]
}
