import { PostgresConnector } from "./postgres.connector";

export class RedshiftConnector extends PostgresConnector {
  constructor() {
    super({ dbType: "redshift", displayName: "Amazon Redshift", category: "Analytics/Warehouse" });
  }
}
