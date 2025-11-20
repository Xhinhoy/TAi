from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str
    FIREBASE_PROJECT_ID: str
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
    
    # App
    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    CORS_ORIGINS: str = "*"
    
    # Rate Limits
    GOOGLE_PLACES_RATE_LIMIT: int = 50
    TRIPADVISOR_RATE_LIMIT: int = 30
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings() # type: ignore