import { UnsupportedConnector } from "./base";

export class SqlServerConnector extends UnsupportedConnector {
  constructor() {
    super("sqlserver", "Microsoft SQL Server", "Relational", "mssql");
  }
}
