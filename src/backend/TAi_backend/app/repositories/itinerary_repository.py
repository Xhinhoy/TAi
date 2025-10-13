from typing import List
from .base import BaseRepository
from datetime import datetime

class ItineraryRepository(BaseRepository):
    def __init__(self):
        super().__init__('itineraries')
    
    def get_user_itineraries(self, uid: str) -> List[dict]:
        query = self.get_collection().where('owner_uid', '==', uid).order_by('created_at', direction='DESCENDING')
        docs = query.stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
    
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
