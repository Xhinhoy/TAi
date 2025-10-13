import firebase_admin
from firebase_admin import credentials, firestore, db
from typing import Optional
from .config import settings

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
            return
        
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': settings.FIREBASE_DATABASE_URL,
            'projectId': settings.FIREBASE_PROJECT_ID
        })
        
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

firebase_service = FirebaseService()