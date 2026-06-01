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
    """Return the role row for role_name, defaulting to 'viewer' (least privilege)."""
    rows = sb.table("roles").select("id, name").eq("name", role_name).execute()
    if rows.data:
        return rows.data[0]
    fallback = sb.table("roles").select("id, name").eq("name", "viewer").execute()
    return fallback.data[0]


def _get_app_user(sb, supabase_uid: str) -> dict:
    """Return user row (with role_name injected) using the service-role client."""
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
# Routes
# ---------------------------------------------------------------------------

@router.post("/register", response_model=schemas.TokenResponse)
def register(payload: schemas.RegisterRequest):
    sb = get_supabase()        # service-role — DB operations only

    # Guard: duplicate email
    existing = sb.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create Supabase Auth user via admin API (does NOT mutate sb auth state)
    try:
        auth_resp = sb.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
        })
    except AuthApiError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    supabase_uid = str(auth_resp.user.id)
    role = _resolve_role(sb, payload.role)

    # Insert app user row — DB trigger provisions role profile + chart_preferences
    try:
        row = sb.table("users").insert({
            "supabase_uid": supabase_uid,
            "full_name": payload.full_name,
            "email": payload.email,
            "role_id": role["id"],
        }).execute()
        user = row.data[0]
    except Exception as exc:
        try:
            sb.auth.admin.delete_user(supabase_uid)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Profile creation failed: {exc}")

    # Sign in using a FRESH anon client so service-role client auth state is untouched
    try:
        auth_client = get_auth_client()
        sign_in = auth_client.auth.sign_in_with_password({
            "email": payload.email,
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


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest):
    sb = get_supabase()           # service-role — DB operations
    auth_client = get_auth_client()  # anon — sign-in only

    try:
        auth_resp = auth_client.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = _get_app_user(sb, str(auth_resp.user.id))

    return schemas.TokenResponse(
        access_token=auth_resp.session.access_token,
        user_id=user["id"],
        full_name=user["full_name"],
        email=user["email"],
        role=user["role_name"],
    )


@router.post("/token")
def token_form(form: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 form endpoint (username = email)."""
    sb = get_supabase()
    auth_client = get_auth_client()
    try:
        auth_resp = auth_client.auth.sign_in_with_password({
            "email": form.username,
            "password": form.password,
        })
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _get_app_user(sb, str(auth_resp.user.id))
    return {"access_token": auth_resp.session.access_token, "token_type": "bearer"}


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
