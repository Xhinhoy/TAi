/**
 * Servicio para el seguimiento de ubicación del usuario
 * Compatible con Expo Location
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

export interface LocationResult {
  coords: LocationCoords;
  timestamp: number;
}

type LocationCallback = (location: LocationResult) => void;
type ErrorCallback = (error: Error) => void;

/**
 * Servicio para manejar la ubicación del usuario
 */
class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private hasPermission: boolean = false;

  /**
   * Solicita permisos de ubicación
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('📍 Solicitando permisos de ubicación...');

      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.error('❌ Permiso de ubicación denegado');
        return false;
      }

      console.log('✅ Permiso de ubicación concedido');
      this.hasPermission = true;
      return true;
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return false;
    }
  }

  /**
   * Verifica si tiene permisos de ubicación
   */
  async hasLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Obtiene la ubicación actual una vez
   */
  async getCurrentLocation(): Promise<LocationResult | null> {
    try {
      if (!this.hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Permisos de ubicación no concedidos');
        }
      }

      console.log('📍 Obteniendo ubicación actual...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('✅ Ubicación obtenida:', location.coords);

      return {
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
        },
        timestamp: location.timestamp,
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo ubicación:', error);
      return null;
    }
  }

  /**
   * Inicia el seguimiento continuo de ubicación
   */
  async startWatching(
    onLocationUpdate: LocationCallback,
    onError?: ErrorCallback,
    options?: {
      distanceInterval?: number; // metros
      timeInterval?: number; // milisegundos
      accuracy?: Location.Accuracy;
    }
  ): Promise<boolean> {
    try {
      if (!this.hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Permisos de ubicación no concedidos');
        }
      }

      // Detener cualquier seguimiento previo
      await this.stopWatching();

      console.log('📍 Iniciando seguimiento de ubicación...');

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: options?.accuracy || Location.Accuracy.High,
          distanceInterval: options?.distanceInterval || 10, // Actualizar cada 10 metros
          timeInterval: options?.timeInterval || 15000, // Actualizar cada 15 segundos
        },
        (location) => {
          const result: LocationResult = {
            coords: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              heading: location.coords.heading,
              speed: location.coords.speed,
            },
            timestamp: location.timestamp,
          };

          console.log('📍 Ubicación actualizada:', result.coords.latitude, result.coords.longitude);
          onLocationUpdate(result);
        }
      );

      console.log('✅ Seguimiento de ubicación iniciado');
      return true;
    } catch (error: any) {
      console.error('❌ Error iniciando seguimiento:', error);
      if (onError) {
        onError(error);
      }
      return false;
    }
  }

  /**
   * Detiene el seguimiento de ubicación
   */
  async stopWatching(): Promise<void> {
    if (this.watchSubscription) {
      console.log('🛑 Deteniendo seguimiento de ubicación');
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  /**
   * Calcula la distancia entre dos coordenadas (en metros)
   * Usa la fórmula de Haversine
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convierte grados a radianes
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Formatea la distancia para mostrar al usuario
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Verifica si la ubicación tiene buena precisión
   */
  hasGoodAccuracy(accuracy: number | null): boolean {
    if (accuracy === null) return false;
    // Considerar buena precisión si es menor a 50 metros
    return accuracy < 50;
  }
}

// Exportar instancia singleton
export const locationService = new LocationService();
