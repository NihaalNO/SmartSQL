import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";
import { getSslConfig } from "../utils/ssl";
import { TableSchema, SchemaVisualization, ColumnInfo, ForeignKeyInfo, IndexInfo, TableInfo } from "../types/query.types";

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
      ssl: getSslConfig(sslRequired),
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
        "Error reading schema: Cannot resolve the database hostname. " +
        "Verify the host in Supabase Dashboard → your project → Connect → " +
        "Session pooler or Direct connection. " +
        "The host should look like: db.<project-ref>.supabase.co. " +
        "For local PostgreSQL, use 'localhost'."
      );
    }
    if (
      msg.includes("connect timeout") ||
      msg.includes("Connection refused")
    ) {
      return (
        "Error reading schema: Connection refused or timed out. " +
        "Check the host, port (5432 for direct, 6543 for session pooler), " +
        "and that your database is accepting connections. " +
        "For Supabase, verify IPv4 mode is enabled in project settings. " +
        "For local PostgreSQL, confirm the server is running."
      );
    }
    if (msg.includes("password authentication failed")) {
      return (
        "Error reading schema: Authentication failed — " +
        "check your DB User and password. " +
        "The default Supabase role is 'postgres'; " +
        "find your password in Project Settings → Database."
      );
    }
    if (msg.includes("role") && msg.includes("does not exist")) {
      return (
        "Error reading schema: The specified database role does not exist. " +
        "Check DB User — the default role is 'postgres'. " +
        "Custom roles can be managed in your Supabase project's SQL editor."
      );
    }
    if (msg.includes("SSL") || msg.includes("ssl")) {
      return (
        "Error reading schema: SSL is required. " +
        "Enable the 'Require SSL' checkbox and try again. " +
        "Supabase connections always require SSL."
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

// ============================================================================
// Rich schema discovery for visualization
// ============================================================================

async function fetchRichSchema(clientOrStr: Client | string, sslRequired = true): Promise<{ tables: TableInfo[]; foreign_keys: ForeignKeyInfo[]; indexes: IndexInfo[] }> {
  const isClient = clientOrStr instanceof Client;
  let client: Client | null = isClient ? clientOrStr as Client : null;
  let owned = false;

  try {
    if (!isClient) {
      client = new Client({
        connectionString: clientOrStr as string,
        ssl: getSslConfig(sslRequired),
        connectionTimeoutMillis: 10000,
      });
      await client.connect();
      owned = true;
    }

    const q = client!;

    const { rows: tablesRes } = await q.query(`
      SELECT
        t.table_name,
        t.table_type,
        (SELECT reltuples::bigint FROM pg_class WHERE oid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass) AS row_estimate
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `);

    const { rows: columnsRes } = await q.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk,
        CASE WHEN uc.column_name IS NOT NULL THEN true ELSE false END AS is_unique
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
      ) uc ON uc.table_name = c.table_name AND uc.column_name = c.column_name
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const { rows: fkRes } = await q.query(`
      SELECT
        tc.constraint_name,
        kcu.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    const { rows: idxRes } = await q.query(`
      SELECT
        indexname AS name,
        tablename AS table,
        indexdef,
        unnest(indkey) = 0 AS is_expression
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const colMap: Record<string, ColumnInfo[]> = {};
    for (const row of columnsRes) {
      if (!colMap[row.table_name]) colMap[row.table_name] = [];
      colMap[row.table_name].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES",
        is_pk: row.is_pk,
        is_unique: row.is_unique,
        default_value: row.column_default,
      });
    }

    const tables: TableInfo[] = tablesRes.map((t: any) => ({
      name: t.table_name,
      schema: "public",
      type: t.table_type === "VIEW" ? "view" : "table",
      columns: colMap[t.table_name] || [],
      row_estimate: t.row_estimate,
    }));

    const foreign_keys: ForeignKeyInfo[] = fkRes.map((fk: any) => ({
      constraint_name: fk.constraint_name,
      source_table: fk.source_table,
      source_column: fk.source_column,
      target_table: fk.target_table,
      target_column: fk.target_column,
    }));

    const indexMap: Record<string, IndexInfo> = {};
    for (const row of idxRes) {
      if (row.is_expression) continue;
      const match = row.indexdef.match(/CREATE\s+(UNIQUE\s+)?INDEX.*?ON\s+(?:\w+\.)?(\w+)\s+USING\s+(\w+)\s+\((.+?)\)/i);
      if (match) {
        const idxName = `${row.table}.${row.name}`;
        if (!indexMap[idxName]) {
          indexMap[idxName] = {
            name: row.name,
            table: row.table,
            columns: [],
            unique: !!match[1],
            index_type: match[3],
          };
        }
        const cols = match[4].split(",").map((s: string) => s.trim().replace(/"(.+?)"/g, "$1").split(/\s+/)[0]);
        indexMap[idxName].columns.push(...cols);
      }
    }

    return { tables, foreign_keys, indexes: Object.values(indexMap) };
  } finally {
    if (owned && client) {
      await client.end().catch(() => {});
    }
  }
}

export async function getRichExternalSchema(
  connectionString: string,
  sslRequired = true
): Promise<SchemaVisualization> {
  try {
    const data = await fetchRichSchema(connectionString, sslRequired);
    const health = analyzeSchemaHealth(data.tables, data.foreign_keys, data.indexes);
    return { ...data, health_score: health.score, health_issues: health.issues };
  } catch (err) {
    logger.error("Error discovering rich external schema:", err);
    return { tables: [], foreign_keys: [], indexes: [], health_score: 0, health_issues: [`Schema discovery failed: ${err}`] };
  }
}

export async function getRichInternalSchema(sb: SupabaseClient): Promise<SchemaVisualization> {
  try {
    const res = await sb.rpc("get_public_schema", {});
    if (res.error) throw res.error;

    const rawCols = (res.data ?? []) as Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
    }>;

    const colMap: Record<string, ColumnInfo[]> = {};
    for (const row of rawCols) {
      if (!colMap[row.table_name]) colMap[row.table_name] = [];
      colMap[row.table_name].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES",
        is_pk: false,
        is_unique: false,
        default_value: null,
      });
    }

    const tables: TableInfo[] = Object.entries(colMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, cols]) => ({
        name,
        schema: "public",
        type: "table" as const,
        columns: cols,
        row_estimate: null,
      }));

    const health = analyzeSchemaHealth(tables, [], []);
    return { tables, foreign_keys: [], indexes: [], health_score: health.score, health_issues: health.issues };
  } catch (err) {
    logger.error("Error discovering rich internal schema:", err);
    return { tables: [], foreign_keys: [], indexes: [], health_score: 0, health_issues: [`Schema discovery failed: ${err}`] };
  }
}

function analyzeSchemaHealth(tables: TableInfo[], foreignKeys: ForeignKeyInfo[], indexes: IndexInfo[]): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  for (const table of tables) {
    if (!table.columns.some((c) => c.is_pk) && table.type === "table") {
      issues.push(`Table "${table.name}" has no primary key — every table should have a PK for data integrity`);
      score -= 5;
    }
    if (table.columns.length === 0) {
      issues.push(`Table "${table.name}" has no columns`);
      score -= 3;
    }
    const textCols = table.columns.filter((c) => c.type.startsWith("character") || c.type === "text");
    for (const col of textCols) {
      if (col.name.match(/^(email|url|phone|name|address|city|state|country)$/i) && col.type === "text") {
        issues.push(`Column "${table.name}.${col.name}" uses text instead of a more specific type (e.g. varchar with length)`);
        score -= 1;
      }
    }
  }

  for (const fk of foreignKeys) {
    const srcTable = tables.find((t) => t.name === fk.source_table);
    if (srcTable) {
      const col = srcTable.columns.find((c) => c.name === fk.source_column);
      if (col && !col.is_pk && !indexes.some((i) => i.table === fk.source_table && i.columns.includes(fk.source_column))) {
        issues.push(`Foreign key column "${fk.source_table}.${fk.source_column}" is not indexed — this can slow down JOINs`);
        score -= 2;
      }
    }
  }

  return { score: Math.max(0, score), issues };
}

export async function getExternalSchemaRich(connectionString: string, sslRequired = true): Promise<SchemaVisualization> {
  return getRichExternalSchema(connectionString, sslRequired);
}
