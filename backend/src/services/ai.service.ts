import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { QueryIntent } from "../types/query.types";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CannotAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotAnswerError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanText(raw: string): string {
  return raw
    .replace(/```(?:sql|json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^`|`$/g, "")
    .trim();
}

function resolveProvider(prov?: string): string {
  return prov || env.DEFAULT_MODEL_PROVIDER || "groq";
}

function resolveModel(prov: string, model?: string): string {
  if (model) return model;
  if (prov === "gemini") return "gemini-1.5-flash";
  if (prov === "ollama") return "llama3";
  return env.DEFAULT_MODEL_NAME || "llama-3.3-70b-versatile";
}

async function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function callGroq(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  const groq = new Groq({ apiKey: env.GROQ_API_KEY });
  const result = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
  });
  return result.choices[0]?.message?.content?.trim() ?? "";
}

async function callGemini(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({
    model: model || "gemini-1.5-flash",
    generationConfig: { temperature: 0 },
  });
  const result = await geminiModel.generateContent({
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
    ],
  });
  return result.response.text().trim();
}

async function callOllama(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
  const response = await fetch(`${env.OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "llama3",
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { response: string };
  return data.response.trim();
}

async function callAI(systemPrompt: string, userPrompt: string, provider: string, model: string): Promise<string> {
  const fn = async () => {
    if (provider === "groq") return callGroq(systemPrompt, userPrompt, model);
    if (provider === "gemini") return callGemini(systemPrompt, userPrompt, model);
    if (provider === "ollama") return callOllama(systemPrompt, userPrompt, model);
    throw new Error(`Unknown provider: ${provider}`);
  };

  return withRetry(() => withTimeout(fn(), 30000), 3);
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const INTENT_EXTRACTION_PROMPT = (): string =>
  `Extract the query intent from a natural language question about a database. ` +
  `Return ONLY a valid JSON object with exactly these four fields:\n` +
  `  "query_type": always "SQL"\n` +
  `  "table": the main table or entity name as a string, or null if not mentioned\n` +
  `  "action": the primary SQL operation — one of: select, sort, filter, count, average, group, top\n` +
  `<html>  "attributes": JSON array of column/field names mentioned (empty array if none)\n\n` +
  `Synonym rules (apply these when classifying action):\n` +
  `  show / list / get / give / fetch / display / find  → select\n` +
  `  sort / order / rank / arrange                       → sort\n` +
  `  highest / top / best / most / maximum / max        → top\n` +
  `  lowest / bottom / minimum / least / min            → sort\n` +
  `  average / mean / avg                               → average\n` +
  `  group / categorize / by category / breakdown       → group\n` +
  `  count / how many / total number / number of        → count\n` +
  `  filter / where / with / having / only / whose      → filter\n\n` +
  `Return ONLY the JSON object. No explanation, no markdown fences.`;

const TEXT_TO_SQL_PROMPT = (schema: string): string =>
  `You are an expert SQL assistant. Your job is to generate a SQL SELECT statement ` +
  `that answers the user's question.\n\n` +
  `Rules:\n` +
  `- Output ONLY the raw SQL query — no explanation, no markdown, no code fences.\n` +
  `- Use ONLY SELECT statements. Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.\n` +
  `- Add LIMIT 100 unless the user explicitly asks for all rows.\n` +
  `- If the table or columns the user mentions exist in the schema below, use the exact ` +
  `  names from the schema.\n` +
  `- If the table or columns the user mentions do NOT appear in the schema, generate a ` +
  `  general SQL query using the table and column names directly from the user's question ` +
  `  as if they existed. Do NOT refuse or return CANNOT_ANSWER just because a table is ` +
  `  missing from the schema — always produce a best-effort query.\n` +
  `- Only output CANNOT_ANSWER if the user is asking to modify data ` +
  `  (INSERT, UPDATE, DELETE, DROP) or the request is completely unrelated to databases.\n\n` +
  `SQL synonym mappings to apply:\n` +
  `- sort / order / rank / arrange          → ORDER BY\n` +
  `- highest / top / best / most / max      → ORDER BY ... DESC LIMIT N\n` +
  `- lowest / bottom / least / min          → ORDER BY ... ASC LIMIT N\n` +
  `- show / list / get / give / fetch       → SELECT\n` +
  `- average / mean / avg                   → AVG()\n` +
  `- count / how many / total number        → COUNT()\n` +
  `- group / categorize / breakdown / by    → GROUP BY\n` +
  `- filter / where / with / only / whose   → WHERE\n\n` +
  `Database Schema (for reference — use if the table exists here, otherwise use the ` +
  `user's own table/column names):\n${schema}`;

const INSIGHT_PROMPT = (): string =>
  `You are a data assistant. Given a SQL query result, provide a concise ` +
  `natural-language insight (2-4 sentences). Focus on patterns, anomalies, and key takeaways. ` +
  `Do not repeat the raw numbers verbatim.`;

const SCHEMA_SUMMARY_PROMPT = (): string =>
  `You are a database architect. Given a JSON description of a database schema, produce a concise ` +
  `analysis. Your response must be valid JSON with exactly these fields:\n` +
  `  "purpose": "What this database appears to be for (e.g. e-commerce, SaaS, analytics)"\n` +
  `  "core_entities": ["List of primary/transaction tables"]\n` +
  `  "lookup_tables": ["List of lookup/reference tables"]\n` +
  `  "primary_workflow": "Description of the main data flow through the schema (2-3 sentences)"\n` +
  `  "relationship_clusters": ["Brief descriptions of related groups of tables, e.g. 'Users + Orders + OrderItems form the sales core'"]\n` +
  `  "complexity": "simple" | "moderate" | "complex"\n` +
  `  "architecture_notes": "Any notable patterns, naming conventions, or design decisions observed"\n\n` +
  `Use ONLY the schema metadata provided. Do not invent tables or relationships. ` +
  `Return ONLY the JSON object. No explanation, no markdown fences.`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractIntent(
  question: string,
  provider?: string,
  model?: string
): Promise<QueryIntent> {
  const prov = resolveProvider(provider);
  const mod = resolveModel(prov, model);

  try {
    const raw = await callAI(INTENT_EXTRACTION_PROMPT(), question, prov, mod);
    const cleaned = cleanText(raw);
    const data = JSON.parse(cleaned) as {
      query_type?: string;
      table?: string | null;
      action?: string;
      attributes?: string[];
    };

    return {
      query_type: data.query_type ?? "SQL",
      table: data.table ?? null,
      action: data.action ?? "select",
      attributes: (data.attributes ?? []).map((a) => String(a)),
    };
  } catch (err) {
    logger.warn("Intent extraction failed:", err);
    // Safe fallback — don't block the query
    return {
      query_type: "SQL",
      table: null,
      action: "select",
      attributes: [],
    };
  }
}

export async function generateSQL(
  schema: string,
  question: string,
  provider?: string,
  model?: string
): Promise<string> {
  const prov = resolveProvider(provider);
  const mod = resolveModel(prov, model);

  const raw = await callAI(TEXT_TO_SQL_PROMPT(schema), question, prov, mod);
  const cleaned = cleanText(raw);

  if (
    cleaned.toUpperCase() === "CANNOT_ANSWER" ||
    cleaned.includes("Unable to generate query for this question")
  ) {
    throw new CannotAnswerError(
      "This question cannot be answered as a read-only SQL query. " +
        "Try asking about data you want to view — for example: " +
        "'Show me all students', 'How many records are in the orders table?', " +
        "or 'What are the top 5 products by sales?'"
    );
  }

  return cleaned;
}

export async function generateInsight(
  question: string,
  resultsPreview: string,
  provider?: string,
  model?: string
): Promise<string> {
  const prov = resolveProvider(provider);
  const mod = resolveModel(prov, model);
  const userPrompt = `Query: ${question}\n\nResults (first 20 rows):\n${resultsPreview}`;

  try {
    return await callAI(INSIGHT_PROMPT(), userPrompt, prov, mod);
  } catch (err) {
    logger.warn("Insight generation failed:", err);
    return "";
  }
}

export async function generateSchemaSummary(
  schemaJson: string,
  provider?: string,
  model?: string
): Promise<{
  purpose: string;
  core_entities: string[];
  lookup_tables: string[];
  primary_workflow: string;
  relationship_clusters: string[];
  complexity: string;
  architecture_notes: string;
}> {
  const prov = resolveProvider(provider);
  const mod = resolveModel(prov, model);

  const fallback = {
    purpose: "Unable to analyze — AI provider unavailable",
    core_entities: [],
    lookup_tables: [],
    primary_workflow: "",
    relationship_clusters: [],
    complexity: "unknown" as const,
    architecture_notes: "",
  };

  try {
    const raw = await callAI(SCHEMA_SUMMARY_PROMPT(), schemaJson, prov, mod);
    const cleaned = cleanText(raw);
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn("Schema summary generation failed:", err);
    return fallback;
  }
}

export function generateSchemaDocumentation(
  tables: Array<{
    name: string;
    type: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      is_pk: boolean;
      is_unique: boolean;
      default_value: string | null;
    }>;
    row_estimate: number | null;
  }>,
  foreignKeys: Array<{
    constraint_name: string;
    source_table: string;
    source_column: string;
    target_table: string;
    target_column: string;
  }>,
  indexes: Array<{
    name: string;
    table: string;
    columns: string[];
    unique: boolean;
    index_type: string;
  }>,
  summary: {
    purpose: string;
    core_entities: string[];
    primary_workflow: string;
  }
): string {
  const lines: string[] = [];

  lines.push("# Database Schema Documentation");
  lines.push("");
  lines.push(`> Auto-generated on ${new Date().toISOString().split("T")[0]}`);
  lines.push("");

  if (summary.purpose) {
    lines.push("## Overview");
    lines.push("");
    lines.push(`**Purpose:** ${summary.purpose}`);
    lines.push(`**Total Tables:** ${tables.length}`);
    lines.push(`**Total Relationships:** ${foreignKeys.length}`);
    lines.push(`**Total Indexes:** ${indexes.length}`);
    lines.push("");

    if (summary.core_entities.length) {
      lines.push("**Core Entities:** " + summary.core_entities.join(", "));
      lines.push("");
    }

    if (summary.primary_workflow) {
      lines.push("**Primary Workflow:**");
      lines.push("");
      lines.push(summary.primary_workflow);
      lines.push("");
    }
  }

  lines.push("## Entity Relationship Diagram");
  lines.push("");
  lines.push("```");
  for (const fk of foreignKeys) {
    lines.push(`${fk.source_table}.${fk.source_column} ──→ ${fk.target_table}.${fk.target_column}`);
  }
  lines.push("```");
  lines.push("");

  lines.push("## Tables");
  lines.push("");

  for (const table of tables) {
    lines.push(`### ${table.name}`);
    lines.push("");
    lines.push(`- **Type:** ${table.type}`);
    if (table.row_estimate != null) {
      lines.push(`- **Estimated Rows:** ${table.row_estimate.toLocaleString()}`);
    }
    lines.push("");

    lines.push("| Column | Type | Nullable | PK | Unique | Default |");
    lines.push("|--------|------|----------|----|--------|---------|");
    for (const col of table.columns) {
      lines.push(
        `| ${col.name} | ${col.type} | ${col.nullable ? "YES" : "NO"} | ${col.is_pk ? "✓" : ""} | ${col.is_unique ? "✓" : ""} | ${col.default_value ?? ""} |`
      );
    }
    lines.push("");

    const tFks = foreignKeys.filter((fk) => fk.source_table === table.name);
    if (tFks.length) {
      lines.push("**Foreign Keys:**");
      for (const fk of tFks) {
        lines.push(`- \`${fk.source_column}\` → \`${fk.target_table}.${fk.target_column}\``);
      }
      lines.push("");
    }

    const tIdxs = indexes.filter((i) => i.table === table.name);
    if (tIdxs.length) {
      lines.push("**Indexes:**");
      for (const idx of tIdxs) {
        lines.push(`- \`${idx.name}\` on ${idx.columns.join(", ")}${idx.unique ? " (UNIQUE)" : ""} (${idx.index_type})`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Schema parsing helpers
// ---------------------------------------------------------------------------

function parseSchemaTables(schemaText: string): Record<string, string[]> {
  const tables: Record<string, string[]> = {};
  let currentTable: string | null = null;

  for (const line of schemaText.split("\n")) {
    if (line.startsWith("Table: ")) {
      currentTable = line.slice(7).trim().toLowerCase();
      tables[currentTable] = [];
    } else if (
      line.startsWith("  ") &&
      currentTable !== null &&
      line.trim() &&
      !line.trim().toLowerCase().startsWith("columns")
    ) {
      const colName = line.trim().split(/\s+/)[0]?.toLowerCase();
      if (colName) {
        tables[currentTable].push(colName);
      }
    }
  }

  return tables;
}

export function validateIntentAgainstSchema(
  intent: QueryIntent,
  schemaText: string
): { isValid: boolean; message: string } {
  if (!intent.table) {
    return { isValid: true, message: "" };
  }

  const tables = parseSchemaTables(schemaText);
  const availableTables = Object.keys(tables).sort();
  const tableKey = intent.table.toLowerCase();

  if (!tables[tableKey]) {
    const tableList = availableTables.length
      ? availableTables.map((t) => `\`${t}\``).join(", ")
      : "none found";
    return {
      isValid: false,
      message:
        `Need more reference. The table \`${intent.table}\` was not found in the schema. ` +
        `Available tables: ${tableList}. ` +
        `Please confirm the table name or provide the schema.`,
    };
  }

  if (intent.attributes && intent.attributes.length > 0) {
    const knownCols = tables[tableKey];
    const missing = intent.attributes.filter(
      (a) => !knownCols.includes(a.toLowerCase())
    );
    if (missing.length > 0) {
      const colList = knownCols.length ? knownCols.map((c) => `\`${c}\``).join(", ") : "none";
      const missingFmt = missing.map((m) => `\`${m}\``).join(", ");
      return {
        isValid: false,
        message:
          `Need more reference. Column(s) ${missingFmt} were not found in \`${intent.table}\`. ` +
          `Available columns: ${colList}. ` +
          `Please confirm the column names or provide the full table schema.`,
      };
    }
  }

  return { isValid: true, message: "" };
}
