"""
Admin-only API routes — mounted at /api/admin.
Every endpoint requires the admin role. These routes are not linked
anywhere in the public frontend; they serve the hidden /moderator panel.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.auth.utils import CurrentUser, require_role
from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/admin", tags=["admin"])

_admin = Depends(require_role("admin"))


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UserStatusUpdate(BaseModel):
    status: str   # "active" | "inactive"


class UserRoleUpdate(BaseModel):
    role_name: str  # "analyst" | "viewer"


# ---------------------------------------------------------------------------
# Platform stats
# ---------------------------------------------------------------------------

@router.get("/stats")
def platform_stats(_: CurrentUser = _admin):
    sb = get_supabase()

    users      = sb.table("users").select("id, status").execute()
    all_users  = users.data or []
    total      = len(all_users)
    active     = sum(1 for u in all_users if u["status"] == "active")

    logs       = sb.table("query_logs").select("id, execution_status").execute()
    all_logs   = logs.data or []
    total_q    = len(all_logs)
    success_q  = sum(1 for l in all_logs if l["execution_status"] == "success")
    success_rate = round((success_q / total_q * 100), 1) if total_q else 0.0

    saved      = sb.table("saved_queries").select("id").execute()

    return {
        "total_users":    total,
        "active_users":   active,
        "inactive_users": total - active,
        "total_queries":  total_q,
        "success_queries": success_q,
        "success_rate":   success_rate,
        "saved_queries":  len(saved.data or []),
    }


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users")
def list_users(_: CurrentUser = _admin):
    sb = get_supabase()
    rows = (
        sb.table("users")
        .select("id, full_name, email, status, role_id, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    users = rows.data or []

    # Attach role names
    roles_res = sb.table("roles").select("id, name").execute()
    role_map  = {r["id"]: r["name"] for r in (roles_res.data or [])}

    for u in users:
        u["role"] = role_map.get(u.pop("role_id"), "viewer")

    return users


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    if payload.status not in ("active", "inactive"):
        raise HTTPException(status_code=400, detail="status must be 'active' or 'inactive'")

    sb  = get_supabase()
    res = sb.table("users").select("id").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")

    sb.table("users").update({"status": payload.status}).eq("id", user_id).execute()
    return {"message": f"User {user_id} set to {payload.status}"}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    allowed = ("analyst", "viewer")
    if payload.role_name not in allowed:
        raise HTTPException(status_code=400, detail=f"role_name must be one of {allowed}")

    sb       = get_supabase()
    role_res = sb.table("roles").select("id").eq("name", payload.role_name).execute()
    if not role_res.data:
        raise HTTPException(status_code=400, detail="Role not found")

    role_id = role_res.data[0]["id"]
    sb.table("users").update({"role_id": role_id}).eq("id", user_id).execute()
    return {"message": f"User {user_id} role updated to {payload.role_name}"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    sb  = get_supabase()
    res = sb.table("users").select("id, supabase_uid").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")

    supabase_uid = res.data[0]["supabase_uid"]

    sb.table("users").delete().eq("id", user_id).execute()
    try:
        sb.auth.admin.delete_user(supabase_uid)
    except Exception:
        pass   # best-effort; user row is already removed

    return {"message": f"User {user_id} deleted"}


# ---------------------------------------------------------------------------
# Query logs (all users)
# ---------------------------------------------------------------------------

@router.get("/logs")
def all_query_logs(limit: int = 100, _: CurrentUser = _admin):
    sb = get_supabase()
    rows = (
        sb.table("query_logs")
        .select("id, user_id, natural_language_query, execution_status, execution_time_ms, row_count, model_provider, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    logs = rows.data or []

    # Attach user emails
    if logs:
        user_ids  = list({l["user_id"] for l in logs})
        users_res = sb.table("users").select("id, email, full_name").in_("id", user_ids).execute()
        user_map  = {u["id"]: u for u in (users_res.data or [])}
        for l in logs:
            u = user_map.get(l["user_id"], {})
            l["user_email"]     = u.get("email", "—")
            l["user_full_name"] = u.get("full_name", "—")

    return logs
