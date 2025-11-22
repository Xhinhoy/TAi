/**
 * Barra de estado superior que muestra información de la sesión activa
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SessionInfo } from '../../../types/exploration';

interface SessionStatusBarProps {
  sessionInfo: SessionInfo;
  isPaused: boolean;
}

export const SessionStatusBar: React.FC<SessionStatusBarProps> = ({ sessionInfo, isPaused }) => {
  const {
    time_remaining_minutes,
    alerts_remaining,
    places_discovered,
    distance_walked_km,
  } = sessionInfo;

  // Determinar color según el tiempo restante
  const getTimeColor = () => {
    if (time_remaining_minutes <= 5) return '#ef4444'; // Rojo
    if (time_remaining_minutes <= 15) return '#f59e0b'; // Naranja
    return '#10b981'; // Verde
  };

  // Determinar color según alertas restantes
  const getAlertsColor = () => {
    if (alerts_remaining <= 3) return '#ef4444';
    if (alerts_remaining <= 10) return '#f59e0b';
    return '#10b981';
  };

  return (
    <View style={[styles.container, isPaused && styles.containerPaused]}>
      {isPaused && (
        <View style={styles.pausedBanner}>
          <Text style={styles.pausedText}>⏸️ Sesión Pausada</Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        {/* Tiempo restante */}
        <View style={styles.stat}>
          <Text style={styles.statIcon}>⏱️</Text>
          <View>
            <Text style={styles.statValue} numberOfLines={1}>
              {time_remaining_minutes}m
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Tiempo
            </Text>
          </View>
        </View>

        {/* Alertas restantes */}
        <View style={styles.stat}>
          <Text style={styles.statIcon}>🔔</Text>
          <View>
            <Text style={[styles.statValue, { color: getAlertsColor() }]} numberOfLines={1}>
              {alerts_remaining}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Alertas
            </Text>
          </View>
        </View>

        {/* Lugares descubiertos */}
        <View style={styles.stat}>
          <Text style={styles.statIcon}>📍</Text>
          <View>
            <Text style={styles.statValue} numberOfLines={1}>
              {places_discovered}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Lugares
            </Text>
          </View>
        </View>

        {/* Distancia caminada */}
        <View style={styles.stat}>
          <Text style={styles.statIcon}>🚶</Text>
          <View>
            <Text style={styles.statValue} numberOfLines={1}>
              {distance_walked_km.toFixed(1)}km
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Distancia
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  containerPaused: {
    backgroundColor: '#fef3c7',
    borderBottomColor: '#f59e0b',
  },
  pausedBanner: {
    backgroundColor: '#fbbf24',
    paddingVertical: 4,
    alignItems: 'center',
  },
  pausedText: {
    color: '#78350f',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: -2,
  },
});
