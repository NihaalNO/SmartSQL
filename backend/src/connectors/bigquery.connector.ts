import { UnsupportedConnector } from "./base";

export class BigQueryConnector extends UnsupportedConnector {
  constructor() {
    super("bigquery", "Google BigQuery", "Analytics/Warehouse", "@google-cloud/bigquery");
  }
}
