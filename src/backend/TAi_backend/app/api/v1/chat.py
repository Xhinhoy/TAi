from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from app.api.deps import get_current_user
from app.services.chat_service import chat_service
from app.models.chat import ChatRequest, ChatResponse
from app.models.itinerary import ItineraryCreate, Itinerary
from app.services.itinerary_service import itinerary_service
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
    # Aceptamos primero para poder enviar mensajes de error descriptivos
    await websocket.accept()

    if token:
        try:
            decoded = auth.verify_id_token(token, clock_skew_seconds=60)
            if decoded.get("uid") != user_id:
                await websocket.send_json({"error": "token_user_mismatch"})
                await websocket.close(code=1008)
                return
        except Exception as exc:  # type: ignore
            logger.warning(f"WS auth failed: {exc}")
            # En modo dev permitimos continuar para evitar bloqueo en Expo Go
            await websocket.send_json({"warning": "auth_verify_failed_dev_mode"})
    else:
        # Si no hay token, permitimos conexión pero advertimos (entorno dev)
        await websocket.send_json({"warning": "missing_token_dev_mode"})

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
            
            itinerary_payload = None
            if response.itinerary:
                itinerary_payload = response.itinerary.dict() if hasattr(response.itinerary, "dict") else response.itinerary

            await websocket.send_json({
                'response': response.response,
                'actions': [a.dict() for a in response.actions],
                'places': [p.dict() for p in response.places],
                'itinerary': itinerary_payload,
            })

    except WebSocketDisconnect:
        logger.info(f"WebSocket desconectado: {user_id}/{session_id}")

@router.post("/save-itinerary", response_model=Itinerary)
async def save_itinerary(
    user_id: str,
    itinerary: ItineraryCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Permite guardar un itinerario desde el flujo de chat.
    """
    if current_user.get("uid") != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    saved = itinerary_service.create_itinerary(user_id, itinerary)
    return saved
    
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
