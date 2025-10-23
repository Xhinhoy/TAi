from typing import TypeVar, Generic, Optional, List, Dict
from abc import ABC, abstractmethod
from app.core.firebase import firebase_service
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

class BaseRepository(Generic[T], ABC):
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self.db = firebase_service.firestore

        # Usar mock_mode si está activado O si Firebase no está disponible
        self.mock_mode = settings.MOCK_MODE or (self.db is None)

        if self.mock_mode:
            if settings.MOCK_MODE:
                logger.warning(f"🧪 {collection_name} Repository en MOCK_MODE: usando dict local")
            else:
                logger.warning(f"⚠️ {collection_name} Repository: Firebase no disponible, usando dict local")
            self.db = None
            self._mock_store = {}  # Almacenamiento en memoria
    
    def get_collection(self):
        if self.mock_mode:
            return None
        return self.db.collection(self.collection_name)

    def get(self, doc_id: str) -> Optional[Dict]:
        if self.mock_mode:
            data = self._mock_store.get(doc_id)
            if data:
                return {**data, 'id': doc_id}
            return None

        doc = self.get_collection().document(doc_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    
    def create(self, doc_id: str, data: Dict) -> str:
        if self.mock_mode:
            self._mock_store[doc_id] = data
            return doc_id

        self.get_collection().document(doc_id).set(data)
        return doc_id

    def update(self, doc_id: str, data: Dict) -> bool:
        if self.mock_mode:
            if doc_id in self._mock_store:
                self._mock_store[doc_id].update(data)
            else:
                self._mock_store[doc_id] = data
            return True

        self.get_collection().document(doc_id).update(data)
        return True

    def delete(self, doc_id: str) -> bool:
        if self.mock_mode:
            self._mock_store.pop(doc_id, None)
            return True

        self.get_collection().document(doc_id).delete()
        return True

    def list_all(self, limit: int = 100) -> List[Dict]:
        if self.mock_mode:
            items = list(self._mock_store.items())[:limit]
            return [{'id': doc_id, **data} for doc_id, data in items]

        docs = self.get_collection().limit(limit).stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
