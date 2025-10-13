from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class GeoPoint(BaseModel):
    latitude: float
    longitude: float

class Place(BaseModel):
    id: str
    name: str
    coords: GeoPoint
    rating: Optional[float] = None
    address: Optional[str] = None
    price_level: Optional[int] = None
    photos: List[str] = []
    source: str = "google"
    categories: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PlaceDetails(Place):
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[Dict] = None
    reviews_count: int = 0
    reviews: List[Dict] = []

class PlaceSearchParams(BaseModel):
    query: Optional[str] = None
    location: GeoPoint
    radius: int = 5000
    place_type: Optional[str] = None
    categories: List[str] = []
