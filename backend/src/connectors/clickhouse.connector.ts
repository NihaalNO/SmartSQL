import { UnsupportedConnector } from "./base";

export class ClickHouseConnector extends UnsupportedConnector {
  constructor() {
    super("clickhouse", "ClickHouse", "Analytics/Warehouse", "@clickhouse/client");
  }
}
