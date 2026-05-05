from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.auth.utils import get_current_user
from app import models
from app.schema_service import service

router = APIRouter(prefix="/api/schema", tags=["schema"])


@router.get("/internal")
def internal_schema(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return {"schema": service.get_internal_schema(db)}


@router.get("/internal/tables")
def internal_tables(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return {"tables": service.get_schema_as_dict(db)}
