import { Request, Response } from "express";
import { getSupabase } from "../config/supabase";
import { getInternalSchema, getSchemaAsDict, getRichInternalSchema, getRichExternalSchema, getExternalSchemaRich } from "../services/schema.service";
import { generateSchemaSummary, generateSchemaDocumentation } from "../services/ai.service";

export async function internalSchema(_req: Request, res: Response): Promise<void> {
  const sb = getSupabase();
  const schema = await getInternalSchema(sb);
  res.json({ schema });
}

export async function internalTables(_req: Request, res: Response): Promise<void> {
  const sb = getSupabase();
  const tables = await getSchemaAsDict(sb);
  res.json({ tables });
}

export async function internalVisualize(_req: Request, res: Response): Promise<void> {
  const sb = getSupabase();
  const visualization = await getRichInternalSchema(sb);
  res.json({ visualization });
}

export async function externalVisualize(req: Request, res: Response): Promise<void> {
  const { db_host, db_port, db_name, db_user, db_password, ssl_required } = req.body;
  const connectionString = `postgresql://${encodeURIComponent(db_user)}:${encodeURIComponent(db_password)}@${db_host}:${db_port}/${encodeURIComponent(db_name)}`;
  const visualization = await getRichExternalSchema(connectionString, ssl_required);
  res.json({ visualization });
}

export async function analyzeExternalSchema(req: Request, res: Response): Promise<void> {
  const { db_host, db_port, db_name, db_user, db_password, ssl_required, model_provider, model_name } = req.body;
  const connectionString = `postgresql://${encodeURIComponent(db_user)}:${encodeURIComponent(db_password)}@${db_host}:${db_port}/${encodeURIComponent(db_name)}`;

  const visualization = await getExternalSchemaRich(connectionString, ssl_required);

  const schemaJson = JSON.stringify({
    tables: visualization.tables.map((t) => ({
      name: t.name,
      type: t.type,
      columns: t.columns.map((c) => ({
        name: c.name,
        type: c.type,
        nullable: c.nullable,
        is_pk: c.is_pk,
        is_unique: c.is_unique,
        default_value: c.default_value,
      })),
      row_estimate: t.row_estimate,
    })),
    foreign_keys: visualization.foreign_keys,
    indexes: visualization.indexes,
  });

  const summary = await generateSchemaSummary(schemaJson, model_provider, model_name);
  const documentation = generateSchemaDocumentation(
    visualization.tables,
    visualization.foreign_keys,
    visualization.indexes,
    {
      purpose: summary.purpose,
      core_entities: summary.core_entities,
      primary_workflow: summary.primary_workflow,
    }
  );

  res.json({
    visualization,
    analysis: summary,
    documentation: {
      markdown: documentation,
      generated_at: new Date().toISOString(),
      table_count: visualization.tables.length,
      relationship_count: visualization.foreign_keys.length,
      index_count: visualization.indexes.length,
    },
  });
}
