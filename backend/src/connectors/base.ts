import { z } from "zod";
import type {
  ConnectionTestResult,
  DatabaseCategory,
  DatabaseStats,
  DbType,
  LiveDbConnector,
  QueryExecutionResult,
  TableRef,
} from "./types";
import { ConnectorError } from "./types";

export const passwordFieldNames = new Set([
  "password",
  "db_password",
  "serviceAccountJson",
  "private_key",
]);

export function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      passwordFieldNames.has(key) && value ? "********" : value,
    ])
  );
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ConnectorError(`${label} timed out after ${ms / 1000}s`, 504)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

export const portSchema = z.number().int().min(1).max(65535);

export class UnsupportedConnector implements LiveDbConnector {
  constructor(
    public readonly dbType: DbType,
    public readonly displayName: string,
    public readonly category: DatabaseCategory,
    private readonly packageName: string
  ) {}

  validateConfig(config: unknown): Record<string, unknown> {
    return z.record(z.unknown()).parse(config);
  }

  maskConfig(config: Record<string, unknown>): Record<string, unknown> {
    return maskConfig(config);
  }

  private unsupported(): never {
    throw new ConnectorError(
      `${this.displayName} is available in the catalogue, but its Node.js driver is not installed yet. Install ${this.packageName} and implement the connector driver to enable live querying.`,
      501
    );
  }

  async testConnection(): Promise<ConnectionTestResult> {
    this.unsupported();
  }

  async getSchemas(): Promise<string[]> {
    this.unsupported();
  }

  async getTables(): Promise<TableRef[]> {
    this.unsupported();
  }

  async getColumns(): Promise<never> {
    this.unsupported();
  }

  async getRelationships(): Promise<never> {
    this.unsupported();
  }

  async runQuery(): Promise<QueryExecutionResult> {
    this.unsupported();
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    this.unsupported();
  }

  async getSampleRows(): Promise<QueryExecutionResult> {
    this.unsupported();
  }

  async getSchemaText(): Promise<string> {
    this.unsupported();
  }
}
