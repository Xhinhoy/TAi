from app.core.firebase import firebase_service
from typing import List, Dict
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

class ChatRepository:
    def __init__(self):
        self.db = firebase_service.realtime_db
        self._mock_store: Dict[str, List[Dict]] = {}  # {session_id: [messages]}

    def save_message(self, session_id: str, message: Dict) -> str:
        message['timestamp'] = datetime.utcnow().isoformat()

        # Si no hay Firebase disponible, usar almacenamiento en memoria
        if self.db is None:
            logger.debug(f"💾 Guardando mensaje en memoria (sin Firebase): {session_id}")
            if session_id not in self._mock_store:
                self._mock_store[session_id] = []
            msg_id = str(uuid.uuid4())
            message['id'] = msg_id
            self._mock_store[session_id].append(message)
            return msg_id

        ref = self.db.child('conversations').child(session_id).child('messages').push(message) # type: ignore
        return ref.key # type: ignore

    def get_conversation(self, session_id: str, limit: int = 50) -> List[Dict]:
        # Si no hay Firebase, retornar desde memoria
        if self.db is None:
            msgs = self._mock_store.get(session_id, [])
            return msgs[-limit:] if len(msgs) > limit else msgs

        messages = self.db.child('conversations').child(session_id).child('messages').order_by_child('timestamp').limit_to_last(limit).get() # type: ignore
        if not messages:
            return []
        return [{'id': k, **v} for k, v in messages.items()] # type: ignore

    def clear_conversation(self, session_id: str) -> bool:
        # Si no hay Firebase, limpiar memoria
        if self.db is None:
            self._mock_store.pop(session_id, None)
            return True

        self.db.child('conversations').child(session_id).delete() # type: ignore
        return True

chat_repository = ChatRepository()