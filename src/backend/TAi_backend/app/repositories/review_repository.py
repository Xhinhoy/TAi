from app.core.firebase import firebase_service
from firebase_admin import firestore
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ReviewRepository:
    def __init__(self):
        self.db = firebase_service.firestore
        self.collection = 'reviews'

    def create_review(self, review_data: dict) -> dict:
        """Crea una nueva reseña"""
        try:
            # Agregar timestamp
            review_data['created_at'] = datetime.utcnow()
            review_data['helpful_count'] = 0
            review_data['source'] = 'internal'

            # Guardar en Firebase
            doc_ref = self.db.collection(self.collection).document()
            review_data['id'] = doc_ref.id
            doc_ref.set(review_data)

            logger.info(f"✅ Reseña creada: {doc_ref.id} para lugar {review_data['place_id']}")
            return review_data

        except Exception as e:
            logger.error(f"❌ Error creando reseña: {str(e)}")
            raise

    def get_reviews_by_place(self, place_id: str, limit: int = 50) -> List[dict]:
        """Obtiene todas las reseñas de un lugar"""
        try:
            # Query sin order_by para evitar requerir índice compuesto
            reviews_ref = (
                self.db.collection(self.collection)
                .where('place_id', '==', place_id)
                .limit(limit)
            )

            reviews = []
            for doc in reviews_ref.stream():
                review = doc.to_dict()
                review['id'] = doc.id
                reviews.append(review)

            # Ordenar en Python después de obtener los resultados
            reviews.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)

            logger.info(f"📋 {len(reviews)} reseñas internas encontradas para {place_id}")
            return reviews

        except Exception as e:
            logger.error(f"❌ Error obteniendo reseñas: {str(e)}")
            return []

    def get_reviews_by_user(self, user_id: str, limit: int = 50) -> List[dict]:
        """Obtiene todas las reseñas de un usuario"""
        try:
            # Query sin order_by para evitar requerir índice compuesto
            reviews_ref = (
                self.db.collection(self.collection)
                .where('user_id', '==', user_id)
                .limit(limit)
            )

            reviews = []
            for doc in reviews_ref.stream():
                review = doc.to_dict()
                review['id'] = doc.id
                reviews.append(review)

            # Ordenar en Python después de obtener los resultados
            reviews.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)

            return reviews

        except Exception as e:
            logger.error(f"❌ Error obteniendo reseñas del usuario: {str(e)}")
            return []

    def delete_review(self, review_id: str, user_id: str) -> bool:
        """Elimina una reseña (solo si es del usuario)"""
        try:
            doc_ref = self.db.collection(self.collection).document(review_id)
            doc = doc_ref.get()

            if not doc.exists:
                return False

            review = doc.to_dict()
            if review['user_id'] != user_id:
                logger.warning(f"⚠️ Usuario {user_id} intentó eliminar reseña de otro usuario")
                return False

            doc_ref.delete()
            logger.info(f"🗑️ Reseña {review_id} eliminada")
            return True

        except Exception as e:
            logger.error(f"❌ Error eliminando reseña: {str(e)}")
            return False

    def mark_helpful(self, review_id: str) -> bool:
        """Marca una reseña como útil (incrementa contador)"""
        try:
            doc_ref = self.db.collection(self.collection).document(review_id)
            doc_ref.update({'helpful_count': firestore.Increment(1)})
            return True
        except Exception as e:
            logger.error(f"❌ Error marcando reseña como útil: {str(e)}")
            return False

review_repository = ReviewRepository()
