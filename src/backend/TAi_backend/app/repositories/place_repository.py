from typing import Optional, List
from .base import BaseRepository
from datetime import datetime
from app.utils.cache import firebase_cache
import hashlib
import logging

logger = logging.getLogger(__name__)

class PlaceRepository(BaseRepository):
    def __init__(self):
        super().__init__('places')
        self.cache_prefix = 'places'
        self.cache_ttl = 86400  # 24 horas para lugares
    
    def get_place(self, place_id: str) -> Optional[dict]:
        """Obtiene un lugar, primero del caché Firebase, luego de Firestore"""
        
        # Intentar obtener del caché
        cached_place = firebase_cache.get(self.cache_prefix, place_id)
        if cached_place:
            logger.debug(f"Lugar {place_id} obtenido del caché Firebase")
            return cached_place
        
        # No está en caché, buscar en Firestore
        place = self.get(place_id)
        if place:
            # Guardar en caché
            firebase_cache.set(self.cache_prefix, place_id, place, self.cache_ttl)
            logger.debug(f"Lugar {place_id} guardado en caché Firebase")
        
        return place
    
    def save_place(self, place_data: dict) -> str:
        """Guarda un lugar en Firestore y actualiza caché"""
        place_id = place_data.get('id')
        if not place_id:
            # Generar ID basado en nombre y coordenadas
            key = f"{place_data['name']}_{place_data['coords']['latitude']}_{place_data['coords']['longitude']}"
            place_id = hashlib.md5(key.encode()).hexdigest()
            place_data['id'] = place_id
        
        place_data['updated_at'] = datetime.utcnow()
        if 'created_at' not in place_data:
            place_data['created_at'] = datetime.utcnow()
        
        # Guardar en Firestore
        self.create(place_id, place_data)
        
        # Actualizar caché
        firebase_cache.set(self.cache_prefix, place_id, place_data, self.cache_ttl)
        logger.debug(f"Lugar {place_id} guardado en Firestore y caché")
        
        return place_id
    
    def search_by_category(self, categories: List[str], limit: int = 20) -> List[dict]:
        """Busca lugares por categorías"""
        query = self.get_collection().where('categories', 'array_contains_any', categories).limit(limit)
        docs = query.stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
    
    def invalidate_cache(self, place_id: str) -> bool:
        """Invalida el caché de un lugar específico"""
        return firebase_cache.delete(self.cache_prefix, place_id)
    
    def clear_all_cache(self) -> bool:
        """Limpia todo el caché de lugares"""
        return firebase_cache.clear_prefix(self.cache_prefix)

place_repository = PlaceRepository()