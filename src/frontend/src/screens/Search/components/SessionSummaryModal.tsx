/**
 * Modal que muestra el resumen de una sesión de exploración finalizada
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SessionSummary } from '../../../types/exploration';

interface SessionSummaryModalProps {
  visible: boolean;
  summary: SessionSummary | null;
  onClose: () => void;
  onNewSession?: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  visible,
  summary,
  onClose,
  onNewSession,
}) => {
  if (!summary) return null;

  const {
    duration_minutes,
    places_discovered,
    alerts_generated,
    alerts_interacted,
    distance_walked_km,
    estimated_cost,
    message,
  } = summary;

  // Calcular tasa de interacción
  const engagementRate =
    alerts_generated > 0 ? ((alerts_interacted / alerts_generated) * 100).toFixed(0) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerIcon}>🎉</Text>
              <Text style={styles.title}>Sesión Completada</Text>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Estadísticas */}
            <View style={styles.statsGrid}>
              {/* Duración */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>⏱️</Text>
                <Text style={styles.statValue}>{duration_minutes}</Text>
                <Text style={styles.statLabel}>Minutos</Text>
              </View>

              {/* Lugares */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📍</Text>
                <Text style={styles.statValue}>{places_discovered}</Text>
                <Text style={styles.statLabel}>Lugares</Text>
              </View>

              {/* Distancia */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🚶</Text>
                <Text style={styles.statValue}>{distance_walked_km}</Text>
                <Text style={styles.statLabel}>Kilómetros</Text>
              </View>

              {/* Interacción */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>👆</Text>
                <Text style={styles.statValue}>{engagementRate}%</Text>
                <Text style={styles.statLabel}>Interacción</Text>
              </View>
            </View>

            {/* Detalles adicionales */}
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Alertas generadas:</Text>
                <Text style={styles.detailValue}>{alerts_generated}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Alertas exploradas:</Text>
                <Text style={styles.detailValue}>{alerts_interacted}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Costo estimado:</Text>
                <Text style={styles.detailValue}>{estimated_cost}</Text>
              </View>
            </View>

            {/* Acciones */}
            <View style={styles.actions}>
              {onNewSession && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={() => {
                    onClose();
                    onNewSession();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonTextPrimary}>🔄 Nueva Sesión</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonTextSecondary}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      },
    }),
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  details: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
