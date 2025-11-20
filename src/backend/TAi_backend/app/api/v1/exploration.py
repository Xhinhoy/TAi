from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime
import logging
import asyncio

from app.api.deps import get_current_user
from app.models.exploration_session import (
    SessionCreateRequest,
    SessionResponse,
    LocationUpdate
)
from app.services.session_service import session_service
from app.services.route_alert_service import route_alert_service
from app.services.preference_learning_service import preference_learning_service
from app.services.websocket_manager import exploration_ws_manager
from app.repositories.user_repository import user_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exploration", tags=["Exploration Sessions"])


@router.post("/session/start", response_model=SessionResponse)
async def start_exploration_session(
    config: SessionCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Inicia una sesión de exploración

    El usuario DEBE activar manualmente para empezar a recibir alertas.

    - **duration_minutes**: Duración de la sesión (30-480 min)
    - **max_alerts**: Número máximo de alertas (5-50)
    - **interests_override**: (Opcional) Sobrescribir intereses del perfil
    """
    try:
        user_id = current_user.get('uid')

        # Verificar si ya tiene sesión activa
        active_session = session_service.get_active_session(user_id)

        if active_session:
            raise HTTPException(
                status_code=400,
                detail="Ya tienes una sesión activa. Finalízala primero."
            )

        # Crear nueva sesión
        session = session_service.create_session(
            user_id=user_id,
            duration_minutes=config.duration_minutes,
            max_alerts=config.max_alerts
        )

        logger.info(f"✅ Sesión de exploración iniciada para {user_id}")

        # Calcular costo estimado
        estimated_cost = config.max_alerts * session_service.COST_PER_ALERT

        return SessionResponse(
            session=session,
            time_remaining_minutes=config.duration_minutes,
            alerts_remaining=config.max_alerts,
            can_continue=True,
            message=f"Sesión iniciada. Descubre lugares durante {config.duration_minutes} minutos. Costo estimado: ${estimated_cost:.4f}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error iniciando sesión de exploración: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error iniciando sesión: {str(e)}")


@router.get("/session/status", response_model=SessionResponse)
async def get_session_status(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene estado de la sesión actual

    Retorna información sobre tiempo restante, alertas disponibles, etc.
    """
    try:
        user_id = current_user.get('uid')
        session = session_service.get_active_session(user_id)

        if not session:
            raise HTTPException(404, "No tienes una sesión activa")

        # Calcular tiempo restante
        now = datetime.now()
        time_remaining = (session.expires_at - now).total_seconds() / 60
        time_remaining = max(0, int(time_remaining))

        # Verificar si expiró
        if time_remaining == 0:
            session_service.expire_session(session.id)
            return SessionResponse(
                session=session,
                time_remaining_minutes=0,
                alerts_remaining=0,
                can_continue=False,
                message="Tu sesión ha expirado. Inicia una nueva para continuar."
            )

        alerts_remaining = session.max_alerts - session.alerts_generated

        status_message = None
        if alerts_remaining <= 5:
            status_message = f"⚠️ Quedan solo {alerts_remaining} alertas"
        elif time_remaining <= 10:
            status_message = f"⏰ Tu sesión expirará en {time_remaining} minutos"

        return SessionResponse(
            session=session,
            time_remaining_minutes=time_remaining,
            alerts_remaining=alerts_remaining,
            can_continue=alerts_remaining > 0,
            message=status_message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo estado de sesión: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estado: {str(e)}")


@router.post("/session/pause")
async def pause_session(
    current_user: dict = Depends(get_current_user)
):
    """
    Pausa la sesión actual (detiene alerts temporalmente)

    La sesión seguirá contando tiempo pero no generará alertas.
    """
    try:
        user_id = current_user.get('uid')
        session = session_service.get_active_session(user_id)

        if not session:
            raise HTTPException(404, "No tienes una sesión activa")

        success = session_service.pause_session(session.id)

        if not success:
            raise HTTPException(400, "No se pudo pausar la sesión")

        return {
            "status": "paused",
            "message": "Sesión pausada. Reactívala cuando quieras continuar."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausando sesión: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error pausando sesión: {str(e)}")


@router.post("/session/resume")
async def resume_session(
    current_user: dict = Depends(get_current_user)
):
    """
    Reactiva una sesión pausada

    Continúa generando alertas desde donde quedó.
    """
    try:
        user_id = current_user.get('uid')
        session = session_service.get_active_session(user_id)

        if not session:
            raise HTTPException(404, "No tienes una sesión activa")

        if not session.is_paused:
            raise HTTPException(400, "La sesión no está pausada")

        success = session_service.resume_session(session.id)

        if not success:
            raise HTTPException(400, "No se pudo reactivar la sesión. Puede haber expirado.")

        return {
            "status": "active",
            "message": "Sesión reactivada. Continuarás recibiendo alertas."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reactivando sesión: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reactivando sesión: {str(e)}")


@router.post("/session/end")
async def end_session(
    current_user: dict = Depends(get_current_user)
):
    """
    Finaliza la sesión manualmente

    Muestra resumen de la sesión al usuario.
    """
    try:
        user_id = current_user.get('uid')
        session = session_service.get_active_session(user_id)

        if not session:
            raise HTTPException(404, "No tienes una sesión activa")

        # Finalizar y obtener resumen
        summary = session_service.end_session(session.id)

        return {
            "status": "ended",
            "summary": summary.model_dump()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finalizando sesión: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finalizando sesión: {str(e)}")


@router.post("/location/update")
async def update_location(
    location: LocationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    MODIFICADO: Solo procesa si hay sesión activa

    Actualiza la ubicación del usuario y retorna alertas de lugares cercanos.
    Requiere una sesión activa de exploración.

    - **latitude**: Latitud actual
    - **longitude**: Longitud actual
    - **accuracy**: (Opcional) Precisión en metros
    """
    try:
        user_id = current_user.get('uid')

        # 1. Verificar sesión activa
        session = session_service.get_active_session(user_id)

        if not session:
            return {
                "alerts": [],
                "count": 0,
                "session_required": True,
                "message": "Activa el Modo Exploración para recibir alertas"
            }

        # 2. Verificar si sesión expiró
        if datetime.now() > session.expires_at:
            session_service.expire_session(session.id)
            summary = session_service.get_session_summary(session.id)
            return {
                "alerts": [],
                "count": 0,
                "session_expired": True,
                "message": "Tu sesión expiró. Inicia una nueva para continuar.",
                "summary": summary
            }

        # 3. Verificar si llegó al límite de alertas
        if session.alerts_generated >= session.max_alerts:
            return {
                "alerts": [],
                "count": 0,
                "limit_reached": True,
                "message": f"Alcanzaste el límite de {session.max_alerts} alertas. Finaliza e inicia nueva sesión."
            }

        # 4. Verificar si está pausada
        if session.is_paused:
            return {
                "alerts": [],
                "count": 0,
                "paused": True,
                "message": "Sesión pausada. Reactívala para continuar."
            }

        # 5. Obtener perfil del usuario para personalización
        user_profile = user_repository.get_user_profile(user_id)

        # 6. Generar alertas inteligentes con AI Agent (Gemini orquestador)
        logger.info(f"🔍 Generando alertas para {user_id} en ({location.latitude}, {location.longitude})")
        alerts = await route_alert_service.get_instant_alerts_with_ai(
            user_id=user_id,
            location=location,
            session=session,
            user_profile=user_profile
        )

        # 7. Actualizar métricas de sesión
        session_service.update_metrics(
            session_id=session.id,
            alerts_count=len(alerts),
            location=location
        )

        # 7. Calcular tiempo/alertas restantes
        time_remaining = (session.expires_at - datetime.now()).total_seconds() / 60
        alerts_remaining = session.max_alerts - (session.alerts_generated + len(alerts))

        # Formatear alertas para respuesta
        formatted_alerts = [
            {
                "id": alert.id,
                "place": {
                    "id": alert.place.id,
                    "name": alert.place.name,
                    "coords": {
                        "latitude": alert.place.coords.latitude,
                        "longitude": alert.place.coords.longitude
                    },
                    "rating": alert.place.rating,
                    "address": alert.place.address,
                    "price_level": alert.place.price_level,
                    "photos": alert.place.photos[:1],  # Solo primera foto
                    "categories": alert.place.categories
                },
                "distance_meters": alert.distance_meters,
                "priority": alert.priority,
                "message": alert.personalized_message,
                "match_score": alert.match_score,
                "estimated_time_minutes": alert.estimated_time_minutes
            }
            for alert in alerts
        ]

        return {
            "alerts": formatted_alerts,
            "count": len(alerts),
            "session_active": True,
            "session_info": {
                "time_remaining_minutes": max(0, int(time_remaining)),
                "alerts_remaining": max(0, alerts_remaining),
                "places_discovered": session.places_discovered,
                "distance_walked_km": round(session.distance_walked_meters / 1000, 2)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando ubicación: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error actualizando ubicación: {str(e)}")


@router.post("/alert/interact")
async def record_alert_interaction(
    alert_id: str,
    interaction_type: str,  # "viewed", "tapped", "dismissed", "saved"
    current_user: dict = Depends(get_current_user)
):
    """
    Registra interacción del usuario con una alerta

    - **alert_id**: ID de la alerta
    - **interaction_type**: Tipo de interacción (viewed, tapped, dismissed, saved)
    """
    try:
        user_id = current_user.get('uid')

        # Obtener sesión activa
        session = session_service.get_active_session(user_id)

        if not session:
            raise HTTPException(404, "No tienes una sesión activa")

        # Registrar interacción
        success = route_alert_service.record_interaction(
            alert_id=alert_id,
            user_id=user_id,
            session_id=session.id,
            interaction_type=interaction_type
        )

        if not success:
            raise HTTPException(500, "Error registrando interacción")

        # Si la interacción es "tapped", actualizar contador de sesión
        if interaction_type == "tapped":
            session_service.update_metrics(
                session_id=session.id,
                alerts_count=0,
                location=LocationUpdate(latitude=0, longitude=0),  # Dummy location
                interacted=True
            )

        return {
            "success": True,
            "message": f"Interacción '{interaction_type}' registrada"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando interacción: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/session/history")
async def get_session_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el historial de sesiones del usuario

    - **limit**: Número máximo de sesiones a retornar (default: 10)
    """
    try:
        user_id = current_user.get('uid')

        from app.repositories.session_repository import session_repository
        sessions = session_repository.get_user_sessions(user_id, limit)

        return {
            "sessions": [session.model_dump() for session in sessions],
            "count": len(sessions)
        }

    except Exception as e:
        logger.error(f"Error obteniendo historial de sesiones: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo historial: {str(e)}")


@router.get("/preferences/insights")
async def get_preference_insights(
    current_user: dict = Depends(get_current_user)
):
    """
    🧠 NUEVO: Obtiene insights sobre preferencias aprendidas del usuario

    Retorna análisis de comportamiento basado en interacciones pasadas:
    - Categorías favoritas y evitadas
    - Rango de precios preferidos
    - Horarios de exploración
    - Distancias preferidas
    - Métricas de engagement

    Este endpoint es útil para:
    - Mostrar al usuario qué ha aprendido el sistema sobre él
    - Debugging de recomendaciones
    - Personalización de UI
    """
    try:
        user_id = current_user.get('uid')

        # Generar análisis completo de comportamiento
        analysis = preference_learning_service.generate_behavior_analysis(user_id)

        return {
            "user_id": analysis.user_id,
            "top_categories": analysis.top_categories,
            "avoided_categories": analysis.avoided_categories,
            "preferred_price_range": analysis.preferred_price_range,
            "preferred_times": analysis.preferred_times,
            "preferred_distances": analysis.preferred_distances,
            "engagement_rate": round(analysis.engagement_rate, 3),
            "dismissal_rate": round(analysis.dismissal_rate, 3),
            "insights": [
                {
                    "type": insight.type,
                    "insight": insight.insight,
                    "confidence": round(insight.confidence, 2),
                    "data": insight.data
                }
                for insight in analysis.insights
            ],
            "analyzed_at": analysis.analyzed_at.isoformat()
        }

    except Exception as e:
        logger.error(f"Error obteniendo insights de preferencias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo insights: {str(e)}")


@router.post("/preferences/refresh")
async def refresh_preferences(
    current_user: dict = Depends(get_current_user)
):
    """
    🧠 NUEVO: Fuerza re-análisis de preferencias del usuario

    Útil cuando:
    - Usuario quiere ver cambios inmediatos después de interacciones
    - Debugging
    - Testing

    Normalmente el sistema re-analiza automáticamente después de cada interacción.
    """
    try:
        user_id = current_user.get('uid')

        logger.info(f"🔄 Re-analizando preferencias manualmente para {user_id}")

        # Re-analizar preferencias
        preferences = preference_learning_service.analyze_user_interactions(user_id)

        return {
            "status": "success",
            "message": "Preferencias re-analizadas exitosamente",
            "total_interactions": preferences.total_interactions,
            "categories_learned": len(preferences.categories),
            "last_updated": preferences.last_updated.isoformat()
        }

    except Exception as e:
        logger.error(f"Error re-analizando preferencias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error re-analizando: {str(e)}")


@router.websocket("/ws/{user_id}/{session_id}")
async def websocket_exploration(websocket: WebSocket, user_id: str, session_id: str):
    """
    🌐 NUEVO: WebSocket para exploración en tiempo real

    Permite:
    - Recibir actualizaciones de ubicación del cliente
    - Enviar alertas de lugares en tiempo real (push)
    - Notificar cambios de estado de sesión
    - Comunicación bidireccional continua

    Mensajes que RECIBE del cliente:
    {
        "type": "location_update",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "accuracy": 10.5
    }
    {
        "type": "ping"  // Keep-alive
    }

    Mensajes que ENVÍA al cliente:
    {
        "type": "connection_established",
        "session_id": "...",
        "timestamp": "..."
    }
    {
        "type": "new_alerts",
        "alerts": [...],
        "count": 3,
        "session_info": {...}
    }
    {
        "type": "session_update",
        "session_info": {...}
    }
    {
        "type": "session_ending",
        "reason": "expired",
        "summary": {...}
    }
    {
        "type": "error",
        "error": "...",
        "error_code": "..."
    }
    """
    try:
        # Conectar usuario
        await exploration_ws_manager.connect(websocket, user_id, session_id)

        # Verificar que la sesión existe y pertenece al usuario
        session = session_service.get_active_session(user_id)

        if not session or session.id != session_id:
            await exploration_ws_manager.send_error(
                user_id,
                "Sesión no válida o expirada",
                "SESSION_INVALID"
            )
            await websocket.close()
            return

        logger.info(f"🌐 WebSocket iniciado para {user_id} en sesión {session_id}")

        # Loop principal de recepción de mensajes
        while True:
            try:
                # Recibir mensaje del cliente
                data = await websocket.receive_json()
                message_type = data.get('type')

                logger.debug(f"📨 Mensaje recibido de {user_id}: {message_type}")

                # Procesar según tipo de mensaje
                if message_type == 'location_update':
                    await handle_location_update(user_id, session, data)

                elif message_type == 'ping':
                    # Responder con pong para keep-alive
                    await exploration_ws_manager.send_to_user(user_id, {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })

                elif message_type == 'get_status':
                    # Enviar estado actual de sesión
                    await send_session_status(user_id, session)

                else:
                    logger.warning(f"⚠️ Tipo de mensaje desconocido: {message_type}")

            except WebSocketDisconnect:
                logger.info(f"🔌 Cliente {user_id} desconectado")
                break

            except Exception as e:
                logger.error(f"❌ Error procesando mensaje de {user_id}: {str(e)}")
                await exploration_ws_manager.send_error(
                    user_id,
                    f"Error procesando mensaje: {str(e)}",
                    "PROCESSING_ERROR"
                )

    except Exception as e:
        logger.error(f"❌ Error en WebSocket para {user_id}: {str(e)}")

    finally:
        # Limpiar al desconectar
        exploration_ws_manager.disconnect(user_id)
        logger.info(f"🔌 WebSocket cerrado para {user_id}")


async def handle_location_update(user_id: str, session, location_data: dict):
    """
    Procesa actualización de ubicación vía WebSocket

    Args:
        user_id: ID del usuario
        session: Sesión activa
        location_data: Datos de ubicación
    """
    try:
        # Crear objeto LocationUpdate
        location = LocationUpdate(
            latitude=location_data.get('latitude'),
            longitude=location_data.get('longitude'),
            accuracy=location_data.get('accuracy')
        )

        # Verificar si sesión sigue activa
        if datetime.now() > session.expires_at:
            # Sesión expiró
            session_service.expire_session(session.id)
            summary = session_service.get_session_summary(session.id)

            await exploration_ws_manager.notify_session_ending(
                user_id,
                reason="expired",
                summary=summary.model_dump() if summary else None
            )
            return

        # Verificar límite de alertas
        if session.alerts_generated >= session.max_alerts:
            await exploration_ws_manager.notify_session_ending(
                user_id,
                reason="limit_reached",
                summary=None
            )
            return

        # Verificar si está pausada
        if session.is_paused:
            await exploration_ws_manager.send_to_user(user_id, {
                "type": "session_paused",
                "message": "Sesión pausada. Reactívala para continuar."
            })
            return

        # Obtener perfil del usuario
        user_profile = user_repository.get_user_profile(user_id)

        # 🚨 Generar alertas con AI
        logger.info(f"🔍 Generando alertas para {user_id} en ({location.latitude}, {location.longitude})")

        alerts = await route_alert_service.get_instant_alerts_with_ai(
            user_id=user_id,
            location=location,
            session=session,
            user_profile=user_profile
        )

        # Actualizar métricas de sesión
        session_service.update_metrics(
            session_id=session.id,
            alerts_count=len(alerts),
            location=location
        )

        # Obtener info actualizada de sesión
        time_remaining = (session.expires_at - datetime.now()).total_seconds() / 60
        alerts_remaining = session.max_alerts - (session.alerts_generated + len(alerts))

        session_info = {
            "time_remaining_minutes": max(0, int(time_remaining)),
            "alerts_remaining": max(0, alerts_remaining),
            "places_discovered": session.places_discovered,
            "distance_walked_km": round(session.distance_walked_meters / 1000, 2)
        }

        # 📤 ENVIAR ALERTAS VÍA WEBSOCKET (PUSH)
        if alerts:
            formatted_alerts = [
                {
                    "id": alert.id,
                    "place": {
                        "id": alert.place.id,
                        "name": alert.place.name,
                        "coords": {
                            "latitude": alert.place.coords.latitude,
                            "longitude": alert.place.coords.longitude
                        },
                        "rating": alert.place.rating,
                        "address": alert.place.address,
                        "price_level": alert.place.price_level,
                        "photos": alert.place.photos[:1],
                        "categories": alert.place.categories
                    },
                    "distance_meters": alert.distance_meters,
                    "priority": alert.priority,
                    "message": alert.personalized_message,
                    "match_score": alert.match_score,
                    "estimated_time_minutes": alert.estimated_time_minutes
                }
                for alert in alerts
            ]

            await exploration_ws_manager.broadcast_alerts(
                user_id,
                formatted_alerts,
                session_info
            )
        else:
            # Si no hay alertas, enviar actualización de sesión
            await exploration_ws_manager.send_session_update(user_id, session_info)

        logger.info(f"✅ Ubicación procesada para {user_id}: {len(alerts)} alertas enviadas")

    except Exception as e:
        logger.error(f"❌ Error en handle_location_update: {str(e)}")
        await exploration_ws_manager.send_error(
            user_id,
            f"Error procesando ubicación: {str(e)}",
            "LOCATION_ERROR"
        )


async def send_session_status(user_id: str, session):
    """Envía estado actual de sesión al cliente"""
    try:
        time_remaining = (session.expires_at - datetime.now()).total_seconds() / 60
        alerts_remaining = session.max_alerts - session.alerts_generated

        session_info = {
            "session_id": session.id,
            "is_paused": session.is_paused,
            "time_remaining_minutes": max(0, int(time_remaining)),
            "alerts_remaining": max(0, alerts_remaining),
            "places_discovered": session.places_discovered,
            "distance_walked_km": round(session.distance_walked_meters / 1000, 2),
            "alerts_generated": session.alerts_generated
        }

        await exploration_ws_manager.send_to_user(user_id, {
            "type": "session_status",
            "session_info": session_info,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error enviando estado de sesión: {str(e)}")
