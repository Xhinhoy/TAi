# ==================== app/services/chat_service.py ====================
from app.repositories.chat_repository import chat_repository
from app.services.llm.agent import TravelAgent
from app.services.user_service import user_service
from app.models.chat import ChatRequest, ChatResponse
from typing import List
import logging

logger = logging.getLogger(__name__)

class ChatService:
    """Servicio de chat con el agente"""
    
    async def send_message(self, request: ChatRequest) -> ChatResponse:
        """Procesa un mensaje del usuario"""
        from app.core.config import settings
        import time

        try:
            # MODO MOCK: respuesta simple sin Firebase/LLM
            if settings.MOCK_MODE:
                logger.info(f"🧪 MOCK_MODE: respondiendo con mock para mensaje: {request.message}")
                # Simular pequeño delay (100ms) para realismo
                time.sleep(0.1)
                return ChatResponse(
                    response=f"[MOCK] Recibí tu mensaje: '{request.message}'. Estoy funcionando correctamente en modo prueba.",
                    conversation_id=request.session_id,
                    suggestions=["¿Qué lugares me recomiendas?", "Crea un itinerario de 3 días"],
                    actions=[],
                    places=[]
                )

            # Guardar mensaje del usuario
            chat_repository.save_message(request.session_id, {
                'role': 'user',
                'content': request.message
            })

            # Obtener perfil (crear uno básico si no existe)
            user_profile = user_service.get_profile(request.user_id)
            if not user_profile:
                logger.warning(f"Usuario {request.user_id} no existe, creando perfil básico")
                from app.models.user import UserProfile
                user_profile = UserProfile(
                    uid=request.user_id,
                    email=f"{request.user_id}@temp.com",
                    display_name="Usuario Temporal",
                    interests=["turismo", "cultura", "gastronomía"],
                    budget="medium"
                )
                user_service.create_profile(request.user_id, user_profile)

            # Crear agente
            agent = TravelAgent(user_profile.model_dump())

            # Obtener respuesta
            result = await agent.chat(request.message)

            # Guardar respuesta
            chat_repository.save_message(request.session_id, {
                'role': 'assistant',
                'content': result['response']
            })

            result['conversation_id'] = request.session_id
            return ChatResponse(**result)

        except Exception as e:
            logger.error(f"❌ Error en chat: {str(e)}", exc_info=True)
            return ChatResponse(
                response=f"Lo siento, ocurrió un error: {str(e)}",
                conversation_id=request.session_id,
                actions=[],
                places=[]
            )
    
    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[dict]:
        """Obtiene el historial de conversación"""
        return chat_repository.get_conversation(session_id, limit)

chat_service = ChatService()