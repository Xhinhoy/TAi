# ==================== app/services/llm/tools.py ====================
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
from typing import List, Optional, Type
from app.services.external.google_places import GooglePlacesFacade
import json
from math import radians, sin, cos, sqrt, asin

class SearchPlacesInput(BaseModel):
    query: Optional[str] = Field(default=None, description="Texto de búsqueda")
    latitude: float = Field(description="Latitud", ge=-90, le=90)
    longitude: float = Field(description="Longitud", ge=-180, le=180)
    radius: int = Field(default=5000, description="Radio en metros", gt=0, le=50000)
    place_type: Optional[str] = Field(default=None, description="Tipo de lugar")

class SearchPlacesTool(BaseTool):
    name: str = "search_places"
    description: str = """Busca lugares usando Google Places API.
    Útil para encontrar restaurantes, museos, parques, etc.
    Input: query, latitude, longitude, radius, place_type"""
    args_schema: Type[BaseModel] = SearchPlacesInput

    def _run(
        self,
        query: Optional[str] = None,
        latitude: float = 0,
        longitude: float = 0,
        radius: int = 5000,
        place_type: Optional[str] = None
    ) -> str:
        facade = GooglePlacesFacade()
        location = {'latitude': latitude, 'longitude': longitude}
        results = facade.search_nearby(
            location=location,
            radius=radius,
            place_type=place_type,
            keyword=query
        )
        return json.dumps(results[:10])

    async def _arun(self, *args, **kwargs) -> str:
        return self._run(*args, **kwargs)

class GetPlaceDetailsInput(BaseModel):
    place_id: str = Field(description="ID del lugar", min_length=1)

class GetPlaceDetailsTool(BaseTool):
    name: str = "get_place_details"
    description: str = """Obtiene detalles completos de un lugar específico.
    Input: place_id"""
    args_schema: Type[BaseModel] = GetPlaceDetailsInput

    def _run(self, place_id: str) -> str:
        facade = GooglePlacesFacade()
        details = facade.get_place_details(place_id)
        return json.dumps(details) if details else "{}"

    async def _arun(self, *args, **kwargs) -> str:
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

    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calcula distancia geodésica en km usando fórmula de Haversine"""
        R = 6371
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return R * c

    def _run(self, places_json: str) -> str:
        try:
            places = json.loads(places_json)

            if not places:
                return json.dumps([])

            if len(places) == 1:
                return json.dumps(places)

            # Nearest Neighbor con distancia Haversine
            optimized = [places[0]]
            remaining = places[1:]

            while remaining:
                last = optimized[-1]
                last_coords = last['coords']

                closest = min(remaining, key=lambda p: self._haversine_distance(
                    last_coords['latitude'],
                    last_coords['longitude'],
                    p['coords']['latitude'],
                    p['coords']['longitude']
                ))

                optimized.append(closest)
                remaining.remove(closest)

            return json.dumps(optimized)

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            return json.dumps({'error': f'Invalid input: {str(e)}'})
        except Exception as e:
            return json.dumps({'error': str(e)})

    async def _arun(self, *args, **kwargs) -> str:
        return self._run(*args, **kwargs)