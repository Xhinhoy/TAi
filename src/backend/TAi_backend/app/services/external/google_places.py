# ==================== app/services/external/google_places.py ====================
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
        # Manejar tanto string como SecretStr
        self.api_key = api_key.get_secret_value() if hasattr(api_key, 'get_secret_value') else str(api_key)
        self.rate_limit = settings.GOOGLE_PLACES_RATE_LIMIT
        self.last_request_time = 0
        self.cache_prefix = 'google_places'
        self.cache_ttl = 43200  # 12 horas
        # URL base para la API legacy de Google Places
        self.base_url = "https://maps.googleapis.com/maps/api/place"
    
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

            # Usar la API legacy de Google Places
            url = f"{self.base_url}/nearbysearch/json"

            params = {
                'location': f"{location['latitude']},{location['longitude']}",
                'radius': radius,
                'key': self.api_key
            }

            if place_type:
                params['type'] = place_type

            if keyword:
                params['keyword'] = keyword

            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get('status') != 'OK':
                logger.warning(f"Google Places status: {data.get('status')}")
                return []

            formatted_results = self._format_legacy_results(data.get('results', []))

            firebase_cache.set(self.cache_prefix, cache_key, formatted_results, self.cache_ttl)
            logger.info(f"Google Places search_nearby guardado en caché ({len(formatted_results)} resultados)")

            return formatted_results

        except Exception as e:
            logger.error(f"Error buscando lugares: {str(e)}")
            return []

    def text_search(
        self,
        query: str,
        location: Optional[Dict[str, float]] = None,
        radius: int = 5000
    ) -> List[Dict]:
        """
        Búsqueda de texto como fallback cuando nearby devuelve vacío o está limitado.
        Usa la API legacy de Google Places.
        Location es opcional - si se proporciona, se usa como locationBias.
        """
        cache_params = {
            'query': query,
            'lat': location['latitude'] if location else None,
            'lng': location['longitude'] if location else None,
            'radius': radius,
        }
        cache_key = self._generate_cache_key('text_search', cache_params)

        cached_result = firebase_cache.get(self.cache_prefix, cache_key)
        if cached_result:
            logger.info("Google Places text_search obtenido del caché")
            return cached_result

        try:
            self._rate_limit_check()
            url = f"{self.base_url}/textsearch/json"

            params = {
                'query': query,
                'key': self.api_key
            }

            # Agregar location solo si se proporciona
            if location:
                params['location'] = f"{location['latitude']},{location['longitude']}"
                params['radius'] = radius

            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get('status') != 'OK':
                logger.warning(f"Google Places text_search status: {data.get('status')}")
                return []

            formatted_results = self._format_legacy_results(data.get('results', []))

            firebase_cache.set(self.cache_prefix, cache_key, formatted_results, self.cache_ttl)
            logger.info(f"Google Places text_search guardado en caché ({len(formatted_results)} resultados)")
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

            # Usar la API legacy de Google Places
            url = f"{self.base_url}/details/json"

            params = {
                'place_id': place_id,
                'key': self.api_key,
                'fields': 'place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,photos,types,opening_hours,formatted_phone_number,website,reviews,editorial_summary'
            }

            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get('status') != 'OK':
                logger.warning(f"Google Places details status: {data.get('status')}")
                return None

            place_data = data.get('result')
            if not place_data:
                return None

            formatted_details = self._format_place_details_legacy(place_data)

            firebase_cache.set(self.cache_prefix, cache_key, formatted_details, self.cache_ttl * 2)
            logger.info(f"Place details {place_id} guardado en caché")

            return formatted_details

        except Exception as e:
            logger.error(f"Error obteniendo detalles: {str(e)}")
            return None

    def _format_legacy_results(self, places: List[Dict]) -> List[Dict]:
        """Formatea los resultados de búsqueda de la API legacy"""
        formatted = []
        for place in places:
            # Manejar opening hours
            opening_hours = None
            hours_data = place.get('opening_hours')
            if hours_data:
                opening_hours = {
                    'open_now': hours_data.get('open_now', False),
                    'weekday_text': hours_data.get('weekday_text', [])
                }

            formatted_place = {
                'id': place.get('place_id'),
                'place_id': place.get('place_id'),
                'name': place.get('name'),
                'coords': {
                    'latitude': place.get('geometry', {}).get('location', {}).get('lat'),
                    'longitude': place.get('geometry', {}).get('location', {}).get('lng')
                },
                'rating': place.get('rating'),
                'address': place.get('vicinity') or place.get('formatted_address'),
                'price_level': place.get('price_level'),
                'photos': [
                    f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo['photo_reference']}&key={self.api_key}"
                    for photo in place.get('photos', [])[:3]
                ],
                'sources': ['google'],
                'categories': place.get('types', []),
                'opening_hours': opening_hours
            }
            formatted.append(formatted_place)
        return formatted

    def _format_place_details_legacy(self, place: Dict) -> Dict:
        """Formatea los detalles de un lugar de la API legacy"""
        # Manejar opening hours con open_now
        opening_hours = None
        hours_data = place.get('opening_hours')
        if hours_data:
            opening_hours = {
                'open_now': hours_data.get('open_now', False),
                'weekday_text': hours_data.get('weekday_text', []),
                'periods': hours_data.get('periods', [])
            }

        return {
            'id': place.get('place_id'),
            'place_id': place.get('place_id'),
            'name': place.get('name'),
            'coords': {
                'latitude': place.get('geometry', {}).get('location', {}).get('lat'),
                'longitude': place.get('geometry', {}).get('location', {}).get('lng')
            },
            'rating': place.get('rating'),
            'formatted_address': place.get('formatted_address'),
            'price_level': place.get('price_level'),
            'photos': [
                f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo['photo_reference']}&key={self.api_key}"
                for photo in place.get('photos', [])[:5]
            ],
            'sources': ['google'],
            'categories': place.get('types', []),
            'formatted_phone_number': place.get('formatted_phone_number'),
            'website': place.get('website'),
            'opening_hours': opening_hours,
            'user_ratings_total': place.get('user_ratings_total', 0),
            'reviews': [
                {
                    'author_name': review.get('author_name'),
                    'rating': review.get('rating'),
                    'text': review.get('text'),
                    'relative_time_description': review.get('relative_time_description', ''),
                    'time': review.get('time')
                }
                for review in place.get('reviews', [])[:5]
            ],
            'editorial_summary': {
                'overview': place.get('editorial_summary', {}).get('overview', '')
            } if place.get('editorial_summary') else None
        }

    def _format_new_api_results(self, places: List[Dict]) -> List[Dict]:
        """Formatea los resultados de búsqueda de la nueva API"""
        formatted = []
        for place in places:
            # Extraer place_id del id completo (format: places/ChIJ...)
            full_id = place.get('id', '')
            place_id = full_id.replace('places/', '') if full_id.startswith('places/') else full_id

            # Manejar opening hours
            opening_hours = None
            current_hours = place.get('currentOpeningHours') or place.get('regularOpeningHours')
            if current_hours:
                opening_hours = {
                    'open_now': current_hours.get('openNow', False),
                    'weekday_text': current_hours.get('weekdayDescriptions', [])
                }

            formatted_place = {
                'id': place_id,
                'place_id': place_id,
                'name': place.get('displayName', {}).get('text', ''),
                'coords': {
                    'latitude': place.get('location', {}).get('latitude'),
                    'longitude': place.get('location', {}).get('longitude')
                },
                'rating': place.get('rating'),
                'address': place.get('formattedAddress', ''),
                'price_level': self._convert_price_level(place.get('priceLevel')),
                'photos': self._format_photos(place.get('photos', [])[:3]),
                'sources': ['google'],
                'categories': place.get('types', []),
                'opening_hours': opening_hours
            }
            formatted.append(formatted_place)
        return formatted

    def _format_place_details_new_api(self, place: Dict) -> Dict:
        """Formatea los detalles de un lugar de la nueva API"""
        # Extraer place_id del id completo
        full_id = place.get('id', '')
        place_id = full_id.replace('places/', '') if full_id.startswith('places/') else full_id

        # Manejar opening hours
        opening_hours = None
        current_hours = place.get('currentOpeningHours') or place.get('regularOpeningHours')
        if current_hours:
            opening_hours = {
                'open_now': current_hours.get('openNow', False),
                'weekday_text': current_hours.get('weekdayDescriptions', []),
                'periods': current_hours.get('periods', [])
            }

        # Formatear reseñas
        reviews = []
        for review in place.get('reviews', [])[:5]:
            reviews.append({
                'author_name': review.get('authorAttribution', {}).get('displayName', 'Usuario'),
                'rating': review.get('rating'),
                'text': review.get('text', {}).get('text', ''),
                'relative_time_description': review.get('relativePublishTimeDescription', ''),
                'time': review.get('publishTime', '')
            })

        return {
            'id': place_id,
            'place_id': place_id,
            'name': place.get('displayName', {}).get('text', ''),
            'coords': {
                'latitude': place.get('location', {}).get('latitude'),
                'longitude': place.get('location', {}).get('longitude')
            },
            'rating': place.get('rating'),
            'formatted_address': place.get('formattedAddress', ''),
            'price_level': self._convert_price_level(place.get('priceLevel')),
            'photos': self._format_photos(place.get('photos', [])[:5]),
            'sources': ['google'],
            'categories': place.get('types', []),
            'formatted_phone_number': place.get('internationalPhoneNumber'),
            'website': place.get('websiteUri'),
            'opening_hours': opening_hours,
            'user_ratings_total': place.get('userRatingCount', 0),
            'reviews': reviews,
            'editorial_summary': {
                'overview': place.get('editorialSummary', {}).get('text', {}).get('text', '')
            } if place.get('editorialSummary') else None
        }

    def _convert_price_level(self, price_level_str: Optional[str]) -> Optional[int]:
        """Convierte el price level de string a número"""
        if not price_level_str:
            return None
        price_map = {
            'PRICE_LEVEL_FREE': 0,
            'PRICE_LEVEL_INEXPENSIVE': 1,
            'PRICE_LEVEL_MODERATE': 2,
            'PRICE_LEVEL_EXPENSIVE': 3,
            'PRICE_LEVEL_VERY_EXPENSIVE': 4
        }
        return price_map.get(price_level_str)

    def _format_photos(self, photos: List[Dict]) -> List[str]:
        """Formatea las URLs de fotos de la nueva API"""
        formatted_photos = []
        for photo in photos:
            photo_name = photo.get('name', '')
            if photo_name:
                # Nueva API usa photo names en formato photos/{photo_id}
                formatted_photos.append(
                    f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&maxWidthPx=800&key={self.api_key}"
                )
        return formatted_photos

# Instancia global
google_places_facade = GooglePlacesFacade()
