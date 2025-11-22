from pydantic import BaseModel, Field, computed_field
from typing import Optional
from datetime import datetime

class ReviewCreate(BaseModel):
    """Modelo para crear una reseña"""
    place_id: str = Field(..., description="Google Place ID del lugar")
    place_name: str = Field(..., description="Nombre del lugar")
    rating: int = Field(..., ge=1, le=5, description="Calificación 1-5 estrellas")
    text: str = Field(..., min_length=10, max_length=1000, description="Texto de la reseña")

class Review(BaseModel):
    """Modelo completo de reseña"""
    id: str
    user_id: str
    user_name: str
    place_id: str
    place_name: str
    rating: int
    text: str
    created_at: datetime
    helpful_count: int = 0
    source: str = "internal"  # "internal" o "google"

class ReviewResponse(BaseModel):
    """Respuesta con todas las reseñas de un lugar"""
    place_id: str
    place_name: str
    total_reviews: int
    average_rating: float
    google_reviews: list[dict] = []
    internal_reviews: list[Review] = []

    @computed_field
    @property
    def reviews(self) -> list:
        """Combina reseñas de Google e internas en una sola lista"""
        combined = []

        # Agregar reseñas de Google (convertir a formato consistente)
        for review in self.google_reviews:
            combined.append({
                **review,
                'source': 'google'
            })

        # Agregar reseñas internas (convertir a dict)
        for review in self.internal_reviews:
            combined.append({
                'id': review.id,
                'user_name': review.user_name,
                'author_name': review.user_name,
                'rating': review.rating,
                'text': review.text,
                'created_at': review.created_at.isoformat(),
                'source': 'internal'
            })

        return combined
