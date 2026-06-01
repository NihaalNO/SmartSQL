from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime


class QueryRequest(BaseModel):
    question: str
    dataset_id: Optional[int] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    include_insight: bool = True


class LiveQueryRequest(BaseModel):
    question: str
    # Ephemeral credentials — never stored persistently
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    include_insight: bool = True
    ssl_required: bool = True   # set False for local/non-SSL PostgreSQL


class QueryIntent(BaseModel):
    query_type: str = "SQL"
    table: Optional[str] = None
    action: str = "select"
    attributes: List[str] = []


class QueryResult(BaseModel):
    natural_language_query: str
    generated_sql: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: int
    log_id: Optional[int] = None
    insight: Optional[str] = None
    error: Optional[str] = None
    status: str = "success"   # success | failed | blocked | need_context
    intent: Optional[QueryIntent] = None


class SaveQueryRequest(BaseModel):
    log_id: int
    title: str
    chart_type: Optional[str] = None
    is_favorite: bool = False


class FeedbackRequest(BaseModel):
    log_id: int
    rating: int
    comments: Optional[str] = None


class SavedQueryOut(BaseModel):
    id: int
    title: str
    natural_language_query: str
    generated_sql: str
    chart_type: Optional[str]
    is_favorite: bool
    created_at: datetime

    class Config:
        from_attributes = True


class QueryLogOut(BaseModel):
    id: int
    natural_language_query: str
    generated_sql: Optional[str]
    execution_status: str
    execution_time_ms: Optional[int]
    row_count: Optional[int]
    model_provider: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
