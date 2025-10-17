# app/core/config.py
import os
from typing import List, Optional, Literal, ClassVar    
from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#  Ruta absoluta hacia el .env
env_path = os.path.join(os.path.dirname(__file__), "..", "..", "TAi_backend", ".env")

class Settings(BaseSettings):
    ...
    MOCK_MODE: bool = Field(default=False, description="Usar Firebase mock (sin conexión real)")

    TRIPADVISOR_API_KEY: str | None = None
    TRIPADVISOR_RATE_LIMIT: int = 60

    # Firebase
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_DATABASE_URL: Optional[str] = None

    # Groq (LLM principal)
    GROQ_API_KEY: Optional[SecretStr] = None
    GROQ_DEV_MODE: bool = True
    GROQ_MODEL_8B: str = "llama-3.1-8b-instant"
    GROQ_MODEL_70B: str = "llama-3.3-70b-versatile"

    @property
    def GROQ_MODEL(self) -> str:
        """Selecciona automáticamente el modelo según el modo de desarrollo"""
        return self.GROQ_MODEL_8B if self.GROQ_DEV_MODE else self.GROQ_MODEL_70B

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

    # 🔧 Configuración general
    model_config = SettingsConfigDict(
        env_file=env_path,  # 👈 ahora lee el .env correcto
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

#  (opcional) verificación de carga
print(f"✅ .env cargado desde: {env_path}")
print(f"📄 FIREBASE_CREDENTIALS_PATH: {settings.FIREBASE_CREDENTIALS_PATH}")
#  Mensaje informativo sobre el modelo Groq activo
current_model = settings.GROQ_MODEL
mode_label = "🧪 MODO DESARROLLO" if settings.GROQ_DEV_MODE else "🚀 MODO PRODUCCIÓN"
print(f"{mode_label} → Usando modelo Groq: {current_model}")


