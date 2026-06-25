import { UnsupportedConnector } from "./base";

export class OracleConnector extends UnsupportedConnector {
  constructor() {
    super("oracle", "Oracle Database", "Relational", "oracledb");
  }
}
