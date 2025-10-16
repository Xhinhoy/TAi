from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.utils.cache import firebase_cache
from typing import Optional

router = APIRouter(prefix="/cache", tags=["cache"])

@router.delete("/clear/{prefix}")
async def clear_cache_prefix(
    prefix: str,
    current_user: dict = Depends(get_current_user)
):
    success = firebase_cache.clear_prefix(prefix)
    return {
        "success": success,
        "prefix": prefix,
        "message": f"Caché de {prefix} limpiado"
    }

@router.delete("/clean-expired/{prefix}")
async def clean_expired_cache(
    prefix: str,
    current_user: dict = Depends(get_current_user)
):
    deleted_count = firebase_cache.clean_expired(prefix)
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"{deleted_count} entradas expiradas eliminadas"
    }

@router.get("/stats")
async def get_cache_stats(
    current_user: dict = Depends(get_current_user)
):
    prefixes = ['places', 'google_places', 'tripadvisor']
    stats = {}
    
    for prefix in prefixes:
        try:
            data = firebase_cache.cache_ref.child(prefix).get()
            if data:
                count = len(data) if isinstance(data, dict) else 0
                stats[prefix] = {
                    'entries': count,
                    'prefix': prefix
                }
            else:
                stats[prefix] = {
                    'entries': 0,
                    'prefix': prefix
                }
        except:
            stats[prefix] = {
                'entries': 0,
                'prefix': prefix,
                'error': 'No se pudo obtener estadísticas'
            }
    
    return {
        "stats": stats,
        "total_entries": sum(s.get('entries', 0) for s in stats.values())
    }
