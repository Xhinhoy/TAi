from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.services.user_service import user_service
from app.models.user import UserProfile, UserProfileUpdate
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{uid}/profile", response_model=UserProfile)
async def get_profile(uid: str, current_user: dict = Depends(get_current_user)):
    if current_user['uid'] != uid:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    profile = user_service.get_profile(uid)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return profile

@router.put("/{uid}/profile", response_model=UserProfile)
async def update_profile(
    uid: str,
    updates: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != uid:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    profile = user_service.update_profile(uid, updates)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return profile

@router.patch("/{uid}/interests")
async def update_interests(
    uid: str,
    interests: List[str],
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != uid:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    success = user_service.update_interests(uid, interests)
    return {"success": success, "interests": interests}

@router.get("/{uid}/favorites")
async def get_favorites(uid: str, current_user: dict = Depends(get_current_user)):
    if current_user['uid'] != uid:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    favorites = user_service.get_favorites(uid)
    return {"favorites": favorites}

@router.post("/{uid}/favorites")
async def add_favorite(
    uid: str,
    place_id: str,
    place_data: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != uid:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    result = user_service.add_favorite(uid, place_id, place_data)
    return {"success": True, "place_id": result}

@router.delete("/{uid}/favorites/{place_id}")
async def remove_favorite(
    uid: str,
    place_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != uid:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    success = user_service.remove_favorite(uid, place_id)
    return {"success": success}
