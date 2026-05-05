import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app import models
from app.auth.utils import get_current_user
from app.queries import schemas
from app.queries.sql_validator import validate_sql
from app.queries.sql_executor import execute_sql, execute_sql_on_external
from app.schema_service.service import get_internal_schema, get_external_schema
from app.ai.langchain_agent import generate_sql, generate_insight

router = APIRouter(prefix="/api/queries", tags=["queries"])


def _log_query(
    db: Session,
    user_id: int,
    question: str,
    sql: str,
    result: dict,
    mode: str,
    provider: str | None,
    dataset_id: int | None = None,
) -> int:
    status = "blocked" if result.get("error") and not sql else (
        "failed" if result.get("error") else "success"
    )
    log = models.QueryLog(
        user_id=user_id,
        dataset_id=dataset_id,
        query_mode=mode,
        natural_language_query=question,
        generated_sql=sql,
        execution_status=status,
        error_message=result.get("error"),
        execution_time_ms=result.get("execution_time_ms"),
        row_count=result.get("row_count"),
        model_provider=provider,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log.id


@router.post("/run", response_model=schemas.QueryResult)
def run_query(
    payload: schemas.QueryRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    provider = payload.model_provider
    schema_text = get_internal_schema(db)

    try:
        sql = generate_sql(schema_text, payload.question, provider, payload.model_name)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {exc}")

    is_safe, reason = validate_sql(sql)
    if not is_safe:
        log_id = _log_query(db, current_user.id, payload.question, sql, {"error": reason, "row_count": 0, "execution_time_ms": 0}, "internal", provider, payload.dataset_id)
        return schemas.QueryResult(
            natural_language_query=payload.question,
            generated_sql=sql,
            columns=[], rows=[], row_count=0, execution_time_ms=0,
            log_id=log_id, status="blocked", error=reason,
        )

    result = execute_sql(db, sql)
    log_id = _log_query(db, current_user.id, payload.question, sql, result, "internal", provider, payload.dataset_id)

    insight = None
    if payload.include_insight and result["rows"] and not result["error"]:
        preview = json.dumps(result["rows"][:20], default=str)
        insight = generate_insight(payload.question, preview, provider, payload.model_name)

    return schemas.QueryResult(
        natural_language_query=payload.question,
        generated_sql=sql,
        columns=result["columns"],
        rows=result["rows"],
        row_count=result["row_count"],
        execution_time_ms=result["execution_time_ms"],
        log_id=log_id,
        insight=insight,
        error=result.get("error"),
        status="failed" if result.get("error") else "success",
    )


@router.post("/run-live", response_model=schemas.QueryResult)
def run_live_query(
    payload: schemas.LiveQueryRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Build ephemeral connection string - password never stored
    conn_str = (
        f"postgresql+psycopg2://{payload.db_user}:{payload.db_password}"
        f"@{payload.db_host}:{payload.db_port}/{payload.db_name}"
    )

    schema_text = get_external_schema(conn_str)
    provider = payload.model_provider

    try:
        sql = generate_sql(schema_text, payload.question, provider, payload.model_name)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {exc}")

    is_safe, reason = validate_sql(sql)
    if not is_safe:
        log_id = _log_query(db, current_user.id, payload.question, sql, {"error": reason, "row_count": 0, "execution_time_ms": 0}, "live_supabase", provider)
        return schemas.QueryResult(
            natural_language_query=payload.question,
            generated_sql=sql,
            columns=[], rows=[], row_count=0, execution_time_ms=0,
            log_id=log_id, status="blocked", error=reason,
        )

    result = execute_sql_on_external(conn_str, sql)
    log_id = _log_query(db, current_user.id, payload.question, sql, result, "live_supabase", provider)

    insight = None
    if result["rows"] and not result["error"]:
        preview = json.dumps(result["rows"][:20], default=str)
        insight = generate_insight(payload.question, preview, provider, payload.model_name)

    return schemas.QueryResult(
        natural_language_query=payload.question,
        generated_sql=sql,
        columns=result["columns"],
        rows=result["rows"],
        row_count=result["row_count"],
        execution_time_ms=result["execution_time_ms"],
        log_id=log_id,
        insight=insight,
        error=result.get("error"),
        status="failed" if result.get("error") else "success",
    )


@router.post("/save")
def save_query(
    payload: schemas.SaveQueryRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(models.QueryLog).filter(
        models.QueryLog.id == payload.log_id,
        models.QueryLog.user_id == current_user.id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Query log not found")

    saved = models.SavedQuery(
        user_id=current_user.id,
        dataset_id=log.dataset_id,
        title=payload.title,
        natural_language_query=log.natural_language_query,
        generated_sql=log.generated_sql or "",
        chart_type=payload.chart_type,
        is_favorite=payload.is_favorite,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return {"id": saved.id, "message": "Query saved"}


@router.get("/saved", response_model=list[schemas.SavedQueryOut])
def list_saved(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.SavedQuery).filter(
        models.SavedQuery.user_id == current_user.id
    ).order_by(models.SavedQuery.created_at.desc()).all()


@router.delete("/saved/{saved_id}")
def delete_saved(
    saved_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    saved = db.query(models.SavedQuery).filter(
        models.SavedQuery.id == saved_id,
        models.SavedQuery.user_id == current_user.id,
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(saved)
    db.commit()
    return {"message": "Deleted"}


@router.get("/history", response_model=list[schemas.QueryLogOut])
def query_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.QueryLog).filter(
        models.QueryLog.user_id == current_user.id
    ).order_by(models.QueryLog.created_at.desc()).limit(limit).all()


@router.post("/feedback")
def submit_feedback(
    payload: schemas.FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(models.QueryLog).filter(models.QueryLog.id == payload.log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Query log not found")

    fb = models.Feedback(
        query_log_id=payload.log_id,
        user_id=current_user.id,
        rating=payload.rating,
        comments=payload.comments,
    )
    db.add(fb)
    db.commit()
    return {"message": "Feedback submitted"}
