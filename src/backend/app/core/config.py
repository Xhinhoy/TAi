from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str
    FIREBASE_PROJECT_ID: str
    FIREBASE_DATABASE_URL: str

    # Groq (LLM principal)
    GROQ_API_KEY: str
    GROQ_MODEL: str = Field(default="llama-3.1-70b-versatile")
    GROQ_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=2.0)
    GROQ_MAX_TOKENS: int = Field(default=2000, gt=0, le=8000)

    # APIs externas
    GOOGLE_PLACES_API_KEY: str

    # App
    ENV: str = Field(default="development", pattern="^(development|staging|production)$")
    DEBUG: bool = Field(default=True)
    LOG_LEVEL: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    PORT: int = Field(default=8080, gt=0, le=65535)
    CORS_ORIGINS: str = Field(default="http://localhost:8081,http://localhost:19006,http://localhost:3000")

    # Rate Limits
    GOOGLE_PLACES_RATE_LIMIT: int = Field(default=50, gt=0, le=1000)

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()  # type: ignore