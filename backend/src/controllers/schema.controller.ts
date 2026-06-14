import { Request, Response } from "express";
import { getSupabase } from "../config/supabase";
import { getInternalSchema, getSchemaAsDict } from "../services/schema.service";

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
