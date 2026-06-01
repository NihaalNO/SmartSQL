from fastapi import APIRouter, Depends

from app.auth.utils import CurrentUser, get_current_user
from app.supabase_client import get_supabase
from app.schema_service import service

router = APIRouter(prefix="/api/schema", tags=["schema"])


@router.get("/internal")
def internal_schema(_: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    return {"schema": service.get_internal_schema(sb)}


@router.get("/internal/tables")
def internal_tables(_: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    return {"tables": service.get_schema_as_dict(sb)}
