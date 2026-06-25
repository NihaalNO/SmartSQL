import { BigQueryConnector } from "./bigquery.connector";
import { ClickHouseConnector } from "./clickhouse.connector";
import { DuckDbConnector } from "./duckdb.connector";
import { MariaDbConnector } from "./mariadb.connector";
import { MySqlConnector } from "./mysql.connector";
import { OracleConnector } from "./oracle.connector";
import { PostgresConnector } from "./postgres.connector";
import { RedshiftConnector } from "./redshift.connector";
import { SnowflakeConnector } from "./snowflake.connector";
import { SqliteConnector } from "./sqlite.connector";
import { SqlServerConnector } from "./sqlserver.connector";
import type { DbType, LiveDbConnector } from "./types";
import { ConnectorError } from "./types";

const connectors = new Map<DbType, LiveDbConnector>([
  ["postgres", new PostgresConnector()],
  ["mysql", new MySqlConnector()],
  ["mariadb", new MariaDbConnector()],
  ["sqlserver", new SqlServerConnector()],
  ["oracle", new OracleConnector()],
  ["sqlite", new SqliteConnector()],
  ["snowflake", new SnowflakeConnector()],
  ["bigquery", new BigQueryConnector()],
  ["redshift", new RedshiftConnector()],
  ["clickhouse", new ClickHouseConnector()],
  ["duckdb", new DuckDbConnector()],
]);

export const allowedDbTypes = [...connectors.keys()];

export function getConnector(dbType: string): LiveDbConnector {
  if (!allowedDbTypes.includes(dbType as DbType)) {
    throw new ConnectorError(`Unsupported database type: ${dbType}`, 400);
  }
  return connectors.get(dbType as DbType)!;
}
