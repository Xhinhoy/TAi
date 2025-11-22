from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.services.itinerary_service import itinerary_service
from app.models.itinerary import Itinerary, ItineraryCreate, ItineraryGenerateRequest
from typing import List

router = APIRouter(prefix="/itineraries", tags=["itineraries"])

# IMPORTANTE: Endpoints específicos (como /generate) deben ir ANTES que los genéricos (como /{user_id})
# para que FastAPI los matchee correctamente

@router.post("/generate", response_model=Itinerary)
async def generate_itinerary(
    request: ItineraryGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    import logging
    logger = logging.getLogger(__name__)

    logger.info("=" * 80)
    logger.info("🎯 ENDPOINT /generate ALCANZADO")
    logger.info("=" * 80)

    try:
        logger.info(f"📥 REQUEST recibido en /generate")
        logger.info(f"👤 current_user completo: {current_user}")
        logger.info(f"👤 Usuario UID: {current_user['uid']}")
        logger.info(f"📦 Request data: ciudad={request.city}, días={request.days}")
        logger.info(f"📦 Request completo: {request.model_dump()}")

        logger.info(f"🚀 Llamando a itinerary_service.generate_itinerary...")
        itinerary = await itinerary_service.generate_itinerary(request, current_user['uid'])
        logger.info(f"✅ Itinerario generado exitosamente: {itinerary.id}")
        return itinerary
    except ValueError as e:
        logger.error(f"❌ Error de validación: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error generando itinerario: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generando itinerario: {str(e)}")

# Endpoints genéricos van DESPUÉS de los específicos
@router.get("/user/{user_id}", response_model=List[Itinerary])
async def get_itineraries(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    itineraries = itinerary_service.get_user_itineraries(user_id)
    return itineraries

@router.get("/{itinerary_id}", response_model=Itinerary)
async def get_itinerary_by_id(
    itinerary_id: str,
    current_user: dict = Depends(get_current_user)
):
    itinerary = itinerary_service.get_itinerary_by_id(itinerary_id)
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")

    if itinerary.owner_uid != current_user['uid']:
        raise HTTPException(status_code=403, detail="No autorizado")

    return itinerary

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