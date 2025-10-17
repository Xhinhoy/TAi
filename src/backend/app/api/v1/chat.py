from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from app.api.deps import get_current_user
from app.services.chat_service import chat_service
from app.models.chat import ChatRequest, ChatResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    # 🚧 Modo de prueba: sin verificación de token
    current_user = {"uid": "test_user"}

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
    # TODO: Implement WebSocket authentication
    # Validar token Firebase antes de accept()
    # token = websocket.query_params.get('token')
    # if not token: await websocket.close(code=1008)

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get('message', '')

            if not message:
                await websocket.send_json({'error': 'Message is required'})
                continue

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
    except Exception as e:
        logger.error(f"Error en WebSocket: {str(e)}")
        await websocket.close(code=1011)