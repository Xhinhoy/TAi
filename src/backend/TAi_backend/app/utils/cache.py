from app.core.firebase import firebase_service
from typing import Optional, Any
import json
import time
import logging
import gzip
import base64

logger = logging.getLogger(__name__)

class FirebaseCache:
    """Sistema de caché usando Firebase Realtime Database con compresión gzip"""

    def __init__(self, default_ttl: int = 3600, enable_compression: bool = True):
        self.firebase_service = firebase_service  # Exponer para acceso directo
        self.db = firebase_service.realtime_db
        self.default_ttl = default_ttl
        self.cache_ref = self.db.child('cache') # type: ignore
        self.enable_compression = enable_compression

        # Estadísticas de compresión
        self.compression_stats = {
            'total_compressed': 0,
            'total_original_bytes': 0,
            'total_compressed_bytes': 0
        }
    
    def _get_key_path(self, prefix: str, key: str) -> str:
        return f"{prefix}/{key}"

    def _compress_value(self, value: Any) -> str:
        """
        Comprime un valor usando gzip y lo codifica en base64

        Returns:
            String base64 del valor comprimido
        """
        try:
            # Convertir a JSON
            json_str = json.dumps(value)
            json_bytes = json_str.encode('utf-8')

            # Comprimir con gzip
            compressed = gzip.compress(json_bytes, compresslevel=6)

            # Codificar en base64 para Firebase
            compressed_b64 = base64.b64encode(compressed).decode('ascii')

            # Estadísticas
            original_size = len(json_bytes)
            compressed_size = len(compressed)
            ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0

            self.compression_stats['total_compressed'] += 1
            self.compression_stats['total_original_bytes'] += original_size
            self.compression_stats['total_compressed_bytes'] += compressed_size

            logger.debug(f"Compresión: {original_size}B → {compressed_size}B ({ratio:.1f}% reducción)")

            return compressed_b64

        except Exception as e:
            logger.error(f"Error comprimiendo valor: {str(e)}")
            raise

    def _decompress_value(self, compressed_b64: str) -> Any:
        """
        Descomprime un valor desde base64 + gzip

        Args:
            compressed_b64: String base64 del valor comprimido

        Returns:
            Valor original deserializado
        """
        try:
            # Decodificar base64
            compressed = base64.b64decode(compressed_b64.encode('ascii'))

            # Descomprimir gzip
            json_bytes = gzip.decompress(compressed)

            # Parsear JSON
            json_str = json_bytes.decode('utf-8')
            value = json.loads(json_str)

            return value

        except Exception as e:
            logger.error(f"Error descomprimiendo valor: {str(e)}")
            raise

    def get(self, prefix: str, key: str) -> Optional[Any]:
        try:
            path = self._get_key_path(prefix, key)
            cached_data = self.cache_ref.child(path).get()

            if not cached_data:
                return None

            expires_at = cached_data.get('expires_at', 0) # type: ignore
            if time.time() > expires_at:
                self.delete(prefix, key)
                return None

            # Obtener valor (puede estar comprimido o no)
            value_data = cached_data.get('value') # type: ignore
            is_compressed = cached_data.get('compressed', False) # type: ignore

            # Si está comprimido, descomprimir
            if is_compressed and isinstance(value_data, str):
                try:
                    return self._decompress_value(value_data)
                except Exception as e:
                    logger.error(f"Error descomprimiendo, retornando valor raw: {str(e)}")
                    return value_data

            return value_data

        except Exception as e:
            logger.error(f"Error obteniendo del caché: {str(e)}")
            return None
    
    def set(self, prefix: str, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        try:
            path = self._get_key_path(prefix, key)
            expires_at = time.time() + (ttl or self.default_ttl)

            # Decidir si comprimir
            should_compress = self.enable_compression

            # Preparar valor (comprimir si está habilitado)
            if should_compress:
                try:
                    compressed_value = self._compress_value(value)
                    cache_data = {
                        'value': compressed_value,
                        'compressed': True,
                        'expires_at': expires_at,
                        'created_at': time.time()
                    }
                except Exception as e:
                    logger.warning(f"No se pudo comprimir, guardando sin compresión: {str(e)}")
                    cache_data = {
                        'value': value,
                        'compressed': False,
                        'expires_at': expires_at,
                        'created_at': time.time()
                    }
            else:
                cache_data = {
                    'value': value,
                    'compressed': False,
                    'expires_at': expires_at,
                    'created_at': time.time()
                }

            self.cache_ref.child(path).set(cache_data)
            return True

        except Exception as e:
            logger.error(f"Error guardando en caché: {str(e)}")
            return False
    
    def delete(self, prefix: str, key: str) -> bool:
        try:
            path = self._get_key_path(prefix, key)
            self.cache_ref.child(path).delete()
            return True
        except Exception as e:
            logger.error(f"Error eliminando del caché: {str(e)}")
            return False
    
    def clear_prefix(self, prefix: str) -> bool:
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

    def get_compression_stats(self) -> dict:
        """
        Obtiene estadísticas de compresión

        Returns:
            {
                'total_compressed': int,
                'total_original_bytes': int,
                'total_compressed_bytes': int,
                'compression_ratio': float,
                'space_saved_percent': float
            }
        """
        stats = self.compression_stats.copy()

        if stats['total_original_bytes'] > 0:
            stats['compression_ratio'] = stats['total_compressed_bytes'] / stats['total_original_bytes']
            stats['space_saved_percent'] = (1 - stats['compression_ratio']) * 100
        else:
            stats['compression_ratio'] = 0.0
            stats['space_saved_percent'] = 0.0

        return stats

firebase_cache = FirebaseCache(default_ttl=3600, enable_compression=True)