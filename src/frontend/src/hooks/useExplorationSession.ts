/**
 * Hook principal para manejar sesiones de exploración
 * Maneja el ciclo de vida completo de una sesión y la comunicación WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { explorationService } from '../api/explorationService';
import { explorationWS } from '../services/explorationWebSocket';
import {
  Alert,
  ExplorationSession,
  SessionInfo,
  SessionSummary,
  WebSocketMessage,
} from '../types/exploration';

interface UseExplorationSessionReturn {
  // Estado de la sesión
  isActive: boolean;
  isPaused: boolean;
  session: ExplorationSession | null;
  alerts: Alert[];
  sessionInfo: SessionInfo | null;
  isLoading: boolean;
  error: string | null;

  // Acciones
  startSession: (duration?: number, maxAlerts?: number) => Promise<void>;
  endSession: () => Promise<SessionSummary | null>;
  togglePause: () => Promise<void>;
  sendLocation: (latitude: number, longitude: number, accuracy?: number) => void;
  recordInteraction: (alertId: string, type: string) => Promise<void>;
  clearAlerts: () => void;
  dismissAlert: (alertId: string) => void;
}

export const useExplorationSession = (userId: string): UseExplorationSessionReturn => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [session, setSession] = useState<ExplorationSession | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref para evitar múltiples llamadas simultáneas
  const isStartingRef = useRef(false);

  /**
   * Handler para mensajes del WebSocket
   */
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    console.log('📨 Mensaje WebSocket recibido:', data.type);

    switch (data.type) {
      case 'connection_established':
        console.log('✅ Conexión WebSocket establecida');
        break;

      case 'new_alerts':
        if (data.alerts && data.alerts.length > 0) {
          console.log(`🚨 ${data.alerts.length} nuevas alertas recibidas`);
          setAlerts((prev) => [...prev, ...data.alerts!]);

          if (data.session_info) {
            setSessionInfo(data.session_info);
          }
        }
        break;

      case 'session_update':
        if (data.session_info) {
          console.log('📊 Actualización de sesión recibida');
          setSessionInfo(data.session_info);
        }
        break;

      case 'session_ending':
        console.log('🏁 Sesión finalizando:', data.reason);
        setIsActive(false);
        setSession(null);
        if (data.summary) {
          // Aquí podrías mostrar un modal con el resumen
          console.log('📈 Resumen de sesión:', data.summary);
        }
        break;

      case 'session_paused':
        console.log('⏸️ Sesión pausada');
        setIsPaused(true);
        break;

      case 'error':
        console.error('❌ Error del servidor:', data.error);
        setError(data.error || 'Error desconocido');
        break;

      case 'pong':
        console.log('🏓 Pong recibido');
        break;
    }
  }, []);

  /**
   * Handler para errores del WebSocket
   */
  const handleWebSocketError = useCallback((error: any) => {
    console.error('❌ Error en WebSocket:', error);
    setError('Error de conexión con el servidor');
  }, []);

  /**
   * Inicia una nueva sesión de exploración
   */
  const startSession = useCallback(
    async (duration: number = 120, maxAlerts: number = 20) => {
      if (isStartingRef.current) {
        console.warn('⚠️ Ya se está iniciando una sesión');
        return;
      }

      isStartingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        console.log('🚀 Iniciando sesión de exploración...');
        const response = await explorationService.startSession({
          duration_minutes: duration,
          max_alerts: maxAlerts,
        });

        console.log('✅ Sesión iniciada:', response.session.id);

        setSession(response.session);
        setSessionInfo({
          time_remaining_minutes: response.time_remaining_minutes,
          alerts_remaining: response.alerts_remaining,
          places_discovered: 0,
          distance_walked_km: 0,
        });
        setIsActive(true);
        setIsPaused(false);

        // Conectar WebSocket
        console.log('🌐 Conectando WebSocket...');
        explorationWS.connect(
          userId,
          response.session.id,
          handleWebSocketMessage,
          handleWebSocketError
        );
      } catch (err: any) {
        console.error('❌ Error iniciando sesión:', err);
        setError(err.response?.data?.detail || err.message || 'Error al iniciar sesión');
      } finally {
        setIsLoading(false);
        isStartingRef.current = false;
      }
    },
    [userId, handleWebSocketMessage, handleWebSocketError]
  );

  /**
   * Finaliza la sesión manualmente
   */
  const endSession = useCallback(async (): Promise<SessionSummary | null> => {
    setIsLoading(true);

    try {
      console.log('🏁 Finalizando sesión...');
      const response = await explorationService.endSession();

      explorationWS.disconnect();
      setIsActive(false);
      setIsPaused(false);
      setSession(null);
      setAlerts([]);
      setSessionInfo(null);

      console.log('✅ Sesión finalizada:', response.summary);
      return response.summary;
    } catch (err: any) {
      console.error('❌ Error finalizando sesión:', err);
      setError(err.response?.data?.detail || err.message || 'Error al finalizar sesión');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Alterna entre pausar y reanudar la sesión
   */
  const togglePause = useCallback(async () => {
    setIsLoading(true);

    try {
      if (isPaused) {
        console.log('▶️ Reanudando sesión...');
        await explorationService.resumeSession();
        setIsPaused(false);
      } else {
        console.log('⏸️ Pausando sesión...');
        await explorationService.pauseSession();
        setIsPaused(true);
      }
    } catch (err: any) {
      console.error('❌ Error pausando/reanudando:', err);
      setError(err.response?.data?.detail || err.message || 'Error al pausar/reanudar sesión');
    } finally {
      setIsLoading(false);
    }
  }, [isPaused]);

  /**
   * Envía la ubicación actual al servidor vía WebSocket
   */
  const sendLocation = useCallback(
    (latitude: number, longitude: number, accuracy?: number) => {
      if (isActive && !isPaused) {
        explorationWS.sendLocationUpdate(latitude, longitude, accuracy);
      }
    },
    [isActive, isPaused]
  );

  /**
   * Registra una interacción con una alerta
   */
  const recordInteraction = useCallback(async (alertId: string, type: string) => {
    try {
      await explorationService.recordInteraction(
        alertId,
        type as 'viewed' | 'tapped' | 'dismissed' | 'saved'
      );
    } catch (err: any) {
      console.error('❌ Error registrando interacción:', err);
    }
  }, []);

  /**
   * Limpia todas las alertas
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  /**
   * Descarta una alerta específica
   */
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    recordInteraction(alertId, 'dismissed');
  }, [recordInteraction]);

  /**
   * Cleanup al desmontar el componente
   */
  useEffect(() => {
    return () => {
      if (isActive) {
        console.log('🧹 Limpiando hook de exploración');
        explorationWS.disconnect();
      }
    };
  }, [isActive]);

  return {
    isActive,
    isPaused,
    session,
    alerts,
    sessionInfo,
    isLoading,
    error,
    startSession,
    endSession,
    togglePause,
    sendLocation,
    recordInteraction,
    clearAlerts,
    dismissAlert,
  };
};
