import { UnsupportedConnector } from "./base";

export class MariaDbConnector extends UnsupportedConnector {
  constructor() {
    super("mariadb", "MariaDB", "Relational", "mariadb");
  }
}
