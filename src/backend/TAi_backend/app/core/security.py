import logging
from firebase_admin import auth
from fastapi import Request, HTTPException, status
from app.core.firebase import firebase_service  # usamos tu servicio centralizado

logger = logging.getLogger(__name__)

async def verify_firebase_token(request: Request):
    """Middleware de verificación de token Firebase"""
    from app.core.config import settings

    # MODO MOCK: omitir validación de token
    if settings.MOCK_MODE:
        logger.warning("⚠️ MOCK_MODE activo: omitiendo validación de token Firebase")
        return {"uid": "mock_user", "email": "mock@test.com"}

    # 🔹 Asegura inicialización (si ya estaba hecho, no lo repite)
    firebase_service.initialize()

    # Si Firebase no está disponible (modo desarrollo sin credenciales)
    if firebase_service.firestore is None:
        logger.warning("⚠️ Firebase no disponible: usando auth de desarrollo")
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # Extraer user info del token (asumiendo JWT estándar)
            token = auth_header.split(" ")[1]
            # En desarrollo, aceptar cualquier token y extraer uid del payload
            import base64
            import json
            try:
                # Decodificar payload JWT (parte central)
                payload = token.split('.')[1]
                # Agregar padding si es necesario
                payload += '=' * (4 - len(payload) % 4)
                decoded = json.loads(base64.urlsafe_b64decode(payload))
                return {"uid": decoded.get("user_id", "dev_user"), "email": decoded.get("email", "dev@test.com")}
            except:
                return {"uid": "dev_user", "email": "dev@test.com"}
        return {"uid": "dev_user", "email": "dev@test.com"}

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
