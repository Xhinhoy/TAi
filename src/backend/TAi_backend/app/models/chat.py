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
    format: str = "markdown"
    actions: List[ChatAction] = []
    places: List[Place] = []
    itinerary: Optional[Dict] = None  # Itinerario generado si existe
    saved_itinerary_id: Optional[str] = None  # ID del itinerario guardado en Firestore