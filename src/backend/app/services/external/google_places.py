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
        """Busca lugares con datos detallados (paraleliza requests).

        Returns:
            List[Dict]: Cada lugar contiene los campos normalizados y la llave
            ``opening_hours`` siempre como ``{"open_now": Optional[bool],
            "weekday_text": List[str]}`` cuando la información está
            disponible.
        """
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
                    try:
                        async with session.get(
                            f"{self.base_url}/details/json",
                            params=details_params,
                            timeout=10,
                        ) as r:
                            det = await r.json()
                            return det.get("result", {})
                    except Exception as exc:  # pragma: no cover - logging path
                        logger.warning("Fallo obteniendo detalles de %s: %s", place_id, exc)
                        return {}

                tasks = [fetch_details(r["place_id"]) for r in results if "place_id" in r]
                details_list = await asyncio.gather(*tasks, return_exceptions=True)

                enriched = []
                for base, details in zip(results, details_list):
                    detail_data = details if isinstance(details, dict) else {}
                    if not isinstance(details, dict):  # pragma: no cover - logging path
                        logger.warning("Detalle inválido para %s: %s", base.get("place_id"), details)

                    # Normalizamos los datos
                    geometry = detail_data.get("geometry", {}).get(
                        "location",
                        base.get("geometry", {}).get("location", {}),
                    )
                    opening = detail_data.get("opening_hours") or base.get("opening_hours")
                    enriched.append({
                        "id": base.get("place_id"),
                        "name": base.get("name"),
                        "address": base.get("formatted_address"),
                        "rating": base.get("rating") or detail_data.get("rating"),
                        "price_level": base.get("price_level") or detail_data.get("price_level"),
                        "opening_hours": self._normalize_opening_hours(opening),
                        "location": geometry,
                        "photos": [
                            f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={p['photo_reference']}&key={self.api_key}"
                            for p in (detail_data.get("photos") or base.get("photos") or [])
                        ]
                    })
            firebase_cache.set("google_places", cache_key, enriched, self.cache_ttl)
            logger.info("Google Places text_search guardado en caché")
            return enriched

        except Exception as e:
            logger.error(f"Error en text_search: {e}")
            return []

    @staticmethod
    def _normalize_opening_hours(opening: Optional[Dict]) -> Optional[Dict]:
        if not opening:
            return None
        weekday_text = opening.get("weekday_text")
        if weekday_text is None:
            weekday_text = []
        return {
            "open_now": opening.get("open_now"),
            "weekday_text": weekday_text,
        }


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