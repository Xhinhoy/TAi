// Complete API services for TAi Backend
import { api } from './client';
import { Place, UserPreferences, Itinerary } from '../types/domain';

// ============================================================================
// USERS SERVICE
// ============================================================================

export interface CreateUserRequest {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  photoURL?: string;
  bio?: string;
}

export interface UserPreferencesRequest {
  budget?: 'low' | 'medium' | 'high';
  interests: string[];
  preferredLanguage?: string;
  accessibility?: string[];
}

export const usersService = {
  /**
   * Create a new user profile
   */
  async create(data: CreateUserRequest) {
    const response = await api.post('/users', data);
    return response.data;
  },

  /**
   * Get user profile by UID
   */
  async getProfile(uid: string) {
    const response = await api.get(`/users/${uid}`);
    return response.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(uid: string, data: UpdateUserRequest) {
    const response = await api.put(`/users/${uid}`, data);
    return response.data;
  },

  /**
   * Get user preferences
   */
  async getPreferences(uid: string): Promise<UserPreferences> {
    const response = await api.get(`/users/${uid}/preferences`);
    return response.data;
  },

  /**
   * Update user preferences
   */
  async updatePreferences(uid: string, data: UserPreferencesRequest) {
    const response = await api.put(`/users/${uid}/preferences`, data);
    return response.data;
  },

  /**
   * Delete user account
   */
  async delete(uid: string) {
    const response = await api.delete(`/users/${uid}`);
    return response.data;
  },
};

// ============================================================================
// PLACES SERVICE
// ============================================================================

export interface PlacesSearchParams {
  query?: string;
  category?: string;
  min_rating?: number;
  max_price_level?: number;
  limit?: number;
}

export interface NearbyPlacesParams {
  latitude: number;
  longitude: number;
  radius?: number;
  category?: string;
  limit?: number;
}

export interface PlaceDetailsParams {
  source?: 'firebase' | 'google';
}

export const placesService = {
  /**
   * Search places with filters
   */
  async search(params: PlacesSearchParams): Promise<Place[]> {
    const response = await api.get('/places/search', { params });
    return response.data;
  },

  /**
   * Get nearby places based on coordinates
   */
  async nearby(params: NearbyPlacesParams): Promise<Place[]> {
    const response = await api.get('/places/nearby', { params });
    return response.data;
  },

  /**
   * Get place details by ID
   */
  async getDetails(placeId: string, params?: PlaceDetailsParams) {
    const response = await api.get(`/places/${placeId}`, { params });
    return response.data;
  },

  /**
   * Sync a place from Google Places to Firebase
   */
  async syncFromGoogle(placeId: string) {
    const response = await api.post(`/places/${placeId}/sync`);
    return response.data;
  },

  /**
   * Get popular places
   */
  async getPopular(limit: number = 10): Promise<Place[]> {
    const response = await api.get('/places/popular', { params: { limit } });
    return response.data;
  },
};

// ============================================================================
// RECOMMENDATIONS SERVICE
// ============================================================================

export interface RecommendationsRequest {
  user_id: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  limit?: number;
  categories?: string[];
}

export interface PersonalizedRecommendation {
  place: Place;
  score: number;
  reasoning: string;
  categories_matched: string[];
}

export const recommendationsService = {
  /**
   * Get AI-powered recommendations (actual endpoint: /generate)
   */
  async getPersonalized(params: RecommendationsRequest): Promise<PersonalizedRecommendation[]> {
    const response = await api.post('/recommendations/generate', params);
    return response.data;
  },

  /**
   * Get category-based recommendations
   */
  async getByCategory(category: string, limit: number = 10) {
    const response = await api.get('/recommendations/category', {
      params: { category, limit },
    });
    return response.data;
  },

  /**
   * Get trending places
   */
  async getTrending(limit: number = 10) {
    const response = await api.get('/recommendations/trending', {
      params: { limit },
    });
    return response.data;
  },
};

// ============================================================================
// ITINERARIES SERVICE
// ============================================================================

export interface CreateItineraryRequest {
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  preferences?: {
    budget?: 'low' | 'medium' | 'high';
    pace?: 'relaxed' | 'moderate' | 'fast';
    interests?: string[];
  };
  place_ids?: string[];
}

export interface UpdateItineraryRequest {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  place_ids?: string[];
}

export interface GenerateItineraryRequest {
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  preferences: {
    budget?: 'low' | 'medium' | 'high';
    pace?: 'relaxed' | 'moderate' | 'fast';
    interests?: string[];
  };
}

export const itinerariesService = {
  /**
   * Create a new itinerary
   */
  async create(data: CreateItineraryRequest): Promise<Itinerary> {
    const response = await api.post('/itineraries', data);
    return response.data;
  },

  /**
   * Get itinerary by ID
   */
  async get(itineraryId: string): Promise<Itinerary> {
    const response = await api.get(`/itineraries/${itineraryId}`);
    return response.data;
  },

  /**
   * Update itinerary
   */
  async update(itineraryId: string, data: UpdateItineraryRequest): Promise<Itinerary> {
    const response = await api.put(`/itineraries/${itineraryId}`, data);
    return response.data;
  },

  /**
   * Delete itinerary
   */
  async delete(itineraryId: string) {
    const response = await api.delete(`/itineraries/${itineraryId}`);
    return response.data;
  },

  /**
   * Get all itineraries for a user
   */
  async getUserItineraries(userId: string): Promise<Itinerary[]> {
    const response = await api.get('/itineraries/user', {
      params: { user_id: userId },
    });
    return response.data;
  },

  /**
   * Generate AI-powered itinerary
   */
  async generate(data: GenerateItineraryRequest): Promise<Itinerary> {
    const response = await api.post('/itineraries/generate', data);
    return response.data;
  },

  /**
   * Add place to itinerary
   */
  async addPlace(itineraryId: string, placeId: string) {
    const response = await api.post(`/itineraries/${itineraryId}/places`, {
      place_id: placeId,
    });
    return response.data;
  },

  /**
   * Remove place from itinerary
   */
  async removePlace(itineraryId: string, placeId: string) {
    const response = await api.delete(`/itineraries/${itineraryId}/places/${placeId}`);
    return response.data;
  },
};

// ============================================================================
// CHAT SERVICE
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  user_id: string;
  session_id?: string; // 👈 antes era conversation_id
  message: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  message: string;
  conversation_id: string;
  suggestions?: string[];
  places?: Place[];
  metadata?: Record<string, any>;
}

export const chatService = {
  /**
   * Send a message to the AI travel assistant
   */
  async sendMessage(data: ChatRequest): Promise<ChatResponse> {
    const response = await api.post('/chat/message', data);
    return response.data;
  },

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string): Promise<ChatMessage[]> {
    const response = await api.get(`/chat/${conversationId}`);
    return response.data;
  },

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string) {
    const response = await api.get('/chat/conversations', {
      params: { user_id: userId },
    });
    return response.data;
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string) {
    const response = await api.delete(`/chat/${conversationId}`);
    return response.data;
  },
};

// ============================================================================
// CACHE SERVICE (Admin)
// ============================================================================

export const cacheService = {
  /**
   * Get cache statistics
   */
  async getStats() {
    const response = await api.get('/cache/stats');
    return response.data;
  },

  /**
   * Clear all cache
   */
  async clearAll() {
    const response = await api.delete('/cache');
    return response.data;
  },

  /**
   * Clear cache for specific key
   */
  async clearKey(key: string) {
    const response = await api.delete(`/cache/${key}`);
    return response.data;
  },
};
