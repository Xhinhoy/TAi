/**
 * Pantalla de Búsqueda/Exploración
 * Muestra un mapa con lugares relevantes según los intereses del usuario
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert as RNAlert,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { usePreferences } from '../../contexts/PreferencesContext';
import { NearbyPlacesMap } from '../../components/Map/NearbyPlacesMap';
import { Place } from '../../types/domain';
import { placesService } from '../../api/services';
import { ReviewModal } from '../../components/ReviewModal';
import { reviewsService } from '../../services/reviews.service';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import * as Location from 'expo-location';

export default function Search() {
  const { user } = useAuth();
  const { preferences } = usePreferences();

  // Estados locales
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [relevantPlaces, setRelevantPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  // Estados para modal de reseñas
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<any>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Estados para modal de escritura de reseñas
  const [writeReviewModalVisible, setWriteReviewModalVisible] = useState(false);
  const [reviewPlaceId, setReviewPlaceId] = useState<string>('');
  const [reviewPlaceName, setReviewPlaceName] = useState<string>('');

  // Mapeo de intereses a tipos de Google Places
  const INTEREST_TO_PLACE_TYPE: Record<string, string> = {
    naturaleza: 'park',
    aventura: 'tourist_attraction',
    gastronomia: 'restaurant',
    cultura: 'museum',
    compras: 'shopping_mall',
    relax: 'spa',
    playa: 'beach',
    historia: 'museum',
    vida_nocturna: 'night_club',
    deportes: 'stadium',
  };

  // Solicitar permisos de ubicación
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setHasPermission(status === 'granted');

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }

        setMapReady(true);
      } catch (error) {
        console.error('Error solicitando permisos de ubicación:', error);
        setMapReady(true);
      }
    };

    requestLocationPermission();
  }, []);

  // Cargar lugares relevantes según intereses del usuario
  useEffect(() => {
    const loadRelevantPlaces = async () => {
      if (!userLocation || preferences.interests.length === 0) {
        setRelevantPlaces([]);
        return;
      }

      setLoadingPlaces(true);

      try {
        const allPlaces: Place[] = [];

        // Buscar lugares para cada interés del usuario
        for (const interest of preferences.interests.slice(0, 3)) {
          const placeType = INTEREST_TO_PLACE_TYPE[interest];
          if (!placeType) continue;

          try {
            const places = await placesService.search({
              lat: userLocation.latitude,
              lng: userLocation.longitude,
              radius: 5000, // 5km
              place_type: placeType,
            });

            if (places && places.length > 0) {
              allPlaces.push(...places.slice(0, 10));
            }
          } catch (error) {
            console.error(`Error buscando lugares para ${interest}:`, error);
          }
        }

        // Eliminar duplicados por place_id
        const uniquePlaces = Array.from(
          new Map(allPlaces.map(place => [place.place_id || place.id, place])).values()
        );

        setRelevantPlaces(uniquePlaces);
        console.log(`✅ Cargados ${uniquePlaces.length} lugares relevantes`);
      } catch (error) {
        console.error('Error cargando lugares relevantes:', error);
        setRelevantPlaces([]);
      } finally {
        setLoadingPlaces(false);
      }
    };

    loadRelevantPlaces();
  }, [userLocation, preferences.interests]);

  /**
   * Mostrar detalles y reseñas de un lugar
   */
  const showPlaceReviews = async (placeData: any, placeName: string) => {
    const placeId = placeData.place_id || placeData.placeId || placeData.google_place_id || placeData.id;

    if (!placeId) {
      RNAlert.alert('Lugar sin detalles', 'No se encontró información para este lugar.');
      return;
    }

    setLoadingReviews(true);
    setReviewsModalVisible(true);

    try {
      // Obtener detalles del lugar desde Google Places
      const details = await placesService.getDetails(placeId);

      // Obtener reseñas combinadas (Google + internas)
      let combinedReviews = details.reviews || [];
      try {
        const reviewsData = await reviewsService.getPlaceReviews(placeId);
        combinedReviews = reviewsData.reviews || [];
      } catch (reviewError) {
        console.log('No se pudieron cargar reseñas internas, usando solo Google:', reviewError);
      }

      setSelectedPlaceDetails({
        ...details,
        displayTitle: details?.name || placeName,
        reviews: combinedReviews,
        place_id: placeId,
      });
      setLoadingReviews(false);
    } catch (error: any) {
      setLoadingReviews(false);
      const status = error?.response?.status;
      if (status === 404) {
        setSelectedPlaceDetails({
          displayTitle: placeName,
          error: 'No se encontraron detalles para este lugar.',
        });
      } else {
        setSelectedPlaceDetails({
          displayTitle: placeName,
          error: 'No se pudo cargar la información. Inténtalo de nuevo más tarde.',
        });
      }
      console.error('Error obteniendo detalles del lugar:', error);
    }
  };

  /**
   * Handler para abrir modal de escritura de reseña
   */
  const handleOpenWriteReview = () => {
    if (!selectedPlaceDetails?.place_id) {
      RNAlert.alert('Error', 'No se puede escribir una reseña para este lugar.');
      return;
    }

    setReviewPlaceId(selectedPlaceDetails.place_id);
    setReviewPlaceName(selectedPlaceDetails.displayTitle || selectedPlaceDetails.name || 'Lugar');
    setWriteReviewModalVisible(true);
  };

  /**
   * Handler para cuando se cierra el modal de escritura de reseña
   */
  const handleReviewModalClose = async (refreshReviews: boolean) => {
    setWriteReviewModalVisible(false);

    // Si se escribió una reseña, recargar las reseñas del lugar
    if (refreshReviews && selectedPlaceDetails?.place_id) {
      try {
        const reviewsData = await reviewsService.getPlaceReviews(selectedPlaceDetails.place_id);
        setSelectedPlaceDetails({
          ...selectedPlaceDetails,
          reviews: reviewsData.reviews || [],
        });
      } catch (error) {
        console.error('Error recargando reseñas:', error);
      }
    }
  };

  // Verificar autenticación
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="account-off" size={64} color="#9ca3af" />
          <Text style={styles.errorText}>Debes iniciar sesión para explorar lugares</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Mostrar loading mientras carga el mapa
  if (!mapReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Verificar permisos de ubicación
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="map-marker-off" size={64} color="#9ca3af" />
          <Text style={styles.errorTitle}>Permisos de ubicación requeridos</Text>
          <Text style={styles.errorText}>
            Necesitamos tu ubicación para mostrar lugares cercanos relevantes
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Verificar que el usuario tenga intereses seleccionados
  if (preferences.interests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="heart-outline" size={64} color="#9ca3af" />
          <Text style={styles.errorTitle}>Selecciona tus intereses</Text>
          <Text style={styles.errorText}>
            Ve a tu perfil y selecciona tus intereses turísticos para ver lugares relevantes
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="map-search" size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>Explora Lugares</Text>
        </View>
        {loadingPlaces && (
          <ActivityIndicator size="small" color="#3b82f6" style={styles.headerLoader} />
        )}
      </View>

      {/* Info de lugares encontrados */}
      {relevantPlaces.length > 0 && (
        <View style={styles.infoBar}>
          <MaterialCommunityIcons name="map-marker-multiple" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {relevantPlaces.length} lugares encontrados según tus intereses
          </Text>
        </View>
      )}

      {/* Mapa con lugares relevantes */}
      <View style={styles.mapContainer}>
        {userLocation ? (
          <NearbyPlacesMap
            userLocation={userLocation}
            radius={5000}
            customPlaces={relevantPlaces}
            onPlaceSelect={(place: Place) => {
              console.log('Lugar seleccionado:', place.name);
              showPlaceReviews(place, place.name);
            }}
          />
        ) : (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
          </View>
        )}
      </View>

      {/* Modal de reseñas */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={reviewsModalVisible}
        onRequestClose={() => setReviewsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setReviewsModalVisible(false)}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedPlaceDetails?.displayTitle || 'Detalles del lugar'}
            </Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingReviews ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Cargando información...</Text>
              </View>
            ) : selectedPlaceDetails?.error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color="#ef4444"
                />
                <Text style={styles.errorText}>{selectedPlaceDetails.error}</Text>
              </View>
            ) : (
              <>
                {selectedPlaceDetails && (
                  <View style={styles.placeDetailsContainer}>
                    {/* Rating */}
                    {selectedPlaceDetails.rating && (
                      <View style={styles.placeRatingContainer}>
                        <MaterialCommunityIcons name="star" size={24} color="#FFD700" />
                        <Text style={styles.placeRatingText}>
                          {selectedPlaceDetails.rating.toFixed(1)}
                        </Text>
                        {selectedPlaceDetails.user_ratings_total && (
                          <Text style={styles.placeRatingCount}>
                            ({selectedPlaceDetails.user_ratings_total} reseñas)
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Dirección */}
                    {selectedPlaceDetails.formatted_address && (
                      <View style={styles.placeInfoRow}>
                        <MaterialCommunityIcons name="map-marker" size={20} color="#6b7280" />
                        <Text style={styles.placeInfoText}>
                          {selectedPlaceDetails.formatted_address}
                        </Text>
                      </View>
                    )}

                    {/* Teléfono */}
                    {selectedPlaceDetails.formatted_phone_number && (
                      <View style={styles.placeInfoRow}>
                        <MaterialCommunityIcons name="phone" size={20} color="#6b7280" />
                        <Text style={styles.placeInfoText}>
                          {selectedPlaceDetails.formatted_phone_number}
                        </Text>
                      </View>
                    )}

                    {/* Horario */}
                    {selectedPlaceDetails.opening_hours?.open_now !== undefined && (
                      <View style={styles.placeInfoRow}>
                        <MaterialCommunityIcons
                          name={selectedPlaceDetails.opening_hours.open_now ? 'clock-check' : 'clock-alert'}
                          size={20}
                          color={selectedPlaceDetails.opening_hours.open_now ? '#10b981' : '#ef4444'}
                        />
                        <Text
                          style={[
                            styles.placeInfoText,
                            {
                              color: selectedPlaceDetails.opening_hours.open_now ? '#10b981' : '#ef4444',
                            },
                          ]}
                        >
                          {selectedPlaceDetails.opening_hours.open_now ? 'Abierto ahora' : 'Cerrado'}
                        </Text>
                      </View>
                    )}

                    {/* Resumen */}
                    {(selectedPlaceDetails.editorial_summary?.overview || selectedPlaceDetails.summary) && (
                      <View style={styles.summaryContainer}>
                        <Text style={styles.summaryTitle}>Acerca de este lugar</Text>
                        <Text style={styles.summaryText}>
                          {selectedPlaceDetails.editorial_summary?.overview || selectedPlaceDetails.summary}
                        </Text>
                      </View>
                    )}

                    {/* Reseñas */}
                    <View style={styles.reviewsSection}>
                      <View style={styles.reviewsSectionHeader}>
                        <Text style={styles.reviewsSectionTitle}>Reseñas</Text>
                        <AnimatedPressable
                          style={styles.writeReviewButton}
                          onPress={handleOpenWriteReview}
                        >
                          <MaterialCommunityIcons name="pencil" size={16} color="#3b82f6" />
                          <Text style={styles.writeReviewButtonText}>Escribir</Text>
                        </AnimatedPressable>
                      </View>
                      {(() => {
                        const reviews = selectedPlaceDetails.reviews || [];
                        if (!Array.isArray(reviews) || reviews.length === 0) {
                          return (
                            <View style={styles.noReviewsContainer}>
                              <MaterialCommunityIcons
                                name="comment-text-outline"
                                size={48}
                                color="#9ca3af"
                              />
                              <Text style={styles.noReviewsText}>
                                No hay reseñas disponibles para este lugar
                              </Text>
                            </View>
                          );
                        }

                        return reviews.map((review: any, index: number) => (
                          <View key={index} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                              <View style={styles.reviewAuthorContainer}>
                                <Text style={styles.reviewAuthor}>
                                  {review.author_name || review.user_name || review.user?.name || 'Usuario anónimo'}
                                </Text>
                                {review.source === 'internal' && (
                                  <View style={styles.internalBadge}>
                                    <Text style={styles.internalBadgeText}>App</Text>
                                  </View>
                                )}
                              </View>
                              {review.rating && (
                                <View style={styles.reviewRating}>
                                  <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                                </View>
                              )}
                            </View>
                            {review.relative_time_description && (
                              <Text style={styles.reviewTime}>{review.relative_time_description}</Text>
                            )}
                            <Text style={styles.reviewText}>
                              {review.text || review.description || 'Sin comentarios'}
                            </Text>
                          </View>
                        ));
                      })()}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal de escritura de reseñas */}
      <ReviewModal
        visible={writeReviewModalVisible}
        onClose={handleReviewModalClose}
        placeId={reviewPlaceId}
        placeName={reviewPlaceName}
      />
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerLoader: {
    marginRight: 8,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 8,
  },
  modalHeaderRight: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 16,
  },
  placeDetailsContainer: {
    paddingBottom: 24,
  },
  placeRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  placeRatingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 8,
  },
  placeRatingCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  placeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  reviewsSection: {
    marginTop: 16,
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  writeReviewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  noReviewsText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  internalBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  internalBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 2,
  },
  reviewTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
