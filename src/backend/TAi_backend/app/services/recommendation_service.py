from app.services.llm.agent import TravelAgent
from app.services.user_service import user_service
from app.models.recommendation import RecommendationRequest, RecommendationResponse
import logging

logger = logging.getLogger(__name__)

class RecommendationService:
    async def generate_recommendations(self, request: RecommendationRequest) -> RecommendationResponse:
        try:
            user_profile = user_service.get_profile(request.user_id)
            if not user_profile:
                raise ValueError("Usuario no encontrado")

            # Crear agente con user_id (aunque no usa historial en recomendaciones)
            agent = TravelAgent(
                user_profile=user_profile.model_dump(),
                user_id=request.user_id
            )
            
            location = request.location or {'city': user_profile.location}
            result = await agent.generate_recommendations(location, request.limit)
            
            return RecommendationResponse(**result)
            
        except Exception as e:
            logger.error(f"Error en recomendaciones: {str(e)}")
            return RecommendationResponse(
                recommendations=[],
                reasoning=f"Error: {str(e)}"
            )

recommendation_service = RecommendationService()

