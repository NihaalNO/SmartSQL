import { z } from "zod";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .optional()
    .default("8000")
    .transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_JWT_SECRET: z.string().min(1, "SUPABASE_JWT_SECRET is required"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // AI
  GROQ_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  OLLAMA_URL: z.string().url().optional().default("http://localhost:11434"),
  DEFAULT_MODEL_PROVIDER: z.string().optional().default("groq"),
  DEFAULT_MODEL_NAME: z
    .string()
    .optional()
    .default("llama-3.3-70b-versatile"),

  // CORS
  FRONTEND_URL: z.string().url().optional().default("http://localhost:3000"),

  // Email Verification & Password Reset
  SENDGRID_API_KEY: z.string().min(1, "SENDGRID_API_KEY is required"),
  SENDGRID_FROM_EMAIL: z.string().email("SENDGRID_FROM_EMAIL must be a valid email"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  EMAIL_VERIFICATION_SECRET: z.string().min(1, "EMAIL_VERIFICATION_SECRET is required"),
  PASSWORD_RESET_SECRET: z.string().min(1, "PASSWORD_RESET_SECRET is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment validation failed:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
