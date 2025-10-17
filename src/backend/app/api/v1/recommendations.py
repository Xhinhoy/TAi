from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.services.recommendation_service import recommendation_service
from app.models.recommendation import RecommendationRequest, RecommendationResponse
    
router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.post("/generate", response_model=RecommendationResponse)
async def generate_recommendations(
    request: RecommendationRequest,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != request.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    recommendations = await recommendation_service.generate_recommendations(request)
    return recommendations