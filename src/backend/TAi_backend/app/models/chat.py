from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from .place import Place

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    message: str
    context: Optional[Dict] = None

class ChatAction(BaseModel):
    type: str
    data: Dict

class ChatResponse(BaseModel):
    response: str
    conversation_id: Optional[str] = None
    suggestions: Optional[List[str]] = []
    actions: List[ChatAction] = []
    places: List[Place] = []