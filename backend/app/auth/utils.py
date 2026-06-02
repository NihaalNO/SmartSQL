from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt as _bcrypt
from jose import JWTError, jwt

from app.config import get_settings
from app.supabase_client import get_supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

settings = get_settings()

# ---------------------------------------------------------------------------
# Admin code hashing — uses bcrypt directly (passlib has Python 3.13 issues)
# ---------------------------------------------------------------------------

def hash_admin_code(code: str) -> str:
    return _bcrypt.hashpw(code.encode(), _bcrypt.gensalt(12)).decode()


def verify_admin_code(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

ALGORITHM = "HS256"
ADMIN_TOKEN_EXPIRE_HOURS = 8


def create_admin_token(supabase_uid: str) -> str:
    """Issue a custom JWT for an admin. Signed with SUPABASE_JWT_SECRET."""
    now = datetime.now(timezone.utc)
    claims = {
        "sub":      supabase_uid,
        "role":     "authenticated",
        "is_admin": True,
        "iat":      now,
        "exp":      now + timedelta(hours=ADMIN_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(claims, settings.SUPABASE_JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Verify and decode any bearer token — both Supabase-issued session tokens
    and custom admin JWTs share the same HS256 / SUPABASE_JWT_SECRET signing key.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ---------------------------------------------------------------------------
# User dataclass
# ---------------------------------------------------------------------------

@dataclass
class _Role:
    name: str


@dataclass
class CurrentUser:
    id: int
    supabase_uid: str
    full_name: str
    email: str
    status: str
    created_at: Any
    role: _Role


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    payload = decode_token(token)

    supabase_uid = payload.get("sub")
    if not supabase_uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    sb = get_supabase()
    try:
        user_res = (
            sb.table("users")
            .select("id, supabase_uid, full_name, email, status, created_at, role_id")
            .eq("supabase_uid", supabase_uid)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=401, detail="User not found")

    if not user_res.data:
        raise HTTPException(status_code=401, detail="User not found")

    data = user_res.data[0]
    if data["status"] != "active":
        raise HTTPException(status_code=401, detail="Account is inactive")

    role_res = sb.table("roles").select("name").eq("id", data["role_id"]).execute()
    role_name = role_res.data[0]["name"] if role_res.data else "viewer"

    return CurrentUser(
        id=data["id"],
        supabase_uid=data["supabase_uid"],
        full_name=data["full_name"],
        email=data["email"],
        status=data["status"],
        created_at=data["created_at"],
        role=_Role(name=role_name),
    )


def require_role(*roles: str):
    def dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role.name not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return dependency
