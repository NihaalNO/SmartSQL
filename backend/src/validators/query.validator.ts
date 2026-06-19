import { z } from "zod";

export const queryRequestSchema = z.object({
  question: z.string().min(1, "question is required"),
  dataset_id: z.number().optional(),
  model_provider: z.string().optional(),
  model_name: z.string().optional(),
  include_insight: z.boolean().optional().default(true),
});

export const liveQueryRequestSchema = z.object({
  question: z.string().min(1, "question is required"),
  db_host: z.string().min(1, "db_host is required"),
  db_port: z.number().int().min(1).max(65535).optional().default(5432),
  db_name: z.string().min(1, "db_name is required"),
  db_user: z.string().min(1, "db_user is required"),
  db_password: z.string().min(1, "db_password is required"),
  model_provider: z.string().optional(),
  model_name: z.string().optional(),
  include_insight: z.boolean().optional().default(true),
  ssl_required: z.boolean().optional().default(true),
});

export const saveQuerySchema = z.object({
  log_id: z.number().int().positive("log_id must be a positive integer"),
  title: z.string().min(1, "title is required"),
  chart_type: z.string().optional(),
  is_favorite: z.boolean().optional().default(false),
});

export const testConnectionSchema = z.object({
  db_host: z.string().min(1, "db_host is required"),
  db_port: z.number().int().min(1).max(65535).optional().default(5432),
  db_name: z.string().min(1, "db_name is required"),
  db_user: z.string().min(1, "db_user is required"),
  db_password: z.string().min(1, "db_password is required"),
  ssl_required: z.boolean().optional().default(true),
});

export const feedbackSchema = z.object({
  log_id: z.number().int().positive("log_id must be a positive integer"),
  rating: z.number().int().min(1).max(5),
  comments: z.string().optional(),
});
