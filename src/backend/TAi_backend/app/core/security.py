import logging
from firebase_admin import auth
from fastapi import Request, HTTPException, status
from app.core.firebase import firebase_service  # usamos tu servicio centralizado

logger = logging.getLogger(__name__)

async def verify_firebase_token(request: Request):
    """Middleware de verificación de token Firebase"""
    # 🔹 Asegura inicialización (si ya estaba hecho, no lo repite)
    firebase_service.initialize()

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de autorización"
        )

    token = auth_header.split(" ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        logger.info(f"✅ Token válido para UID: {decoded_token.get('uid')}")
        return decoded_token
    except Exception as e:
        logger.error(f"❌ Error verificando token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
