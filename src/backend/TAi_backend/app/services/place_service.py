from app.repositories.place_repository import place_repository
from app.services.external.google_places import google_places_facade
from app.services.external.tripadvisor import tripadvisor_facade
from app.models.place import Place, PlaceDetails, PlaceSearchParams
from typing import List, Optional

class PlaceService:
    def __init__(self):
        self.google_places = google_places_facade

    def search_places(self, params: PlaceSearchParams) -> List[Place]:
        # Limitar radio máximo a 5km
        max_radius = 5000  # 5km máximo
        search_radius = min(params.radius, max_radius)

        # 1) Google Places - búsqueda principal
        results = self.google_places.search_nearby(
            location={'latitude': params.location.latitude, 'longitude': params.location.longitude},
            radius=search_radius,
            place_type=params.place_type,
            keyword=params.query
        )

        places: List[Place] = []
        for result in results:
            # Solo agregar si tiene place_id válido (empieza con ChIJ o similar)
            if result.get('place_id') and len(result.get('place_id', '')) > 10:
                place_repository.save_place(result)
                places.append(Place(**result))

        # 1b) Reintento sin filtro de tipo si Google devolvió vacío
        if len(places) == 0:
            fallback_query = params.query or "tourist attraction"
            retry_results = self.google_places.search_nearby(
                location={'latitude': params.location.latitude, 'longitude': params.location.longitude},
                radius=search_radius,  # Mantener mismo radio (máx 5km)
                place_type=None,
                keyword=fallback_query
            )
            for result in retry_results:
                # Solo agregar si tiene place_id válido
                if result.get('place_id') and len(result.get('place_id', '')) > 10:
                    place_repository.save_place(result)
                    places.append(Place(**result))

        # 1c) Fallback a text_search si aún está vacío
        if len(places) == 0:
            text_query = params.query or "puntos de interés"
            text_results = self.google_places.text_search(
                query=text_query,
                location={'latitude': params.location.latitude, 'longitude': params.location.longitude},
                radius=search_radius,  # Mantener mismo radio (máx 5km)
            )
            for result in text_results:
                # Solo agregar si tiene place_id válido
                if result.get('place_id') and len(result.get('place_id', '')) > 10:
                    place_repository.save_place(result)
                    places.append(Place(**result))

        # NO usar TripAdvisor - solo lugares reales de Google Places
        # Si Google Places no devuelve nada, mejor retornar vacío

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
