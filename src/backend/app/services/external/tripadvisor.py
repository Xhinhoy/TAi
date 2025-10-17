from typing import List, Dict, Optional
from app.core.config import settings
from app.utils.cache import firebase_cache
import logging
import time
import hashlib
import json
import requests
logger = logging.getLogger(__name__)

class TripAdvisorFacade:
    """Facade para TripAdvisor API con caché Firebase"""
    
    def __init__(self):
        self.api_key = settings.TRIPADVISOR_API_KEY
        self.base_url = "https://api.content.tripadvisor.com/api/v1/location"
        self.rate_limit = settings.TRIPADVISOR_RATE_LIMIT
        self.last_request_time = 0
        self.cache_prefix = 'tripadvisor'
        self.cache_ttl = 43200  # 12 horas
    
    def _rate_limit_check(self):
        """Rate limiting"""
        current_time = time.time()
        time_diff = current_time - self.last_request_time
        min_interval = 60.0 / self.rate_limit
        
        if time_diff < min_interval:
            time.sleep(min_interval - time_diff)
        
        self.last_request_time = time.time()
    
    def _generate_cache_key(self, operation: str, params: Dict) -> str:
        """Genera clave única para caché"""
        params_str = json.dumps(params, sort_keys=True)
        key_str = f"{operation}_{params_str}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def search_location(self, query: str, lat: float, lng: float) -> List[Dict]:
        """Busca ubicaciones en TripAdvisor con caché"""
        
        # Generar clave de caché
        cache_params = {'query': query, 'lat': lat, 'lng': lng}
        cache_key = self._generate_cache_key('search_location', cache_params)
        
        # Intentar del caché
        cached_result = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_result:
            logger.info(f"TripAdvisor search_location obtenido del caché")
            return cached_result
        
        # No está en caché, hacer request
        try:
            self._rate_limit_check()
            
            url = f"{self.base_url}/search"
            params = {
                'key': self.api_key,
                'q': query,
                'lat': lat,
                'lng': lng,
                'limit': 20
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            results = response.json().get('data', [])
            
            # Guardar en caché
            firebase_cache.set(self.cache_prefix, cache_key, results, self.cache_ttl)
            logger.info(f"TripAdvisor search_location guardado en caché")
            
            return results
            
        except Exception as e:
            logger.error(f"Error buscando en TripAdvisor: {str(e)}")
            return []
    
    def get_reviews(self, location_id: str, limit: int = 5) -> List[Dict]:
        """Obtiene reviews de un lugar con caché"""
        
        # Clave de caché
        cache_key = f"reviews_{location_id}_{limit}"
        
        # Intentar del caché
        cached_reviews = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_reviews:
            logger.info(f"Reviews {location_id} obtenidas del caché")
            return cached_reviews
        
        # No está en caché
        try:
            self._rate_limit_check()
            
            url = f"{self.base_url}/{location_id}/reviews"
            params = {
                'key': self.api_key,
                'limit': limit
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            reviews = response.json().get('data', [])
            
            # Guardar en caché (menor TTL para reviews)
            firebase_cache.set(self.cache_prefix, cache_key, reviews, 21600)  # 6 horas
            logger.info(f"Reviews {location_id} guardadas en caché")
            
            return reviews
            
        except Exception as e:
            logger.error(f"Error obteniendo reviews: {str(e)}")
            return []
    
    def get_location_details(self, location_id: str) -> Optional[Dict]:
        """Obtiene detalles de una ubicación con caché"""
        
        # Clave de caché
        cache_key = f"details_{location_id}"
        
        # Intentar del caché
        cached_details = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_details:
            logger.info(f"Details {location_id} obtenidos del caché")
            return cached_details
        
        # No está en caché
        try:
            self._rate_limit_check()
            
            url = f"{self.base_url}/{location_id}"
            params = {'key': self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            details = response.json()
            
            # Guardar en caché
            firebase_cache.set(self.cache_prefix, cache_key, details, self.cache_ttl)
            logger.info(f"Details {location_id} guardados en caché")
            
            return details
            
        except Exception as e:
            logger.error(f"Error obteniendo detalles: {str(e)}")
            return None

# Instancia global
tripadvisor_facade = TripAdvisorFacade()