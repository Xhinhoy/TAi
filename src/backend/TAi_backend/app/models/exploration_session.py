from enum import Enum
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ExplorationSessionStatus(str, Enum):
    """Estados posibles de una sesión de exploración"""
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    ENDED = "ended"


class LocationUpdate(BaseModel):
    """Actualización de ubicación del usuario"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timestamp: Optional[datetime] = None
    accuracy: Optional[float] = None  # Precisión en metros


class ExplorationSession(BaseModel):
    """Sesión de exploración del usuario"""
    id: str  # UUID
    user_id: str
    status: ExplorationSessionStatus

    # Configuración
    duration_minutes: int = 120  # 2 horas por defecto
    max_alerts: int = 20  # Máximo de alertas por sesión

    # Timestamps
    started_at: datetime
    expires_at: datetime  # started_at + duration_minutes
    ended_at: Optional[datetime] = None

    # Métricas de uso
    alerts_generated: int = 0
    alerts_interacted: int = 0  # Usuario hizo tap en "Ver más"
    places_discovered: int = 0
    distance_walked_meters: float = 0.0

    # Costos (transparencia)
    estimated_cost_usd: float = 0.0  # Tracking de costo estimado

    # Estado
    is_paused: bool = False
    paused_at: Optional[datetime] = None

    class Config:
        use_enum_values = True


class SessionCreateRequest(BaseModel):
    """Request para crear sesión"""
    duration_minutes: int = Field(default=120, ge=30, le=480)  # 30min - 8h
    max_alerts: int = Field(default=20, ge=5, le=50)
    interests_override: Optional[List[str]] = None  # Sobrescribir intereses temporalmente


class SessionResponse(BaseModel):
    """Response de sesión con info para el usuario"""
    session: ExplorationSession
    time_remaining_minutes: int
    alerts_remaining: int
    can_continue: bool
    message: Optional[str] = None  # Mensajes al usuario


class SessionSummary(BaseModel):
    """Resumen final de una sesión"""
    duration_minutes: int
    places_discovered: int
    alerts_generated: int
    alerts_interacted: int
    distance_walked_km: float
    estimated_cost: str  # Formateado como "$0.0000"
    message: str
