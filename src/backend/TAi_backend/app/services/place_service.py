from app.repositories.place_repository import place_repository
from app.services.external.google_places import google_places_facade
from app.services.external.tripadvisor import tripadvisor_facade
from app.models.place import Place, PlaceDetails, PlaceSearchParams
from typing import List, Optional

class PlaceService:
    def __init__(self):
        self.google_places = google_places_facade

    def search_places(self, params: PlaceSearchParams) -> List[Place]:
        # 1) Google Places
        results = self.google_places.search_nearby(
            location={'latitude': params.location.latitude, 'longitude': params.location.longitude},
            radius=params.radius,
            place_type=params.place_type,
            keyword=params.query
        )
        
        places: List[Place] = []
        for result in results:
            place_repository.save_place(result)
            places.append(Place(**result))

        # 2) Fallback con TripAdvisor si Google no devolvió nada
        if len(places) == 0:
            fallback_query = params.query or "lugares de interés"
            ta_results = tripadvisor_facade.search_location(
                query=fallback_query,
                lat=params.location.latitude,
                lng=params.location.longitude
            )

            for ta in ta_results:
                try:
                    place_dict = {
                        "id": ta.get("location_id") or ta.get("id") or ta.get("name"),
                        "name": ta.get("name") or "Lugar recomendado",
                        "coords": {
                            "latitude": float(ta.get("latitude") or params.location.latitude),
                            "longitude": float(ta.get("longitude") or params.location.longitude)
                        },
                        "rating": float(ta.get("rating")) if ta.get("rating") else None,
                        "address": ta.get("address_obj", {}).get("address_string") or ta.get("address"),
                        "price_level": None,
                        "photos": [],
                        "sources": ["tripadvisor"],
                        "tripadvisor": ta,
                        "categories": [c.get("name") for c in ta.get("category", [])] if isinstance(ta.get("category"), list) else []
                    }
                    place_repository.save_place(place_dict)
                    places.append(Place(**place_dict))
                except Exception as e:
                    # Si algún campo falta, continuar con los demás
                    continue

        return places
    
    def get_place_details(self, place_id: str) -> Optional[PlaceDetails]:
        cached = place_repository.get_place(place_id)
        if cached:
            return PlaceDetails(**cached)
        
        details = self.google_places.get_place_details(place_id)
        if details:
            place_repository.save_place(details)
            return PlaceDetails(**details)
        
        return None
    
    def search_by_category(self, categories: List[str], limit: int = 20) -> List[Place]:
        results = place_repository.search_by_category(categories, limit)
        return [Place(**r) for r in results]
    
    def enrich_place_with_tripadvisor(self, place: Place) -> PlaceDetails:
        """Enriquece un lugar de Google Places con datos de TripAdvisor"""
        tripadvisor_results = tripadvisor_facade.search_location(
            query=place.name,
            lat=place.coords.latitude,
            lng=place.coords.longitude
        )
        
        place_dict = place.model_dump()
        
        if tripadvisor_results:
            location_id = tripadvisor_results[0].get('location_id')
            
            # Obtener reviews
            reviews = tripadvisor_facade.get_reviews(location_id, limit=5) # type: ignore
            
            # Agregar información de TripAdvisor
            place_dict['reviews'] = reviews
            place_dict['reviews_count'] = tripadvisor_results[0].get('num_reviews', 0)
            
            # Si TripAdvisor tiene mejor rating, usarlo
            tripadvisor_rating = tripadvisor_results[0].get('rating')
            if tripadvisor_rating and (not place.rating or tripadvisor_rating > place.rating):
                place_dict['rating'] = tripadvisor_rating
        
        return PlaceDetails(**place_dict)

place_service = PlaceService()
