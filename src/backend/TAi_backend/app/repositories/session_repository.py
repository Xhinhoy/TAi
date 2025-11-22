from typing import Optional, List
from datetime import datetime
import logging
from app.core.firebase import firebase_service
from app.models.exploration_session import (
    ExplorationSession,
    ExplorationSessionStatus,
    LocationUpdate
)

logger = logging.getLogger(__name__)


class SessionRepository:
    """Repositorio para gestionar sesiones de exploración en Firebase"""

    def __init__(self):
        self.db_ref = "exploration_sessions"
        self.locations_ref = "session_locations"

    def save_session(self, session: ExplorationSession) -> bool:
        """Guarda o actualiza una sesión en Firebase"""
        try:
            db = firebase_service.realtime_db
            session_data = session.model_dump()

            # Convertir datetime a ISO string para Firebase
            session_data['started_at'] = session.started_at.isoformat()
            session_data['expires_at'] = session.expires_at.isoformat()
            if session.ended_at:
                session_data['ended_at'] = session.ended_at.isoformat()
            if session.paused_at:
                session_data['paused_at'] = session.paused_at.isoformat()

            db.child(self.db_ref).child(session.id).set(session_data)
            logger.info(f"Sesión {session.id} guardada para usuario {session.user_id}")
            return True
        except Exception as e:
            logger.error(f"Error guardando sesión: {str(e)}")
            return False

    def get_session(self, session_id: str) -> Optional[ExplorationSession]:
        """Obtiene una sesión por ID"""
        try:
            db = firebase_service.realtime_db
            result = db.child(self.db_ref).child(session_id).get()
            data = result.val() if hasattr(result, 'val') else result

            if not data:
                return None

            # Convertir ISO strings de vuelta a datetime
            data['started_at'] = datetime.fromisoformat(data['started_at'])
            data['expires_at'] = datetime.fromisoformat(data['expires_at'])
            if data.get('ended_at'):
                data['ended_at'] = datetime.fromisoformat(data['ended_at'])
            if data.get('paused_at'):
                data['paused_at'] = datetime.fromisoformat(data['paused_at'])

            return ExplorationSession(**data)
        except Exception as e:
            logger.error(f"Error obteniendo sesión {session_id}: {str(e)}")
            return None

    def get_active_session(self, user_id: str) -> Optional[ExplorationSession]:
        """Obtiene la sesión activa de un usuario (si existe)"""
        try:
            db = firebase_service.realtime_db
            sessions = db.child(self.db_ref).order_by_child("user_id").equal_to(user_id).get()

            # sessions.val() retorna un OrderedDict o None
            sessions_data = sessions.val() if hasattr(sessions, 'val') else sessions

            logger.debug(f"🔍 Buscando sesión activa para {user_id}")
            logger.debug(f"📊 Sesiones encontradas: {len(sessions_data) if sessions_data else 0}")

            if not sessions_data:
                logger.debug(f"❌ No se encontraron sesiones para {user_id}")
                return None

            # Buscar sesión activa o pausada
            for session_id, session_data in sessions_data.items():
                status = session_data.get('status')
                logger.debug(f"   Sesión {session_id}: status={status}")

                if status in [ExplorationSessionStatus.ACTIVE, ExplorationSessionStatus.PAUSED]:
                    # Convertir timestamps
                    session_data['started_at'] = datetime.fromisoformat(session_data['started_at'])
                    session_data['expires_at'] = datetime.fromisoformat(session_data['expires_at'])
                    if session_data.get('ended_at'):
                        session_data['ended_at'] = datetime.fromisoformat(session_data['ended_at'])
                    if session_data.get('paused_at'):
                        session_data['paused_at'] = datetime.fromisoformat(session_data['paused_at'])

                    logger.info(f"✅ Sesión activa encontrada: {session_id}")
                    return ExplorationSession(**session_data)

            logger.debug(f"❌ No se encontró sesión activa/pausada para {user_id}")
            return None
        except Exception as e:
            logger.error(f"Error obteniendo sesión activa para usuario {user_id}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    def update_session(self, session: ExplorationSession) -> bool:
        """Actualiza una sesión existente"""
        return self.save_session(session)

    def save_location(self, session_id: str, location: LocationUpdate) -> bool:
        """Guarda una ubicación asociada a una sesión"""
        try:
            db = firebase_service.realtime_db
            location_data = location.model_dump()

            if location.timestamp:
                location_data['timestamp'] = location.timestamp.isoformat()
            else:
                location_data['timestamp'] = datetime.now().isoformat()

            # Guardar en lista de ubicaciones de la sesión
            db.child(self.locations_ref).child(session_id).push(location_data)
            return True
        except Exception as e:
            logger.error(f"Error guardando ubicación para sesión {session_id}: {str(e)}")
            return False

    def get_last_location(self, session_id: str) -> Optional[LocationUpdate]:
        """Obtiene la última ubicación registrada de una sesión"""
        try:
            db = firebase_service.realtime_db
            result = db.child(self.locations_ref).child(session_id).order_by_key().limit_to_last(1).get()
            locations_data = result.val() if hasattr(result, 'val') else result

            if not locations_data:
                return None

            # Obtener el último elemento
            for _, location_data in locations_data.items():
                if location_data.get('timestamp'):
                    location_data['timestamp'] = datetime.fromisoformat(location_data['timestamp'])
                return LocationUpdate(**location_data)

            return None
        except Exception as e:
            logger.error(f"Error obteniendo última ubicación para sesión {session_id}: {str(e)}")
            return None

    def get_user_sessions(self, user_id: str, limit: int = 10) -> List[ExplorationSession]:
        """Obtiene las últimas sesiones de un usuario"""
        try:
            db = firebase_service.realtime_db
            result = db.child(self.db_ref).order_by_child("user_id").equal_to(user_id).limit_to_last(limit).get()
            sessions_data = result.val() if hasattr(result, 'val') else result

            if not sessions_data:
                return []

            session_list = []
            for session_id, session_data in sessions_data.items():
                # Convertir timestamps
                session_data['started_at'] = datetime.fromisoformat(session_data['started_at'])
                session_data['expires_at'] = datetime.fromisoformat(session_data['expires_at'])
                if session_data.get('ended_at'):
                    session_data['ended_at'] = datetime.fromisoformat(session_data['ended_at'])
                if session_data.get('paused_at'):
                    session_data['paused_at'] = datetime.fromisoformat(session_data['paused_at'])

                session_list.append(ExplorationSession(**session_data))

            # Ordenar por fecha de inicio (más reciente primero)
            session_list.sort(key=lambda s: s.started_at, reverse=True)
            return session_list
        except Exception as e:
            logger.error(f"Error obteniendo sesiones del usuario {user_id}: {str(e)}")
            return []


# Instancia global
session_repository = SessionRepository()
