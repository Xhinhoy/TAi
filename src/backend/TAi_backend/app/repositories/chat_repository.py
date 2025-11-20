from app.core.firebase import firebase_service
from typing import List, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ChatRepository:
    def __init__(self):
        self.db = firebase_service.realtime_db
    
    def save_message(self, session_id: str, message: Dict) -> str:
        message['timestamp'] = datetime.utcnow().isoformat()
        ref = self.db.child('conversations').child(session_id).child('messages').push(message) # type: ignore
        return ref.key # type: ignore
    
    def get_conversation(self, session_id: str, limit: int = 50) -> List[Dict]:
        messages = self.db.child('conversations').child(session_id).child('messages').order_by_child('timestamp').limit_to_last(limit).get() # type: ignore
        if not messages:
            return []
        return [{'id': k, **v} for k, v in messages.items()] # type: ignore
    
    def clear_conversation(self, session_id: str) -> bool:
        """Alias para delete_session (mantener compatibilidad)"""
        return self.delete_session(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Elimina una sesión de chat completamente"""
        try:
            self.db.child('conversations').child(session_id).delete() # type: ignore
            return True
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {str(e)}")
            return False

    def get_user_sessions(self, user_id: str) -> List[Dict]:
        """
        Obtiene todas las sesiones de chat de un usuario con metadata
        """
        conversations = self.db.child('conversations').get() # type: ignore
        if not conversations:
            return []

        user_sessions = []
        for session_id, session_data in conversations.items(): # type: ignore
            if not isinstance(session_data, dict):
                continue

            # Verificar si esta sesión pertenece al usuario
            messages = session_data.get('messages', {})
            if not messages:
                continue

            # Obtener el primer mensaje para verificar user_id y crear título
            first_message = None
            last_message = None
            last_timestamp = None

            for msg_id, msg_data in messages.items():
                if not isinstance(msg_data, dict):
                    continue

                # Verificar que pertenezca al usuario (buscar en metadata o en los mensajes)
                if not first_message:
                    first_message = msg_data

                # Actualizar último mensaje
                msg_timestamp = msg_data.get('timestamp')
                if msg_timestamp:
                    if not last_timestamp or msg_timestamp > last_timestamp:
                        last_timestamp = msg_timestamp
                        last_message = msg_data

            if not first_message:
                continue

            # Extraer título del primer mensaje del usuario
            title = "Nueva conversación"
            if first_message.get('role') == 'user':
                content = first_message.get('content', '')
                title = content[:50] + ('...' if len(content) > 50 else '')

            # Extraer último mensaje
            last_message_content = ""
            if last_message:
                last_message_content = last_message.get('content', '')[:100]

            user_sessions.append({
                'id': session_id,
                'title': title,
                'lastMessage': last_message_content,
                'timestamp': last_timestamp or datetime.utcnow().isoformat(),
                'messageCount': len(messages)
            })

        # Ordenar por timestamp descendente
        user_sessions.sort(key=lambda x: x['timestamp'], reverse=True)

        return user_sessions

chat_repository = ChatRepository()