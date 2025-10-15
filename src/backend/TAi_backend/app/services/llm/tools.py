# ==================== app/services/llm/tools.py ====================
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Type
from app.services.external.google_places import GooglePlacesFacade
from app.services.external.tripadvisor import tripadvisor_facade
import json

class SearchPlacesInput(BaseModel):
    query: Optional[str] = Field(default=None, description="Texto de búsqueda")
    latitude: float = Field(description="Latitud")
    longitude: float = Field(description="Longitud")
    radius: int = Field(default=5000, description="Radio en metros")
    place_type: Optional[str] = Field(default=None, description="Tipo de lugar")

class SearchPlacesTool(BaseTool):
    name: str = "search_places"
    description: str = """Busca lugares usando Google Places API.
    Útil para encontrar restaurantes, museos, parques, etc.
    Input: query, latitude, longitude, radius, place_type"""
    args_schema: Type[BaseModel] = SearchPlacesInput
    
    def _run(self, query: str = None, latitude: float = 0, longitude: float = 0,  # type: ignore
             radius: int = 5000, place_type: str = None) -> str: # type: ignore
        location = {'latitude': latitude, 'longitude': longitude}
        results = GooglePlacesFacade.search_nearby(
            location=location,
            radius=radius,
            place_type=place_type,
            keyword=query
        ) # type: ignore
        return json.dumps(results[:10])
    
    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)

class GetPlaceDetailsInput(BaseModel):
    place_id: str = Field(description="ID del lugar")

class GetPlaceDetailsTool(BaseTool):
    name: str = "get_place_details"
    description: str = """Obtiene detalles completos de un lugar específico.
    Input: place_id"""
    args_schema: Type[BaseModel] = GetPlaceDetailsInput
    
    def _run(self, place_id: str) -> str:
        details = GooglePlacesFacade.get_place_details(place_id) # type: ignore
        return json.dumps(details) if details else "{}"
    
    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)

class GetReviewsInput(BaseModel):
    location_id: str = Field(description="ID de la ubicación en TripAdvisor")
    limit: int = Field(default=5, description="Número de reviews")

class GetReviewsTool(BaseTool):
    name: str = "get_reviews"
    description: str = """Obtiene reviews de TripAdvisor.
    Input: location_id, limit"""
    args_schema: Type[BaseModel] = GetReviewsInput
    
    def _run(self, location_id: str, limit: int = 5) -> str:
        reviews = tripadvisor_facade.get_reviews(location_id, limit)
        return json.dumps(reviews)
    
    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)
    
class FilterPlacesByInterestsInput(BaseModel):
    places_json: str = Field(description="JSON string con lista de lugares")
    user_interests: List[str] = Field(description="Intereses del usuario")

class FilterPlacesByInterestsTool(BaseTool):
    name: str = "filter_by_interests"
    description: str = """Filtra y rankea lugares según los intereses del usuario.
    Input: places_json (string JSON), user_interests (lista)"""
    args_schema: Type[BaseModel] = FilterPlacesByInterestsInput
    
    def _run(self, places_json: str, user_interests: List[str]) -> str:
        try:
            places = json.loads(places_json)
            
            # Mapa de intereses a categorías de Google Places
            interest_map = {
                'museos': ['museum', 'art_gallery'],
                'monumentos': ['monument', 'landmark'],
                'parques': ['park', 'nature'],
                'restaurantes': ['restaurant', 'food'],
                'bares': ['bar', 'night_club'],
                'playa': ['beach', 'aquatic'],
                'senderismo': ['hiking', 'mountain'],
                'vida-nocturna': ['night_club', 'bar'],
                'compras': ['shopping_mall', 'store'],
                'arquitectura': ['landmark', 'building'],
                'mercados': ['market', 'shopping'],
                'deportes': ['stadium', 'sports']
            }
            
            # Crear set de categorías relevantes
            relevant_categories = set()
            for interest in user_interests:
                if interest in interest_map:
                    relevant_categories.update(interest_map[interest])
            
            # Rankear lugares
            scored_places = []
            for place in places:
                score = 0
                place_categories = place.get('categories', [])
                
                for category in place_categories:
                    if category in relevant_categories:
                        score += 1
                
                # Bonus por rating
                if place.get('rating'):
                    score += place['rating'] / 5.0
                
                if score > 0:
                    scored_places.append({
                        **place,
                        'relevance_score': score
                    })
            
            # Ordenar por score
            scored_places.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return json.dumps(scored_places[:15])
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)

class OptimizeRouteInput(BaseModel):
    places_json: str = Field(description="JSON string con lista de lugares")

class OptimizeRouteTool(BaseTool):
    name: str = "optimize_route"
    description: str = """Optimiza el orden de visitas para minimizar desplazamientos.
    Input: places_json (string JSON)"""
    args_schema: Type[BaseModel] = OptimizeRouteInput
    
    def _run(self, places_json: str) -> str:
        try:
            places = json.loads(places_json)
            
            # Algoritmo simple de vecino más cercano
            if not places:
                return json.dumps([])
            
            optimized = [places[0]]
            remaining = places[1:]
            
            while remaining:
                last = optimized[-1]
                last_coords = last['coords']
                
                # Encontrar el más cercano
                closest = min(remaining, key=lambda p: (
                    (p['coords']['latitude'] - last_coords['latitude'])**2 +
                    (p['coords']['longitude'] - last_coords['longitude'])**2
                ))
                
                optimized.append(closest)
                remaining.remove(closest)
            
            return json.dumps(optimized)
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)