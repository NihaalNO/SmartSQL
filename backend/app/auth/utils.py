from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.supabase_client import get_supabase, get_auth_client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


# ---------------------------------------------------------------------------
# Lightweight user object returned by get_current_user.
# Mirrors the attributes used by all route handlers so no route code changes.
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
# Token helpers
# ---------------------------------------------------------------------------

def verify_supabase_token(token: str) -> str:
    """
    Validate the bearer token against Supabase Auth and return the user's UUID.
    Uses a fresh anon client so the cached service-role client's auth state
    is never contaminated by this call.  Handles ES256, HS256, and any
    future algorithm transparently — no local JWT secret needed.
    """
    try:
        auth_client = get_auth_client()   # fresh instance per call, anon key
        resp = auth_client.auth.get_user(token)
        if not resp or not resp.user:
            raise ValueError("no user in response")
        return str(resp.user.id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """Resolve the current user via the Supabase Auth + REST APIs."""
    supabase_uid = verify_supabase_token(token)
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

    # Fetch role name separately — avoids flaky PostgREST embedded join
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
