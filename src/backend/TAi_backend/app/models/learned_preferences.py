from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class InteractionType(str, Enum):
    """Tipos de interacción del usuario con alertas"""
    VIEWED = "viewed"
    TAPPED = "tapped"
    DISMISSED = "dismissed"
    SAVED = "saved"


class CategoryPreference(BaseModel):
    """Preferencia aprendida para una categoría de lugar"""
    category: str
    positive_interactions: int = 0  # tapped, saved
    negative_interactions: int = 0  # dismissed
    total_shown: int = 0  # Cuántas veces se mostró
    preference_score: float = Field(default=0.5, ge=0.0, le=1.0)  # 0 = evitar, 0.5 = neutral, 1 = preferir
    last_updated: datetime = Field(default_factory=datetime.now)


class PricePreference(BaseModel):
    """Preferencia aprendida sobre niveles de precio"""
    price_level: int  # 0-4 (Google Places price level)
    positive_interactions: int = 0
    negative_interactions: int = 0
    preference_score: float = Field(default=0.5, ge=0.0, le=1.0)


class TimePreference(BaseModel):
    """Preferencia aprendida sobre horarios de exploración"""
    hour_range: str  # "morning" (6-12), "afternoon" (12-18), "evening" (18-24), "night" (0-6)
    interaction_count: int = 0
    preference_score: float = Field(default=0.5, ge=0.0, le=1.0)


class DistancePreference(BaseModel):
    """Preferencia aprendida sobre distancias preferidas"""
    distance_range: str  # "very_close" (0-100m), "close" (100-300m), "medium" (300-500m), "far" (500m+)
    positive_interactions: int = 0
    total_shown: int = 0
    preference_score: float = Field(default=0.5, ge=0.0, le=1.0)


class LearnedPreferences(BaseModel):
    """Preferencias aprendidas automáticamente del comportamiento del usuario"""
    user_id: str

    # Preferencias por categoría
    categories: Dict[str, CategoryPreference] = {}

    # Preferencias por precio
    price_levels: Dict[int, PricePreference] = {}

    # Preferencias de horario
    time_preferences: Dict[str, TimePreference] = {}

    # Preferencias de distancia
    distance_preferences: Dict[str, DistancePreference] = {}

    # Estadísticas generales
    total_interactions: int = 0
    total_positive_interactions: int = 0  # tapped + saved
    total_negative_interactions: int = 0  # dismissed

    # Metadatos
    created_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)
    last_analyzed: Optional[datetime] = None


class PreferenceInsight(BaseModel):
    """Insight sobre las preferencias del usuario"""
    type: str  # "category", "price", "time", "distance"
    insight: str  # Descripción del insight
    confidence: float = Field(ge=0.0, le=1.0)  # Qué tan confiable es el insight
    data: Dict  # Datos que respaldan el insight


class UserBehaviorAnalysis(BaseModel):
    """Análisis completo del comportamiento del usuario"""
    user_id: str

    # Top preferencias
    top_categories: List[Dict[str, Any]] = []  # [{"category": "restaurant", "score": 0.9}, ...]
    avoided_categories: List[Dict[str, Any]] = []  # Categorías que evita

    preferred_price_range: Optional[List[int]] = None  # [1, 2] = económico/moderado

    preferred_times: List[str] = []  # ["morning", "afternoon"]
    preferred_distances: List[str] = []  # ["very_close", "close"]

    # Insights
    insights: List[PreferenceInsight] = []

    # Métricas
    engagement_rate: float = 0.0  # % de alertas con interacción positiva
    dismissal_rate: float = 0.0  # % de alertas descartadas

    analyzed_at: datetime = Field(default_factory=datetime.now)
