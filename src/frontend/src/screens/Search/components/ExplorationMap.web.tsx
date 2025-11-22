/**
 * Mapa de exploración para WEB
 * Versión alternativa que no usa react-native-maps
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Alert } from '../../../types/exploration';

interface ExplorationMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  alerts: Alert[];
  onAlertPress?: (alert: Alert) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export const ExplorationMap: React.FC<ExplorationMapProps> = ({
  userLocation,
  alerts,
  onAlertPress,
  initialRegion,
}) => {
  const latitude = userLocation?.latitude || initialRegion?.latitude || -33.4489;
  const longitude = userLocation?.longitude || initialRegion?.longitude || -70.6693;

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>
          Mapa de Exploración
        </Text>
        <Text style={styles.coordsText}>
          Ubicación: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
        {alerts.length > 0 && (
          <View style={styles.alertsContainer}>
            <Text style={styles.alertsTitle}>Alertas cercanas: {alerts.length}</Text>
            {alerts.slice(0, 3).map((alert, index) => (
              <View key={alert.id} style={styles.alertItem}>
                <View
                  style={[
                    styles.alertDot,
                    { backgroundColor: getPriorityColor(alert.priority) },
                  ]}
                />
                <Text style={styles.alertName}>{alert.place.name}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.noteText}>
          💡 El mapa interactivo está disponible en la app móvil
        </Text>
      </View>
    </View>
  );
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#3b82f6';
    default:
      return '#3b82f6';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  coordsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  alertsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  alertName: {
    fontSize: 14,
    color: '#666',
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    marginTop: 30,
    textAlign: 'center',
  },
});
