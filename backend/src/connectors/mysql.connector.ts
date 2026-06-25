import { UnsupportedConnector } from "./base";

export class MySqlConnector extends UnsupportedConnector {
  constructor() {
    super("mysql", "MySQL", "Relational", "mysql2");
  }
}
