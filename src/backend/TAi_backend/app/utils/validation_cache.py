"""
Sistema de caché para validaciones de experiencias
Usa Firebase Realtime Database para almacenar resultados
"""

from app.utils.cache import firebase_cache
from app.utils.image_hash import generate_image_hash
from typing import Optional, Dict, List
import logging
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ValidationCacheManager:
    """Gestor de caché para validaciones de experiencias"""

    def __init__(self):
        self.cache_prefix = 'experience_validation'
        self.cache_ttl = 7 * 24 * 60 * 60  # 7 días en segundos
        self.stats_key = 'validation_cache_stats'

    def _generate_cache_key(self, image_hash: str) -> str:
        """Genera clave de caché única"""
        return f"{image_hash}"

    def save_validation(
        self,
        image_bytes: bytes,
        result: dict,
        user_id: str = None
    ) -> bool:
        """
        Guarda un resultado de validación en caché

        Args:
            image_bytes: Bytes de la imagen
            result: Resultado de la validación
            user_id: ID del usuario (opcional)

        Returns:
            True si se guardó correctamente
        """
        try:
            # Generar hash de la imagen
            image_hash = generate_image_hash(image_bytes)
            cache_key = self._generate_cache_key(image_hash)

            # Preparar datos para caché
            cached_data = {
                'image_hash': image_hash,
                'result': result,
                'cached_at': datetime.now().isoformat(),
                'user_id': user_id,
                'expires_at': (datetime.now() + timedelta(days=7)).isoformat(),
            }

            # Guardar en Firebase
            success = firebase_cache.set(
                self.cache_prefix,
                cache_key,
                cached_data,
                self.cache_ttl
            )

            if success:
                logger.info(
                    f"💾 Validation cached: {result.get('lugar_identificado', {}).get('nombre', 'unknown')} "
                    f"(hash: {image_hash[:8]}...)"
                )
                # Actualizar estadísticas
                self._update_stats('save', image_hash)

            return success

        except Exception as e:
            logger.error(f"Error guardando validación en caché: {str(e)}")
            return False

    def get_validation(self, image_bytes: bytes) -> Optional[dict]:
        """
        Busca una validación en caché por hash de imagen

        Args:
            image_bytes: Bytes de la imagen

        Returns:
            Resultado cacheado o None
        """
        try:
            # Generar hash
            image_hash = generate_image_hash(image_bytes)
            cache_key = self._generate_cache_key(image_hash)

            # Buscar en caché
            cached_data = firebase_cache.get(self.cache_prefix, cache_key)

            if cached_data:
                # Verificar expiración (double-check)
                expires_at = datetime.fromisoformat(cached_data['expires_at'])
                if datetime.now() > expires_at:
                    logger.info(f"⏰ Cache expired for hash: {image_hash[:8]}...")
                    self.delete_validation(image_hash)
                    self._update_stats('miss', image_hash)
                    return None

                logger.info(
                    f"✅ Cache HIT: {cached_data['result'].get('lugar_identificado', {}).get('nombre', 'unknown')} "
                    f"(hash: {image_hash[:8]}...)"
                )
                self._update_stats('hit', image_hash)
                return cached_data['result']

            logger.info(f"❌ Cache MISS for hash: {image_hash[:8]}...")
            self._update_stats('miss', image_hash)
            return None

        except Exception as e:
            logger.error(f"Error obteniendo validación de caché: {str(e)}")
            return None

    def delete_validation(self, image_hash: str) -> bool:
        """
        Elimina una validación del caché

        Args:
            image_hash: Hash de la imagen

        Returns:
            True si se eliminó correctamente
        """
        try:
            cache_key = self._generate_cache_key(image_hash)
            success = firebase_cache.delete(self.cache_prefix, cache_key)

            if success:
                logger.info(f"🗑️ Validation deleted from cache: {image_hash[:8]}...")

            return success

        except Exception as e:
            logger.error(f"Error eliminando validación de caché: {str(e)}")
            return False

    def get_all_validations(self, user_id: str = None) -> List[dict]:
        """
        Obtiene todas las validaciones en caché (opcionalmente filtradas por usuario)

        Args:
            user_id: ID del usuario (opcional)

        Returns:
            Lista de validaciones cacheadas
        """
        try:
            # Firebase cache no tiene método para listar todas las claves
            # Por simplicidad, retornamos lista vacía
            # En producción, considera usar Firestore en lugar de Realtime Database
            logger.warning("get_all_validations no implementado para Firebase Realtime Database")
            return []

        except Exception as e:
            logger.error(f"Error obteniendo todas las validaciones: {str(e)}")
            return []

    def clear_expired_cache(self) -> int:
        """
        Limpia validaciones expiradas del caché

        Returns:
            Cantidad de entradas eliminadas
        """
        try:
            # Firebase Realtime Database elimina automáticamente por TTL
            # Esta función es más para logging
            logger.info("🧹 Firebase TTL se encarga de limpiar caché expirado automáticamente")
            return 0

        except Exception as e:
            logger.error(f"Error limpiando caché expirado: {str(e)}")
            return 0

    def get_stats(self) -> dict:
        """
        Obtiene estadísticas del caché

        Returns:
            Dict con estadísticas
        """
        try:
            stats = firebase_cache.get(self.cache_prefix, self.stats_key)

            if not stats:
                return {
                    'total_saves': 0,
                    'total_hits': 0,
                    'total_misses': 0,
                    'hit_rate': 0.0,
                    'last_updated': None,
                }

            # Calcular hit rate
            total_requests = stats['total_hits'] + stats['total_misses']
            hit_rate = (stats['total_hits'] / total_requests * 100) if total_requests > 0 else 0.0

            return {
                **stats,
                'hit_rate': round(hit_rate, 2),
            }

        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de caché: {str(e)}")
            return {
                'total_saves': 0,
                'total_hits': 0,
                'total_misses': 0,
                'hit_rate': 0.0,
                'last_updated': None,
            }

    def reset_stats(self) -> bool:
        """
        Resetea las estadísticas del caché

        Returns:
            True si se reseteó correctamente
        """
        try:
            initial_stats = {
                'total_saves': 0,
                'total_hits': 0,
                'total_misses': 0,
                'last_updated': datetime.now().isoformat(),
            }

            success = firebase_cache.set(
                self.cache_prefix,
                self.stats_key,
                initial_stats,
                None  # Sin TTL para stats
            )

            if success:
                logger.info("📊 Cache stats reset")

            return success

        except Exception as e:
            logger.error(f"Error reseteando estadísticas: {str(e)}")
            return False

    # ===== Métodos privados =====

    def _update_stats(self, action: str, image_hash: str = None):
        """
        Actualiza estadísticas del caché

        Args:
            action: 'save', 'hit', o 'miss'
            image_hash: Hash de la imagen (opcional)
        """
        try:
            stats = firebase_cache.get(self.cache_prefix, self.stats_key)

            if not stats:
                stats = {
                    'total_saves': 0,
                    'total_hits': 0,
                    'total_misses': 0,
                    'last_updated': None,
                }

            # Actualizar contador
            if action == 'save':
                stats['total_saves'] = stats.get('total_saves', 0) + 1
            elif action == 'hit':
                stats['total_hits'] = stats.get('total_hits', 0) + 1
            elif action == 'miss':
                stats['total_misses'] = stats.get('total_misses', 0) + 1

            stats['last_updated'] = datetime.now().isoformat()

            # Guardar stats (sin TTL)
            firebase_cache.set(
                self.cache_prefix,
                self.stats_key,
                stats,
                None
            )

        except Exception as e:
            logger.error(f"Error actualizando estadísticas: {str(e)}")


# Instancia global
validation_cache = ValidationCacheManager()
