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
        try:
            # Guardar mensaje del usuario
            chat_repository.save_message(
                request.session_id,
                {
                    'role': 'user',
                    'content': request.message
                },
                owner_uid=request.user_id
            )
            
            # Obtener perfil
            user_profile = user_service.get_profile(request.user_id)
            if not user_profile:
                raise ValueError("Usuario no encontrado")

            # Crear agente con user_id para historial persistente
            agent = TravelAgent(
                user_profile=user_profile.model_dump(),
                user_id=request.user_id  # UID de Firebase
            )
            
            # Obtener respuesta
            result = await agent.chat(request.message)

            # Si se guardó un itinerario, avisar explícitamente al usuario
            if result.get("saved_itinerary_id"):
                save_notice = (
                    f"\n\n💾 Itinerario guardado con ID: {result['saved_itinerary_id']} "
                    "Lo puedes ver en tus itinerarios."
                )
                result["response"] = f"{result.get('response','')}{save_notice}"
            
            # Guardar respuesta
            chat_repository.save_message(
                request.session_id,
                {
                    'role': 'assistant',
                    'content': result['response']
                },
                owner_uid=request.user_id
            )
            
            return ChatResponse(**result)
            
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

    def get_user_sessions(self, user_id: str) -> List[dict]:
        """Obtiene todas las sesiones de chat de un usuario"""
        return chat_repository.get_user_sessions(user_id)

    def delete_session(self, session_id: str) -> bool:
        """Elimina una sesión de chat"""
        return chat_repository.delete_session(session_id)

chat_service = ChatService()
