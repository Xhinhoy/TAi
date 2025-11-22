from app.repositories.place_repository import place_repository
from app.services.external.google_places import GooglePlacesFacade
from app.models.place import Place, PlaceDetails, PlaceSearchParams
from typing import List, Optional

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


