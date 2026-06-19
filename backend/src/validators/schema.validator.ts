import { z } from "zod";

// Schema routes do not have request bodies — validate query params only
export const userStatusUpdateSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const userRoleUpdateSchema = z.object({
  role_name: z.enum(["analyst", "viewer"]),
});

export const externalVisualizeSchema = z.object({
  db_host: z.string().min(1, "db_host is required"),
  db_port: z.number().int().min(1).max(65535).optional().default(5432),
  db_name: z.string().min(1, "db_name is required"),
  db_user: z.string().min(1, "db_user is required"),
  db_password: z.string().min(1, "db_password is required"),
  ssl_required: z.boolean().optional().default(true),
});
