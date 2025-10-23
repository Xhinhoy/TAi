from app.core.firebase import firebase_service
from typing import Optional, Any
import json
import time
import logging

logger = logging.getLogger(__name__)

class FirebaseCache:
    """Sistema de caché usando Firebase Realtime Database"""

    def __init__(self, default_ttl: int = 3600):
        from app.core.config import settings

        self.default_ttl = default_ttl
        self.mock_mode = settings.MOCK_MODE

        if self.mock_mode:
            logger.warning("🧪 FirebaseCache en MOCK_MODE: usando dict local")
            self.db = None
            self.cache_ref = None
            self._mock_cache = {}  # Cache en memoria
        else:
            self.db = firebase_service.realtime_db
            self.cache_ref = self.db.child('cache') if self.db else None
            self._mock_cache = None
    
    def _get_key_path(self, prefix: str, key: str) -> str:
        return f"{prefix}/{key}"
    
    def get(self, prefix: str, key: str) -> Optional[Any]:
        if self.mock_mode:
            path = self._get_key_path(prefix, key)
            cached_data = self._mock_cache.get(path)
            if not cached_data:
                return None
            expires_at = cached_data.get('expires_at', 0)
            if time.time() > expires_at:
                del self._mock_cache[path]
                return None
            return cached_data.get('value')

        try:
            path = self._get_key_path(prefix, key)
            cached_data = self.cache_ref.child(path).get()

            if not cached_data:
                return None

            expires_at = cached_data.get('expires_at', 0) # type: ignore
            if time.time() > expires_at:
                self.delete(prefix, key)
                return None

            return cached_data.get('value') # type: ignore

        except Exception as e:
            logger.error(f"Error obteniendo del caché: {str(e)}")
            return None
    
    def set(self, prefix: str, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        if self.mock_mode:
            path = self._get_key_path(prefix, key)
            expires_at = time.time() + (ttl or self.default_ttl)
            self._mock_cache[path] = {
                'value': value,
                'expires_at': expires_at,
                'created_at': time.time()
            }
            return True

        try:
            path = self._get_key_path(prefix, key)
            expires_at = time.time() + (ttl or self.default_ttl)

            cache_data = {
                'value': value,
                'expires_at': expires_at,
                'created_at': time.time()
            }

            self.cache_ref.child(path).set(cache_data)
            return True

        except Exception as e:
            logger.error(f"Error guardando en caché: {str(e)}")
            return False
    
    def delete(self, prefix: str, key: str) -> bool:
        if self.mock_mode:
            path = self._get_key_path(prefix, key)
            self._mock_cache.pop(path, None)
            return True

        try:
            path = self._get_key_path(prefix, key)
            self.cache_ref.child(path).delete()
            return True
        except Exception as e:
            logger.error(f"Error eliminando del caché: {str(e)}")
            return False
    
    def clear_prefix(self, prefix: str) -> bool:
        if self.mock_mode:
            keys_to_delete = [k for k in self._mock_cache.keys() if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._mock_cache[k]
            return True

        try:
            self.cache_ref.child(prefix).delete()
            return True
        except Exception as e:
            logger.error(f"Error limpiando prefijo: {str(e)}")
            return False
    
    def get_or_set(self, prefix: str, key: str, fetch_func, ttl: Optional[int] = None) -> Optional[Any]:
        cached_value = self.get(prefix, key)
        if cached_value is not None:
            logger.debug(f"Cache HIT: {prefix}/{key}")
            return cached_value
        
        logger.debug(f"Cache MISS: {prefix}/{key}")
        value = fetch_func()
        
        if value is not None:
            self.set(prefix, key, value, ttl)
        
        return value
    
    def clean_expired(self, prefix: str) -> int:
        if self.mock_mode:
            current_time = time.time()
            keys_to_delete = []
            for path, data in self._mock_cache.items():
                if path.startswith(prefix):
                    expires_at = data.get('expires_at', 0)
                    if current_time > expires_at:
                        keys_to_delete.append(path)
            for k in keys_to_delete:
                del self._mock_cache[k]
            return len(keys_to_delete)

        try:
            entries = self.cache_ref.child(prefix).get()
            if not entries:
                return 0

            deleted_count = 0
            current_time = time.time()

            for key, data in entries.items(): # type: ignore
                if isinstance(data, dict):
                    expires_at = data.get('expires_at', 0)
                    if current_time > expires_at:
                        self.delete(prefix, key)
                        deleted_count += 1

            logger.info(f"Limpiadas {deleted_count} entradas expiradas de {prefix}")
            return deleted_count

        except Exception as e:
            logger.error(f"Error limpiando expirados: {str(e)}")
            return 0

firebase_cache = FirebaseCache(default_ttl=3600)