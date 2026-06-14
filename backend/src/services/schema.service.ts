import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";
import { TableSchema } from "../types/query.types";

// ============================================================================
// Internal schema via Supabase RPC
// ============================================================================

export async function getInternalSchema(sb: SupabaseClient): Promise<string> {
  try {
    const result = await sb.rpc("get_public_schema", {});
    if (result.error) {
      throw result.error;
    }

    const rows = (result.data ?? []) as Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
    }>;

    // Group columns by table
    const tables: Record<string, typeof rows> = {};
    for (const col of rows) {
      if (!tables[col.table_name]) {
        tables[col.table_name] = [];
      }
      tables[col.table_name].push(col);
    }

    const parts: string[] = [];
    for (const [table, cols] of Object.entries(tables).sort(([a], [b]) => a.localeCompare(b))) {
      const colDefs = cols.map((c) => {
        const nullable = c.is_nullable === "NO" ? " NOT NULL" : "";
        return `  ${c.column_name} ${c.data_type}${nullable}`;
      });
      parts.push(`Table: ${table}\nColumns:\n${colDefs.join("\n")}`);
    }

    return parts.join("\n\n");
  } catch (err) {
    logger.error("Error reading internal schema:", err);
    return `Error reading schema: ${err}`;
  }
}

// ============================================================================
// External schema via direct PostgreSQL connection
// ============================================================================

export async function getExternalSchema(
  connectionString: string,
  sslRequired = true
): Promise<string> {
  let client: Client | null = null;
  try {
    client = new Client({
      connectionString,
      ssl: sslRequired ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();

    // Query information_schema for table/column details
    const res = await client.query(
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );

    // Group by table
    const tables: Record<string, { column_name: string; data_type: string; is_nullable: string }[]> = {};
    for (const row of res.rows) {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push(row);
    }

    const parts: string[] = [];
    for (const [table, cols] of Object.entries(tables).sort(([a], [b]) => a.localeCompare(b))) {
      const colDefs = cols.map((c) => `  ${c.column_name} ${c.data_type}`);
      parts.push(`Table: ${table}\nColumns:\n${colDefs.join("\n")}`);
    }

    return parts.join("\n\n");
  } catch (err) {
    const msg = String(err);
    if (
      msg.includes("could not translate host name") ||
      msg.includes("Name or service not known")
    ) {
      return (
        "Error reading schema: Cannot resolve the Neon database hostname. " +
        "Verify the host in Neon Console → your project → Connection Details. " +
        "The host should look like: ep-<name>-<id>.<region>.aws.neon.tech. " +
        "For local PostgreSQL, use 'localhost'."
      );
    }
    if (
      msg.includes("endpoint is disabled") ||
      msg.includes("project is in restricted state")
    ) {
      return (
        "Error reading schema: The Neon compute endpoint is disabled or the project is restricted. " +
        "Open Neon Console → your project and check the compute status. " +
        "Free-tier computes suspend automatically after 5 minutes of inactivity but wake on reconnect — " +
        "wait a moment and try again."
      );
    }
    if (
      msg.includes("Connection refused") ||
      msg.includes("connect timeout")
    ) {
      return (
        "Error reading schema: Connection refused or timed out. " +
        "Check the host, port (5432), and that your Neon compute is active. " +
        "For local PostgreSQL, confirm the server is running."
      );
    }
    if (msg.includes("password authentication failed")) {
      return (
        "Error reading schema: Authentication failed — " +
        "check your DB User and password. " +
        "The default Neon role is typically 'neondb_owner'; " +
        "find yours in Neon Console → Roles."
      );
    }
    if (msg.includes("role") && msg.includes("does not exist")) {
      return (
        "Error reading schema: The specified database role does not exist. " +
        "Check DB User — it must match a role in Neon Console → Roles. " +
        "The default role is typically 'neondb_owner'."
      );
    }
    if (msg.includes("SSL") || msg.includes("ssl")) {
      return (
        "Error reading schema: SSL is required for Neon databases. " +
        "Enable the 'Require SSL' checkbox and try again."
      );
    }
    return `Error reading schema: ${err}`;
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

// ============================================================================
// Structured schema for the frontend schema explorer
// ============================================================================

export async function getSchemaAsDict(
  sb: SupabaseClient
): Promise<TableSchema[]> {
  try {
    const result = await sb.rpc("get_public_schema", {});
    if (result.error) {
      throw result.error;
    }

    const rows = (result.data ?? []) as Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
    }>;

    // Group by table
    const tables: Record<string, typeof rows> = {};
    for (const col of rows) {
      if (!tables[col.table_name]) {
        tables[col.table_name] = [];
      }
      tables[col.table_name].push(col);
    }

    return Object.entries(tables)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([table, cols]) => ({
        table,
        columns: cols.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === "YES",
        })),
      }));
  } catch (err) {
    logger.error("Error reading schema as dict:", err);
    return [];
  }
}
