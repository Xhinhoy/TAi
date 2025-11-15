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
import re
import asyncio
import aiohttp


logger = logging.getLogger(__name__)

class GooglePlacesFacade:
    def __init__(self):
        self.api_key = (
            settings.GOOGLE_PLACES_API_KEY.get_secret_value()
            if settings.GOOGLE_PLACES_API_KEY
            else None
        )
        self.client = googlemaps.Client(key=self.api_key)
        self.base_url = "https://maps.googleapis.com/maps/api/place"  
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
        # ✅ Elimina caracteres ilegales
        safe_key = re.sub(r'[^a-zA-Z0-9]', '_', key_str)
        return hashlib.md5(safe_key.encode()).hexdigest()
    
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
    async def text_search(self, query: str, location: Dict, radius: int = 5000) -> List[Dict]:
        """Busca lugares con datos detallados (paraleliza requests)."""
        from app.utils.cache import firebase_cache

        cache_key = f"text_search_{query}_{location.get('latitude')}_{location.get('longitude')}"
        cached = firebase_cache.get("google_places", cache_key)
        if cached:
            logger.info("Google Places text_search obtenido del caché")
            return cached

        try:
            self._rate_limit_check()

            params = {
                "query": query,
                "location": f"{location['latitude']},{location['longitude']}",
                "radius": radius,
                "key": self.api_key,
            }

            # --- Primera request: búsqueda base ---
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/textsearch/json", params=params, timeout=10) as resp:
                    data = await resp.json()

                results = data.get("results", [])[:5]  # limitamos a 5 resultados buenos

                # --- Peticiones paralelas para obtener detalles de cada lugar ---
                async def fetch_details(place_id):
                    details_params = {
                        "place_id": place_id,
                        "fields": "name,geometry,formatted_address,rating,price_level,opening_hours,user_ratings_total,types,photos",
                        "key": self.api_key,
                    }
                    async with session.get(f"{self.base_url}/details/json", params=details_params, timeout=10) as r:
                        det = await r.json()
                        return det.get("result", {})

                tasks = [fetch_details(r["place_id"]) for r in results if "place_id" in r]
                details_list = await asyncio.gather(*tasks, return_exceptions=True)

                enriched = []
                for base, details in zip(results, details_list):
                    if not isinstance(details, dict):
                        continue

                    merged = {**base, **details}

                    # Fallbacks para datos ausentes en los detalles
                    if "geometry" not in merged or not merged.get("geometry"):
                        merged["geometry"] = base.get("geometry", {})
                    if not merged.get("formatted_address"):
                        merged["formatted_address"] = base.get("formatted_address") or base.get("vicinity")
                    if not merged.get("opening_hours") and base.get("opening_hours"):
                        merged["opening_hours"] = base.get("opening_hours")
                    if not merged.get("photos") and base.get("photos"):
                        merged["photos"] = base.get("photos")

                    formatted = self._format_place_details(merged)
                    if formatted:
                        enriched.append(formatted)

            firebase_cache.set("google_places", cache_key, enriched, self.cache_ttl)
            logger.info("Google Places text_search guardado en caché")
            return enriched

        except Exception as e:
            logger.error(f"Error en text_search: {e}")
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
    def _extract_coords(self, geometry: Dict) -> Optional[Dict[str, float]]:
        location = (geometry or {}).get("location", {})
        lat = location.get("lat") or location.get("latitude")
        lng = location.get("lng") or location.get("longitude")

        if lat is None or lng is None:
            return None

        try:
            return {"latitude": float(lat), "longitude": float(lng)}
        except (TypeError, ValueError):
            return None

    def _format_opening_hours(self, opening_hours: Optional[Dict]) -> Optional[Dict[str, Optional[object]]]:
        if not isinstance(opening_hours, dict):
            return None

        formatted = {
            "open_now": opening_hours.get("open_now"),
            "weekday_text": opening_hours.get("weekday_text", []),
        }

        if formatted["open_now"] is None and not formatted["weekday_text"]:
            return None

        return formatted

    def _build_photo_urls(self, photos: Optional[List[Dict]]) -> List[str]:
        if not photos or not self.api_key:
            return []

        urls = []
        for photo in photos:
            if not isinstance(photo, dict):
                continue
            reference = photo.get("photo_reference")
            if not reference:
                continue
            urls.append(
                f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={reference}&key={self.api_key}"
            )
        return urls

    def _format_reviews(self, reviews: Optional[List[Dict]]) -> List[Dict]:
        if not isinstance(reviews, list):
            return []

        formatted_reviews = []
        for review in reviews:
            if not isinstance(review, dict):
                continue
            formatted_reviews.append({
                "author_name": review.get("author_name"),
                "rating": review.get("rating"),
                "text": review.get("text"),
                "time": review.get("time"),
                "relative_time_description": review.get("relative_time_description"),
                "profile_photo_url": review.get("profile_photo_url"),
            })
        return formatted_reviews

    def _format_results(self, results: List[Dict]) -> List[Dict]:
        """Formatea los resultados crudos de la API de Google Places"""
        formatted: List[Dict] = []
        for r in results:
            place_id = r.get("place_id")
            coords = self._extract_coords(r.get("geometry", {}))

            if not place_id or not coords:
                continue

            formatted.append({
                "id": place_id,
                "name": r.get("name"),
                "coords": coords,
                "rating": r.get("rating"),
                "address": r.get("vicinity") or r.get("formatted_address"),
                "price_level": r.get("price_level"),
                "opening_hours": self._format_opening_hours(r.get("opening_hours")),
                "photos": self._build_photo_urls(r.get("photos")),
                "source": "google",
                "categories": r.get("types", []),
            })
        return formatted

    def _format_place_details(self, result: Dict) -> Optional[Dict]:
        if not isinstance(result, dict) or not result:
            return None

        base = self._format_results([result])
        if not base:
            return None

        details = base[0]

        if result.get("formatted_address"):
            details["address"] = result.get("formatted_address")

        opening_hours = result.get("opening_hours") or result.get("current_opening_hours")
        formatted_opening_hours = self._format_opening_hours(opening_hours)
        if formatted_opening_hours is not None:
            details["opening_hours"] = formatted_opening_hours

        photos = self._build_photo_urls(result.get("photos"))
        if photos:
            details["photos"] = photos

        details.update(
            {
                "phone": result.get("formatted_phone_number")
                or result.get("international_phone_number"),
                "website": result.get("website"),
                "reviews_count": result.get("user_ratings_total") or 0,
                "reviews": self._format_reviews(result.get("reviews")),
            }
        )

        return details

    # ================================================================
    # 🔹 FIN DE INSERCIÓN _format_results()
    # ================================================================

    # 👇 ESTA LÍNEA ES LA QUE FALTABA
google_places_facade = GooglePlacesFacade()