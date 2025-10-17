from typing import Optional, List
from .base import BaseRepository
from datetime import datetime

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__('users')
    
    def get_profile(self, uid: str) -> Optional[dict]:
        return self.get(uid)
    
    def create_profile(self, uid: str, profile_data: dict) -> str:
        profile_data['created_at'] = datetime.utcnow()
        profile_data['updated_at'] = datetime.utcnow()
        return self.create(uid, profile_data)
    
    def update_profile(self, uid: str, profile_data: dict) -> bool:
        profile_data['updated_at'] = datetime.utcnow()
        return self.update(uid, profile_data)
    
    def update_interests(self, uid: str, interests: List[str]) -> bool:
        return self.update(uid, {
            'interests': interests,
            'updated_at': datetime.utcnow()
        })
    
    def get_favorites(self, uid: str) -> List[dict]:
        if self.mock_mode:
            fav_key = f"{uid}_favorites"
            return self._mock_store.get(fav_key, [])

        favorites_ref = self.get_collection().document(uid).collection('favorites')
        docs = favorites_ref.stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]

    def add_favorite(self, uid: str, place_id: str, place_data: dict) -> str:
        if self.mock_mode:
            fav_key = f"{uid}_favorites"
            favorites = self._mock_store.get(fav_key, [])
            place_data['added_at'] = datetime.utcnow()
            place_data['id'] = place_id
            favorites.append(place_data)
            self._mock_store[fav_key] = favorites
            return place_id

        favorites_ref = self.get_collection().document(uid).collection('favorites')
        place_data['added_at'] = datetime.utcnow()
        doc_ref = favorites_ref.document(place_id)
        doc_ref.set(place_data)
        return place_id

    def remove_favorite(self, uid: str, place_id: str) -> bool:
        if self.mock_mode:
            fav_key = f"{uid}_favorites"
            favorites = self._mock_store.get(fav_key, [])
            self._mock_store[fav_key] = [f for f in favorites if f.get('id') != place_id]
            return True

        favorites_ref = self.get_collection().document(uid).collection('favorites')
        favorites_ref.document(place_id).delete()
        return True

user_repository = UserRepository()