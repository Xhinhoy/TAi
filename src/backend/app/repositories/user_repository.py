from typing import Optional, List
from datetime import datetime
from app.core.firebase import db  # 🔹 Importa el cliente Firestore

class UserRepository:
    def __init__(self):
        self.collection = db.collection("users")

    # 🔹 Obtiene el perfil del usuario desde Firestore
    def get_profile(self, uid: str) -> Optional[dict]:
        try:
            doc_ref = self.collection.document(uid)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["uid"] = uid
                return data
            else:
                print(f"⚠️ No se encontró el usuario {uid} en Firestore.")
                return None
        except Exception as e:
            print(f"❌ Error obteniendo perfil de usuario: {e}")
            return None

    # 🔹 Crea un nuevo perfil
    def create_profile(self, uid: str, profile_data: dict) -> str:
        profile_data["createdAt"] = datetime.utcnow()
        profile_data["updatedAt"] = datetime.utcnow()
        self.collection.document(uid).set(profile_data)
        return uid

    # 🔹 Actualiza un perfil existente
    def update_profile(self, uid: str, profile_data: dict) -> bool:
        try:
            profile_data["updatedAt"] = datetime.utcnow()
            self.collection.document(uid).update(profile_data)
            return True
        except Exception as e:
            print(f"❌ Error actualizando perfil {uid}: {e}")
            return False

    # 🔹 Actualiza solo los intereses
    def update_interests(self, uid: str, interests: List[str]) -> bool:
        try:
            self.collection.document(uid).update({
                "interests": interests,
                "updatedAt": datetime.utcnow(),
            })
            return True
        except Exception as e:
            print(f"❌ Error actualizando intereses de {uid}: {e}")
            return False

    # 🔹 Obtiene los favoritos del usuario
    def get_favorites(self, uid: str) -> List[dict]:
        try:
            favorites_ref = self.collection.document(uid).collection("favorites")
            docs = favorites_ref.stream()
            return [{"id": doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            print(f"❌ Error obteniendo favoritos de {uid}: {e}")
            return []

    # 🔹 Agrega un nuevo favorito
    def add_favorite(self, uid: str, place_id: str, place_data: dict) -> str:
        try:
            favorites_ref = self.collection.document(uid).collection("favorites")
            place_data["addedAt"] = datetime.utcnow()
            favorites_ref.document(place_id).set(place_data)
            return place_id
        except Exception as e:
            print(f"❌ Error agregando favorito {place_id}: {e}")
            return ""

    # 🔹 Elimina un favorito
    def remove_favorite(self, uid: str, place_id: str) -> bool:
        try:
            favorites_ref = self.collection.document(uid).collection("favorites")
            favorites_ref.document(place_id).delete()
            return True
        except Exception as e:
            print(f"❌ Error eliminando favorito {place_id}: {e}")
            return False


# ✅ Instancia global
user_repository = UserRepository()
