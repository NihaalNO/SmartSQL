import { z } from "zod";

export const registerSchema = z.object({
  full_name: z.string().min(1, "full_name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["analyst", "viewer"]).default("viewer"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = z.object({
  admin_name: z.string().min(1, "admin_name is required"),
  admin_code: z.string().min(1, "admin_code is required"),
});

export const tokenFormSchema = z.object({
  username: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
