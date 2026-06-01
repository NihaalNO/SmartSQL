"""
Legacy SQLAlchemy bootstrap — kept for reference only.
All live DB operations now go through the Supabase REST API (supabase_client.py).
Nothing in the active codebase imports get_db() or Base.

If you ever re-enable direct PostgreSQL access, replace DB_HOST with the
Session Pooler host (aws-0-<region>.pooler.supabase.com, port 5432) —
the direct host (db.<ref>.supabase.co) is IPv6-only.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    pass


_engine = None
_SessionLocal = None


def _get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_timeout=10,
            connect_args={
                "sslmode": "require",
                "connect_timeout": 5,
            },
        )
    return _engine


def get_db():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_get_engine())
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
