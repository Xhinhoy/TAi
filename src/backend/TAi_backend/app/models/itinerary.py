from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Modelo de actividad dentro de un día del itinerario
class ItineraryActivity(BaseModel):
    place_id: str
    place_name: str
    start: str  # Formato HH:MM
    end: str    # Formato HH:MM
    price_level: int = Field(ge=0, le=4)  # 0=Gratis, 1=$, 2=$$, 3=$$$, 4=$$$$
    price_display: str  # "Gratis", "$", "$$", "$$$", "$$$$"
    notes: str

# Modelo de un día del itinerario
class ItineraryDay(BaseModel):
    day: int
    activities: List[ItineraryActivity]

# Modelo principal de itinerario (nueva estructura)
class Itinerary(BaseModel):
    id: Optional[str] = None
    title: str
    city: str
    days: List[ItineraryDay]  # Array de días con actividades
    owner_uid: str
    reasoning: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        # Permitir aliases para compatibilidad con diferentes naming conventions
        populate_by_name = True

# Modelo legacy para compatibilidad con código antiguo
class ItineraryItem(BaseModel):
    day: int
    place_id: str
    place_name: Optional[str] = None
    start: str
    end: str
    notes: Optional[str] = None

class ItineraryCreate(BaseModel):
    title: str
    city: str
    days: List[ItineraryDay]

class ItineraryGenerateRequest(BaseModel):
    title: Optional[str] = None  # Opcional - si no se proporciona, se genera automáticamente
    city: str
    days: int  # Número de días (se convierte a lista de días en el servicio)
    start_date: Optional[str] = None
    preferences: Optional[Dict] = None