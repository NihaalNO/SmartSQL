/**
 * Auth request/response types mirroring the original Python Pydantic schemas.
 */

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  email_verified: boolean;
}

export interface UserOut {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  email_verified: boolean;
  created_at: string | Date;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginRequest {
  admin_name: string;
  admin_code: string;
}
