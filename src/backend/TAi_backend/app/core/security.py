from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """Verifica el token de Firebase y retorna los datos del usuario"""
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError:
        logger.error("Token inválido")
        raise HTTPException(status_code=401, detail="Token inválido")
    except auth.ExpiredIdTokenError: # type: ignore
        logger.error("Token expirado")
        raise HTTPException(status_code=401, detail="Token expirado")
    except Exception as e:
        logger.error(f"Error verificando token: {str(e)}")
        raise HTTPException(status_code=401, detail="Error de autenticación")