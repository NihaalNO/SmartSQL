from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from gotrue.errors import AuthApiError

from app.auth import schemas, utils
from app.auth.utils import CurrentUser, get_current_user
from app.supabase_client import get_supabase, get_auth_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_role(sb, role_name: str) -> dict:
    rows = sb.table("roles").select("id, name").eq("name", role_name).execute()
    if rows.data:
        return rows.data[0]
    fallback = sb.table("roles").select("id, name").eq("name", "viewer").execute()
    return fallback.data[0]


def _get_app_user(sb, supabase_uid: str) -> dict:
    result = (
        sb.table("users")
        .select("id, full_name, email, status, role_id")
        .eq("supabase_uid", supabase_uid)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="User profile not found")
    user = result.data[0]
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="Account inactive")
    role_res = sb.table("roles").select("name").eq("id", user["role_id"]).execute()
    user["role_name"] = role_res.data[0]["name"] if role_res.data else "viewer"
    return user


# ---------------------------------------------------------------------------
# Public registration — admin role is blocked at schema level
# ---------------------------------------------------------------------------

@router.post("/register", response_model=schemas.TokenResponse)
def register(payload: schemas.RegisterRequest):
    sb = get_supabase()

    existing = sb.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        auth_resp = sb.auth.admin.create_user({
            "email":         payload.email,
            "password":      payload.password,
            "email_confirm": True,
        })
    except AuthApiError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    supabase_uid = str(auth_resp.user.id)
    role = _resolve_role(sb, payload.role)

    try:
        row = sb.table("users").insert({
            "supabase_uid": supabase_uid,
            "full_name":    payload.full_name,
            "email":        payload.email,
            "role_id":      role["id"],
        }).execute()
        user = row.data[0]
    except Exception as exc:
        try:
            sb.auth.admin.delete_user(supabase_uid)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Profile creation failed: {exc}")

    try:
        auth_client = get_auth_client()
        sign_in = auth_client.auth.sign_in_with_password({
            "email":    payload.email,
            "password": payload.password,
        })
        token = sign_in.session.access_token
    except AuthApiError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return schemas.TokenResponse(
        access_token=token,
        user_id=user["id"],
        full_name=user["full_name"],
        email=user["email"],
        role=role["name"],
    )


# ---------------------------------------------------------------------------
# Standard login — blocks admin accounts
# ---------------------------------------------------------------------------

@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest):
    sb          = get_supabase()
    auth_client = get_auth_client()

    try:
        auth_resp = auth_client.auth.sign_in_with_password({
            "email":    payload.email,
            "password": payload.password,
        })
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = _get_app_user(sb, str(auth_resp.user.id))

    if user["role_name"] == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts must sign in via the admin panel.",
        )

    return schemas.TokenResponse(
        access_token=auth_resp.session.access_token,
        user_id=user["id"],
        full_name=user["full_name"],
        email=user["email"],
        role=user["role_name"],
    )


# ---------------------------------------------------------------------------
# Admin login — fetches credentials from admin_credentials table
# ---------------------------------------------------------------------------

@router.post("/admin-login", response_model=schemas.TokenResponse)
def admin_login(payload: schemas.AdminLoginRequest):
    """
    Authenticate an admin using an admin_name and admin_code.
    Credentials are stored in the admin_credentials database table —
    no values are hardcoded in configuration files.
    """
    sb = get_supabase()

    rows = (
        sb.table("admin_credentials")
        .select("code_hash, user_id")
        .eq("admin_name", payload.admin_name)
        .execute()
    )
    if not rows.data:
        # Return the same error whether name or code is wrong (prevents enumeration)
        raise HTTPException(status_code=401, detail="Invalid admin name or code")

    account = rows.data[0]

    if not utils.verify_admin_code(payload.admin_code, account["code_hash"]):
        raise HTTPException(status_code=401, detail="Invalid admin name or code")

    user_rows = (
        sb.table("users")
        .select("id, supabase_uid, full_name, email, status")
        .eq("id", account["user_id"])
        .execute()
    )
    if not user_rows.data:
        raise HTTPException(status_code=401, detail="Admin user profile not found")

    user = user_rows.data[0]
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="Admin account is inactive")

    token = utils.create_admin_token(user["supabase_uid"])

    return schemas.TokenResponse(
        access_token=token,
        user_id=user["id"],
        full_name=user["full_name"],
        email=user["email"],
        role="admin",
    )


# ---------------------------------------------------------------------------
# OAuth2 form endpoint
# ---------------------------------------------------------------------------

@router.post("/token")
def token_form(form: OAuth2PasswordRequestForm = Depends()):
    sb          = get_supabase()
    auth_client = get_auth_client()
    try:
        auth_resp = auth_client.auth.sign_in_with_password({
            "email":    form.username,
            "password": form.password,
        })
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = _get_app_user(sb, str(auth_resp.user.id))
    if user["role_name"] == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts must use the admin panel")

    return {"access_token": auth_resp.session.access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------

@router.get("/me", response_model=schemas.UserOut)
def me(current_user: CurrentUser = Depends(get_current_user)):
    return schemas.UserOut(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role.name,
        status=current_user.status,
        created_at=current_user.created_at,
    )
