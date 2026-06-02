from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from app.config import get_settings
from app.auth.router import router as auth_router
from app.queries.router import router as queries_router
from app.schema_service.router import router as schema_router
from app.admin.router import router as admin_router

settings = get_settings()

app = FastAPI(
    title="SmartSQL API",
    description="Text-to-SQL Analytics Portal backend",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – must be added before any route or exception handler so it wraps
# every response, including error responses.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,    # from .env  (e.g. https://yourapp.vercel.app)
        "http://localhost:3000",   # Next.js dev server
        "http://localhost:3001",   # alternate dev port
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# ---------------------------------------------------------------------------
# Global exception handlers
# These ensure every error still returns a JSON body with CORS headers.
# ---------------------------------------------------------------------------

@app.exception_handler(OperationalError)
async def db_operational_error(request: Request, exc: OperationalError):
    """Raised when psycopg2 can't reach the database (wrong host, timeout, …)."""
    return JSONResponse(
        status_code=503,
        content={
            "detail": (
                "Database unreachable. "
                "Check DB_HOST / DB_PASSWORD in your .env and ensure the "
                "Neon compute endpoint is active."
            )
        },
    )


@app.exception_handler(SQLAlchemyError)
async def db_generic_error(request: Request, exc: SQLAlchemyError):
    """Catch-all for other SQLAlchemy failures."""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Database error: {exc.__class__.__name__}"},
    )


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    """Last-resort handler so every crash still returns JSON + CORS headers."""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc.__class__.__name__}"},
    )

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(queries_router)
app.include_router(schema_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "SmartSQL API"}
