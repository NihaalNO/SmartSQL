from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "analyst"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
