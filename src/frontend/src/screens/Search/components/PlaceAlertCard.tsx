/**
 * Tarjeta individual para mostrar una alerta de lugar
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Alert } from '../../../types/exploration';

interface PlaceAlertCardProps {
  alert: Alert;
  onTap: () => void;
  onDismiss: () => void;
  onSave?: () => void;
}

export const PlaceAlertCard: React.FC<PlaceAlertCardProps> = ({
  alert,
  onTap,
  onDismiss,
  onSave,
}) => {
  const { place, distance_meters, priority, message, match_score, estimated_time_minutes } = alert;

  // Formatear distancia
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Obtener color según prioridad
  const getPriorityColor = (): string => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  // Renderizar estrellas de rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Text key={`full-${i}`} style={styles.star}>⭐</Text>);
    }
    if (hasHalfStar) {
      stars.push(<Text key="half" style={styles.star}>⭐</Text>);
    }

    return stars;
  };

  // Renderizar indicador de precio
  const renderPriceLevel = (level: number) => {
    return '💰'.repeat(Math.max(1, Math.min(level, 4)));
  };

  return (
    <View style={styles.container}>
      {/* Indicador de prioridad */}
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor() }]} />

      {/* Imagen del lugar */}
      {place.photos && place.photos.length > 0 ? (
        <Image source={{ uri: place.photos[0] }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>📷</Text>
        </View>
      )}

      {/* Contenido */}
      <View style={styles.content}>
        {/* Nombre y distancia */}
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {place.name}
          </Text>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{formatDistance(distance_meters)}</Text>
          </View>
        </View>

        {/* Rating y precio */}
        <View style={styles.infoRow}>
          <View style={styles.rating}>
            {renderStars(place.rating)}
            <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
          </View>
          {place.price_level > 0 && (
            <Text style={styles.priceLevel}>{renderPriceLevel(place.price_level)}</Text>
          )}
        </View>

        {/* Mensaje personalizado */}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        {/* Tiempo estimado y categorías */}
        <View style={styles.footer}>
          <Text style={styles.timeEstimate}>🚶 {estimated_time_minutes} min</Text>
          {place.categories && place.categories.length > 0 && (
            <Text style={styles.category} numberOfLines={1}>
              {place.categories[0]}
            </Text>
          )}
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.actionButtonText}>Omitir</Text>
          </TouchableOpacity>

          {onSave && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={onSave}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonTextSecondary}>💾 Guardar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={onTap}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonTextPrimary}>Ver más</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Match score indicator */}
      <View style={styles.matchScoreContainer}>
        <View style={[styles.matchScoreBar, { width: `${match_score * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  priorityIndicator: {
    height: 4,
    width: '100%',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  priceLevel: {
    fontSize: 14,
  },
  message: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  timeEstimate: {
    fontSize: 13,
    color: '#6b7280',
  },
  category: {
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  actionButtonSecondary: {
    backgroundColor: '#dbeafe',
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  matchScoreContainer: {
    height: 3,
    width: '100%',
    backgroundColor: '#e5e7eb',
  },
  matchScoreBar: {
    height: '100%',
    backgroundColor: '#10b981',
  },
});
