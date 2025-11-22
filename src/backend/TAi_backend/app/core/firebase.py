import firebase_admin
from firebase_admin import credentials, firestore, db
from typing import Optional
from pathlib import Path
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
        if firebase_admin._apps:
            # Reutiliza la app existente (uvicorn --reload / multiprocess)
            self._firestore_client = firestore.client()
            self._realtime_db = db.reference()
            self._initialized = True
            return

        cred_path = Path(settings.FIREBASE_CREDENTIALS_PATH).expanduser()
        if not cred_path.is_absolute():
            # Interpretar path relativo respecto a la carpeta de config
            base_dir = Path(__file__).resolve().parent.parent
            cred_path = (base_dir / cred_path).resolve()

        if not cred_path.exists():
            raise FileNotFoundError(f"Firebase credentials file not found: {cred_path}")

        cred = credentials.Certificate(str(cred_path))
        project_id = cred.project_id
        if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PROJECT_ID != cred.project_id:
            # Preferimos el project_id del service account para evitar aud/iss incorrectos
            project_id = cred.project_id
        elif settings.FIREBASE_PROJECT_ID:
            project_id = settings.FIREBASE_PROJECT_ID

        firebase_admin.initialize_app(cred, {
            'databaseURL': settings.FIREBASE_DATABASE_URL,
            'projectId': project_id
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
