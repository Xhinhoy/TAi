from typing import TypeVar, Generic, Optional, List, Dict
from abc import ABC, abstractmethod
from app.core.firebase import firebase_service

T = TypeVar('T')

class BaseRepository(Generic[T], ABC):
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self.db = firebase_service.firestore
    
    def get_collection(self):
        return self.db.collection(self.collection_name)
    
    def get(self, doc_id: str) -> Optional[Dict]:
        doc = self.get_collection().document(doc_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    
    def create(self, doc_id: str, data: Dict) -> str:
        self.get_collection().document(doc_id).set(data)
        return doc_id
    
    def update(self, doc_id: str, data: Dict) -> bool:
        self.get_collection().document(doc_id).update(data)
        return True
    
    def delete(self, doc_id: str) -> bool:
        self.get_collection().document(doc_id).delete()
        return True
    
    def list_all(self, limit: int = 100) -> List[Dict]:
        docs = self.get_collection().limit(limit).stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
