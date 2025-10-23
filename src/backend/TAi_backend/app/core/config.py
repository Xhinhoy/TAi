import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Configuración centralizada del backend TAi"""

    # App
    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:19006,http://localhost:3000,http://127.0.0.1:8081,http://127.0.0.1:19006,http://localhost:5173,http://127.0.0.1:5173"

    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "TAi_backend/proyectotai-cb31a-firebase-adminsdk-fbsvc-ecc5309b12.json"
    FIREBASE_PROJECT_ID: str = "proyectotai-cb31a"
    FIREBASE_DATABASE_URL: str = "https://proyectotai-cb31a-default-rtdb.firebaseio.com/"

    # Groq LLM
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"  # Modelo actualizado
    GROQ_TEMPERATURE: float = 0.5
    GROQ_MAX_TOKENS: int = 2000
    GROQ_DEV_MODE: bool = True
    GROQ_MODEL_8B: str = "llama-3.1-8b-instant"
    GROQ_MODEL_70B: str = "llama-3.3-70b-versatile"

    # Google Places
    GOOGLE_PLACES_API_KEY: str = ""
    GOOGLE_PLACES_RATE_LIMIT: int = 50

    # TripAdvisor
    TRIPADVISOR_API_KEY: str = ""
    TRIPADVISOR_RATE_LIMIT: int = 30

    # Mock mode
    MOCK_MODE: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
