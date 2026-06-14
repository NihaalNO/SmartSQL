/**
 * Application-wide constants preserving domain-specific values
 * from the original Python backend.
 */

export const ALLOWED_USER_STATUS = ["active", "inactive"] as const;
export type UserStatus = (typeof ALLOWED_USER_STATUS)[number];

export const ALLOWED_ROLES = ["admin", "analyst", "viewer"] as const;
export type UserRole = (typeof ALLOWED_ROLES)[number];

export const ALLOWED_DATASET_SOURCE_TYPES = ["internal_pg", "supabase_live"] as const;
export type DatasetSourceType = (typeof ALLOWED_DATASET_SOURCE_TYPES)[number];

export const ALLOWED_QUERY_MODES = ["internal", "live_supabase"] as const;
export type QueryMode = (typeof ALLOWED_QUERY_MODES)[number];

export const ALLOWED_EXECUTION_STATUS = ["success", "failed", "blocked"] as const;
export type ExecutionStatus = (typeof ALLOWED_EXECUTION_STATUS)[number];

export const ALLOWED_LIVE_DB_PROVIDERS = ["supabase"] as const;
export type LiveDbProvider = (typeof ALLOWED_LIVE_DB_PROVIDERS)[number];

export const JWT_ALGORITHM = "HS256" as const;
export const ADMIN_TOKEN_EXPIRE_HOURS = 8 as const;
