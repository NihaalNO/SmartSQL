import { z } from "zod";

export const dbTypeSchema = z.enum([
  "postgres",
  "mysql",
  "mariadb",
  "sqlserver",
  "oracle",
  "sqlite",
  "snowflake",
  "bigquery",
  "redshift",
  "clickhouse",
  "duckdb",
]);

export const liveDbBaseSchema = z.object({
  dbType: dbTypeSchema,
  config: z.record(z.unknown()),
});

export const liveDbTestSchema = liveDbBaseSchema;

export const liveDbQuerySchema = liveDbBaseSchema.extend({
  question: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  model_provider: z.string().optional(),
  model_name: z.string().optional(),
  include_insight: z.boolean().optional().default(true),
}).refine((data) => Boolean(data.question || data.query), {
  message: "query or question is required",
});

export const liveDbSampleRowsSchema = liveDbBaseSchema.extend({
  tableName: z.string().min(1),
});
