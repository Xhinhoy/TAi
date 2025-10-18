from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class ItineraryItem(BaseModel):
    day: int
    place_id: str
    place_name: Optional[str] = None
    start: str
    end: str
    notes: Optional[str] = None

class Itinerary(BaseModel):
    id: Optional[str] = None
    title: str
    city: str
    days: int
    items: List[ItineraryItem] = []
    owner_uid: str
    score: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ItineraryCreate(BaseModel):
    title: str
    city: str
    days: int
    items: List[ItineraryItem] = []

class ItineraryGenerateRequest(BaseModel):
    title: Optional[str] = None  # Opcional - si no se proporciona, se genera automáticamente
    city: str
    days: int
    start_date: Optional[str] = None
    preferences: Optional[Dict] = None