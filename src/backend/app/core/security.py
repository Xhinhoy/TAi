import logging
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth, credentials
from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

#  Inicializa Firebase explícitamente en este módulo si no existe
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred, {
            "databaseURL": settings.FIREBASE_DATABASE_URL,
            "projectId": settings.FIREBASE_PROJECT_ID,
        })
        logger.info(" Firebase inicializado correctamente desde security.py")
    except Exception as e:
        logger.error(f" Error inicializando Firebase en security.py: {e}")
else:
    logger.info(" Firebase ya estaba inicializado (security.py)")

async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Verifica el token de Firebase y retorna los datos del usuario.
    (Garantiza que el SDK esté inicializado antes de usar auth.verify_id_token)
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        logger.info(f" Token válido para UID: {decoded_token.get('uid')}")
        return decoded_token
    except Exception as e:
        logger.error(f" Error verificando token: {e}")
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
