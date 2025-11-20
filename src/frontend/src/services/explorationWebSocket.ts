/**
 * Servicio de WebSocket para conexión en tiempo real con el backend
 * Maneja la comunicación bidireccional para alertas de exploración
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { WebSocketMessage, Alert, SessionInfo } from '../types/exploration';

// Configurar URL del WebSocket
const getWebSocketURL = (): string => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    'http://localhost:8000/api/v1';

  // Convertir HTTP a WS
  let wsUrl = configuredUrl.replace('http://', 'ws://').replace('https://', 'wss://');

  // Si es Android y usa localhost, usar IP de desarrollo
  if (Platform.OS === 'android' && wsUrl.includes('localhost')) {
    const expoDevServerUrl = Constants.expoConfig?.hostUri;
    if (expoDevServerUrl) {
      const devServerIP = expoDevServerUrl.split(':')[0];
      wsUrl = wsUrl.replace('localhost', devServerIP);
      console.log('🤖 Android WebSocket URL:', wsUrl);
    }
  }

  // Remover /api/v1 del final si existe para construir la URL correcta
  wsUrl = wsUrl.replace('/api/v1', '');

  console.log('🌐 WebSocket Base URL:', wsUrl);
  return wsUrl;
};

const WS_BASE_URL = getWebSocketURL();

type MessageHandler = (data: WebSocketMessage) => void;
type ErrorHandler = (error: any) => void;

/**
 * Clase para manejar la conexión WebSocket de exploración
 */
class ExplorationWebSocketService {
  private ws: WebSocket | null = null;
  private userId: string = '';
  private sessionId: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isIntentionallyClosed: boolean = false;

  // Handlers
  private onMessageHandlers: MessageHandler[] = [];
  private onErrorHandlers: ErrorHandler[] = [];

  /**
   * Conecta al WebSocket del backend
   */
  connect(
    userId: string,
    sessionId: string,
    onMessage?: MessageHandler,
    onError?: ErrorHandler
  ): void {
    this.userId = userId;
    this.sessionId = sessionId;
    this.isIntentionallyClosed = false;

    if (onMessage) {
      this.onMessageHandlers.push(onMessage);
    }
    if (onError) {
      this.onErrorHandlers.push(onError);
    }

    // Construir URL del WebSocket
    const wsUrl = `${WS_BASE_URL}/api/v1/exploration/ws/${userId}/${sessionId}`;
    console.log('🔗 Conectando a WebSocket:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      // Listener de conexión
      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      // Listener de mensajes
      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 Mensaje recibido:', data.type);

          // Notificar a todos los handlers
          this.onMessageHandlers.forEach((handler) => handler(data));
        } catch (error) {
          console.error('❌ Error parseando mensaje:', error);
        }
      };

      // Listener de errores
      this.ws.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
        this.onErrorHandlers.forEach((handler) => handler(error));
      };

      // Listener de cierre
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket cerrado:', event.code, event.reason);
        this.stopPingInterval();

        // Intentar reconectar si no fue un cierre intencional
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('❌ Error creando WebSocket:', error);
      this.onErrorHandlers.forEach((handler) => handler(error));
    }
  }

  /**
   * Programa un intento de reconexión
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `🔄 Intentando reconectar en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.userId, this.sessionId);
    }, delay);
  }

  /**
   * Inicia el intervalo de ping para mantener la conexión viva
   */
  private startPingInterval(): void {
    this.stopPingInterval();

    // Enviar ping cada 30 segundos
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 30000);
  }

  /**
   * Detiene el intervalo de ping
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Envía actualización de ubicación al servidor
   */
  sendLocationUpdate(latitude: number, longitude: number, accuracy?: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket no está conectado, no se puede enviar ubicación');
      return;
    }

    const message = {
      type: 'location_update',
      latitude,
      longitude,
      accuracy,
    };

    try {
      this.ws.send(JSON.stringify(message));
      console.log('📍 Ubicación enviada:', latitude, longitude);
    } catch (error) {
      console.error('❌ Error enviando ubicación:', error);
    }
  }

  /**
   * Envía ping para mantener la conexión viva
   */
  ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({ type: 'ping' }));
      console.log('🏓 Ping enviado');
    } catch (error) {
      console.error('❌ Error enviando ping:', error);
    }
  }

  /**
   * Solicita el estado actual de la sesión
   */
  getStatus(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket no está conectado');
      return;
    }

    try {
      this.ws.send(JSON.stringify({ type: 'get_status' }));
      console.log('📊 Solicitando estado de sesión');
    } catch (error) {
      console.error('❌ Error solicitando estado:', error);
    }
  }

  /**
   * Desconecta el WebSocket
   */
  disconnect(): void {
    console.log('🔌 Desconectando WebSocket');
    this.isIntentionallyClosed = true;
    this.stopPingInterval();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Limpiar handlers
    this.onMessageHandlers = [];
    this.onErrorHandlers = [];
  }

  /**
   * Verifica si el WebSocket está conectado
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Agrega un handler de mensajes
   */
  addMessageHandler(handler: MessageHandler): void {
    this.onMessageHandlers.push(handler);
  }

  /**
   * Agrega un handler de errores
   */
  addErrorHandler(handler: ErrorHandler): void {
    this.onErrorHandlers.push(handler);
  }

  /**
   * Remueve un handler de mensajes
   */
  removeMessageHandler(handler: MessageHandler): void {
    this.onMessageHandlers = this.onMessageHandlers.filter((h) => h !== handler);
  }

  /**
   * Remueve un handler de errores
   */
  removeErrorHandler(handler: ErrorHandler): void {
    this.onErrorHandlers = this.onErrorHandlers.filter((h) => h !== handler);
  }
}

// Exportar instancia singleton
export const explorationWS = new ExplorationWebSocketService();
