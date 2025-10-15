from app.repositories.itinerary_repository import itinerary_repository
from app.services.llm.agent import TravelAgent
from app.services.user_service import user_service
from app.models.itinerary import Itinerary, ItineraryCreate, ItineraryGenerateRequest
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class ItineraryService:
    def get_user_itineraries(self, uid: str) -> List[Itinerary]:
        results = itinerary_repository.get_user_itineraries(uid)
        return [Itinerary(**r) for r in results]
    
    def create_itinerary(self, uid: str, itinerary: ItineraryCreate) -> Itinerary:
        data = itinerary.model_dump()
        data['owner_uid'] = uid
        itinerary_id = itinerary_repository.create_itinerary(data)
        return Itinerary(id=itinerary_id, **data)
    
    def update_itinerary(self, itinerary_id: str, itinerary: ItineraryCreate) -> bool:
        return itinerary_repository.update_itinerary(itinerary_id, itinerary.model_dump())
    
    def delete_itinerary(self, itinerary_id: str) -> bool:
        return itinerary_repository.delete(itinerary_id)
    
    async def generate_itinerary(self, request: ItineraryGenerateRequest) -> Itinerary:
        try:
            user_profile = user_service.get_profile(request.user_id)
            if not user_profile:
                raise ValueError("Usuario no encontrado")
            
            agent = TravelAgent(user_profile.model_dump())
            
            result = await agent.generate_itinerary(request.city, request.days)
            
            items = []
            for day_data in result.get('days', []):
                for activity in day_data.get('activities', []):
                    items.append({
                        'day': day_data['day'],
                        'place_id': activity['place_id'],
                        'start': activity['start'],
                        'end': activity['end'],
                        'notes': activity.get('notes')
                    })
            
            itinerary = ItineraryCreate(
                title=result.get('title', f'{request.days} días en {request.city}'),
                city=request.city,
                days=request.days,
                items=items
            )
            
            return self.create_itinerary(request.user_id, itinerary)
            
        except Exception as e:
            logger.error(f"Error generando itinerario: {str(e)}")
            raise

itinerary_service = ItineraryService()