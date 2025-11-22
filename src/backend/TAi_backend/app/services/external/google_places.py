# ==================== app/services/external/google_places.py ====================
import googlemaps
from typing import List, Dict, Optional
from app.core.config import settings
from app.utils.cache import firebase_cache
import logging
import time
import hashlib
import json
import requests
from pathlib import Path

logger = logging.getLogger(__name__)

class GooglePlacesFacade:
    def __init__(self):
        api_key = settings.GOOGLE_PLACES_API_KEY
        if not api_key:
            raise ValueError("GOOGLE_PLACES_API_KEY no configurada")
        self.client = googlemaps.Client(key=api_key)
        self.rate_limit = settings.GOOGLE_PLACES_RATE_LIMIT
        self.last_request_time = 0
        self.cache_prefix = 'google_places'
        self.cache_ttl = 43200  # 12 horas
    
    def _rate_limit_check(self):
        current_time = time.time()
        time_diff = current_time - self.last_request_time
        min_interval = 60.0 / self.rate_limit
        
        if time_diff < min_interval:
            time.sleep(min_interval - time_diff)
        
        self.last_request_time = time.time()
    
    def _generate_cache_key(self, operation: str, params: Dict) -> str:
        params_str = json.dumps(params, sort_keys=True)
        key_str = f"{operation}_{params_str}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def search_nearby(
        self,
        location: Dict[str, float],
        radius: int = 5000,
        place_type: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> List[Dict]:
        cache_params = {
            'lat': location['latitude'],
            'lng': location['longitude'],
            'radius': radius,
            'type': place_type,
            'keyword': keyword
        }
        cache_key = self._generate_cache_key('search_nearby', cache_params)
        
        cached_result = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_result:
            logger.info(f"Google Places search_nearby obtenido del caché")
            return cached_result
        
        try:
            self._rate_limit_check()
            
            params = {
                'location': (location['latitude'], location['longitude']),
                'radius': radius,
                'rank_by': 'prominence'
            }
            
            if place_type:
                params['type'] = place_type
            if keyword:
                params['keyword'] = keyword
            
            results = self.client.places_nearby(**params)
            formatted_results = self._format_results(results.get('results', []))
            
            firebase_cache.set(self.cache_prefix, cache_key, formatted_results, self.cache_ttl)
            logger.info(f"Google Places search_nearby guardado en caché")
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error buscando lugares: {str(e)}")
            return []

    def text_search(
        self,
        query: str,
        location: Dict[str, float],
        radius: int = 5000
    ) -> List[Dict]:
        """
        Búsqueda de texto como fallback cuando nearby devuelve vacío o está limitado.
        Usa el endpoint REST oficial de Text Search.
        """
        cache_params = {
            'query': query,
            'lat': location['latitude'],
            'lng': location['longitude'],
            'radius': radius,
        }
        cache_key = self._generate_cache_key('text_search', cache_params)

        cached_result = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_result:
            logger.info("Google Places text_search obtenido del caché")
            return cached_result

        try:
            self._rate_limit_check()
            url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            params = {
                "query": query,
                "location": f"{location['latitude']},{location['longitude']}",
                "radius": radius,
                "key": settings.GOOGLE_PLACES_API_KEY.get_secret_value()  # type: ignore
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            formatted_results = self._format_results(results)

            firebase_cache.set(self.cache_prefix, cache_key, formatted_results, self.cache_ttl)
            logger.info("Google Places text_search guardado en caché")
            return formatted_results
        except Exception as e:
            logger.error(f"Error en text_search: {str(e)}")
            return []
    
    def get_place_details(self, place_id: str) -> Optional[Dict]:
        cache_key = f"details_{place_id}"
        
        cached_details = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_details:
            logger.info(f"Place details {place_id} obtenido del caché")
            return cached_details
        
        try:
            self._rate_limit_check()
            result = self.client.place(place_id)
            formatted_details = self._format_place_details(result.get('result', {}))
            
            firebase_cache.set(self.cache_prefix, cache_key, formatted_details, self.cache_ttl * 2)
            logger.info(f"Place details {place_id} guardado en caché")
            
            return formatted_details
            
        except Exception as e:
            logger.error(f"Error obteniendo detalles: {str(e)}")
            return None

    def _format_results(self, places: List[Dict]) -> List[Dict]:
        """Formatea los resultados de búsqueda"""
        formatted = []
        for place in places:
            formatted_place = {
                'id': place.get('place_id'),
                'name': place.get('name'),
                'coords': {
                    'latitude': place.get('geometry', {}).get('location', {}).get('lat'),
                    'longitude': place.get('geometry', {}).get('location', {}).get('lng')
                },
                'rating': place.get('rating'),
                'address': place.get('vicinity'),
                'price_level': place.get('price_level'),
                'photos': [
                    f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo['photo_reference']}&key={settings.GOOGLE_PLACES_API_KEY}"
                    for photo in place.get('photos', [])[:3]
                ],
                'sources': ['google', 'tripadvisor'],
                'tripadvisor': None,  # Se llenará si hay datos disponibles
                'categories': place.get('types', [])
            }
            formatted.append(formatted_place)
        return formatted

    def _format_place_details(self, place: Dict) -> Dict:
        """Formatea los detalles de un lugar"""
        return {
            'id': place.get('place_id'),
            'name': place.get('name'),
            'coords': {
                'latitude': place.get('geometry', {}).get('location', {}).get('lat'),
                'longitude': place.get('geometry', {}).get('location', {}).get('lng')
            },
            'rating': place.get('rating'),
            'address': place.get('formatted_address'),
            'price_level': place.get('price_level'),
            'photos': [
                f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo['photo_reference']}&key={settings.GOOGLE_PLACES_API_KEY}"
                for photo in place.get('photos', [])[:5]
            ],
            'sources': ['google', 'tripadvisor'],
            'tripadvisor': None,  # Se llenará si hay datos disponibles
            'categories': place.get('types', []),
            'phone': place.get('formatted_phone_number'),
            'website': place.get('website'),
            'opening_hours': place.get('opening_hours'),
            'reviews_count': place.get('user_ratings_total', 0),
            'reviews': [
                {
                    'author': review.get('author_name'),
                    'rating': review.get('rating'),
                    'text': review.get('text'),
                    'time': review.get('time')
                }
                for review in place.get('reviews', [])[:5]
            ]
        }

# Instancia global
google_places_facade = GooglePlacesFacade()
