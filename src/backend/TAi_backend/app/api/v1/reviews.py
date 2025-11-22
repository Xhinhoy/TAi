from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.repositories.review_repository import review_repository
from app.services.place_service import place_service
from app.models.review import ReviewCreate, Review, ReviewResponse
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.post("/", response_model=Review)
async def create_review(
    review: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una nueva reseña interna del usuario
    """
    try:
        review_data = {
            'user_id': current_user['uid'],
            'user_name': current_user.get('displayName', 'Usuario'),
            'place_id': review.place_id,
            'place_name': review.place_name,
            'rating': review.rating,
            'text': review.text
        }

        created_review = review_repository.create_review(review_data)
        return Review(**created_review)

    except Exception as e:
        logger.error(f"Error creando reseña: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creando reseña")

@router.get("/place/{place_id}", response_model=ReviewResponse)
async def get_place_reviews(
    place_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene TODAS las reseñas de un lugar (Google + internas)
    """
    try:
        # 1. Obtener reseñas internas
        internal_reviews = review_repository.get_reviews_by_place(place_id)

        # 2. Obtener detalles del lugar (incluye reseñas de Google)
        place_details = place_service.get_place_details(place_id)

        google_reviews = []
        place_name = ""
        google_rating = 0

        if place_details:
            google_reviews = place_details.reviews or []
            place_name = place_details.name
            google_rating = place_details.rating or 0

        # 3. Calcular rating promedio combinado
        total_reviews = len(internal_reviews) + len(google_reviews)

        if total_reviews > 0:
            internal_sum = sum(r['rating'] for r in internal_reviews)
            google_sum = sum(r.get('rating', 0) for r in google_reviews)
            average_rating = (internal_sum + google_sum) / total_reviews
        else:
            average_rating = google_rating

        return ReviewResponse(
            place_id=place_id,
            place_name=place_name or "Lugar",
            total_reviews=total_reviews,
            average_rating=round(average_rating, 1),
            google_reviews=google_reviews,
            internal_reviews=[Review(**r) for r in internal_reviews]
        )

    except Exception as e:
        logger.error(f"Error obteniendo reseñas: {str(e)}")
        raise HTTPException(status_code=500, detail="Error obteniendo reseñas")

@router.get("/user/me", response_model=List[Review])
async def get_my_reviews(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todas las reseñas del usuario actual
    """
    try:
        reviews = review_repository.get_reviews_by_user(current_user['uid'])
        return [Review(**r) for r in reviews]

    except Exception as e:
        logger.error(f"Error obteniendo reseñas del usuario: {str(e)}")
        raise HTTPException(status_code=500, detail="Error obteniendo reseñas")

@router.delete("/{review_id}")
async def delete_review(
    review_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina una reseña del usuario
    """
    try:
        success = review_repository.delete_review(review_id, current_user['uid'])

        if not success:
            raise HTTPException(status_code=404, detail="Reseña no encontrada o no autorizado")

        return {"message": "Reseña eliminada correctamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando reseña: {str(e)}")
        raise HTTPException(status_code=500, detail="Error eliminando reseña")

@router.post("/{review_id}/helpful")
async def mark_helpful(
    review_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Marca una reseña como útil
    """
    try:
        success = review_repository.mark_helpful(review_id)

        if not success:
            raise HTTPException(status_code=404, detail="Reseña no encontrada")

        return {"message": "Marcada como útil"}

    except Exception as e:
        logger.error(f"Error marcando reseña: {str(e)}")
        raise HTTPException(status_code=500, detail="Error marcando reseña")
