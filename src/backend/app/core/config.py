# app/core/config.py
from typing import List, Optional, Literal
from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Modo mock: no exige credenciales ni inicializa SDKs reales
    MOCK_MODE: bool = True

    # Firebase
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_DATABASE_URL: Optional[str] = None

    # Groq (LLM principal)
    GROQ_API_KEY: Optional[SecretStr] = None
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    GROQ_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=2.0)
    GROQ_MAX_TOKENS: int = Field(default=2000, gt=0, le=8000)

    # APIs externas
    GOOGLE_PLACES_API_KEY: Optional[SecretStr] = None

    # App
    ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    PORT: int = Field(default=8080, gt=0, le=65535)
    CORS_ORIGINS: str = (
        "http://localhost:8081,http://localhost:19006,http://localhost:3000"
    )

    # Rate Limits
    GOOGLE_PLACES_RATE_LIMIT: int = Field(default=50, gt=0, le=1000)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def _require_when_not_mock(self):
        if not self.MOCK_MODE:
            checks = {
                "FIREBASE_CREDENTIALS_PATH": self.FIREBASE_CREDENTIALS_PATH,
                "FIREBASE_PROJECT_ID": self.FIREBASE_PROJECT_ID,
                "FIREBASE_DATABASE_URL": self.FIREBASE_DATABASE_URL,
                "GROQ_API_KEY": self.GROQ_API_KEY.get_secret_value() if self.GROQ_API_KEY else None,
                "GOOGLE_PLACES_API_KEY": self.GOOGLE_PLACES_API_KEY.get_secret_value() if self.GOOGLE_PLACES_API_KEY else None,
            }
            missing = [k for k, v in checks.items() if not v]
            if missing:
                raise ValueError(
                    f"Missing required env vars (MOCK_MODE=false): {', '.join(missing)}"
                )
        return self

# Instancia única exportada por el módulo
settings = Settings()  # type: ignore
