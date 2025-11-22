from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.firebase import firebase_service
from app.api.v1.router import api_router
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Iniciando aplicación...")
    firebase_service.initialize()
    logger.info("Firebase inicializado correctamente")
    
    yield  # Aquí la aplicación está corriendo
    
    # Shutdown
    logger.info("Cerrando aplicación...")

# Crear app con lifespan
app = FastAPI(
    title="TAi Backend - Agente de Viajes IA",
    description="Backend para aplicación de recomendaciones turísticas con IA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,  # ← Nuevo parámetro
    # Asegurar encoding UTF-8 en responses
    responses={
        200: {"content": {"application/json": {"charset": "utf-8"}}}
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list if settings.CORS_ORIGINS != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware simple para debugging
class DebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"🌐 Incoming {request.method} request to: {request.url.path}")
        response = await call_next(request)
        logger.info(f"Response status code: {response.status_code}")
        return response

@app.get("/")
async def root():
    return {
        "message": "TAi Backend API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "firebase": "connected",
        "llm": f"Google AI ({settings.GOOGLE_MODEL})"
    }

@app.get("/test-google-api")
async def test_google_api():
    """Test endpoint para verificar si la API key de Google Places funciona"""
    import requests

    api_key = settings.GOOGLE_PLACES_API_KEY
    if hasattr(api_key, 'get_secret_value'):
        api_key = api_key.get_secret_value()

    test_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        'location': '-33.4489,70.6693',  # Santiago, Chile
        'radius': 1000,
        'key': api_key
    }

    try:
        response = requests.get(test_url, params=params, timeout=10)
        data = response.json()

        return {
            "api_key_length": len(api_key),
            "api_key_preview": f"{api_key[:10]}...{api_key[-4:]}",
            "status_code": response.status_code,
            "google_status": data.get('status'),
            "error_message": data.get('error_message'),
            "results_count": len(data.get('results', [])),
            "full_response": data if data.get('status') != 'OK' else None
        }
    except Exception as e:
        return {
            "error": str(e),
            "api_key_length": len(api_key)
        }

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )
