from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.auth.router import router as auth_router
from app.queries.router import router as queries_router
from app.schema_service.router import router as schema_router

settings = get_settings()

app = FastAPI(
    title="SmartSQL API",
    description="Text-to-SQL Analytics Portal backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(queries_router)
app.include_router(schema_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "SmartSQL API"}
