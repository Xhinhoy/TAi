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
   * Get user profile by UID
   */
  async getProfile(uid: string) {
    const response = await api.get(`/users/${uid}/profile`);
    return response.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(uid: string, data: UpdateUserRequest) {
    const response = await api.put(`/users/${uid}/profile`, data);
    return response.data;
  },

  /**
   * Update user interests
   */
  async updateInterests(uid: string, interests: string[]) {
    const response = await api.patch(`/users/${uid}/interests`, interests);
    return response.data;
  },

  /**
   * Get user favorites
   */
  async getFavorites(uid: string) {
    const response = await api.get(`/users/${uid}/favorites`);
    return response.data.favorites;
  },

  /**
   * Add place to favorites
   */
  async addFavorite(uid: string, placeId: string, placeData: any) {
    const response = await api.post(`/users/${uid}/favorites`, {
      place_id: placeId,
      place_data: placeData,
    });
    return response.data;
  },

  /**
   * Remove place from favorites
   */
  async removeFavorite(uid: string, placeId: string) {
    const response = await api.delete(`/users/${uid}/favorites/${placeId}`);
    return response.data;
  },
};

// ============================================================================
// PLACES SERVICE
// ============================================================================

export interface PlacesSearchParams {
  q?: string; // query text
  lat: number; // latitude
  lng: number; // longitude
  radius?: number; // radius in meters (default 5000)
  place_type?: string; // type of place
}

export const placesService = {
  /**
   * Search places with filters and location
   */
  async search(params: PlacesSearchParams): Promise<Place[]> {
    const response = await api.get('/places/search', { params });
    return response.data;
  },

  /**
   * Get place details by ID
   */
  async getDetails(placeId: string) {
    const response = await api.get(`/places/${placeId}`);
    return response.data;
  },

  /**
   * Get places by category
   */
  async getByCategory(categories: string[], limit: number = 20): Promise<Place[]> {
    const response = await api.get('/places/by-category/', {
      params: {
        categories: categories.join(','),
        limit,
      },
    });
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

export const recommendationsService = {
  /**
   * Generate AI-powered recommendations
   */
  async generate(params: RecommendationsRequest) {
    const response = await api.post('/recommendations/generate', params);
    return response.data;
  },
};

// ============================================================================
// ITINERARIES SERVICE
// ============================================================================

export interface CreateItineraryRequest {
  title: string;
  description?: string;
  days: number;
  preferences?: {
    budget?: string;
    interests?: string[];
  };
}

export interface GenerateItineraryRequest {
  city: string;
  days: number;
  interests?: string[];
  budget?: string;
}

export const itinerariesService = {
  /**
   * Generate AI-powered itinerary
   */
  async generate(data: GenerateItineraryRequest): Promise<Itinerary> {
    const response = await api.post('/itineraries/generate', data);
    return response.data;
  },

  /**
   * Get all itineraries for a user
   */
  async getUserItineraries(userId: string): Promise<Itinerary[]> {
    const response = await api.get(`/itineraries/user/${userId}`);
    return response.data;
  },

  /**
   * Get itinerary by ID
   */
  async getById(itineraryId: string): Promise<Itinerary> {
    const response = await api.get(`/itineraries/${itineraryId}`);
    return response.data;
  },

  /**
   * Create a new itinerary manually
   */
  async create(userId: string, data: CreateItineraryRequest): Promise<Itinerary> {
    const response = await api.post(`/itineraries/${userId}`, data);
    return response.data;
  },

  /**
   * Update itinerary
   */
  async update(itineraryId: string, data: CreateItineraryRequest) {
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
  session_id: string;
  message: string;
  context?: Record<string, any>;
}

export interface ChatAction {
  type: string;
  data: Record<string, any>;
}

export interface ChatResponse {
  response: string;
  actions: ChatAction[];
  places: Place[];
  itinerary?: any;
  saved_itinerary_id?: string;
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
  async getHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const response = await api.get(`/chat/history/${sessionId}`, {
      params: { limit },
    });
    return response.data.messages;
  },

  /**
   * Get all chat sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const response = await api.get(`/chat/sessions/${userId}`);
    return response.data.sessions;
  },

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/chat/sessions/${sessionId}`);
  },

  /**
   * Connect to WebSocket for real-time chat
   */
  connectWebSocket(userId: string, sessionId: string): WebSocket {
    const wsUrl = api.defaults.baseURL?.replace('http', 'ws').replace('/api/v1', '');
    const ws = new WebSocket(`${wsUrl}/api/v1/chat/ws/${userId}/${sessionId}`);
    return ws;
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
   * Clear cache by prefix
   */
  async clearPrefix(prefix: string) {
    const response = await api.delete(`/cache/clear/${prefix}`);
    return response.data;
  },

  /**
   * Clean expired cache entries
   */
  async cleanExpired(prefix: string) {
    const response = await api.delete(`/cache/clean-expired/${prefix}`);
    return response.data;
  },
};
