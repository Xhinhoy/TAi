from typing import List
from .base import BaseRepository
from datetime import datetime

class ItineraryRepository(BaseRepository):
    def __init__(self):
        super().__init__('itineraries')
    
    def get_user_itineraries(self, uid: str) -> List[dict]:
        """
        Devuelve todos los itinerarios del usuario.
        Algunos documentos antiguos usan user_id en vez de owner_uid, así que combinamos ambos.
        """
        results: List[dict] = []

        # Itinerarios con owner_uid
        try:
            docs_owner = (
                self.get_collection()
                .where('owner_uid', '==', uid)
                .order_by('created_at', direction='DESCENDING')
                .stream()
            )
            results.extend([{'id': doc.id, **doc.to_dict()} for doc in docs_owner])
        except Exception:
            docs_owner = []

        # Itinerarios con user_id (legacy)
        try:
            docs_user = (
                self.get_collection()
                .where('user_id', '==', uid)
                .order_by('created_at', direction='DESCENDING')
                .stream()
            )
            results.extend([{'id': doc.id, **doc.to_dict()} for doc in docs_user])
        except Exception:
            docs_user = []

        # Eliminar duplicados y normalizar start_date
        unique = {}
        for item in results:
            if not item.get('start_date') and item.get('created_at'):
                try:
                    item['start_date'] = item['created_at'].date().isoformat()
                except Exception:
                    pass
            unique[item['id']] = item

        from datetime import datetime
        sorted_items = sorted(
            unique.values(),
            key=lambda x: x.get('created_at') or datetime.min,
            reverse=True,
        )

        return sorted_items
    
    def create_itinerary(self, itinerary_data: dict) -> str:
        itinerary_data['created_at'] = datetime.utcnow()
        itinerary_data['updated_at'] = datetime.utcnow()
        doc_ref = self.get_collection().document()
        doc_ref.set(itinerary_data)
        return doc_ref.id
    
    def update_itinerary(self, itinerary_id: str, itinerary_data: dict) -> bool:
        itinerary_data['updated_at'] = datetime.utcnow()
        return self.update(itinerary_id, itinerary_data)

itinerary_repository = ItineraryRepository()
