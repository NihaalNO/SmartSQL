from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Boolean, Enum,
    TIMESTAMP, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    status = Column(Enum("active", "inactive"), default="active")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    role = relationship("Role", back_populates="users")
    saved_queries = relationship("SavedQuery", back_populates="user")
    query_logs = relationship("QueryLog", back_populates="user")
    chart_preferences = relationship("ChartPreference", back_populates="user", uselist=False)
    live_db_sessions = relationship("LiveDbSession", back_populates="user")


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    source_type = Column(Enum("internal_mysql", "supabase_live"), default="internal_mysql")
    schema_name = Column(String(120))
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(TIMESTAMP, server_default=func.now())

    saved_queries = relationship("SavedQuery", back_populates="dataset")
    query_logs = relationship("QueryLog", back_populates="dataset")


class SavedQuery(Base):
    __tablename__ = "saved_queries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    title = Column(String(150), nullable=False)
    natural_language_query = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=False)
    chart_type = Column(String(50))
    is_favorite = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="saved_queries")
    dataset = relationship("Dataset", back_populates="saved_queries")


class QueryLog(Base):
    __tablename__ = "query_logs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    query_mode = Column(Enum("internal", "live_supabase"), default="internal")
    natural_language_query = Column(Text, nullable=False)
    generated_sql = Column(Text)
    execution_status = Column(Enum("success", "failed", "blocked"), default="success")
    error_message = Column(Text)
    execution_time_ms = Column(Integer)
    row_count = Column(Integer)
    model_provider = Column(String(50))
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="query_logs")
    dataset = relationship("Dataset", back_populates="query_logs")
    feedback = relationship("Feedback", back_populates="query_log", uselist=False)


class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, autoincrement=True)
    query_log_id = Column(BigInteger, ForeignKey("query_logs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer)
    comments = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    query_log = relationship("QueryLog", back_populates="feedback")


class ChartPreference(Base):
    __tablename__ = "chart_preferences"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    default_chart_type = Column(String(50))
    theme = Column(String(20), default="light")
    show_sql_preview = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="chart_preferences")


class LiveDbSession(Base):
    __tablename__ = "live_db_sessions"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(Enum("supabase"), default="supabase")
    project_ref = Column(String(120))
    db_host = Column(String(255))
    db_port = Column(Integer, default=5432)
    db_name = Column(String(120))
    db_user = Column(String(120))
    connection_label = Column(String(120))
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime)
    created_at = Column(TIMESTAMP, server_default=func.now())
    ended_at = Column(DateTime)

    user = relationship("User", back_populates="live_db_sessions")
