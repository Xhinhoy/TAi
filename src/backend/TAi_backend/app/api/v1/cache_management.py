"""
Endpoints para gestionar el caché inteligente del AI Agent
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
import logging

from app.api.deps import get_current_user
from app.utils.cache import firebase_cache
from app.utils.cache_utils import DynamicTTL, cache_stats
from app.services.cache_warming_service import cache_warming_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cache", tags=["Cache Management"])


@router.get("/stats")
async def get_cache_stats(current_user: dict = Depends(get_current_user)):
    """
    Obtiene estadísticas del caché inteligente

    Incluye:
    - Hit rate
    - Llamadas al AI ahorradas
    - Costo ahorrado estimado
    - Estadísticas por zona geográfica
    """
    try:
        # Stats generales del cache
        general_stats = cache_stats.get_stats()

        # Stats por zona (popularidad)
        zone_stats = DynamicTTL.get_zone_stats()

        # Top 10 zonas más visitadas
        top_zones = sorted(
            zone_stats.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]

        return {
            "cache_stats": general_stats,
            "zone_stats": {
                "total_zones": len(zone_stats),
                "total_hits": sum(zone_stats.values()),
                "top_zones": [
                    {"geohash": geohash, "hits": hits}
                    for geohash, hits in top_zones
                ]
            }
        }

    except Exception as e:
        logger.error(f"Error obteniendo stats de cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/clear/ai-alerts")
async def clear_ai_alerts_cache(current_user: dict = Depends(get_current_user)):
    """
    Limpia todo el caché de alertas del AI Agent

    PRECAUCIÓN: Esto forzará regeneración con Gemini en todas las ubicaciones.
    """
    try:
        # Limpiar caché de AI Agent
        success = firebase_cache.clear_prefix("ai_agent_alerts")

        if success:
            logger.info("🧹 Caché de AI Agent limpiado completamente")
            return {
                "success": True,
                "message": "Caché de AI Agent limpiado. Las siguientes requests usarán Gemini."
            }
        else:
            raise HTTPException(500, "No se pudo limpiar el caché")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error limpiando caché: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/clear/zone/{geohash}")
async def clear_zone_cache(
    geohash: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Limpia caché de una zona específica (GeoHash)

    Útil cuando:
    - Hay nuevos lugares en la zona
    - Cambios significativos de ratings
    - Eventos especiales en la zona
    """
    try:
        # Obtener todas las keys del cache
        db = firebase_cache.firebase_service.get_db()
        all_keys = db.child("cache").child("ai_agent_alerts").get().val()

        if not all_keys:
            return {
                "success": True,
                "deleted": 0,
                "message": "No hay caché para limpiar"
            }

        # Filtrar keys que contengan el geohash
        deleted = 0
        for key in all_keys.keys():
            if geohash in key:
                db.child("cache").child("ai_agent_alerts").child(key).delete()
                deleted += 1

        logger.info(f"🧹 Limpiadas {deleted} entradas de caché para zona {geohash}")

        return {
            "success": True,
            "deleted": deleted,
            "geohash": geohash,
            "message": f"Caché de zona {geohash} limpiado ({deleted} entradas)"
        }

    except Exception as e:
        logger.error(f"Error limpiando zona {geohash}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/stats/reset")
async def reset_cache_stats(current_user: dict = Depends(get_current_user)):
    """
    Resetea estadísticas de cache (para testing o nuevo ciclo)
    """
    try:
        cache_stats.reset()

        return {
            "success": True,
            "message": "Estadísticas de caché reseteadas"
        }

    except Exception as e:
        logger.error(f"Error reseteando stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/config")
async def get_cache_config():
    """
    Obtiene configuración actual del caché

    Muestra TTLs por tipo de zona y estrategia
    """
    return {
        "strategy": "GeoHash + Profile Hash",
        "geohash_precision": 7,
        "grid_size_meters": 153,
        "compression": {
            "enabled": firebase_cache.enable_compression,
            "algorithm": "gzip (level 6)",
            "expected_savings": "60-70%"
        },
        "ttl_config": {
            "very_popular": {"min_hits": 50, "ttl_seconds": 1800, "ttl_display": "30 min"},
            "popular": {"min_hits": 20, "ttl_seconds": 3600, "ttl_display": "1 hora"},
            "normal": {"min_hits": 5, "ttl_seconds": 7200, "ttl_display": "2 horas"},
            "low_traffic": {"min_hits": 0, "ttl_seconds": 21600, "ttl_display": "6 horas"}
        },
        "cache_prefix": "ai_agent_alerts",
        "profile_hash_factors": ["interests", "budget_range", "travel_style", "group_size"]
    }


@router.get("/compression/stats")
async def get_compression_stats(current_user: dict = Depends(get_current_user)):
    """
    Obtiene estadísticas de compresión del caché

    Muestra:
    - Total de entradas comprimidas
    - Bytes originales vs comprimidos
    - Ratio de compresión
    - Espacio ahorrado (%)
    """
    try:
        stats = firebase_cache.get_compression_stats()

        # Formato amigable
        return {
            "compression_enabled": firebase_cache.enable_compression,
            "total_compressed_entries": stats['total_compressed'],
            "original_size": {
                "bytes": stats['total_original_bytes'],
                "kb": round(stats['total_original_bytes'] / 1024, 2),
                "mb": round(stats['total_original_bytes'] / (1024 * 1024), 2)
            },
            "compressed_size": {
                "bytes": stats['total_compressed_bytes'],
                "kb": round(stats['total_compressed_bytes'] / 1024, 2),
                "mb": round(stats['total_compressed_bytes'] / (1024 * 1024), 2)
            },
            "compression_ratio": round(stats['compression_ratio'], 3),
            "space_saved_percent": round(stats['space_saved_percent'], 1),
            "estimated_storage_cost_savings": {
                "description": "Firebase Realtime Database charges $5/GB/month",
                "original_cost_per_month": f"${round(stats['total_original_bytes'] / (1024**3) * 5, 4)}",
                "compressed_cost_per_month": f"${round(stats['total_compressed_bytes'] / (1024**3) * 5, 4)}"
            }
        }

    except Exception as e:
        logger.error(f"Error obteniendo compression stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ==================== CACHE WARMING ====================

class WarmZoneRequest(BaseModel):
    latitude: float
    longitude: float
    zone_name: str = "custom_zone"
    force: bool = False


@router.post("/warming/zone")
async def warm_specific_zone(
    request: WarmZoneRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Pre-genera caché para una zona específica × todos los perfiles comunes

    Útil para:
    - Warming ad-hoc de nuevas zonas
    - Preparar caché antes de eventos
    - Testing de cache warming

    Ejecuta en background para no bloquear
    """
    try:
        # Ejecutar en background
        background_tasks.add_task(
            cache_warming_service.warm_zone_for_all_profiles,
            latitude=request.latitude,
            longitude=request.longitude,
            zone_name=request.zone_name,
            force=request.force
        )

        return {
            "success": True,
            "message": f"Cache warming iniciado para zona '{request.zone_name}'",
            "zone_name": request.zone_name,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "profiles_to_warm": 6,
            "status": "processing_in_background"
        }

    except Exception as e:
        logger.error(f"Error iniciando warming de zona: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/warming/city/{city}")
async def warm_city(
    city: str,
    background_tasks: BackgroundTasks,
    force: bool = False,
    max_concurrent: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """
    Pre-genera caché para todas las zonas populares de una ciudad

    Ciudades disponibles: santiago_chile

    PRECAUCIÓN: Esto generará muchas requests al AI Agent (zonas × perfiles)
    - santiago_chile: 8 zonas × 6 perfiles = 48 requests
    - Tiempo estimado: ~5-10 minutos
    - Costo estimado: ~$0.10 (con cache hits reducirá)

    Recomendado ejecutar durante horas de bajo tráfico (3am-6am)
    """
    try:
        # Validar ciudad
        if city not in ["santiago_chile"]:
            raise HTTPException(
                status_code=400,
                detail=f"Ciudad no soportada: {city}. Disponibles: santiago_chile"
            )

        # Obtener info de la ciudad
        zones_count = len(cache_warming_service.zones.get(city, []))
        profiles_count = len(cache_warming_service.profiles)
        total_combinations = zones_count * profiles_count

        # Ejecutar en background
        background_tasks.add_task(
            cache_warming_service.warm_all_zones,
            city=city,
            force=force,
            max_concurrent=max_concurrent
        )

        return {
            "success": True,
            "message": f"Cache warming iniciado para {city}",
            "city": city,
            "zones": zones_count,
            "profiles": profiles_count,
            "total_combinations": total_combinations,
            "max_concurrent": max_concurrent,
            "estimated_time_minutes": total_combinations // max_concurrent,
            "estimated_cost_usd": round(total_combinations * 0.002, 2),
            "status": "processing_in_background"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error iniciando warming de ciudad: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/warming/zones")
async def get_warmable_zones():
    """
    Lista todas las zonas disponibles para warming

    Útil para ver qué zonas están configuradas
    """
    return {
        "cities": {
            "santiago_chile": {
                "zones": cache_warming_service.zones.get("santiago_chile", []),
                "total_zones": len(cache_warming_service.zones.get("santiago_chile", []))
            }
        },
        "common_profiles": [
            {
                "name": p["name"],
                "interests": p["profile"]["interests"],
                "budget_range": p["profile"]["preferences"]["budget"],
                "travel_style": p["profile"]["preferences"]["travel_style"]
            }
            for p in cache_warming_service.profiles
        ],
        "total_profiles": len(cache_warming_service.profiles)
    }
