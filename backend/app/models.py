from sqlalchemy import (
    Column, Integer, BigInteger, SmallInteger, String, Text, Boolean,
    TIMESTAMP, DateTime, ForeignKey, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


# =============================================================================
# Lookup / identity tables
# =============================================================================

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    users = relationship("User", back_populates="role")


class User(Base):
    """
    Central identity record.  All activity tables (saved_queries, query_logs,
    etc.) reference this table.  Role-specific settings live in the three
    companion tables (admin_users, analyst_users, viewer_users) that are
    auto-provisioned by a database trigger on INSERT.
    """
    __tablename__ = "users"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    supabase_uid = Column(UUID(as_uuid=False), unique=True, nullable=True)
    full_name    = Column(String(120), nullable=False)
    email        = Column(String(150), nullable=False, unique=True)
    role_id      = Column(Integer, ForeignKey("roles.id"), nullable=False)
    status       = Column(String(10), nullable=False, default="active")
    created_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive')", name="ck_users_status"),
    )

    # Lookup / role
    role = relationship("Role", back_populates="users")

    # Role-specific profiles (exactly one will be non-None per user)
    admin_profile   = relationship("AdminUser",   back_populates="user", uselist=False)
    analyst_profile = relationship("AnalystUser", back_populates="user", uselist=False)
    viewer_profile  = relationship("ViewerUser",  back_populates="user", uselist=False)

    # Activity tables
    saved_queries    = relationship("SavedQuery",    back_populates="user")
    query_logs       = relationship("QueryLog",      back_populates="user")
    chart_preferences= relationship("ChartPreference", back_populates="user", uselist=False)
    live_db_sessions = relationship("LiveDbSession", back_populates="user")

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------
    @property
    def role_name(self) -> str:
        return self.role.name if self.role else ""

    @property
    def role_profile(self):
        """Return whichever role-profile object is populated."""
        return self.admin_profile or self.analyst_profile or self.viewer_profile


# =============================================================================
# Role-specific profile tables  (1:1 with users, keyed on user_id)
# The database trigger provision_role_profile() auto-inserts a default row
# into the correct table whenever a user is created.
# =============================================================================

class AdminUser(Base):
    """
    Extended profile for admin-role users.
    Admins have full platform access: user management, data-source config,
    and visibility into all query logs.
    """
    __tablename__ = "admin_users"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # Organisational context
    department = Column(String(120))

    # Capability flags
    can_manage_users          = Column(Boolean, nullable=False, default=True)
    can_configure_datasources = Column(Boolean, nullable=False, default=True)
    see_all_query_logs        = Column(Boolean, nullable=False, default=True)
    can_manage_datasets       = Column(Boolean, nullable=False, default=True)

    # Activity tracking
    last_dashboard_visit_at = Column(TIMESTAMP(timezone=True))
    total_users_managed     = Column(Integer, nullable=False, default=0)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="admin_profile")


class AnalystUser(Base):
    """
    Extended profile for analyst-role users.
    Analysts can run queries, save results, and connect to live databases.
    """
    __tablename__ = "analyst_users"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # AI / query preferences
    preferred_model_provider = Column(String(50),  nullable=False, default="groq")
    preferred_model_name     = Column(String(100), nullable=False, default="llama-3.3-70b-versatile")

    # Operational limits
    max_saved_queries = Column(Integer, nullable=False, default=100)
    can_use_live_db   = Column(Boolean, nullable=False, default=True)

    # Usage counters (denormalised for quick display)
    total_queries_run   = Column(Integer, nullable=False, default=0)
    total_saved_queries = Column(Integer, nullable=False, default=0)

    # Activity tracking
    last_query_at = Column(TIMESTAMP(timezone=True))

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="analyst_profile")


class ViewerUser(Base):
    """
    Extended profile for viewer-role users.
    Viewers have read-only access to shared query results and history.
    """
    __tablename__ = "viewer_users"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # Capability flags (all restrictive by default)
    read_only          = Column(Boolean, nullable=False, default=True)
    can_export_results = Column(Boolean, nullable=False, default=False)

    # Activity tracking
    last_viewed_at = Column(TIMESTAMP(timezone=True))
    total_views    = Column(Integer, nullable=False, default=0)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="viewer_profile")


# =============================================================================
# Shared activity / data tables
# =============================================================================

class Dataset(Base):
    __tablename__ = "datasets"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(120), nullable=False)
    description = Column(Text)
    source_type = Column(String(20), nullable=False, default="internal_pg")
    schema_name = Column(String(120))
    is_active   = Column(Boolean, default=True)
    created_by  = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('internal_pg', 'supabase_live')",
            name="ck_datasets_source_type",
        ),
    )

    saved_queries = relationship("SavedQuery", back_populates="dataset")
    query_logs    = relationship("QueryLog",   back_populates="dataset")


class SavedQuery(Base):
    __tablename__ = "saved_queries"
    id                     = Column(Integer, primary_key=True, autoincrement=True)
    user_id                = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id             = Column(Integer, ForeignKey("datasets.id"))
    title                  = Column(String(150), nullable=False)
    natural_language_query = Column(Text, nullable=False)
    generated_sql          = Column(Text, nullable=False)
    chart_type             = Column(String(50))
    is_favorite            = Column(Boolean, default=False)
    created_at             = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at             = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user    = relationship("User",    back_populates="saved_queries")
    dataset = relationship("Dataset", back_populates="saved_queries")


class QueryLog(Base):
    __tablename__ = "query_logs"
    id                     = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id                = Column(Integer, ForeignKey("users.id"))
    dataset_id             = Column(Integer, ForeignKey("datasets.id"))
    query_mode             = Column(String(20), nullable=False, default="internal")
    natural_language_query = Column(Text, nullable=False)
    generated_sql          = Column(Text)
    execution_status       = Column(String(10), nullable=False, default="success")
    error_message          = Column(Text)
    execution_time_ms      = Column(Integer)
    row_count              = Column(Integer)
    model_provider         = Column(String(50))
    created_at             = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "query_mode IN ('internal', 'live_supabase')",
            name="ck_query_logs_query_mode",
        ),
        CheckConstraint(
            "execution_status IN ('success', 'failed', 'blocked')",
            name="ck_query_logs_exec_status",
        ),
    )

    user     = relationship("User",    back_populates="query_logs")
    dataset  = relationship("Dataset", back_populates="query_logs")
    feedback = relationship("Feedback", back_populates="query_log", uselist=False)


class Feedback(Base):
    __tablename__ = "feedback"
    id           = Column(Integer,    primary_key=True, autoincrement=True)
    query_log_id = Column(BigInteger, ForeignKey("query_logs.id"), nullable=False)
    user_id      = Column(Integer,    ForeignKey("users.id"))
    rating       = Column(SmallInteger)
    comments     = Column(Text)
    created_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_feedback_rating"),
    )

    query_log = relationship("QueryLog", back_populates="feedback")


class ChartPreference(Base):
    __tablename__ = "chart_preferences"
    id                 = Column(Integer, primary_key=True, autoincrement=True)
    user_id            = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    default_chart_type = Column(String(50))
    theme              = Column(String(20), default="light")
    show_sql_preview   = Column(Boolean, default=True)
    created_at         = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at         = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chart_preferences")


class LiveDbSession(Base):
    __tablename__ = "live_db_sessions"
    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id          = Column(Integer,  ForeignKey("users.id"), nullable=False)
    provider         = Column(String(20), nullable=False, default="supabase")
    project_ref      = Column(String(120))
    db_host          = Column(String(255))
    db_port          = Column(Integer, default=5432)
    db_name          = Column(String(120))
    db_user          = Column(String(120))
    connection_label = Column(String(120))
    is_active        = Column(Boolean, default=True)
    expires_at       = Column(DateTime(timezone=True))
    created_at       = Column(TIMESTAMP(timezone=True), server_default=func.now())
    ended_at         = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("provider IN ('supabase')", name="ck_live_db_sessions_provider"),
    )

    user = relationship("User", back_populates="live_db_sessions")
