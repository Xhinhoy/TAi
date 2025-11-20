"""
Cache Warming Service

Pre-genera caché para zonas turísticas populares durante horas de bajo tráfico.
Reduce latencia en primera request y mejora experiencia del usuario.

Estrategia:
1. Define zonas populares (landmarks, centros turísticos)
2. Define perfiles de usuario comunes
3. Pre-genera alertas para combinaciones zona + perfil
4. Ejecutar durante horas de bajo tráfico (3am-6am)
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.services.llm.alert_agent import alert_generator_agent
from app.utils.cache import firebase_cache
from app.utils.cache_utils import CacheKeyGenerator, DynamicTTL, GeoHashUtil

logger = logging.getLogger(__name__)


# ==================== ZONAS POPULARES ====================

POPULAR_ZONES = {
    "santiago_chile": [
        {
            "name": "Plaza de Armas",
            "latitude": -33.437182,
            "longitude": -70.650687,
            "description": "Centro histórico de Santiago"
        },
        {
            "name": "Cerro San Cristóbal",
            "latitude": -33.425423,
            "longitude": -70.633666,
            "description": "Mirador icónico"
        },
        {
            "name": "Barrio Bellavista",
            "latitude": -33.430778,
            "longitude": -70.633889,
            "description": "Vida nocturna y gastronomía"
        },
        {
            "name": "Parque Forestal",
            "latitude": -33.434444,
            "longitude": -70.640556,
            "description": "Parque urbano y museos"
        },
        {
            "name": "Barrio Lastarria",
            "latitude": -33.437500,
            "longitude": -70.639444,
            "description": "Cultura y cafés bohemios"
        },
        {
            "name": "Mercado Central",
            "latitude": -33.433333,
            "longitude": -70.651944,
            "description": "Gastronomía local y mariscos"
        },
        {
            "name": "Costanera Center",
            "latitude": -33.417778,
            "longitude": -70.606667,
            "description": "Shopping y Sky Costanera"
        },
        {
            "name": "Barrio Italia",
            "latitude": -33.455556,
            "longitude": -70.635833,
            "description": "Diseño y gastronomía"
        }
    ]
}


# ==================== PERFILES COMUNES ====================

COMMON_PROFILES = [
    {
        "name": "foodie_budget",
        "profile": {
            "interests": ["gastronomia", "comida_local"],
            "preferences": {
                "budget": {"min": 5000, "max": 15000},
                "travel_style": "explorer",
                "group_size": 2
            }
        }
    },
    {
        "name": "culture_lover",
        "profile": {
            "interests": ["museos", "historia", "arte"],
            "preferences": {
                "budget": {"min": 0, "max": 10000},
                "travel_style": "cultural",
                "group_size": 1
            }
        }
    },
    {
        "name": "nightlife_social",
        "profile": {
            "interests": ["vida_nocturna", "bares", "musica"],
            "preferences": {
                "budget": {"min": 10000, "max": 30000},
                "travel_style": "social",
                "group_size": 4
            }
        }
    },
    {
        "name": "luxury_tourist",
        "profile": {
            "interests": ["gastronomia", "compras", "vistas"],
            "preferences": {
                "budget": {"min": 30000, "max": 100000},
                "travel_style": "luxury",
                "group_size": 2
            }
        }
    },
    {
        "name": "adventure_seeker",
        "profile": {
            "interests": ["naturaleza", "actividades", "fotografia"],
            "preferences": {
                "budget": {"min": 5000, "max": 20000},
                "travel_style": "adventure",
                "group_size": 3
            }
        }
    },
    {
        "name": "family_friendly",
        "profile": {
            "interests": ["parques", "actividades_familiares", "restaurantes"],
            "preferences": {
                "budget": {"min": 15000, "max": 40000},
                "travel_style": "family",
                "group_size": 4
            }
        }
    }
]


# ==================== SERVICE ====================

class CacheWarmingService:
    """Servicio para pre-generar caché inteligente"""

    def __init__(self):
        self.zones = POPULAR_ZONES
        self.profiles = COMMON_PROFILES

    async def warm_zone(
        self,
        zone: Dict[str, Any],
        profile: Dict[str, Any],
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Pre-genera caché para una combinación zona + perfil

        Args:
            zone: Zona geográfica con lat/lon
            profile: Perfil de usuario
            force: Si True, regenera aunque ya exista en caché

        Returns:
            {
                "success": bool,
                "zone_name": str,
                "profile_name": str,
                "cache_key": str,
                "already_cached": bool,
                "generated": bool
            }
        """
        try:
            latitude = zone["latitude"]
            longitude = zone["longitude"]
            zone_name = zone["name"]
            profile_data = profile["profile"]
            profile_name = profile["name"]

            logger.info(f"🔥 Warming cache: {zone_name} + {profile_name}")

            # Generar cache key
            cache_key = CacheKeyGenerator.generate_alert_cache_key(
                latitude=latitude,
                longitude=longitude,
                user_profile=profile_data,
                geohash_precision=7
            )

            # Verificar si ya existe
            if not force:
                existing = firebase_cache.get("ai_agent_alerts", cache_key)
                if existing:
                    logger.info(f"✅ Ya existe en caché: {zone_name} + {profile_name}")
                    return {
                        "success": True,
                        "zone_name": zone_name,
                        "profile_name": profile_name,
                        "cache_key": cache_key,
                        "already_cached": True,
                        "generated": False
                    }

            # Generar con AI Agent
            logger.info(f"🤖 Generando con AI Agent...")
            result = await alert_generator_agent.generate_alerts(
                latitude=latitude,
                longitude=longitude,
                user_id=f"warming_{profile_name}",
                user_profile=profile_data,
                max_alerts=3,
                use_cache=True  # Usará caché automáticamente
            )

            logger.info(f"✅ Cache generado: {zone_name} + {profile_name} → {len(result.get('alerts', []))} alertas")

            return {
                "success": True,
                "zone_name": zone_name,
                "profile_name": profile_name,
                "cache_key": cache_key,
                "already_cached": False,
                "generated": True,
                "alerts_generated": len(result.get("alerts", []))
            }

        except Exception as e:
            logger.error(f"❌ Error warming {zone_name} + {profile_name}: {str(e)}")
            return {
                "success": False,
                "zone_name": zone.get("name", "unknown"),
                "profile_name": profile.get("name", "unknown"),
                "error": str(e),
                "already_cached": False,
                "generated": False
            }

    async def warm_all_zones(
        self,
        city: str = "santiago_chile",
        force: bool = False,
        max_concurrent: int = 3
    ) -> Dict[str, Any]:
        """
        Pre-genera caché para todas las zonas populares de una ciudad

        Args:
            city: Ciudad objetivo
            force: Si True, regenera todo
            max_concurrent: Máximo de requests concurrentes al AI Agent

        Returns:
            {
                "total_combinations": int,
                "successful": int,
                "already_cached": int,
                "failed": int,
                "results": [...]
            }
        """
        try:
            zones = self.zones.get(city, [])
            if not zones:
                logger.warning(f"No hay zonas definidas para ciudad: {city}")
                return {
                    "total_combinations": 0,
                    "successful": 0,
                    "already_cached": 0,
                    "failed": 0,
                    "results": []
                }

            logger.info(f"🔥 Iniciando Cache Warming para {city}")
            logger.info(f"📍 {len(zones)} zonas × {len(self.profiles)} perfiles = {len(zones) * len(self.profiles)} combinaciones")

            # Generar todas las combinaciones
            tasks = []
            for zone in zones:
                for profile in self.profiles:
                    tasks.append((zone, profile))

            # Ejecutar con límite de concurrencia
            results = []
            for i in range(0, len(tasks), max_concurrent):
                batch = tasks[i:i + max_concurrent]
                logger.info(f"📦 Procesando batch {i//max_concurrent + 1}/{(len(tasks)-1)//max_concurrent + 1}")

                batch_results = await asyncio.gather(*[
                    self.warm_zone(zone, profile, force)
                    for zone, profile in batch
                ])

                results.extend(batch_results)

                # Esperar un poco entre batches para no saturar
                if i + max_concurrent < len(tasks):
                    await asyncio.sleep(2)

            # Estadísticas
            successful = sum(1 for r in results if r["success"])
            already_cached = sum(1 for r in results if r.get("already_cached", False))
            failed = sum(1 for r in results if not r["success"])

            logger.info(f"✅ Cache Warming completado:")
            logger.info(f"   Total: {len(results)}")
            logger.info(f"   Exitosos: {successful}")
            logger.info(f"   Ya en caché: {already_cached}")
            logger.info(f"   Fallidos: {failed}")

            return {
                "city": city,
                "total_combinations": len(results),
                "successful": successful,
                "already_cached": already_cached,
                "failed": failed,
                "results": results
            }

        except Exception as e:
            logger.error(f"❌ Error en warm_all_zones: {str(e)}")
            raise

    async def warm_zone_for_all_profiles(
        self,
        latitude: float,
        longitude: float,
        zone_name: str = "custom_zone",
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Pre-genera caché para una ubicación específica × todos los perfiles

        Útil para warming ad-hoc de una zona específica
        """
        try:
            logger.info(f"🔥 Warming zona específica: {zone_name} ({latitude}, {longitude})")

            zone = {
                "name": zone_name,
                "latitude": latitude,
                "longitude": longitude,
                "description": "Custom zone"
            }

            results = []
            for profile in self.profiles:
                result = await self.warm_zone(zone, profile, force)
                results.append(result)

                # Esperar un poco entre requests
                await asyncio.sleep(1)

            successful = sum(1 for r in results if r["success"])
            already_cached = sum(1 for r in results if r.get("already_cached", False))

            return {
                "zone_name": zone_name,
                "latitude": latitude,
                "longitude": longitude,
                "total_profiles": len(results),
                "successful": successful,
                "already_cached": already_cached,
                "results": results
            }

        except Exception as e:
            logger.error(f"❌ Error warming zona específica: {str(e)}")
            raise


# Instancia global
cache_warming_service = CacheWarmingService()
