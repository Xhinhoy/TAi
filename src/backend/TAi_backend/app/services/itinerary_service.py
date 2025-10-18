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

    def get_itinerary_by_id(self, itinerary_id: str) -> Optional[Itinerary]:
        result = itinerary_repository.get(itinerary_id)
        if result:
            return Itinerary(**result)
        return None
    
    def create_itinerary(self, uid: str, itinerary: ItineraryCreate) -> Itinerary:
        data = itinerary.model_dump()
        data['owner_uid'] = uid
        itinerary_id = itinerary_repository.create_itinerary(data)
        return Itinerary(id=itinerary_id, **data)
    
    def update_itinerary(self, itinerary_id: str, itinerary: ItineraryCreate) -> bool:
        return itinerary_repository.update_itinerary(itinerary_id, itinerary.model_dump())
    
    def delete_itinerary(self, itinerary_id: str) -> bool:
        return itinerary_repository.delete(itinerary_id)
    
    async def generate_itinerary(self, request: ItineraryGenerateRequest, user_id: str) -> Itinerary:
        try:
            logger.info(f"🚀 Iniciando generación de itinerario para user_id: {user_id}")
            logger.info(f"📍 Ciudad: {request.city}, Días: {request.days}")

            logger.info(f"👤 Obteniendo perfil del usuario: {user_id}")
            user_profile = user_service.get_profile(user_id)

            # Si el perfil no existe, crear uno básico con el UID
            if not user_profile:
                logger.warning(f"⚠️ Perfil no encontrado, creando perfil básico para: {user_id}")
                from app.models.user import UserProfile
                user_profile = UserProfile(uid=user_id)

            logger.info(f"✅ Perfil de usuario obtenido/creado exitosamente")

            logger.info(f"🤖 Inicializando agente de viaje con perfil de usuario")
            agent = TravelAgent(user_profile.model_dump())

            logger.info(f"🎯 Generando itinerario con IA...")
            result = await agent.generate_itinerary(request.city, request.days)
            logger.info(f"✅ Itinerario generado por IA")

            items = []
            for day_data in result.get('days', []):
                for activity in day_data.get('activities', []):
                    items.append({
                        'day': day_data['day'],
                        'place_id': activity['place_id'],
                        'place_name': activity.get('place_name', activity.get('place_id', 'Lugar sin nombre')),
                        'start': activity['start'],
                        'end': activity['end'],
                        'notes': activity.get('notes')
                    })

            # Usar título proporcionado por el usuario o generado por IA, o crear uno por defecto
            final_title = request.title or result.get('title') or f'{request.days} días en {request.city}'

            itinerary = ItineraryCreate(
                title=final_title,
                city=request.city,
                days=request.days,
                items=items
            )

            return self.create_itinerary(user_id, itinerary)

        except Exception as e:
            logger.error(f"Error generando itinerario: {str(e)}")
            raise

itinerary_service = ItineraryService()