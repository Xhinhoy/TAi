from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.place import Place


class AlertPriority(str, Enum):
    """Prioridad de una alerta según relevancia para el usuario"""
    HIGH = "high"        # Coincide perfectamente con intereses y está muy cerca
    MEDIUM = "medium"    # Coincide parcialmente o está a distancia media
    LOW = "low"          # Poco relevante pero puede ser interesante


class AlertReason(str, Enum):
    """Razón por la que se generó la alerta"""
    INTEREST_MATCH = "interest_match"           # Coincide con intereses del usuario
    HIGH_RATING = "high_rating"                 # Rating muy alto (>4.5)
    TRENDING = "trending"                       # Lugar popular/trending
    HIDDEN_GEM = "hidden_gem"                   # Joya oculta (pocos reviews pero alto rating)
    NEARBY = "nearby"                           # Simplemente está cerca
    BUDGET_FRIENDLY = "budget_friendly"         # Se ajusta al presupuesto
    HIGHLY_REVIEWED = "highly_reviewed"         # Muchas reseñas positivas


class RouteAlert(BaseModel):
    """Alerta de lugar interesante en la ruta del usuario"""
    id: str  # UUID único de la alerta
    session_id: str  # ID de la sesión de exploración
    user_id: str

    # Información del lugar
    place: Place

    # Contexto de la alerta
    distance_meters: float  # Distancia desde ubicación actual
    priority: AlertPriority
    reasons: List[AlertReason]  # Múltiples razones por las que es relevante

    # Personalización
    match_score: float = Field(ge=0.0, le=1.0)  # 0-1 qué tan bien coincide con el perfil
    personalized_message: str  # Mensaje personalizado para el usuario

    # Detalles adicionales
    estimated_time_minutes: Optional[int] = None  # Tiempo estimado para llegar
    is_open_now: Optional[bool] = None  # Si está abierto ahora

    # Tracking
    created_at: datetime
    shown_to_user: bool = False  # Si se mostró al usuario
    user_interacted: bool = False  # Si el usuario hizo tap
    interaction_at: Optional[datetime] = None


class AlertGenerationConfig(BaseModel):
    """Configuración para generar alertas"""
    max_distance_meters: int = 500  # Máximo 500m de distancia
    min_rating: float = 3.5  # Rating mínimo
    max_alerts_per_update: int = 3  # Máximo 3 alertas por actualización
    include_hidden_gems: bool = True  # Incluir joyas ocultas
    user_interests: List[str] = []  # Intereses del usuario
    budget_max: Optional[float] = None  # Presupuesto máximo


class AlertInteraction(BaseModel):
    """Registro de interacción del usuario con una alerta"""
    alert_id: str
    user_id: str
    session_id: str
    interaction_type: str  # "viewed", "tapped", "dismissed", "saved"
    timestamp: datetime
