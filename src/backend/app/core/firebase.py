# app/core/firebase.py
from __future__ import annotations
from typing import Any, Dict, Iterator, Optional, Tuple, List
from app.core.config import settings

# Importa SDK real solo si NO estamos en mock
if not settings.MOCK_MODE:
    import firebase_admin
    from firebase_admin import credentials, firestore as fb_firestore, db as fb_db

# ------------------ FIRESTORE MOCK ------------------

class _MockDocSnapshot:
    def __init__(self, id: str, data: Optional[Dict[str, Any]]):
        self.id = id
        self._data = data
    @property
    def exists(self) -> bool:
        return self._data is not None
    def to_dict(self) -> Optional[Dict[str, Any]]:
        return dict(self._data) if self._data is not None else None

class _MockDocRef:
    def __init__(self, collection: "_MockCollection", doc_id: str):
        self._col = collection
        self.id = doc_id
    def set(self, data: Dict[str, Any], merge: bool = False) -> None:
        existing = self._col._store.get(self.id)
        if merge and isinstance(existing, dict):
            existing.update(data)
            self._col._store[self.id] = existing
        else:
            self._col._store[self.id] = dict(data)
    def get(self) -> _MockDocSnapshot:
        return _MockDocSnapshot(self.id, self._col._store.get(self.id))
    def update(self, data: Dict[str, Any]) -> None:
        if self.id not in self._col._store:
            raise KeyError("Document does not exist")
        self._col._store[self.id].update(data)
    def delete(self) -> None:
        self._col._store.pop(self.id, None)

class _MockQuery:
    def __init__(self, docs: List[Tuple[str, Dict[str, Any]]]):
        self._docs = docs
    def where(self, field: str, op: str, value: Any) -> "_MockQuery":
        if op != "==":
            return self
        filtered = [(i, d) for (i, d) in self._docs if d.get(field) == value]
        return _MockQuery(filtered)
    def order_by(self, field: str, direction: str = "ASCENDING") -> "_MockQuery":
        reverse = str(direction).upper().startswith("DESC")
        ordered = sorted(self._docs, key=lambda t: t[1].get(field), reverse=reverse)
        return _MockQuery(ordered)
    def limit(self, n: int) -> "_MockQuery":
        return _MockQuery(self._docs[:n])
    def stream(self) -> Iterator[_MockDocSnapshot]:
        for doc_id, data in self._docs:
            yield _MockDocSnapshot(doc_id, data)

class _MockCollection:
    def __init__(self, name: str):
        self.name = name
        self._store: Dict[str, Dict[str, Any]] = {}
        self._auto = 0
    def document(self, doc_id: Optional[str] = None) -> _MockDocRef:
        if doc_id is None:
            self._auto += 1
            doc_id = f"auto_{self._auto}"
        return _MockDocRef(self, doc_id)
    def add(self, data: Dict[str, Any]):
        ref = self.document(None)
        ref.set(data)
        return ref, None
    def stream(self) -> Iterator[_MockDocSnapshot]:
        for k, v in self._store.items():
            yield _MockDocSnapshot(k, v)
    def where(self, field: str, op: str, value: Any) -> _MockQuery:
        return _MockQuery(list(self._store.items())).where(field, op, value)
    def order_by(self, field: str, direction: str = "ASCENDING") -> _MockQuery:
        return _MockQuery(list(self._store.items())).order_by(field, direction)
    def limit(self, n: int) -> _MockQuery:
        return _MockQuery(list(self._store.items())).limit(n)

class _MockFirestore:
    def __init__(self):
        self._collections: Dict[str, _MockCollection] = {}
    def collection(self, name: str) -> _MockCollection:
        if name not in self._collections:
            self._collections[name] = _MockCollection(name)
        return self._collections[name]

# ------------------ REALTIME DB MOCK ------------------

class _MockRTRef:
    def __init__(self, store: Dict[str, Any], path: str = "/"):
        self._store = store
        self._path = path.strip("/")  # '' para root
    def child(self, name: str) -> "_MockRTRef":
        name = name.strip("/")
        new_path = f"{self._path}/{name}" if self._path else name
        return _MockRTRef(self._store, new_path)
    def _resolve_parent_and_key(self):
        if not self._path:
            return self._store, None
        parts = self._path.split("/")
        cur = self._store
        for p in parts[:-1]:
            cur = cur.setdefault(p, {})
        return cur, parts[-1]
    def set(self, value: Any):
        if not self._path:
            if isinstance(value, dict):
                self._store.clear()
                self._store.update(value)
            else:
                self._store.clear()
                self._store["value"] = value
            return
        parent, key = self._resolve_parent_and_key()
        parent[key] = value
    def update(self, value: Dict[str, Any]):
        cur = self.get()
        if not isinstance(cur, dict):
            cur = {}
        if not self._path:
            if not isinstance(value, dict):
                return
            self._store.update(value)
        else:
            parent, key = self._resolve_parent_and_key()
            node = parent.get(key, {})
            if not isinstance(node, dict):
                node = {}
            node.update(value)
            parent[key] = node
    def get(self) -> Any:
        if not self._path:
            return self._store
        parts = self._path.split("/")
        cur: Any = self._store
        for p in parts:
            if not isinstance(cur, dict) or p not in cur:
                return None
            cur = cur[p]
        return cur

# ------------------ SERVICIO ------------------

class FirebaseService:
    """Singleton para Firebase Admin SDK o mocks en memoria"""
    _instance: Optional["FirebaseService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self._initialized = False
        self._firestore_client = None
        self._rt_store: Dict[str, Any] = {}
        self._rt_root_ref = _MockRTRef(self._rt_store) if settings.MOCK_MODE else None

        if settings.MOCK_MODE:
            self._firestore_client = _MockFirestore()
            self._initialized = True  # no init real en mock

    def initialize(self):
        """Inicializa Firebase Admin SDK (solo si MOCK_MODE=false)"""
        if self._initialized:
            return
        if settings.MOCK_MODE:
            self._initialized = True
            return

        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)  # type: ignore[arg-type]
        firebase_admin.initialize_app(cred, {
            "databaseURL": settings.FIREBASE_DATABASE_URL,
            "projectId": settings.FIREBASE_PROJECT_ID,
        })
        self._firestore_client = fb_firestore.client()
        # Importante: en el SDK real, solemos usar una referencia raíz
        self._rt_root_ref = fb_db.reference("/")
        self._initialized = True

    @property
    def firestore(self):
        if not self._initialized:
            self.initialize()
        return self._firestore_client

    @property
    def realtime_db(self):
        """
        Devuelve SIEMPRE una referencia raíz con `.child(...)`,
        tanto en real como en mock.
        """
        if not self._initialized:
            self.initialize()
        return self._rt_root_ref

firebase_service = FirebaseService()
