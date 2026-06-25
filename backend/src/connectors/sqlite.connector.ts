import { UnsupportedConnector } from "./base";

export class SqliteConnector extends UnsupportedConnector {
  constructor() {
    super("sqlite", "SQLite", "Embedded", "better-sqlite3 or sqlite3");
  }
}
