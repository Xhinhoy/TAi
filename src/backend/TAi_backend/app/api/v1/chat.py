from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from app.api.deps import get_current_user
from app.services.chat_service import chat_service
from app.models.chat import ChatRequest, ChatResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    # En modo mock/dev, omitir validación estricta de user_id
    # if current_user['uid'] != request.user_id:
    #     raise HTTPException(status_code=403, detail="No autorizado")

    response = await chat_service.send_message(request)
    return response

@router.get("/history/{session_id}")
async def get_history(
    session_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    history = chat_service.get_conversation_history(session_id, limit)
    return {"messages": history}

@router.websocket("/ws/{user_id}/{session_id}")
async def websocket_chat(websocket: WebSocket, user_id: str, session_id: str):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get('message', '')
            
            request = ChatRequest(
                user_id=user_id,
                session_id=session_id,
                message=message
            )
            
            response = await chat_service.send_message(request)
            
            await websocket.send_json({
                'response': response.response,
                'actions': [a.dict() for a in response.actions],
                'places': [p.dict() for p in response.places]
            })
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket desconectado: {user_id}/{session_id}")