from typing import Dict, Set
from fastapi import WebSocket
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class ExplorationConnectionManager:
    """
    Gestor de conexiones WebSocket para modo exploración

    Mantiene conexiones activas por usuario y permite enviar
    alertas en tiempo real cuando se detectan lugares cercanos.
    """

    def __init__(self):
        # {user_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # {user_id: session_id}
        self.user_sessions: Dict[str, str] = {}
        # Estadísticas
        self.total_connections = 0
        self.total_messages_sent = 0

    async def connect(self, websocket: WebSocket, user_id: str, session_id: str):
        """
        Conecta un usuario al WebSocket

        Args:
            websocket: Conexión WebSocket
            user_id: ID del usuario
            session_id: ID de la sesión de exploración
        """
        await websocket.accept()

        # Si ya tenía una conexión activa, cerrarla
        if user_id in self.active_connections:
            logger.warning(f"Usuario {user_id} ya tenía conexión activa, reemplazando")
            try:
                await self.active_connections[user_id].close()
            except:
                pass

        self.active_connections[user_id] = websocket
        self.user_sessions[user_id] = session_id
        self.total_connections += 1

        logger.info(f"✅ Usuario {user_id} conectado al WebSocket (sesión: {session_id})")
        logger.info(f"📊 Conexiones activas: {len(self.active_connections)}")

        # Enviar mensaje de bienvenida
        await self.send_to_user(user_id, {
            "type": "connection_established",
            "message": "Conectado al modo exploración",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        })

    def disconnect(self, user_id: str):
        """
        Desconecta un usuario del WebSocket

        Args:
            user_id: ID del usuario a desconectar
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"❌ Usuario {user_id} desconectado del WebSocket")

        if user_id in self.user_sessions:
            del self.user_sessions[user_id]

        logger.info(f"📊 Conexiones activas: {len(self.active_connections)}")

    async def send_to_user(self, user_id: str, message: dict):
        """
        Envía un mensaje a un usuario específico

        Args:
            user_id: ID del usuario destinatario
            message: Diccionario con el mensaje a enviar
        """
        if user_id not in self.active_connections:
            logger.warning(f"⚠️ Usuario {user_id} no está conectado, no se puede enviar mensaje")
            return False

        try:
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)
            self.total_messages_sent += 1
            logger.debug(f"📤 Mensaje enviado a {user_id}: {message.get('type', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"❌ Error enviando mensaje a {user_id}: {str(e)}")
            # Desconectar si hay error
            self.disconnect(user_id)
            return False

    async def broadcast_alerts(self, user_id: str, alerts: list, session_info: dict):
        """
        Envía alertas de lugares al usuario en tiempo real

        Args:
            user_id: ID del usuario
            alerts: Lista de alertas a enviar
            session_info: Información de la sesión
        """
        if not alerts:
            return

        message = {
            "type": "new_alerts",
            "alerts": alerts,
            "count": len(alerts),
            "session_info": session_info,
            "timestamp": datetime.now().isoformat()
        }

        success = await self.send_to_user(user_id, message)

        if success:
            logger.info(f"🚨 {len(alerts)} alertas enviadas a {user_id} vía WebSocket")

    async def send_session_update(self, user_id: str, session_info: dict):
        """
        Envía actualización de estado de sesión

        Args:
            user_id: ID del usuario
            session_info: Info actualizada de la sesión
        """
        message = {
            "type": "session_update",
            "session_info": session_info,
            "timestamp": datetime.now().isoformat()
        }

        await self.send_to_user(user_id, message)

    async def notify_session_ending(self, user_id: str, reason: str, summary: dict = None):
        """
        Notifica al usuario que su sesión está por terminar o terminó

        Args:
            user_id: ID del usuario
            reason: Razón de finalización (expired, limit_reached, manual)
            summary: Resumen de la sesión
        """
        message = {
            "type": "session_ending",
            "reason": reason,
            "summary": summary,
            "timestamp": datetime.now().isoformat()
        }

        await self.send_to_user(user_id, message)

    async def send_error(self, user_id: str, error_message: str, error_code: str = None):
        """
        Envía un mensaje de error al usuario

        Args:
            user_id: ID del usuario
            error_message: Mensaje de error
            error_code: Código de error opcional
        """
        message = {
            "type": "error",
            "error": error_message,
            "error_code": error_code,
            "timestamp": datetime.now().isoformat()
        }

        await self.send_to_user(user_id, message)

    def is_connected(self, user_id: str) -> bool:
        """Verifica si un usuario está conectado"""
        return user_id in self.active_connections

    def get_session_id(self, user_id: str) -> str:
        """Obtiene el ID de sesión de un usuario conectado"""
        return self.user_sessions.get(user_id)

    def get_stats(self) -> dict:
        """Retorna estadísticas del manager"""
        return {
            "active_connections": len(self.active_connections),
            "total_connections_made": self.total_connections,
            "total_messages_sent": self.total_messages_sent,
            "connected_users": list(self.active_connections.keys())
        }


# Instancia global
exploration_ws_manager = ExplorationConnectionManager()
