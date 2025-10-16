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
        try:
            # Guardar mensaje del usuario
            chat_repository.save_message(request.session_id, {
                'role': 'user',
                'content': request.message
            })
            
            # Obtener perfil
            user_profile = user_service.get_profile(request.user_id)
            if not user_profile:
                raise ValueError("Usuario no encontrado")
            
            # Crear agente
            agent = TravelAgent(user_profile.model_dump())
            
            # Obtener respuesta
            result = await agent.chat(request.message)
            
            # Guardar respuesta
            chat_repository.save_message(request.session_id, {
                'role': 'assistant',
                'content': result['response']
            })
            
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

chat_service = ChatService()