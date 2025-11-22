/**
 * Servicio para interactuar con los endpoints de exploración del backend
 */

import { api } from './client';
import {
  SessionCreateRequest,
  SessionResponse,
  LocationUpdate,
  LocationUpdateResponse,
  SessionSummary,
  PreferenceInsights,
  InteractionType,
} from '../types/exploration';

export const explorationService = {
  /**
   * Inicia una nueva sesión de exploración
   */
  async startSession(config: SessionCreateRequest): Promise<SessionResponse> {
    try {
      console.log('🚀 Iniciando sesión de exploración:', config);
      const response = await api.post('/exploration/session/start', config);
      console.log('✅ Sesión iniciada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error iniciando sesión:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Obtiene el estado de la sesión activa
   */
  async getSessionStatus(): Promise<SessionResponse> {
    try {
      const response = await api.get('/exploration/session/status');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo estado de sesión:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Pausa la sesión actual
   */
  async pauseSession(): Promise<{ status: string; message: string }> {
    try {
      console.log('⏸️ Pausando sesión');
      const response = await api.post('/exploration/session/pause');
      console.log('✅ Sesión pausada');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error pausando sesión:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Reanuda una sesión pausada
   */
  async resumeSession(): Promise<{ status: string; message: string }> {
    try {
      console.log('▶️ Reanudando sesión');
      const response = await api.post('/exploration/session/resume');
      console.log('✅ Sesión reanudada');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error reanudando sesión:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Finaliza la sesión manualmente
   */
  async endSession(): Promise<{ status: string; summary: SessionSummary }> {
    try {
      console.log('🏁 Finalizando sesión');
      const response = await api.post('/exploration/session/end');
      console.log('✅ Sesión finalizada:', response.data.summary);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error finalizando sesión:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Actualiza la ubicación del usuario y recibe alertas (sin WebSocket)
   * Este método es útil como fallback si WebSocket falla
   */
  async updateLocation(location: LocationUpdate): Promise<LocationUpdateResponse> {
    try {
      const response = await api.post('/exploration/location/update', location);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error actualizando ubicación:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Registra una interacción del usuario con una alerta
   */
  async recordInteraction(
    alertId: string,
    type: InteractionType
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(
        `/exploration/alert/interact?alert_id=${alertId}&interaction_type=${type}`
      );
      console.log(`📊 Interacción registrada: ${type} en alerta ${alertId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error registrando interacción:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Obtiene el historial de sesiones del usuario
   */
  async getSessionHistory(limit: number = 10): Promise<{ sessions: any[]; count: number }> {
    try {
      const response = await api.get(`/exploration/session/history?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo historial:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Obtiene insights sobre las preferencias aprendidas del usuario
   */
  async getPreferenceInsights(): Promise<PreferenceInsights> {
    try {
      const response = await api.get('/exploration/preferences/insights');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo insights:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Fuerza re-análisis de preferencias del usuario
   */
  async refreshPreferences(): Promise<{
    status: string;
    message: string;
    total_interactions: number;
    categories_learned: number;
    last_updated: string;
  }> {
    try {
      console.log('🔄 Re-analizando preferencias');
      const response = await api.post('/exploration/preferences/refresh');
      console.log('✅ Preferencias actualizadas');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error refrescando preferencias:', error.response?.data || error.message);
      throw error;
    }
  },
};
