"""
Utilidades para caché inteligente del AI Agent

Incluye:
- GeoHash para agrupar ubicaciones cercanas
- Profile Hash para identificar usuarios con preferencias similares
- TTL dinámico basado en popularidad de zona
"""

import hashlib
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class GeoHashUtil:
    """Utilidad para convertir coordenadas GPS a GeoHash (cuadrícula)"""

    @staticmethod
    def encode(latitude: float, longitude: float, precision: int = 7) -> str:
        """
        Codifica coordenadas a GeoHash

        Precision levels:
        - 5: ~4.9km x 4.9km (ciudad completa)
        - 6: ~1.2km x 0.6km (barrio)
        - 7: ~153m x 153m (cuadra) ← RECOMENDADO
        - 8: ~38m x 19m (edificio)

        Args:
            latitude: Latitud
            longitude: Longitud
            precision: Nivel de precisión (default: 7 = ~150m)

        Returns:
            GeoHash string (ej: "66hrxsj")
        """
        try:
            import geohash2 as gh
            geohash = gh.encode(latitude, longitude, precision=precision)
            logger.debug(f"GeoHash: ({latitude}, {longitude}) → {geohash}")
            return geohash
        except ImportError:
            # Fallback simple si geohash2 no está instalado
            logger.warning("geohash2 no instalado, usando fallback simple")
            return GeoHashUtil._simple_geohash(latitude, longitude, precision)

    @staticmethod
    def _simple_geohash(lat: float, lng: float, precision: int) -> str:
        """
        Fallback simple de GeoHash sin librería externa
        Agrupa coordenadas en cuadrículas
        """
        # Dividir en cuadrículas de ~150m (0.0015 grados ≈ 150m)
        grid_size = 0.0015
        lat_grid = int(lat / grid_size)
        lng_grid = int(lng / grid_size)

        # Crear hash simple
        hash_str = f"{lat_grid}_{lng_grid}"
        return hashlib.md5(hash_str.encode()).hexdigest()[:precision]

    @staticmethod
    def decode(geohash: str) -> tuple:
        """
        Decodifica GeoHash a coordenadas aproximadas

        Returns:
            (latitude, longitude)
        """
        try:
            import geohash2 as gh
            lat, lng = gh.decode(geohash)
            return (lat, lng)
        except ImportError:
            # No se puede decodificar sin librería
            return (0.0, 0.0)

    @staticmethod
    def neighbors(geohash: str) -> List[str]:
        """
        Obtiene GeoHashes vecinos (8 cuadrículas alrededor)

        Útil para expandir búsqueda a zonas cercanas
        """
        try:
            import geohash2 as gh
            return [
                gh.neighbor(geohash, direction)
                for direction in ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
            ]
        except ImportError:
            return []


class ProfileHashUtil:
    """Utilidad para crear hash de perfiles de usuario"""

    @staticmethod
    def create_hash(user_profile: Dict[str, Any]) -> str:
        """
        Crea hash único basado en características clave del perfil

        Usuarios con hash similar → intereses similares → pueden compartir cache

        Args:
            user_profile: Perfil del usuario

        Returns:
            Hash MD5 del perfil (ej: "a3f5d9c2...")
        """
        # Extraer características clave para el hash
        interests = sorted(user_profile.get('interests', []))  # Ordenar para consistencia
        preferences = user_profile.get('preferences', {})

        # Budget range (agrupar en rangos)
        budget = preferences.get('budget', {})
        budget_range = ProfileHashUtil._get_budget_range(
            budget.get('min', 0),
            budget.get('max', 1000)
        )

        # Travel style
        travel_style = preferences.get('travel_style', 'standard')

        # Group size
        group_size = preferences.get('group_size', 'solo')

        # Crear estructura normalizada
        profile_key = {
            'interests': interests,
            'budget_range': budget_range,
            'travel_style': travel_style,
            'group_size': group_size
        }

        # Generar hash
        profile_str = json.dumps(profile_key, sort_keys=True)
        profile_hash = hashlib.md5(profile_str.encode()).hexdigest()[:8]

        logger.debug(f"Profile Hash: {interests} + {budget_range} → {profile_hash}")
        return profile_hash

    @staticmethod
    def _get_budget_range(min_budget: float, max_budget: float) -> str:
        """
        Agrupa presupuestos en rangos para mejor cache hit rate

        Ranges:
        - low: 0-50
        - medium: 50-150
        - high: 150-300
        - luxury: 300+
        """
        avg_budget = (min_budget + max_budget) / 2

        if avg_budget < 50:
            return "low"
        elif avg_budget < 150:
            return "medium"
        elif avg_budget < 300:
            return "high"
        else:
            return "luxury"


class CacheKeyGenerator:
    """Generador de cache keys para AI Agent"""

    @staticmethod
    def generate_alert_cache_key(
        latitude: float,
        longitude: float,
        user_profile: Dict[str, Any],
        geohash_precision: int = 7
    ) -> str:
        """
        Genera cache key para alertas del AI Agent

        Format: "ai_alerts_{geohash}_{profile_hash}"

        Usuarios en misma zona con perfiles similares comparten cache
        """
        geohash = GeoHashUtil.encode(latitude, longitude, precision=geohash_precision)
        profile_hash = ProfileHashUtil.create_hash(user_profile)

        cache_key = f"ai_alerts_{geohash}_{profile_hash}"

        logger.debug(f"Cache Key: ({latitude}, {longitude}) + profile → {cache_key}")
        return cache_key

    @staticmethod
    def parse_cache_key(cache_key: str) -> Optional[Dict[str, str]]:
        """
        Parsea un cache key para obtener componentes

        Returns:
            {"geohash": "...", "profile_hash": "..."}
        """
        try:
            parts = cache_key.split('_')
            if len(parts) >= 4 and parts[0] == 'ai' and parts[1] == 'alerts':
                return {
                    "geohash": parts[2],
                    "profile_hash": parts[3]
                }
        except Exception as e:
            logger.warning(f"Error parsing cache key: {str(e)}")

        return None


class DynamicTTL:
    """TTL dinámico basado en popularidad de zona"""

    # Tracking de hits por zona
    _zone_hits: Dict[str, int] = {}

    @staticmethod
    def get_ttl_for_zone(geohash: str, default_ttl: int = 7200) -> int:
        """
        Calcula TTL dinámico basado en popularidad de la zona

        Zonas más visitadas → TTL más corto (datos más frescos)
        Zonas poco visitadas → TTL más largo (ahorro de costos)

        Args:
            geohash: GeoHash de la zona
            default_ttl: TTL por defecto en segundos (2 horas)

        Returns:
            TTL en segundos
        """
        hits = DynamicTTL._zone_hits.get(geohash, 0)

        # Lógica de TTL basada en hits
        if hits > 50:  # Zona muy popular
            ttl = 1800  # 30 minutos
            popularity = "muy_popular"
        elif hits > 20:  # Zona popular
            ttl = 3600  # 1 hora
            popularity = "popular"
        elif hits > 5:  # Zona normal
            ttl = 7200  # 2 horas (default)
            popularity = "normal"
        else:  # Zona poco visitada
            ttl = 21600  # 6 horas
            popularity = "poco_visitada"

        logger.debug(f"TTL para zona {geohash}: {ttl}s ({popularity}, {hits} hits)")
        return ttl

    @staticmethod
    def record_zone_hit(geohash: str):
        """Registra un hit en una zona (para tracking de popularidad)"""
        if geohash not in DynamicTTL._zone_hits:
            DynamicTTL._zone_hits[geohash] = 0

        DynamicTTL._zone_hits[geohash] += 1

        # Log cada 10 hits
        if DynamicTTL._zone_hits[geohash] % 10 == 0:
            logger.info(f"Zona {geohash}: {DynamicTTL._zone_hits[geohash]} hits")

    @staticmethod
    def get_zone_stats() -> Dict[str, int]:
        """Retorna estadísticas de hits por zona"""
        return DynamicTTL._zone_hits.copy()


class CacheStats:
    """Estadísticas de cache para monitoring"""

    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.ai_calls_saved = 0
        self.cost_saved_usd = 0.0

    def record_hit(self):
        """Registra cache hit"""
        self.hits += 1
        self.ai_calls_saved += 1
        self.cost_saved_usd += 0.012  # Costo estimado por llamada al AI

    def record_miss(self):
        """Registra cache miss"""
        self.misses += 1

    def get_hit_rate(self) -> float:
        """Calcula hit rate"""
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return (self.hits / total) * 100

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estadísticas completas"""
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{self.get_hit_rate():.1f}%",
            "ai_calls_saved": self.ai_calls_saved,
            "cost_saved_usd": f"${self.cost_saved_usd:.2f}"
        }

    def reset(self):
        """Resetea estadísticas"""
        self.hits = 0
        self.misses = 0
        self.ai_calls_saved = 0
        self.cost_saved_usd = 0.0


# Instancia global de stats
cache_stats = CacheStats()
