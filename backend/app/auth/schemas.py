from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "viewer"

    @field_validator("role")
    @classmethod
    def block_admin_role(cls, v: str) -> str:
        if v.lower() == "admin":
            raise ValueError("Admin accounts cannot be created through public registration.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginRequest(BaseModel):
    admin_name: str
    admin_code: str



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    email: str
    role: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
