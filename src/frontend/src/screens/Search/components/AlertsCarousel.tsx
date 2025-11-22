/**
 * Carrusel horizontal de alertas de lugares
 */

import React, { useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Platform, Dimensions } from 'react-native';
import { Alert } from '../../../types/exploration';
import { PlaceAlertCard } from './PlaceAlertCard';

interface AlertsCarouselProps {
  alerts: Alert[];
  onAlertTap: (alert: Alert) => void;
  onDismiss: (alertId: string) => void;
  onSave?: (alertId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export const AlertsCarousel: React.FC<AlertsCarouselProps> = ({
  alerts,
  onAlertTap,
  onDismiss,
  onSave,
}) => {
  const flatListRef = useRef<FlatList>(null);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header con contador */}
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Lugares Cercanos</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{alerts.length}</Text>
        </View>
      </View>

      {/* Carrusel */}
      <FlatList
        ref={flatListRef}
        data={alerts}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <PlaceAlertCard
              alert={item}
              onTap={() => onAlertTap(item)}
              onDismiss={() => onDismiss(item.id)}
              onSave={onSave ? () => onSave(item.id) : undefined}
            />
          </View>
        )}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    ...Platform.select({
      web: {
        zIndex: 999,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingRight: 16,
  },
});
