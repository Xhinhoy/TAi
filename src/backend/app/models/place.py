from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class GeoPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitud")
    longitude: float = Field(..., ge=-180, le=180, description="Longitud")

class Place(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    coords: GeoPoint
    rating: Optional[float] = Field(None, ge=0, le=5)
    address: Optional[str] = None
    price_level: Optional[int] = Field(None, ge=0, le=4)
    photos: List[str] = Field(default_factory=list)
    source: str = Field(default="google")
    categories: List[str] = Field(default_factory=list)
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
    radius: int = Field(default=5000, gt=0, le=50000)
    place_type: Optional[str] = None
    categories: List[str] = Field(default_factory=list)
