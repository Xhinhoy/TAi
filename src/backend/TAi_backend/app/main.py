from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.firebase import firebase_service
from app.api.v1.router import api_router
import logging

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
    lifespan=lifespan  # ← Nuevo parámetro
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        "llm": f"Groq ({settings.GROQ_MODEL})"
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