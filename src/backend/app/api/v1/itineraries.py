from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.services.itinerary_service import itinerary_service
from app.models.itinerary import Itinerary, ItineraryCreate, ItineraryGenerateRequest
from typing import List

router = APIRouter(prefix="/itineraries", tags=["itineraries"])

@router.get("/{user_id}", response_model=List[Itinerary])
async def get_itineraries(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    itineraries = itinerary_service.get_user_itineraries(user_id)
    return itineraries

@router.post("/{user_id}", response_model=Itinerary)
async def create_itinerary(
    user_id: str,
    itinerary: ItineraryCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    result = itinerary_service.create_itinerary(user_id, itinerary)
    return result

@router.put("/{itinerary_id}", response_model=dict)
async def update_itinerary(
    itinerary_id: str,
    itinerary: ItineraryCreate,
    current_user: dict = Depends(get_current_user)
):
    success = itinerary_service.update_itinerary(itinerary_id, itinerary)
    return {"success": success}

@router.delete("/{itinerary_id}")
async def delete_itinerary(
    itinerary_id: str,
    current_user: dict = Depends(get_current_user)
):
    success = itinerary_service.delete_itinerary(itinerary_id)
    return {"success": success}

@router.post("/generate", response_model=Itinerary)
async def generate_itinerary(
    request: ItineraryGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != request.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    itinerary = await itinerary_service.generate_itinerary(request)
    return itinerary