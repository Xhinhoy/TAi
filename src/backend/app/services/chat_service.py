# ==================== app/services/chat_service.py ====================
from app.repositories.chat_repository import chat_repository
from app.services.llm.agent import TravelAgent
from app.services.user_service import user_service
from app.models.chat import ChatRequest, ChatResponse
from app.core.config import settings
from typing import List
import logging

logger = logging.getLogger(__name__)

class ChatService:
    """Servicio de chat con el agente"""

    async def send_message(self, request: ChatRequest) -> ChatResponse:
        """Procesa un mensaje del usuario"""
        try:
            # Guardar mensaje del usuario
            chat_repository.save_message(request.session_id, {
                'role': 'user',
                'content': request.message
            })

            # -------------------------------
            #  MODO CONMUTADOR MOCK / FIREBASE
            # -------------------------------
            user_profile = None
            if not settings.MOCK_MODE:
                try:
                    user_profile = user_service.get_profile(request.user_id)
                except Exception as e:
                    logger.warning(f"Error obteniendo perfil desde Firebase: {str(e)}")
                    user_profile = None

            # 🚧 Perfil simulado si MOCK_MODE está activo o el usuario no existe
            if settings.MOCK_MODE or not user_profile:
                logger.info(f"Usando perfil simulado para usuario {request.user_id}")
                user_profile = {
                    "id": request.user_id,
                    "name": "Usuario de prueba",
                    "interests": ["museos", "parques", "monumentos"],
                    "preferences": {
                        "budget": "medio",
                        "travel_style": "cultural"
                    }
                }

            # Crear agente de viaje inteligente
            agent = TravelAgent(user_profile)

            # Obtener respuesta del agente
            result = await agent.chat(request.message)

            # Guardar respuesta del asistente
            chat_repository.save_message(request.session_id, {
                'role': 'assistant',
                'content': result['response']
            })

            # ----------------------------------------------------
            # 🔍 Extraer lugares del texto si el agente devolvió JSON_RESULT
            # ----------------------------------------------------
            import json, re
            places_list = result.get('places', [])

            if not places_list and "JSON_RESULT=" in result.get('response', ''):
                try:
                    json_match = re.search(r'JSON_RESULT\s*=\s*(\[.*?\])', result['response'], re.DOTALL)
                    if json_match:
                        places_list = json.loads(json_match.group(1))
                        logger.info(f"✅ Lugares extraídos desde JSON_RESULT: {len(places_list)} encontrados.")
                except Exception as e:
                    logger.warning(f"No se pudieron parsear los lugares: {e}")

            # Formatear respuesta para frontend
            return ChatResponse(
                response=result.get('response', 'Sin respuesta generada'),
                actions=result.get('actions', []),
                places=places_list,
            )

        except Exception as e:
            logger.error(f"Error en chat: {str(e)}")
            return ChatResponse(
                response=f"Lo siento, ocurrió un error: {str(e)}",
                actions=[],
                places=[]
            )

    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[dict]:
        """Obtiene el historial de conversación"""
        return chat_repository.get_conversation(session_id, limit)


chat_service = ChatService()
