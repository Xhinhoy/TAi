from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from app.api.deps import get_current_user
from app.services.chat_service import chat_service
from app.models.chat import ChatRequest, ChatResponse
from firebase_admin import auth
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    if current_user['uid'] != request.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
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

@router.get("/sessions/{user_id}")
async def get_user_sessions(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtiene todas las sesiones de chat de un usuario"""
    if current_user['uid'] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    sessions = chat_service.get_user_sessions(user_id)
    return {"sessions": sessions}

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Elimina una sesión de chat"""
    # Opcional: Validar que la sesión pertenezca al usuario actual
    # Por ahora permitimos que cualquier usuario autenticado pueda eliminar

    success = chat_service.delete_session(session_id)

    if not success:
        raise HTTPException(status_code=500, detail="Error al eliminar la sesión")

    return {"message": "Sesión eliminada correctamente", "session_id": session_id}

@router.websocket("/ws/{user_id}/{session_id}")
async def websocket_chat(websocket: WebSocket, user_id: str, session_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        decoded = auth.verify_id_token(token, clock_skew_seconds=60)
        if decoded.get("uid") != user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

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
