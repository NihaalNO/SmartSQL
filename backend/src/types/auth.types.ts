/**
 * Auth request/response types mirroring the original Python Pydantic schemas.
 */

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  full_name: string;
  email: string;
  email_verified: boolean;
  created_at?: string | Date;
  updated_at?: string | Date | null;
  avatar_url?: string | null;
}

export interface UserOut {
  id: number;
  full_name: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: string | Date;
  updated_at?: string | Date | null;
  avatar_url?: string | null;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
