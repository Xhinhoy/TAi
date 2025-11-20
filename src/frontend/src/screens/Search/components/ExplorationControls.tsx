/**
 * Controles flotantes para gestionar la sesión de exploración
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface ExplorationControlsProps {
  isActive: boolean;
  isPaused: boolean;
  isLoading: boolean;
  onStart: () => void;
  onEnd: () => void;
  onTogglePause: () => void;
}

export const ExplorationControls: React.FC<ExplorationControlsProps> = ({
  isActive,
  isPaused,
  isLoading,
  onStart,
  onEnd,
  onTogglePause,
}) => {
  if (!isActive) {
    // Botón para iniciar exploración
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.button, styles.buttonStart]}
          onPress={onStart}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>🗺️</Text>
          <Text style={styles.buttonText}>
            {isLoading ? 'Iniciando...' : 'Modo Exploración'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Controles cuando hay sesión activa
  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        {/* Botón pausar/reanudar */}
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonSecondary,
            isPaused && styles.buttonResume,
          ]}
          onPress={() => {
            console.log('🔘 Botón pausar/reanudar presionado');
            onTogglePause();
          }}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>{isPaused ? '▶️' : '⏸️'}</Text>
          <Text style={styles.buttonTextSecondary}>
            {isPaused ? 'Reanudar' : 'Pausar'}
          </Text>
        </TouchableOpacity>

        {/* Botón finalizar */}
        <TouchableOpacity
          style={[styles.button, styles.buttonEnd]}
          onPress={() => {
            console.log('🔘 Botón finalizar presionado');
            onEnd();
          }}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>🏁</Text>
          <Text style={styles.buttonTextSecondary}>Finalizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        zIndex: 1000,
      },
    }),
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    }),
  },
  buttonStart: {
    backgroundColor: '#10b981',
    flex: 1,
  },
  buttonSecondary: {
    backgroundColor: '#f59e0b',
    flex: 1,
  },
  buttonResume: {
    backgroundColor: '#3b82f6',
  },
  buttonEnd: {
    backgroundColor: '#ef4444',
    flex: 1,
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
