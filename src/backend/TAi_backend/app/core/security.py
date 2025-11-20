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
        logger.info(f"🔑 Token recibido (primeros 50 chars): {token[:50]}...")
        logger.info(f"🔑 Token length: {len(token)}")

        # Verificar el token con Firebase Admin
        # Agregamos clock_skew_seconds=60 para tolerar diferencias de hasta 60 segundos en el reloj
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=60)

        logger.info(f"✅ Token verificado exitosamente")
        logger.info(f"👤 Usuario UID: {decoded_token.get('uid')}")
        logger.info(f"📧 Email: {decoded_token.get('email')}")
        logger.info(f"🔓 Token payload completo: {decoded_token}")

        return decoded_token
    except auth.InvalidIdTokenError as e:
        logger.error(f"❌ Token inválido: {str(e)}")
        logger.error(f"❌ Detalles del error: {type(e).__name__}")
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")
    except auth.ExpiredIdTokenError as e: # type: ignore
        logger.error(f"❌ Token expirado: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Token expirado: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error verificando token: {str(e)}")
        logger.error(f"❌ Tipo de error: {type(e).__name__}")
        logger.error(f"❌ Error completo:", exc_info=True)
        raise HTTPException(status_code=401, detail=f"Error de autenticación: {str(e)}")