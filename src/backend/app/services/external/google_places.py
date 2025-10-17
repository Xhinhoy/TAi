# ==================== app/services/external/google_places.py ====================
import googlemaps
from typing import List, Dict, Optional
from app.core.config import settings
from app.utils.cache import firebase_cache
import logging
import time
import hashlib
import json

logger = logging.getLogger(__name__)

class GooglePlacesFacade:
    def __init__(self):
        self.client = googlemaps.Client(
                key=settings.GOOGLE_PLACES_API_KEY.get_secret_value()
                if settings.GOOGLE_PLACES_API_KEY
                else None
            )
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
        
    # ================================================================
    # INSERTAR AQUÍ el NUEVO MÉTODO text_search()
    # ================================================================
    def text_search(
    self,
    query: str,
    location: Optional[Dict[str, float]] = None,
    radius: int = 5000
) -> List[Dict]:
        """🔍 Busca lugares por texto con Google Places API (textsearch) y obtiene detalles."""
        cache_params = {
            "query": query, 
            "location": location,
            "radius": radius
        }
        cache_key = self._generate_cache_key("text_search", cache_params)

        cached_result = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_result:
            logger.info(f"Google Places text_search obtenido del caché")
            return cached_result

        try:
            self._rate_limit_check()

            params = {"query": query}
            if location:
                params["location"] = (location["latitude"], location["longitude"])
                params["radius"] = radius

            # Buscar lugares
            results = self.client.places(**params)
            places = results.get("results", [])

            # Obtener detalles para cada lugar (incluye horarios)
            detailed_results = []
            for p in places:
                place_id = p.get("place_id")
                if not place_id:
                    continue
                try:
                    details = self.client.place(place_id=place_id)
                    data = details.get("result", {})
                    formatted = {
                        "name": data.get("name"),
                        "address": data.get("formatted_address"),
                        "rating": data.get("rating"),
                        "place_id": data.get("place_id"),
                        "location": data.get("geometry", {}).get("location", {}),
                        "photos": [
                            f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={ph.get('photo_reference')}&key={settings.GOOGLE_PLACES_API_KEY.get_secret_value()}"
                            for ph in data.get("photos", [])
                        ] if data.get("photos") else [],
                        "opening_hours": data.get("opening_hours"),
                        "types": data.get("types", [])
                    }
                    detailed_results.append(formatted)
                except Exception as e:
                    logger.warning(f"Error obteniendo detalles de {place_id}: {e}")

            firebase_cache.set(self.cache_prefix, cache_key, detailed_results, self.cache_ttl)
            logger.info(f"Google Places text_search guardado en caché con detalles")
            return detailed_results

        except Exception as e:
            logger.error(f"Error en text_search: {str(e)}")
            return []
    # ================================================================
    # 🔹 FIN DE INSERCIÓN text_search()
    # ================================================================

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
        
  # ================================================================
    # 🔹 INSERTAR AL FINAL el MÉTODO _format_results()
    # ================================================================
    def _format_results(self, results: List[Dict]) -> List[Dict]:
        """Formatea los resultados crudos de la API de Google Places"""
        formatted = []
        for r in results:
            formatted.append({
                "name": r.get("name"),
                "address": r.get("vicinity") or r.get("formatted_address"),
                "rating": r.get("rating"),
                "place_id": r.get("place_id"),
                "types": r.get("types", []),
                "location": r.get("geometry", {}).get("location", {}),
                "photos": [
                    f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={p.get('photo_reference')}&key={settings.GOOGLE_PLACES_API_KEY.get_secret_value()}"
                    for p in r.get("photos", [])
                ] if r.get("photos") else [],
                "opening_hours": {
                    "open_now": r.get("opening_hours", {}).get("open_now"),
                    "weekday_text": r.get("opening_hours", {}).get("weekday_text", [])
                }
            })
        return formatted

    # ================================================================
    # 🔹 FIN DE INSERCIÓN _format_results()
    # ================================================================

    # 👇 ESTA LÍNEA ES LA QUE FALTABA
google_places_facade = GooglePlacesFacade()