from app.repositories.user_repository import user_repository
from app.models.user import UserProfile, UserProfileUpdate
from typing import Optional, List

class UserService:
    def get_profile(self, uid: str) -> Optional[UserProfile]:
        profile_data = user_repository.get_profile(uid)
        if profile_data:
            return UserProfile(**profile_data)
        return None
    
    def create_profile(self, uid: str, profile: UserProfile) -> UserProfile:
        profile_dict = profile.model_dump(exclude={'uid'})
        user_repository.create_profile(uid, profile_dict)
        return profile
    
    def update_profile(self, uid: str, updates: UserProfileUpdate) -> Optional[UserProfile]:
        update_dict = updates.model_dump(exclude_unset=True)
        user_repository.update_profile(uid, update_dict)
        return self.get_profile(uid)
    
    def update_interests(self, uid: str, interests: List[str]) -> bool:
        return user_repository.update_interests(uid, interests)
    
    def get_favorites(self, uid: str) -> List[dict]:
        return user_repository.get_favorites(uid)
    
    def add_favorite(self, uid: str, place_id: str, place_data: dict) -> str:
        return user_repository.add_favorite(uid, place_id, place_data)
    
    def remove_favorite(self, uid: str, place_id: str) -> bool:
        return user_repository.remove_favorite(uid, place_id)

user_service = UserService()
