from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import quote_plus


class Settings(BaseSettings):
    # Database
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DB: str = "text_to_sql_portal"

    # JWT
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # AI Providers
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OLLAMA_URL: str = "http://localhost:11434"
    DEFAULT_MODEL_PROVIDER: str = "groq"
    DEFAULT_MODEL_NAME: str = "llama-3.3-70b-versatile"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def database_url(self) -> str:
        password = quote_plus(self.MYSQL_PASSWORD)
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{password}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
