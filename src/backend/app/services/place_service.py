from typing import Optional, List, Dict
from app.models.place import Place
from app.services.external.google_places import GooglePlacesFacade
from app.utils.cache import firebase_cache
from app.core.config import settings
import logging

from pydantic import BaseModel

class PlaceSearchParams(BaseModel):
    query: Optional[str] = None
    category: Optional[str] = None
    min_rating: Optional[float] = None
    max_price_level: Optional[int] = None
    limit: int = 10

from pydantic import BaseModel

class PlaceDetails(BaseModel):
    name: str
    address: Optional[str] = None
    rating: Optional[float] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    types: Optional[List[str]] = []
    location: Optional[Dict[str, float]] = None
    source: Optional[str] = "google"


class PlaceService:
    def search_places(self, params: PlaceSearchParams) -> List[Place]:
        results = GooglePlacesFacade.search_nearby(
            location={'latitude': params.location.latitude, 'longitude': params.location.longitude},
            radius=params.radius,
            place_type=params.place_type,
            keyword=params.query
        ) # type: ignore
        
        places = []
        for result in results:
            place_repository.save_place(result)
            places.append(Place(**result))
        
        return places
    
    def get_place_details(self, place_id: str) -> Optional[PlaceDetails]:
        cached = place_repository.get_place(place_id)
        if cached:
            return PlaceDetails(**cached)
        
        details = GooglePlacesFacade.get_place_details(place_id) # type: ignore
        if details:
            place_repository.save_place(details)
            return PlaceDetails(**details)
        
        return None
    
    def search_by_category(self, categories: List[str], limit: int = 20) -> List[Place]:
        results = place_repository.search_by_category(categories, limit)
        return [Place(**r) for r in results]

place_service = PlaceService()


