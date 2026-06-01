from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import quote_plus


class Settings(BaseSettings):
    # ------------------------------------------------------------------
    # Supabase project credentials
    # ------------------------------------------------------------------
    SUPABASE_URL: str = ""                  # https://<ref>.supabase.co
    SUPABASE_ANON_KEY: str = ""             # public anon key
    SUPABASE_SERVICE_ROLE_KEY: str = ""     # secret service-role key (backend only)
    SUPABASE_JWT_SECRET: str = ""           # Project Settings > API > JWT Secret

    # ------------------------------------------------------------------
    # Direct PostgreSQL connection (Neon project connection details from
    # Neon Console → your project → Connection Details)
    # ------------------------------------------------------------------
    DB_HOST: str = ""
    DB_PORT: int = 5432
    DB_NAME: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""

    # ------------------------------------------------------------------
    # AI Providers
    # ------------------------------------------------------------------
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OLLAMA_URL: str = "http://localhost:11434"
    DEFAULT_MODEL_PROVIDER: str = "groq"
    DEFAULT_MODEL_NAME: str = "llama-3.3-70b-versatile"

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def database_url(self) -> str:
        password = quote_plus(self.DB_PASSWORD)
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
