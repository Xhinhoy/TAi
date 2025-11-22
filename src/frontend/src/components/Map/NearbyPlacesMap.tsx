/**
 * Mapa Interactivo con Lugares Cercanos
 * Muestra lugares de interés cerca de la ubicación del usuario
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { placesService } from '../../api/services';
import { Place } from '../../types/domain';

interface NearbyPlacesMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  radius?: number; // Radio en metros
  onPlaceSelect?: (place: Place) => void;
  customPlaces?: Place[]; // Lugares personalizados (opcional)
}

export const NearbyPlacesMap: React.FC<NearbyPlacesMapProps> = ({
  userLocation,
  radius = 1000,
  onPlaceSelect,
  customPlaces,
}) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'restaurant', name: 'Restaurantes', icon: 'silverware-fork-knife' },
    { id: 'cafe', name: 'Cafés', icon: 'coffee' },
    { id: 'museum', name: 'Museos', icon: 'bank' },
    { id: 'park', name: 'Parques', icon: 'tree' },
    { id: 'shopping_mall', name: 'Compras', icon: 'shopping' },
    { id: 'tourist_attraction', name: 'Atracciones', icon: 'star' },
  ];

  // Si hay lugares personalizados, usarlos directamente
  useEffect(() => {
    if (customPlaces) {
      setNearbyPlaces(customPlaces);
      setLoading(false);
    } else if (userLocation) {
      loadNearbyPlaces();
    }
  }, [userLocation, selectedCategory, customPlaces]);

  const loadNearbyPlaces = async () => {
    if (!userLocation) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🗺️ Buscando lugares cercanos...');

      const places = await placesService.searchNearby({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius,
        type: selectedCategory || undefined,
      });

      console.log(`✅ Encontrados ${places.length} lugares cercanos`);
      setNearbyPlaces(places);
    } catch (err: any) {
      console.error('❌ Error cargando lugares:', err);
      setError('No se pudieron cargar los lugares cercanos');
    } finally {
      setLoading(false);
    }
  };

  if (!userLocation) {
    return (
      <View style={styles.centerContent}>
        <MaterialCommunityIcons
          name="map-marker-off"
          size={48}
          color={theme.colors.text.tertiary}
        />
        <Text style={styles.emptyText}>
          Ubicación no disponible
        </Text>
        <Text style={styles.emptySubtext}>
          Activa los permisos de ubicación para ver lugares cercanos
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Categorías - Solo mostrar si NO hay lugares personalizados */}
      {!customPlaces && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === null && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <MaterialCommunityIcons
              name="all-inclusive"
              size={16}
              color={selectedCategory === null ? theme.colors.primary.main : theme.colors.text.secondary}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === null && styles.categoryTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={16}
                color={
                  selectedCategory === category.id
                    ? theme.colors.primary.main
                    : theme.colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Mapa con marcadores */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {/* Marcadores de lugares */}
          {nearbyPlaces.map((place, index) => {
            const coords = place.coords || place.coordinates || { lat: 0, lng: 0 };
            const latitude = coords.lat || coords.latitude || 0;
            const longitude = coords.lng || coords.longitude || 0;

            // Validar que las coordenadas sean válidas
            if (!latitude || !longitude) return null;

            return (
              <Marker
                key={place.id || place.place_id || index}
                coordinate={{
                  latitude,
                  longitude,
                }}
                title={String(place.name || 'Lugar')}
                description={String(place.description || place.address || 'Sin descripción')}
                onPress={() => onPlaceSelect && onPlaceSelect(place)}
              >
                <View style={styles.markerContainer}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={32}
                    color={theme.colors.primary.main}
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>

      {/* Lista de Lugares Cercanos */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Cargando lugares cercanos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={48}
            color={theme.colors.error.main}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadNearbyPlaces}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : nearbyPlaces.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="map-marker-off"
            size={48}
            color={theme.colors.text.tertiary}
          />
          <Text style={styles.emptyText}>No hay lugares cercanos</Text>
          <Text style={styles.emptySubtext}>
            Intenta con otra categoría o aumenta el radio de búsqueda
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.placesList}>
          {nearbyPlaces.map((place, index) => (
            <TouchableOpacity
              key={place.id || place.place_id || index}
              style={styles.placeCard}
              onPress={() => onPlaceSelect?.(place)}
            >
              <View style={styles.placeIcon}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={24}
                  color={theme.colors.primary.main}
                />
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.name || 'Lugar sin nombre'}
                </Text>
                {place.address && (
                  <Text style={styles.placeAddress} numberOfLines={1}>
                    {place.address}
                  </Text>
                )}
                {place.rating && (
                  <View style={styles.placeRating}>
                    <MaterialCommunityIcons
                      name="star"
                      size={12}
                      color="#FFD700"
                    />
                    <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                    {place.distance && (
                      <>
                        <Text style={styles.separator}>•</Text>
                        <Text style={styles.distanceText}>
                          {place.distance < 1000
                            ? `${Math.round(place.distance)}m`
                            : `${(place.distance / 1000).toFixed(1)}km`}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.colors.text.tertiary}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  categoriesContainer: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  categoriesContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface.secondary,
    marginRight: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  categoryTextActive: {
    color: theme.colors.primary.main,
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placesList: {
    flex: 1,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  separator: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  distanceText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error.main,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.radius.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
});
