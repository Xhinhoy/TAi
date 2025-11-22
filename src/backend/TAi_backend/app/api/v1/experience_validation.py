from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from app.api.deps import get_current_user
from app.services.experience_validation_service import experience_validation_service
from app.models.experience_validation import (
    ExperienceValidationResponse,
    ValidationError,
    ScreenshotQualityCheck
)
from app.utils.validation_cache import validation_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/experience-validation", tags=["experience-validation"])

@router.post("/validate", response_model=ExperienceValidationResponse)
async def validate_experience(
    screenshot: UploadFile = File(..., description="Screenshot del post de Instagram/TikTok"),
    skip_cache: bool = Query(False, description="Forzar re-validación sin usar caché"),
    current_user: dict = Depends(get_current_user)
):
    """
    Valida una experiencia turística desde un screenshot de redes sociales.

    **Flujo:**
    1. Analiza el screenshot con Gemini Vision para identificar el lugar
    2. Busca el lugar en Google Places (obligatorio)
    3. Busca reviews en TripAdvisor (opcional)
    4. Analiza discrepancias entre lo mostrado y la realidad
    5. Genera score de realidad (0-100)
    6. Sugiere alternativas si el score es bajo

    **Requiere:**
    - Screenshot completo del post (imagen + descripción + ubicación si está etiquetada)
    - El screenshot debe ser legible y mostrar claramente el lugar

    **Retorna:**
    - Score de realidad (qué tan parecido es a lo promocionado)
    - Red flags detectados
    - Aspectos positivos y negativos
    - Alternativas mejores si las hay
    """
    logger.info("🚀 ENDPOINT /validate LLAMADO")
    logger.info(f"📸 Screenshot filename: {screenshot.filename}")
    logger.info(f"📝 Content-Type: {screenshot.content_type}")
    logger.info(f"🔄 Skip cache: {skip_cache}")

    try:
        user_id = current_user['uid']

        logger.info(f"👤 Usuario autenticado: {user_id}")

        # Validar tipo de archivo
        if not screenshot.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="El archivo debe ser una imagen (JPEG, PNG, etc.)"
            )

        # Leer imagen en memoria
        image_bytes = await screenshot.read()

        # Validar tamaño (máximo 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(image_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"La imagen es demasiado grande. Máximo: 10MB"
            )

        logger.info(f"📏 Imagen recibida: {len(image_bytes)} bytes, tipo: {screenshot.content_type}")

        # Ejecutar validación (con caché integrado)
        result = await experience_validation_service.validate_experience(
            image_bytes=image_bytes,
            user_id=user_id,
            skip_cache=skip_cache
        )

        logger.info(f"✅ Validación completada: score={result.score_realidad}, recomendación={result.recomendacion}")

        return result

    except ValueError as e:
        # Errores de validación (confianza baja, no encontrado, etc.)
        logger.warning(f"⚠️ Error de validación: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail={
                "error": "validation_failed",
                "message": str(e),
                "suggestions": [
                    "Asegúrate de que el screenshot sea claro y legible",
                    "Verifica que incluya la ubicación etiquetada",
                    "El nombre del lugar debe ser visible en el post"
                ]
            }
        )
    except Exception as e:
        logger.error(f"❌ Error procesando validación: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando la validación: {str(e)}"
        )


@router.post("/check-quality", response_model=ScreenshotQualityCheck)
async def check_screenshot_quality(
    screenshot: UploadFile = File(..., description="Screenshot a validar"),
    current_user: dict = Depends(get_current_user)
):
    """
    Pre-valida la calidad de un screenshot antes de procesarlo completamente.

    Útil para dar feedback inmediato al usuario sobre si el screenshot
    tiene la información necesaria.

    **Retorna:**
    - Si el screenshot es válido
    - Qué información tiene (ubicación, nombre, descripción)
    - Sugerencias para mejorar si es necesario
    """
    try:
        user_id = current_user['uid']

        logger.info(f"🔍 Validación de calidad de screenshot para user {user_id}")

        # Validar tipo de archivo
        if not screenshot.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="El archivo debe ser una imagen"
            )

        # Leer imagen
        image_bytes = await screenshot.read()

        # Validar tamaño
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Imagen demasiado grande (máx 10MB)"
            )

        # Validar calidad
        quality_check = await experience_validation_service.validate_screenshot_quality(
            image_bytes=image_bytes
        )

        logger.info(f"✅ Calidad validada: válido={quality_check.es_valido}, confianza={quality_check.confianza_extraccion}%")

        return quality_check

    except Exception as e:
        logger.error(f"❌ Error validando calidad: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error validando calidad: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    Health check del servicio de validación
    """
    return {
        "status": "healthy",
        "service": "experience-validation",
        "llm_model": "gemini-2.5-flash (quality) / gemini-2.5-flash (analysis)",
        "apis": {
            "google_places": "active",
            "tripadvisor": "active (optional)"
        }
    }


@router.post("/test-upload")
async def test_upload(
    screenshot: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint de prueba para verificar que el upload de archivos funciona
    """
    logger.info(f"🧪 TEST UPLOAD - User: {current_user['uid']}")
    logger.info(f"🧪 Filename: {screenshot.filename}")
    logger.info(f"🧪 Content-Type: {screenshot.content_type}")

    try:
        content = await screenshot.read()
        size = len(content)
        logger.info(f"🧪 File size: {size} bytes")

        return {
            "success": True,
            "filename": screenshot.filename,
            "content_type": screenshot.content_type,
            "size": size,
            "size_mb": round(size / (1024 * 1024), 2)
        }
    except Exception as e:
        logger.error(f"🧪 Error en test upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache/stats")
async def get_cache_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene estadísticas del caché de validaciones

    **Retorna:**
    - Total de validaciones guardadas
    - Total de cache hits
    - Total de cache misses
    - Hit rate (%)
    - Última actualización
    """
    try:
        stats = validation_cache.get_stats()

        return {
            "success": True,
            "stats": stats
        }

    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas de caché: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )


@router.post("/cache/clear")
async def clear_cache_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Resetea las estadísticas del caché

    **Requiere:** Usuario autenticado

    **Nota:** Solo resetea contadores, no elimina validaciones guardadas
    """
    try:
        user_id = current_user['uid']
        logger.info(f"🗑️ Usuario {user_id} reseteando estadísticas de caché")

        success = validation_cache.reset_stats()

        if success:
            return {
                "success": True,
                "message": "Estadísticas de caché reseteadas"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="No se pudieron resetear las estadísticas"
            )

    except Exception as e:
        logger.error(f"❌ Error reseteando estadísticas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error reseteando estadísticas: {str(e)}"
        )
