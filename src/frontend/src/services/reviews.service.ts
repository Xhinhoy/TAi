import { api } from '../api/client';

export interface ReviewCreate {
  place_id: string;
  place_name: string;
  rating: number; // 1-5
  text: string;
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  place_id: string;
  place_name: string;
  rating: number;
  text: string;
  created_at: string;
  helpful_count: number;
  source: 'internal' | 'google';
}

export interface ReviewsResponse {
  place_id: string;
  place_name: string;
  total_reviews: number;
  average_rating: number;
  google_reviews: any[];
  internal_reviews: Review[];
}

class ReviewsService {
  /**
   * Crear una nueva reseña
   */
  async createReview(review: ReviewCreate): Promise<Review> {
    const response = await api.post('/reviews/', review);
    return response.data;
  }

  /**
   * Obtener todas las reseñas de un lugar (Google + internas)
   */
  async getPlaceReviews(placeId: string): Promise<ReviewsResponse> {
    const response = await api.get(`/reviews/place/${placeId}`);
    return response.data;
  }

  /**
   * Obtener mis reseñas
   */
  async getMyReviews(): Promise<Review[]> {
    const response = await api.get('/reviews/user/me');
    return response.data;
  }

  /**
   * Eliminar mi reseña
   */
  async deleteReview(reviewId: string): Promise<void> {
    await api.delete(`/reviews/${reviewId}`);
  }

  /**
   * Marcar reseña como útil
   */
  async markHelpful(reviewId: string): Promise<void> {
    await api.post(`/reviews/${reviewId}/helpful`);
  }

  /**
   * Abrir Google Maps para escribir reseña
   */
  openGoogleMapsReview(placeId: string, placeName: string) {
    // URL para abrir Google Maps en el lugar específico
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}&query_place_id=${placeId}`;

    // En React Native necesitamos usar Linking
    import('react-native').then(({ Linking }) => {
      Linking.openURL(googleMapsUrl).catch(err =>
        console.error('Error abriendo Google Maps:', err)
      );
    });
  }
}

export const reviewsService = new ReviewsService();
