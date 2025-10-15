from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.deps import get_current_user
from app.services.place_service import place_service 
from app.models.place import Place, PlaceDetails, PlaceSearchParams, GeoPoint
from typing import List, Optional

router = APIRouter(prefix="/places", tags=["places"])

@router.get("/search", response_model=List[Place])
async def search_places(
    q: Optional[str] = Query(None, description="Búsqueda de texto"),
    lat: float = Query(..., description="Latitud"),
    lng: float = Query(..., description="Longitud"),
    radius: int = Query(5000, description="Radio en metros"),
    place_type: Optional[str] = Query(None, description="Tipo de lugar"),
    current_user: dict = Depends(get_current_user)
):
    params = PlaceSearchParams(
        query=q,
        location=GeoPoint(latitude=lat, longitude=lng),
        radius=radius,
        place_type=place_type
    )
    
    places = place_service.search_places(params)
    return places

@router.get("/{place_id}", response_model=PlaceDetails)
async def get_place(
    place_id: str,
    current_user: dict = Depends(get_current_user)
):
    place = place_service.get_place_details(place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")
    return place

@router.get("/by-category/", response_model=List[Place])
async def get_by_category(
    categories: str = Query(..., description="Categorías separadas por coma"),
    limit: int = Query(20, description="Límite de resultados"),
    current_user: dict = Depends(get_current_user)
):
    category_list = [c.strip() for c in categories.split(",")]
    places = place_service.search_by_category(category_list, limit)
    return places