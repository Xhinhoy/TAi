/**
 * Pantalla de Exploración
 * Modo de descubrimiento en tiempo real mientras caminas
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert as RNAlert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useExplorationSession } from '../../hooks/useExplorationSession';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { SessionStatusBar } from './components/SessionStatusBar';
import { ExplorationControls } from './components/ExplorationControls';
import { AlertsCarousel } from './components/AlertsCarousel';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { ExplorationMap } from './components/ExplorationMap';
import { Alert, SessionSummary } from '../../types/exploration';
import { NearbyPlacesMap } from '../../components/Map/NearbyPlacesMap';
import { Place } from '../../types/domain';

export default function Search() {
  const { user } = useAuth();

  // Estados locales
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Hook de sesión de exploración
  const {
    isActive,
    isPaused,
    alerts,
    sessionInfo,
    isLoading: sessionLoading,
    error: sessionError,
    startSession,
    endSession,
    togglePause,
    sendLocation,
    recordInteraction,
    dismissAlert,
  } = useExplorationSession(user?.uid || '');

  // Hook de tracking de ubicación
  const {
    location,
    hasPermission,
    requestPermission,
    startTracking,
    stopTracking,
    getCurrentLocation,
  } = useLocationTracking();

  // Obtener ubicación inicial
  useEffect(() => {
    const initLocation = async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      await getCurrentLocation();
      setMapReady(true);
    };

    initLocation();
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (isActive) {
        stopTracking();
      }
    };
  }, [isActive]);

  /**
   * Inicia el modo de exploración
   */
  const handleStartExploration = async () => {
    try {
      // Verificar permisos
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          RNAlert.alert(
            'Permisos Requeridos',
            'Necesitamos acceso a tu ubicación para el modo exploración',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Iniciar sesión de exploración
      console.log('🚀 Iniciando modo de exploración...');
      await startSession(120, 20); // 2 horas, 20 alertas

      // Iniciar tracking de ubicación
      const trackingStarted = await startTracking({
        distanceInterval: 10, // Actualizar cada 10 metros
        timeInterval: 15000, // Actualizar cada 15 segundos
        onLocationUpdate: (loc) => {
          console.log('📍 Nueva ubicación:', loc.coords.latitude, loc.coords.longitude);
          sendLocation(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy || undefined);
        },
      });

      if (trackingStarted) {
        RNAlert.alert(
          'Modo Exploración Activado',
          'Camina y descubre lugares increíbles cerca de ti!',
          [{ text: 'Entendido' }]
        );
      } else {
        throw new Error('No se pudo iniciar el tracking de ubicación');
      }
    } catch (error: any) {
      console.error('❌ Error iniciando exploración:', error);
      RNAlert.alert(
        'Error',
        error.message || 'No se pudo iniciar el modo de exploración',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Finaliza el modo de exploración
   */
  const handleEndExploration = async () => {
    console.log('🔴 handleEndExploration llamado');

    // En web, usar window.confirm en lugar de RNAlert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres finalizar la sesión de exploración?'
      );

      if (!confirmed) {
        console.log('❌ Usuario canceló finalizar');
        return;
      }

      try {
        console.log('🏁 Finalizando sesión...');

        // Detener tracking
        await stopTracking();

        // Finalizar sesión en backend
        const summaryData = await endSession();

        if (summaryData) {
          setSummary(summaryData);
          setShowSummary(true);
        }
      } catch (error: any) {
        console.error('❌ Error finalizando sesión:', error);
        alert('Error: No se pudo finalizar la sesión');
      }
      return;
    }

    // Para móvil, usar RNAlert normal
    RNAlert.alert(
      'Finalizar Sesión',
      '¿Estás seguro de que quieres finalizar la sesión de exploración?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => console.log('❌ Usuario canceló finalizar'),
        },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🏁 Finalizando sesión...');

              // Detener tracking
              await stopTracking();

              // Finalizar sesión en backend
              const summaryData = await endSession();

              if (summaryData) {
                setSummary(summaryData);
                setShowSummary(true);
              }
            } catch (error: any) {
              console.error('❌ Error finalizando sesión:', error);
              RNAlert.alert('Error', 'No se pudo finalizar la sesión', [{ text: 'OK' }]);
            }
          },
        },
      ]
    );
  };

  /**
   * Alterna entre pausar y reanudar
   */
  const handleTogglePause = async () => {
    console.log('⏯️ handleTogglePause llamado, isPaused actual:', isPaused);
    try {
      await togglePause();

      if (isPaused) {
        // Se está reanudando
        console.log('▶️ Reanudando tracking...');
        await startTracking({
          distanceInterval: 10,
          timeInterval: 15000,
          onLocationUpdate: (loc) => {
            sendLocation(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy || undefined);
          },
        });
      } else {
        // Se está pausando
        console.log('⏸️ Pausando tracking...');
        await stopTracking();
      }
    } catch (error) {
      console.error('❌ Error pausando/reanudando:', error);
    }
  };

  /**
   * Handler cuando el usuario toca una alerta
   */
  const handleAlertTap = async (alert: Alert) => {
    console.log('👆 Usuario tocó alerta:', alert.place.name);
    await recordInteraction(alert.id, 'tapped');

    // Mostrar detalles del lugar
    RNAlert.alert(
      alert.place.name,
      `${alert.message}\n\nDirección: ${alert.place.address}\nRating: ${alert.place.rating}/5`,
      [
        {
          text: 'Cerrar',
          style: 'cancel',
        },
        {
          text: 'Ver en Mapa',
          onPress: () => {
            console.log('Centrar mapa en:', alert.place.coords);
          },
        },
      ]
    );
  };

  /**
   * Handler cuando el usuario guarda una alerta
   */
  const handleSaveAlert = async (alertId: string) => {
    await recordInteraction(alertId, 'saved');
    RNAlert.alert('Guardado', 'Lugar guardado en tus favoritos', [{ text: 'OK' }]);
  };

  /**
   * Handler cuando el usuario descarta una alerta
   */
  const handleDismissAlert = async (alertId: string) => {
    dismissAlert(alertId);
  };

  /**
   * Handler para iniciar nueva sesión desde el modal de resumen
   */
  const handleNewSessionFromSummary = () => {
    setShowSummary(false);
    setSummary(null);
    handleStartExploration();
  };

  // Verificar autenticación
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Debes iniciar sesión para usar el modo exploración</Text>
        </View>
      </View>
    );
  }

  // Mostrar loading mientras carga el mapa
  if (!mapReady) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de estado de sesión (solo si está activa) */}
      {isActive && sessionInfo && (
        <SessionStatusBar sessionInfo={sessionInfo} isPaused={isPaused} />
      )}

      {/* Mapa - Mostrar NearbyPlacesMap cuando NO está en exploración */}
      {!isActive ? (
        <NearbyPlacesMap
          userLocation={
            location.latitude && location.longitude
              ? { latitude: location.latitude, longitude: location.longitude }
              : null
          }
          radius={1000}
          onPlaceSelect={(place: Place) => {
            console.log('Lugar seleccionado:', place.name);
            // Aquí puedes navegar a detalles del lugar
          }}
        />
      ) : (
        <ExplorationMap
          userLocation={
            location.latitude && location.longitude
              ? { latitude: location.latitude, longitude: location.longitude }
              : null
          }
          alerts={alerts}
          onAlertPress={handleAlertTap}
        />
      )}

      {/* Banner de error (si existe) */}
      {sessionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {sessionError}</Text>
        </View>
      )}

      {/* Carrusel de alertas (solo si hay sesión activa y alertas) */}
      {isActive && alerts.length > 0 && (
        <AlertsCarousel
          alerts={alerts}
          onAlertTap={handleAlertTap}
          onDismiss={handleDismissAlert}
          onSave={handleSaveAlert}
        />
      )}

      {/* Controles de exploración */}
      <ExplorationControls
        isActive={isActive}
        isPaused={isPaused}
        isLoading={sessionLoading}
        onStart={handleStartExploration}
        onEnd={handleEndExploration}
        onTogglePause={handleTogglePause}
      />

      {/* Modal de resumen */}
      <SessionSummaryModal
        visible={showSummary}
        summary={summary}
        onClose={() => setShowSummary(false)}
        onNewSession={handleNewSessionFromSummary}
      />

      {/* Indicador de tracking */}
      {isActive && !isPaused && (
        <View style={styles.trackingIndicator}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Explorando...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 16,
    right: 16,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    ...Platform.select({
      web: {
        zIndex: 1001,
      },
    }),
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991b1b',
    textAlign: 'center',
  },
  trackingIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1001,
      },
    }),
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  trackingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
