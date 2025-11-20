/**
 * Tipos para el sistema de exploración con alertas de lugares
 */

// Prioridad de alerta según relevancia
export type AlertPriority = 'high' | 'medium' | 'low';

// Estados posibles de una sesión
export type SessionStatus = 'active' | 'paused' | 'expired' | 'ended';

// Tipos de interacción con alertas
export type InteractionType = 'viewed' | 'tapped' | 'dismissed' | 'saved';

/**
 * Coordenadas geográficas
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Lugar asociado a una alerta
 */
export interface AlertPlace {
  id: string;
  name: string;
  coords: Coordinates;
  rating: number;
  address: string;
  price_level: number;
  photos: string[];
  categories: string[];
}

/**
 * Alerta de lugar cercano
 */
export interface Alert {
  id: string;
  place: AlertPlace;
  distance_meters: number;
  priority: AlertPriority;
  message: string;
  match_score: number; // 0-1
  estimated_time_minutes: number;
}

/**
 * Información de sesión de exploración
 */
export interface SessionInfo {
  time_remaining_minutes: number;
  alerts_remaining: number;
  places_discovered: number;
  distance_walked_km: number;
}

/**
 * Sesión de exploración completa
 */
export interface ExplorationSession {
  id: string;
  user_id: string;
  status: SessionStatus;
  duration_minutes: number;
  max_alerts: number;
  started_at: string;
  expires_at: string;
  ended_at?: string;
  alerts_generated: number;
  alerts_interacted: number;
  places_discovered: number;
  distance_walked_meters: number;
  estimated_cost_usd: number;
  is_paused: boolean;
  paused_at?: string;
}

/**
 * Request para iniciar sesión
 */
export interface SessionCreateRequest {
  duration_minutes: number;
  max_alerts: number;
  interests_override?: string[];
}

/**
 * Response al iniciar sesión
 */
export interface SessionResponse {
  session: ExplorationSession;
  time_remaining_minutes: number;
  alerts_remaining: number;
  can_continue: boolean;
  message?: string;
}

/**
 * Actualización de ubicación
 */
export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Response de actualización de ubicación
 */
export interface LocationUpdateResponse {
  alerts: Alert[];
  count: number;
  session_active: boolean;
  session_info?: SessionInfo;
  session_required?: boolean;
  session_expired?: boolean;
  limit_reached?: boolean;
  paused?: boolean;
  message?: string;
  summary?: SessionSummary;
}

/**
 * Resumen de sesión
 */
export interface SessionSummary {
  duration_minutes: number;
  places_discovered: number;
  alerts_generated: number;
  alerts_interacted: number;
  distance_walked_km: number;
  estimated_cost: string;
  message: string;
}

/**
 * Mensaje de WebSocket
 */
export interface WebSocketMessage {
  type: 'connection_established' | 'new_alerts' | 'session_update' | 'session_ending' | 'error' | 'pong' | 'session_status' | 'session_paused';
  alerts?: Alert[];
  count?: number;
  session_info?: SessionInfo;
  session_id?: string;
  timestamp?: string;
  message?: string;
  reason?: string;
  summary?: SessionSummary;
  error?: string;
  error_code?: string;
}

/**
 * Insights de preferencias del usuario
 */
export interface PreferenceInsights {
  user_id: string;
  top_categories: Array<{ category: string; score: number }>;
  avoided_categories: Array<{ category: string; score: number }>;
  preferred_price_range: { min: number; max: number };
  preferred_times: string[];
  preferred_distances: { min: number; max: number };
  engagement_rate: number;
  dismissal_rate: number;
  insights: Array<{
    type: string;
    insight: string;
    confidence: number;
    data: any;
  }>;
  analyzed_at: string;
}
