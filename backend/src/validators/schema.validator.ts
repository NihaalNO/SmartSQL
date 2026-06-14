import { z } from "zod";

// Schema routes do not have request bodies — validate query params only
export const userStatusUpdateSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const userRoleUpdateSchema = z.object({
  role_name: z.enum(["analyst", "viewer"]),
});
