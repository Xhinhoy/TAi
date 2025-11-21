from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List, Optional, ClassVar
from pathlib import Path
import os

class Settings(BaseSettings):
    MOCK_MODE: bool = Field(default=False, description="Usar servicios mock (desactiva llamadas reales)")
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str
    FIREBASE_PROJECT_ID: Optional[str] = Field(default=None, description="ID de proyecto Firebase (se usará el del service account si no se define)")
    FIREBASE_DATABASE_URL: str
    
    # Google AI - Gemini (LLM principal)
    GOOGLE_API_KEY: str
    GOOGLE_MODEL: str = "gemini-2.5-flash"
    GOOGLE_TEMPERATURE: float = 0.5
    GOOGLE_MAX_TOKENS: int = 32000  # Aumentado para itinerarios completos (hasta 10 días)
    
    # APIs externas
    GOOGLE_PLACES_API_KEY: str
    TRIPADVISOR_API_KEY: str
    TRIPADVISOR_BASE_URL: str = "https://api.content.tripadvisor.com/api/v1"
    TRIPADVISOR_RATE_LIMIT: int = 30

    # Frontend público (no crítico para backend)
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: Optional[str] = None
    API_URL: Optional[str] = None
    
    # App
    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    CORS_ORIGINS: str = "*"
    
    # Rate Limits
    GOOGLE_PLACES_RATE_LIMIT: int = 50
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Pydantic v2 config
    # Configuración Pydantic v2
    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        case_sensitive=True,
        extra="ignore",
    )

settings = Settings() # type: ignore
