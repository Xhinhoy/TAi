from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Literal
from datetime import datetime

# ==================== Request Models ====================

class ExperienceValidationRequest(BaseModel):
    """Request para validar una experiencia desde screenshot"""
    user_id: str
    # El screenshot se maneja como UploadFile en el endpoint, no aquí

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user123"
            }
        }

# ==================== Response Models ====================

class PlaceIdentification(BaseModel):
    """Información del lugar identificado"""
    nombre: str = Field(description="Nombre del lugar o descripción si no está visible")
    tipo: Literal["hotel", "restaurant", "tourist_attraction", "tour_operator", "bar", "cafe", "spa", "museum"]
    ubicacion: Dict[str, Optional[str]] = Field(description="Información de ubicación extraída (ciudad, país, región, zona, referencias_visuales)")
    confianza_identificacion: int = Field(ge=0, le=100, description="Nivel de confianza en la identificación")
    query_busqueda: str = Field(description="Query optimizado para buscar en Google Places y TripAdvisor")

class RedFlag(BaseModel):
    """Red flag detectado en el análisis"""
    severidad: Literal["alta", "media", "baja"]
    descripcion: str
    frecuencia: str
    fuente: Literal["google", "tripadvisor", "ambas"]

class Aspecto(BaseModel):
    """Aspecto positivo o negativo"""
    aspecto: str
    descripcion: str
    mencionado_en: str
    fuente: Literal["google", "tripadvisor", "ambas"]

class DiscrepanciaImagenRealidad(BaseModel):
    """Discrepancia entre imagen promocional y realidad"""
    hay_discrepancia: bool
    elementos_no_coinciden: List[str] = []
    elementos_coinciden: List[str] = []

class TendenciaTemporal(BaseModel):
    """Tendencia temporal del lugar"""
    mejorando: bool
    estable: bool
    empeorando: bool
    evidencia: str

class Analisis(BaseModel):
    """Análisis detallado de la experiencia"""
    red_flags: List[RedFlag]
    aspectos_positivos: List[Aspecto]
    aspectos_negativos: List[Aspecto]
    discrepancia_imagen_realidad: DiscrepanciaImagenRealidad
    tendencia_temporal: TendenciaTemporal

class Alternativa(BaseModel):
    """Lugar alternativo sugerido"""
    place_id: str
    nombre: str
    porque_es_mejor: str
    rating_google: float
    total_reviews: int
    direccion: str
    precio_nivel: Optional[int] = None
    distancia_km: float

class FuentesConsultadas(BaseModel):
    """Fuentes de datos consultadas"""
    google_places: bool
    tripadvisor: bool

class ExperienceValidationResponse(BaseModel):
    """Response completa de validación de experiencia"""
    lugar_identificado: PlaceIdentification
    score_realidad: int = Field(ge=0, le=100, description="Score de qué tan real es vs lo promocionado")
    recomendacion: Literal["RESERVAR_CON_CONFIANZA", "CONSIDERAR_ALTERNATIVAS", "NO_RECOMENDADO"]
    razon_recomendacion: str
    analisis: Analisis
    alternativas: List[Alternativa] = []
    fuentes_consultadas: FuentesConsultadas
    tiempo_procesamiento_segundos: float
    validation_id: Optional[str] = None  # ID si se guarda en Firestore

    class Config:
        json_schema_extra = {
            "example": {
                "lugar_identificado": {
                    "nombre": "Hotel Paradise Beach",
                    "tipo": "hotel",
                    "ubicacion": {
                        "ciudad": "Cancún",
                        "pais": "México"
                    },
                    "confianza_identificacion": 92,
                    "query_busqueda": "Hotel Paradise Beach Cancún México"
                },
                "score_realidad": 72,
                "recomendacion": "CONSIDERAR_ALTERNATIVAS",
                "razon_recomendacion": "El lugar tiene buena ubicación pero instalaciones desactualizadas",
                "analisis": {
                    "red_flags": [
                        {
                            "severidad": "media",
                            "descripcion": "Fotos desactualizadas mencionadas en 15% de reseñas",
                            "frecuencia": "15%",
                            "fuente": "google"
                        }
                    ],
                    "aspectos_positivos": [],
                    "aspectos_negativos": [],
                    "discrepancia_imagen_realidad": {
                        "hay_discrepancia": True,
                        "elementos_no_coinciden": ["Estado de la piscina"],
                        "elementos_coinciden": ["Ubicación frente a playa"]
                    },
                    "tendencia_temporal": {
                        "mejorando": False,
                        "estable": True,
                        "empeorando": False,
                        "evidencia": "Reviews estables últimos 6 meses"
                    }
                },
                "alternativas": [],
                "fuentes_consultadas": {
                    "google_places": True,
                    "tripadvisor": True
                },
                "tiempo_procesamiento_segundos": 18.5
            }
        }

# ==================== Error Models ====================

class ValidationError(BaseModel):
    """Error de validación"""
    error: str
    detail: str
    suggestions: List[str] = []

class ScreenshotQualityCheck(BaseModel):
    """Pre-validación de calidad del screenshot"""
    es_valido: bool
    tiene_imagen_lugar: bool
    tiene_texto_descripcion: bool
    tiene_ubicacion_visible: bool
    tiene_nombre_visible: bool
    plataforma_detectada: Literal["instagram", "tiktok", "facebook", "desconocida"]
    confianza_extraccion: int = Field(ge=0, le=100)
    problemas: List[str] = []
    sugerencia: str
