import { UnsupportedConnector } from "./base";

export class DuckDbConnector extends UnsupportedConnector {
  constructor() {
    super("duckdb", "DuckDB", "Embedded", "duckdb or @duckdb/node-api");
  }
}
