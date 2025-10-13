from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str
    FIREBASE_PROJECT_ID: str
    FIREBASE_DATABASE_URL: str
    
    # Groq (LLM principal)
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    GROQ_TEMPERATURE: float = 0.7
    GROQ_MAX_TOKENS: int = 2000
    
    # APIs externas
    GOOGLE_PLACES_API_KEY: str
    #TRIPADVISOR_API_KEY: str
    
    # App
    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    CORS_ORIGINS: str = "*"
    
    # Rate Limits
    GOOGLE_PLACES_RATE_LIMIT: int = 50
    #TRIPADVISOR_RATE_LIMIT: int = 30
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings() # type: ignore