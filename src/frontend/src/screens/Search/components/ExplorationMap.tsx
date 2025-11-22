/**
 * Mapa de exploración con marcadores de alertas
 * Compatible con React Native Maps y Web
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Alert } from '../../../types/exploration';

interface ExplorationMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  alerts: Alert[];
  onAlertPress?: (alert: Alert) => void;
  initialRegion?: Region;
}

export const ExplorationMap: React.FC<ExplorationMapProps> = ({
  userLocation,
  alerts,
  onAlertPress,
  initialRegion,
}) => {
  const mapRef = useRef<MapView>(null);

  // Centrar mapa en ubicación del usuario cuando cambia
  useEffect(() => {
    if (userLocation && mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [userLocation]);

  const getMarkerColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '#ef4444'; // Rojo
      case 'medium':
        return '#f59e0b'; // Naranja
      case 'low':
        return '#3b82f6'; // Azul
      default:
        return '#3b82f6';
    }
  };

  const defaultRegion: Region = initialRegion || {
    latitude: userLocation?.latitude || -33.4489,
    longitude: userLocation?.longitude || -70.6693,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // En web, mostrar un placeholder hasta que se implemente Google Maps Web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webPlaceholder}>
          <Text style={styles.placeholderTitle}>🗺️ Mapa de Exploración</Text>
          <Text style={styles.placeholderText}>
            Ubicación: {userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Esperando ubicación...'}
          </Text>
          {alerts.length > 0 && (
            <Text style={styles.placeholderText}>
              📍 {alerts.length} lugares cercanos detectados
            </Text>
          )}
          <Text style={styles.placeholderHint}>
            💡 El mapa interactivo está disponible en la aplicación móvil
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsBuildings
        showsTraffic={false}
        loadingEnabled
      >
        {/* Marcadores de alertas */}
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            coordinate={{
              latitude: alert.place.coords.latitude,
              longitude: alert.place.coords.longitude,
            }}
            title={alert.place.name}
            description={alert.message}
            pinColor={getMarkerColor(alert.priority)}
            onPress={() => onAlertPress && onAlertPress(alert)}
          >
            {/* Custom callout con rating */}
            <View style={styles.markerContainer}>
              <View
                style={[
                  styles.marker,
                  { backgroundColor: getMarkerColor(alert.priority) },
                ]}
              >
                <View style={styles.markerInner} />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f3f4f6',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
