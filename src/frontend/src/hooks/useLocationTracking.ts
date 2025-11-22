/**
 * Hook para el seguimiento de ubicación del usuario
 * Maneja permisos y actualizaciones en tiempo real
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert as RNAlert } from 'react-native';
import { locationService, LocationResult } from '../services/locationService';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

interface UseLocationTrackingReturn {
  location: LocationState;
  isTracking: boolean;
  hasPermission: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  startTracking: (options?: TrackingOptions) => Promise<boolean>;
  stopTracking: () => Promise<void>;
  getCurrentLocation: () => Promise<void>;
}

interface TrackingOptions {
  distanceInterval?: number;
  timeInterval?: number;
  onLocationUpdate?: (location: LocationResult) => void;
}

export const useLocationTracking = (): UseLocationTrackingReturn => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  });
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackingOptionsRef = useRef<TrackingOptions | null>(null);

  /**
   * Solicita permisos de ubicación
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const granted = await locationService.requestPermissions();

      if (!granted) {
        setError('Permisos de ubicación denegados');

        // Mostrar alerta al usuario
        if (Platform.OS !== 'web') {
          RNAlert.alert(
            'Permisos Requeridos',
            'La app necesita acceso a tu ubicación para mostrarte lugares cercanos.',
            [
              {
                text: 'OK',
                onPress: () => {},
              },
            ]
          );
        }
      }

      setHasPermission(granted);
      return granted;
    } catch (err: any) {
      console.error('❌ Error solicitando permisos:', err);
      setError(err.message || 'Error al solicitar permisos');
      return false;
    }
  }, []);

  /**
   * Obtiene la ubicación actual una sola vez
   */
  const getCurrentLocation = useCallback(async () => {
    try {
      setError(null);

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return;
      }

      const result = await locationService.getCurrentLocation();

      if (result) {
        setLocation({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy,
          timestamp: result.timestamp,
        });
        console.log('📍 Ubicación obtenida:', result.coords);
      } else {
        setError('No se pudo obtener la ubicación');
      }
    } catch (err: any) {
      console.error('❌ Error obteniendo ubicación:', err);
      setError(err.message || 'Error al obtener ubicación');
    }
  }, [hasPermission, requestPermission]);

  /**
   * Inicia el seguimiento continuo de ubicación
   */
  const startTracking = useCallback(
    async (options?: TrackingOptions): Promise<boolean> => {
      try {
        setError(null);

        if (!hasPermission) {
          const granted = await requestPermission();
          if (!granted) return false;
        }

        // Guardar opciones para usar en el callback
        trackingOptionsRef.current = options || null;

        const success = await locationService.startWatching(
          (result: LocationResult) => {
            // Actualizar estado local
            setLocation({
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
              accuracy: result.coords.accuracy,
              timestamp: result.timestamp,
            });

            // Llamar callback externo si existe
            if (trackingOptionsRef.current?.onLocationUpdate) {
              trackingOptionsRef.current.onLocationUpdate(result);
            }
          },
          (err: Error) => {
            console.error('❌ Error en seguimiento:', err);
            setError(err.message);
          },
          {
            distanceInterval: options?.distanceInterval,
            timeInterval: options?.timeInterval,
          }
        );

        setIsTracking(success);
        return success;
      } catch (err: any) {
        console.error('❌ Error iniciando seguimiento:', err);
        setError(err.message || 'Error al iniciar seguimiento');
        return false;
      }
    },
    [hasPermission, requestPermission]
  );

  /**
   * Detiene el seguimiento de ubicación
   */
  const stopTracking = useCallback(async () => {
    try {
      await locationService.stopWatching();
      setIsTracking(false);
      console.log('🛑 Seguimiento detenido');
    } catch (err: any) {
      console.error('❌ Error deteniendo seguimiento:', err);
      setError(err.message || 'Error al detener seguimiento');
    }
  }, []);

  /**
   * Verificar permisos al montar
   */
  useEffect(() => {
    const checkPermissions = async () => {
      const granted = await locationService.hasLocationPermission();
      setHasPermission(granted);
    };

    checkPermissions();
  }, []);

  /**
   * Cleanup al desmontar
   */
  useEffect(() => {
    return () => {
      if (isTracking) {
        locationService.stopWatching();
      }
    };
  }, [isTracking]);

  return {
    location,
    isTracking,
    hasPermission,
    error,
    requestPermission,
    startTracking,
    stopTracking,
    getCurrentLocation,
  };
};
