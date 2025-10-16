from app.core.firebase import firebase_service
from typing import List, Dict
from datetime import datetime

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
        self.db.child('conversations').child(session_id).delete() # type: ignore
        return True

chat_repository = ChatRepository()