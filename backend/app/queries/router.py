import json
from urllib.parse import quote_plus
from fastapi import APIRouter, Depends, HTTPException

from app.auth.utils import CurrentUser, get_current_user, require_role
from app.supabase_client import get_supabase
from app.queries import schemas
from app.queries.sql_validator import validate_sql
from app.queries.sql_executor import execute_sql, execute_sql_on_external
from app.schema_service.service import get_internal_schema, get_external_schema
from app.ai.langchain_agent import (
    generate_sql, generate_insight, extract_intent,
    CannotAnswerError,
)

router = APIRouter(prefix="/api/queries", tags=["queries"])


# ---------------------------------------------------------------------------
# Internal helper — write a query_logs row via Supabase REST
# ---------------------------------------------------------------------------

def _log_query(
    sb,
    user_id: int,
    question: str,
    sql: str,
    result: dict,
    mode: str,
    provider: str | None,
    dataset_id: int | None = None,
) -> int:
    exec_status = (
        "blocked" if result.get("error") and not sql
        else "failed" if result.get("error")
        else "success"
    )
    row = sb.table("query_logs").insert({
        "user_id": user_id,
        "dataset_id": dataset_id,
        "query_mode": mode,
        "natural_language_query": question,
        "generated_sql": sql,
        "execution_status": exec_status,
        "error_message": result.get("error"),
        "execution_time_ms": result.get("execution_time_ms"),
        "row_count": result.get("row_count"),
        "model_provider": provider,
    }).execute()
    return row.data[0]["id"]


def _intent_schema(intent) -> schemas.QueryIntent | None:
    if intent is None:
        return None
    return schemas.QueryIntent(
        query_type=intent.query_type,
        table=intent.table,
        action=intent.action,
        attributes=intent.attributes,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/run", response_model=schemas.QueryResult)
def run_query(
    payload: schemas.QueryRequest,
    current_user: CurrentUser = Depends(require_role("admin", "analyst", "viewer")),
):
    sb = get_supabase()
    provider = payload.model_provider
    schema_text = get_internal_schema(sb)

    # Step 1 — extract intent
    intent = None
    try:
        intent = extract_intent(payload.question, provider, payload.model_name)
    except Exception:
        pass  # intent extraction failure is non-fatal; proceed to SQL generation

    # Step 2 — generate SQL
    try:
        sql = generate_sql(schema_text, payload.question, provider, payload.model_name)
    except CannotAnswerError as exc:
        log_id = _log_query(
            sb, current_user.id, payload.question, "",
            {"error": str(exc), "row_count": 0, "execution_time_ms": 0},
            "internal", provider, payload.dataset_id,
        )
        return schemas.QueryResult(
            natural_language_query=payload.question, generated_sql="",
            columns=[], rows=[], row_count=0, execution_time_ms=0,
            log_id=log_id, status="blocked", error=str(exc),
            intent=_intent_schema(intent),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {exc}")

    # Step 4 — validate SQL safety
    is_safe, reason = validate_sql(sql)
    if not is_safe:
        log_id = _log_query(
            sb, current_user.id, payload.question, sql,
            {"error": reason, "row_count": 0, "execution_time_ms": 0},
            "internal", provider, payload.dataset_id,
        )
        return schemas.QueryResult(
            natural_language_query=payload.question, generated_sql=sql,
            columns=[], rows=[], row_count=0, execution_time_ms=0,
            log_id=log_id, status="blocked", error=reason,
            intent=_intent_schema(intent),
        )

    # Step 5 — execute
    result = execute_sql(sb, sql)
    log_id = _log_query(sb, current_user.id, payload.question, sql, result,
                        "internal", provider, payload.dataset_id)

    # 42P01 = table does not exist — the SQL is a valid general template but
    # references tables outside the connected schema; return it without error styling.
    if result.get("error_code") == "42P01":
        return schemas.QueryResult(
            natural_language_query=payload.question, generated_sql=sql,
            columns=[], rows=[], row_count=0,
            execution_time_ms=result["execution_time_ms"],
            log_id=log_id,
            status="template",
            error=None,
            intent=_intent_schema(intent),
        )

    insight = None
    if payload.include_insight and result["rows"] and not result["error"]:
        preview = json.dumps(result["rows"][:20], default=str)
        insight = generate_insight(payload.question, preview, provider, payload.model_name)

    return schemas.QueryResult(
        natural_language_query=payload.question, generated_sql=sql,
        columns=result["columns"], rows=result["rows"],
        row_count=result["row_count"], execution_time_ms=result["execution_time_ms"],
        log_id=log_id, insight=insight,
        error=result.get("error"),
        status="failed" if result.get("error") else "success",
        intent=_intent_schema(intent),
    )


@router.post("/run-live", response_model=schemas.QueryResult)
def run_live_query(
    payload: schemas.LiveQueryRequest,
    current_user: CurrentUser = Depends(require_role("admin", "analyst")),
):
    sb = get_supabase()

    # URL-encode user + password so special chars (@, :, #, +, etc.) don't break the URI
    conn_str = (
        f"postgresql+psycopg2://{quote_plus(payload.db_user)}:{quote_plus(payload.db_password)}"
        f"@{payload.db_host}:{payload.db_port}/{payload.db_name}"
    )

    schema_text = get_external_schema(conn_str, ssl_required=payload.ssl_required)

    if schema_text.startswith("Error reading schema:"):
        raise HTTPException(
            status_code=502,
            detail=f"Could not connect to database — {schema_text}",
        )

    provider = payload.model_provider

    # Step 1 — extract intent
    intent = None
    try:
        intent = extract_intent(payload.question, provider, payload.model_name)
    except Exception:
        pass

    # Step 2 — generate SQL
    try:
        sql = generate_sql(schema_text, payload.question, provider, payload.model_name)
    except CannotAnswerError as exc:
        log_id = _log_query(
            sb, current_user.id, payload.question, "",
            {"error": str(exc), "row_count": 0, "execution_time_ms": 0},
            "live_supabase", provider,
        )
        return schemas.QueryResult(
            natural_language_query=payload.question, generated_sql="",
            columns=[], rows=[], row_count=0, execution_time_ms=0,
            log_id=log_id, status="blocked", error=str(exc),
            intent=_intent_schema(intent),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {exc}")

    # Step 4 — validate SQL safety
    is_safe, reason = validate_sql(sql)
    if not is_safe:
        log_id = _log_query(
            sb, current_user.id, payload.question, sql,
            {"error": reason, "row_count": 0, "execution_time_ms": 0},
            "live_supabase", provider,
        )
        return schemas.QueryResult(
            natural_language_query=payload.question, generated_sql=sql,
            columns=[], rows=[], row_count=0, execution_time_ms=0,
            log_id=log_id, status="blocked", error=reason,
            intent=_intent_schema(intent),
        )

    # Step 5 — execute
    result = execute_sql_on_external(conn_str, sql, ssl_required=payload.ssl_required)
    log_id = _log_query(sb, current_user.id, payload.question, sql, result, "live_supabase", provider)

    if result.get("error_code") == "42P01":
        return schemas.QueryResult(
            natural_language_query=payload.question, generated_sql=sql,
            columns=[], rows=[], row_count=0,
            execution_time_ms=result["execution_time_ms"],
            log_id=log_id,
            status="template",
            error=None,
            intent=_intent_schema(intent),
        )

    insight = None
    if payload.include_insight and result["rows"] and not result["error"]:
        preview = json.dumps(result["rows"][:20], default=str)
        insight = generate_insight(payload.question, preview, provider, payload.model_name)

    return schemas.QueryResult(
        natural_language_query=payload.question, generated_sql=sql,
        columns=result["columns"], rows=result["rows"],
        row_count=result["row_count"], execution_time_ms=result["execution_time_ms"],
        log_id=log_id, insight=insight,
        error=result.get("error"),
        status="failed" if result.get("error") else "success",
        intent=_intent_schema(intent),
    )


@router.post("/save")
def save_query(
    payload: schemas.SaveQueryRequest,
    current_user: CurrentUser = Depends(require_role("admin", "analyst")),
):
    sb = get_supabase()

    log_rows = sb.table("query_logs").select(
        "natural_language_query, generated_sql, dataset_id"
    ).eq("id", payload.log_id).eq("user_id", current_user.id).execute()

    if not log_rows.data:
        raise HTTPException(status_code=404, detail="Query log not found")

    log = log_rows.data[0]
    row = sb.table("saved_queries").insert({
        "user_id": current_user.id,
        "dataset_id": log.get("dataset_id"),
        "title": payload.title,
        "natural_language_query": log["natural_language_query"],
        "generated_sql": log.get("generated_sql") or "",
        "chart_type": payload.chart_type,
        "is_favorite": payload.is_favorite,
    }).execute()

    return {"id": row.data[0]["id"], "message": "Query saved"}


@router.get("/saved", response_model=list[schemas.SavedQueryOut])
def list_saved(
    current_user: CurrentUser = Depends(require_role("admin", "analyst")),
):
    sb = get_supabase()
    rows = (
        sb.table("saved_queries")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return rows.data


@router.delete("/saved/{saved_id}")
def delete_saved(
    saved_id: int,
    current_user: CurrentUser = Depends(require_role("admin", "analyst")),
):
    sb = get_supabase()
    existing = sb.table("saved_queries").select("id").eq("id", saved_id).eq(
        "user_id", current_user.id
    ).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Not found")

    sb.table("saved_queries").delete().eq("id", saved_id).execute()
    return {"message": "Deleted"}


@router.get("/history", response_model=list[schemas.QueryLogOut])
def query_history(
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    sb = get_supabase()
    rows = (
        sb.table("query_logs")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return rows.data


@router.post("/feedback")
def submit_feedback(
    payload: schemas.FeedbackRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    sb = get_supabase()
    log_rows = sb.table("query_logs").select("id").eq("id", payload.log_id).execute()
    if not log_rows.data:
        raise HTTPException(status_code=404, detail="Query log not found")

    sb.table("feedback").insert({
        "query_log_id": payload.log_id,
        "user_id": current_user.id,
        "rating": payload.rating,
        "comments": payload.comments,
    }).execute()
    return {"message": "Feedback submitted"}
