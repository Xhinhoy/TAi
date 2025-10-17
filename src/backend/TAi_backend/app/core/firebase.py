import firebase_admin
from firebase_admin import credentials, firestore, db
from typing import Optional
from .config import settings
import logging
import os

logger = logging.getLogger(__name__)

class FirebaseService:
    """Singleton para Firebase Admin SDK"""
    _instance: Optional['FirebaseService'] = None
    _firestore_client = None
    _realtime_db = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self):
        """Inicializa Firebase Admin SDK"""
        if self._initialized:
            logger.info("Firebase ya estaba inicializado.")
            return

        # 🔎 Verificación de credenciales
        if not os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            raise FileNotFoundError(
                f"No se encontró el archivo de credenciales Firebase en: {settings.FIREBASE_CREDENTIALS_PATH}"
            )

        # 🔒 Evita inicialización múltiple (por reloader o imports)
        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred, {
                'databaseURL': settings.FIREBASE_DATABASE_URL,
                'projectId': settings.FIREBASE_PROJECT_ID
            })
            logger.info("Firebase inicializado correctamente.")
        else:
            logger.info("Firebase Admin SDK ya estaba inicializado previamente.")

        self._firestore_client = firestore.client()
        self._realtime_db = db.reference()
        self._initialized = True

    @property
    def firestore(self):
        if not self._initialized:
            self.initialize()
        return self._firestore_client

    @property
    def realtime_db(self):
        if not self._initialized:
            self.initialize()
        return self._realtime_db


# Instancia global
firebase_service = FirebaseService()
firebase_service.initialize()  # 👈 Asegura que se inicializa al importar
