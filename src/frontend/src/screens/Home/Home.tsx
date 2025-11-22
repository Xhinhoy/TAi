import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Pressable,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Firebase imports
import {
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
// Import Firebase services
import { auth } from '../../services/firebase';

// Import components and services
import { theme } from '../../styles/theme';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { usePreferences } from '../../contexts/PreferencesContext';
import { localRecommendationsService, PlaceRecommendation } from '../../services/recommendations.service';
import { TOURIST_INTERESTS } from '../../components/ui/InterestSelector';
import { itinerariesService, usersService, placesService } from '../../api/services';
import { NotificationBubble } from '../../components/Notifications/NotificationBubble';
import { useNotifications } from '../../hooks/useNotifications';
import * as Location from 'expo-location';

// TypeScript interfaces

interface Itinerary {
  id: string;
  title: string;
  city: string;
  days: any[];
  start_date?: string;
  created_at: string;
  user_id?: string;
}

interface Favorite {
  id: string;
  title: string;
  subtitle: string;
  placeId: string;
  createdAt: string;
}


// Use the same tourist interests system as in the profile
const getDisplayableInterests = (userInterests: string[]) => {
  return TOURIST_INTERESTS.filter(interest => userInterests.includes(interest.id));
};

// Components for displaying user interests
interface InterestBadgeProps {
  interest: typeof TOURIST_INTERESTS[0];
}

const InterestBadge: React.FC<InterestBadgeProps> = ({ interest }) => {
  return (
    <View style={styles.interestBadge}>
      <MaterialCommunityIcons
        name={interest.icon as any}
        size={16}
        color={theme.colors.primary.main}
      />
      <Text style={styles.interestBadgeText}>{interest.name}</Text>
    </View>
  );
};

interface RecommendationCardProps {
  recommendation: PlaceRecommendation;
  onPress: () => void;
  onFavorite: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onPress, onFavorite }) => {
  const getPriceText = (priceLevel?: number) => {
    if (!priceLevel) return 'Precio no disponible';
    return '$'.repeat(priceLevel) + '$'.repeat(Math.max(0, 4 - priceLevel));
  };

  const getOpenStatusInfo = () => {
    if (!recommendation.openingHours) {
      return null;
    }

    const isOpen = recommendation.openingHours.isOpenNow;
    const now = new Date();
    const currentDay = now.getDay();

    // Encontrar el horario de hoy
    const todaySchedule = recommendation.openingHours.periods?.find(
      (period) => period.open.day === currentDay
    );

    let statusText = '';
    let statusColor = '';
    let statusIcon: any = '';

    if (isOpen) {
      statusText = 'Abierto ahora';
      statusColor = '#10b981';
      statusIcon = 'check-circle';

      // Mostrar hora de cierre si está disponible
      if (todaySchedule?.close) {
        const closeTime = todaySchedule.close.time;
        const closeHour = Math.floor(parseInt(closeTime) / 100);
        const closeMin = parseInt(closeTime) % 100;
        statusText = `Abierto · Cierra ${closeHour}:${closeMin.toString().padStart(2, '0')}`;
      }
    } else {
      statusText = 'Cerrado';
      statusColor = '#ef4444';
      statusIcon = 'close-circle';

      // Buscar próximo horario de apertura
      const tomorrow = (currentDay + 1) % 7;
      const nextDaySchedule = recommendation.openingHours.periods?.find(
        (period) => period.open.day === tomorrow
      );

      if (nextDaySchedule) {
        const openTime = nextDaySchedule.open.time;
        const openHour = Math.floor(parseInt(openTime) / 100);
        const openMin = parseInt(openTime) % 100;
        statusText = `Cerrado · Abre ${openHour}:${openMin.toString().padStart(2, '0')}`;
      }
    }

    return { statusText, statusColor, statusIcon, isOpen };
  };

  const openStatus = getOpenStatusInfo();

  return (
    <AnimatedPressable
      style={styles.recommendationCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Recommendation for ${recommendation.name}`}
    >
      <View style={styles.recommendationContent}>
        <View style={styles.recommendationHeader}>
          <Text style={styles.recommendationName} numberOfLines={1}>
            {recommendation.name}
          </Text>
          <View style={styles.recommendationRating}>
            <MaterialCommunityIcons
              name="star"
              size={14}
              color="#FFD700"
            />
            <Text style={styles.ratingText}>{recommendation.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Estado de apertura */}
        {openStatus && (
          <View style={styles.openStatusContainer}>
            <MaterialCommunityIcons
              name={openStatus.statusIcon}
              size={12}
              color={openStatus.statusColor}
            />
            <Text style={[styles.openStatusText, { color: openStatus.statusColor }]}>
              {openStatus.statusText}
            </Text>
          </View>
        )}

        <Text style={styles.recommendationDescription} numberOfLines={2}>
          {recommendation.description}
        </Text>

        <View style={styles.recommendationFooter}>
          <Text style={styles.recommendationReason} numberOfLines={1}>
            {recommendation.reason}
          </Text>
          {recommendation.priceLevel && (
            <Text style={styles.priceLevel}>
              {getPriceText(recommendation.priceLevel)}
            </Text>
          )}
        </View>

        <View style={styles.matchScoreBadge}>
          <Text style={styles.matchScoreText}>
            {Math.round(recommendation.matchScore * 100)}% match
          </Text>
        </View>

        <AnimatedPressable style={styles.favoriteButton} onPress={onFavorite}>
          <MaterialCommunityIcons name="heart-plus" size={16} color={theme.colors.error.main} />
          <Text style={styles.favoriteButtonText}>Favorito</Text>
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
};

interface CardItinerarioProps {
  itinerary: Itinerary;
  onPress: () => void;
  onDelete: (id: string) => void;
}

const CardItinerario: React.FC<CardItinerarioProps> = ({ itinerary, onPress, onDelete }) => {
  const daysCount = itinerary.days?.length || 0;

  const handleDelete = (e: any) => {
    e.stopPropagation(); // Evitar que se dispare el onPress del card
    onDelete(itinerary.id);
  };

  return (
    <View style={{ position: 'relative' }}>
      <AnimatedPressable
        style={styles.itineraryCard}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Itinerario ${itinerary.title}`}
      >
        <View style={styles.itineraryImageContainer}>
          <View style={[styles.itineraryImage, styles.itineraryImagePlaceholder]}>
            <MaterialCommunityIcons
              name="map-marker-path"
              size={32}
              color={theme.colors.primary.main}
            />
          </View>
          <View style={styles.itineraryDateBadge}>
            <MaterialCommunityIcons name="calendar-range" size={10} color="#fff" />
            <Text style={styles.itineraryDateText}> {daysCount}d</Text>
          </View>
        </View>
        <View style={styles.itineraryContent}>
          <Text style={styles.itineraryCity} numberOfLines={2}>
            {itinerary.title}
          </Text>
          <View style={styles.itineraryMeta}>
            <MaterialCommunityIcons
              name="map-marker"
              size={12}
              color={theme.colors.text.secondary}
            />
            <Text style={styles.itineraryMetaText} numberOfLines={1}>
              {itinerary.city}
            </Text>
          </View>
        </View>
      </AnimatedPressable>

      {/* Botón de eliminar (hermano, no hijo del botón principal) */}
      <AnimatedPressable
        style={styles.deleteItineraryButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Eliminar itinerario"
      >
        <MaterialCommunityIcons
          name="delete-outline"
          size={20}
          color={theme.colors.error.main}
        />
      </AnimatedPressable>
    </View>
  );
};

// Main Home Screen Component
const HomeScreen: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recommendations, setRecommendations] = useState<PlaceRecommendation[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [allItinerariesVisible, setAllItinerariesVisible] = useState(false);
  const [allFavoritesVisible, setAllFavoritesVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean>(false);

  // Reviews modal state
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<any>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Use new preferences system
  const { preferences } = usePreferences();
  const interests = preferences.interests;

  // Hook de notificaciones
  const {
    notifications,
    markAsRead,
    dismiss,
    clearAll,
  } = useNotifications({
    userId: user?.uid,
    userLocation: userLocation || undefined,
    userInterests: preferences.interests,
    enableItineraryReminders: true,
    enableNearbyRecommendations: true,
  });

  // Load itineraries from backend
  const loadItineraries = async (userId: string) => {
    try {
      console.log('📥 Cargando itinerarios del backend para userId:', userId);
      const userItineraries = await itinerariesService.getUserItineraries(userId);
      const normalized = (userItineraries || []).map((it, idx) => ({
        ...it,
        id: it.id || it.itinerary_id || it._id || `it-${idx}-${it.title || 'untitled'}`,
      }));
      console.log(`✅ Itinerarios cargados: ${normalized.length}`);
      setItineraries(normalized);
    } catch (error: any) {
      console.error('❌ Error cargando itinerarios:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      // No mostrar error al usuario, simplemente dejar la lista vacía
      setItineraries([]);
    }
  };

  // Load favorites via backend (avoids Firestore client-permission issues)
  const loadFavorites = async (userId: string) => {
    try {
      const data = await usersService.getFavorites(userId);
      const mapped: Favorite[] = (data || []).map((fav: any) => ({
        id: fav.id || fav.place_id || fav.placeId || 'fav',
        title: fav.title || fav.place_data?.title || fav.place_data?.name || 'Favorito',
        subtitle: fav.subtitle || fav.place_data?.subtitle || fav.place_data?.address || '',
        placeId: fav.place_id || fav.placeId || fav.id,
        createdAt: fav.added_at || fav.created_at || new Date().toISOString(),
      }));
      setFavorites(mapped);
    } catch (error) {
      console.error('Error cargando favoritos:', error);
      setFavorites([]);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setupUserData(user);
      } else {
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  // Solicitar permisos de ubicación y obtenerla
  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      setLocationGranted(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Buscar lugares cercanos según ubicación e intereses
  useEffect(() => {
    const fetchNearby = async () => {
      if (!userLocation) {
        setNearbyPlaces([]);
        return;
      }

      // Mapeo sencillo interés -> tipo de lugar de Google
      const interestToType: Record<string, string> = {
        naturaleza: 'park',
        aventura: 'tourist_attraction',
        gastronomia: 'restaurant',
        cultura: 'museum',
        compras: 'shopping_mall',
        relax: 'spa',
        playa: 'beach',
        historia: 'historical_landmark',
      };

      // Escoger el primer tipo que matchee algún interés; si no hay intereses, usar tipo genérico
      const placeType =
        preferences.interests.reduce<string | undefined>((acc, interest) => {
          return acc || interestToType[interest];
        }, undefined) || 'tourist_attraction';

      try {
        let results = await placesService.search({
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          radius: 3000,
          place_type: placeType,
        });

        // Si no hay resultados con el tipo sugerido, hacer intento amplio sin filtrar
        if (!results || results.length === 0) {
          results = await placesService.search({
            lat: userLocation.latitude,
            lng: userLocation.longitude,
            radius: 8000,
          });
        }

        // Último fallback: usar nearby genérico (puede usar otras fuentes como TripAdvisor si backend las expone)
        if (!results || results.length === 0) {
          results = await placesService.searchNearby({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            radius: 12000,
          });
        }

        const mapped: PlaceRecommendation[] = (results || []).map((place: any) => ({
          id: place.id || place.place_id || place.name,
          name: place.name,
          description: place.address || place.formatted_address || '',
          category: placeType || place.types?.[0] || place.categories?.[0] || 'spot',
          location: {
            latitude: place.coords?.latitude || place.geometry?.location?.lat || 0,
            longitude: place.coords?.longitude || place.geometry?.location?.lng || 0,
            address: place.address || place.formatted_address || '',
          },
          rating: place.rating || 0,
          priceLevel: place.price_level || place.priceLevel || 0,
          photos: place.photos || [],
          types: place.types || place.categories || [],
          matchScore: 1,
          reason: preferences.interests.length
            ? 'Cerca de tu ubicación y tus intereses'
            : 'Cerca de tu ubicación',
        }));

        setNearbyPlaces(mapped.slice(0, 10));
      } catch (error) {
        console.error('Error obteniendo lugares cercanos:', error);
        setNearbyPlaces([]);
      }
    };

    fetchNearby();
  }, [userLocation, preferences.interests]);

  // Recargar itinerarios cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      if (user) {
        console.log('🔄 Pantalla Home enfocada - recargando itinerarios...');
        loadItineraries(user.uid);
        loadFavorites(user.uid);
      }
    }, [user])
  );

// Generate recommendations when user/interests are ready
useEffect(() => {
  if (!user || interests.length === 0) {
    setRecommendations([]);
    return;
  }

  let cancelled = false;

  const generateRecommendations = async () => {
    try {
      const recs = await localRecommendationsService.generateRecommendations(
        preferences,
        user.uid,
        undefined,
        10
      );
      if (!cancelled) {
        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      if (!cancelled) {
        setRecommendations([]);
      }
    }
  };

  const timeout = setTimeout(() => generateRecommendations(), 300);
  return () => {
    cancelled = true;
    clearTimeout(timeout);
  };
}, [user, interests]);


  const setupUserData = async (user: FirebaseUser) => {
    try {
      // Cargar itinerarios desde el backend
      await loadItineraries(user.uid);

      // Cargar favoritos desde backend (evita errores de permisos en Firestore del cliente)
      await loadFavorites(user.uid);

      setLoading(false);
    } catch (error) {
      console.error('Error setting up user data:', error);
      setLoading(false);
    }
  };

  const handleOpenItinerary = (itinerary: Itinerary) => {
    console.log('🗺️ Abriendo itinerario:', itinerary.title);
    console.log('📦 Datos del itinerario:', JSON.stringify(itinerary, null, 2));

    setSelectedItinerary(itinerary);
    setModalVisible(true);
  };

  const handleDeleteItinerary = async (itineraryId: string) => {
    if (!user) return;

    // Confirmación multiplataforma
    const confirmDelete = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm('¿Estás seguro de que deseas eliminar este itinerario?'));
        } else {
          Alert.alert(
            'Eliminar itinerario',
            '¿Estás seguro de que deseas eliminar este itinerario?',
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        }
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      console.log('🗑️ Eliminando itinerario:', itineraryId);
      await itinerariesService.delete(itineraryId);
      console.log('✅ Itinerario eliminado exitosamente');

      // Actualizar la lista local
      setItineraries(prev => prev.filter(it => it.id !== itineraryId));

      // Mostrar mensaje de éxito
      if (Platform.OS === 'web') {
        // En web no hay forma nativa de mostrar toast, usar alert o implementar un toast custom
        console.log('✅ Itinerario eliminado');
      } else {
        Alert.alert('Éxito', 'Itinerario eliminado correctamente');
      }
    } catch (error) {
      console.error('❌ Error eliminando itinerario:', error);
      if (Platform.OS === 'web') {
        window.alert('Error al eliminar el itinerario. Por favor, intenta de nuevo.');
      } else {
        Alert.alert('Error', 'No se pudo eliminar el itinerario. Por favor, intenta de nuevo.');
      }
    }
  };


  const handleAddFavorite = async (place: PlaceRecommendation) => {
    if (!user) return;
    try {
      const placeId = place.id || place.placeId || place.name;
      const address = place.location?.address || '';
      const subtitle = address || place.description || place.reason || '';
      await usersService.addFavorite(user.uid, placeId, {
        title: place.name,
        subtitle,
        address,
        rating: place.rating || 0,
        types: place.types || [],
      });
      Alert.alert('Agregado a favoritos', `${place.name} se ha guardado en tus favoritos.`);
      await loadFavorites(user.uid);
    } catch (error) {
      console.error('Error al agregar favorito:', error);
      Alert.alert('Error', 'No se pudo agregar a favoritos (permisos o conexión). Intenta de nuevo.');
    }
  };

  const showPlaceReview = async (
    placeData: { id?: string; placeId?: string; place_id?: string; name?: string },
    fallbackTitle?: string
  ) => {
    const placeId = placeData.placeId || placeData.place_id || placeData.id;
    const title = placeData.name || fallbackTitle || 'Lugar';

    if (!placeId) {
      Alert.alert('Lugar sin detalles', 'No se encontró un id para consultar reseñas.');
      return;
    }

    setLoadingReviews(true);
    setReviewsModalVisible(true);

    try {
      const details = await placesService.getDetails(placeId);
      setSelectedPlaceDetails({
        ...details,
        displayTitle: details?.name || title,
      });
      setLoadingReviews(false);
    } catch (error: any) {
      setLoadingReviews(false);
      const status = error?.response?.status;
      if (status === 404) {
        setSelectedPlaceDetails({
          displayTitle: title,
          error: 'No se encontraron detalles para este lugar.',
        });
      } else {
        setSelectedPlaceDetails({
          displayTitle: title,
          error: 'No se pudo cargar la información. Inténtalo de nuevo más tarde.',
        });
      }
      console.error('Error obteniendo detalles del lugar:', error);
    }
  };

  const handleRemoveFavorite = async (placeId: string) => {
    if (!user) return;
    try {
      await usersService.removeFavorite(user.uid, placeId);
      await loadFavorites(user.uid);
    } catch (error) {
      console.error('Error al eliminar favorito:', error);
      Alert.alert('Error', 'No se pudo eliminar el favorito. Intenta de nuevo.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Inicia sesión para ver tu contenido</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View style={styles.greetingSection}>
              <Text style={styles.welcomeText}>¡Hola de nuevo!</Text>
              <Text style={styles.subtitle}>¿Listo para tu próxima aventura?</Text>
            </View>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons
                name="airplane"
                size={28}
                color={theme.colors.primary.main}
              />
            </View>
          </View>
        </View>

        {/* Travel Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus intereses turísticos</Text>
          {preferences.interests.length > 0 ? (
            <View style={styles.interestsGrid}>
              {getDisplayableInterests(preferences.interests).map((interest) => (
                <InterestBadge key={interest.id} interest={interest} />
              ))}
            </View>
          ) : (
            <View style={styles.noInterestsHome}>
              <MaterialCommunityIcons
                name="heart-plus-outline"
                size={32}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.noInterestsText}>
                Ve a tu perfil para seleccionar tus intereses turísticos
              </Text>
            </View>
          )}
        </View>

        {/* Personalized Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendaciones para ti</Text>
          {recommendations.length > 0 ? (
            <>
              <Text style={styles.recommendationsSubtitle}>
                Basado en tus intereses turísticos seleccionados
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
              >
                {recommendations.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    onPress={() => showPlaceReview(recommendation, recommendation.name)}
                    onFavorite={() => handleAddFavorite(recommendation)}
                  />
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.noRecommendations}>
              <MaterialCommunityIcons
                name="heart-outline"
                size={48}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.noRecommendationsTitle}>
                Selecciona tus intereses
              </Text>
              <Text style={styles.noRecommendationsSubtitle}>
                Ve a tu perfil y elige tus preferencias turísticas para obtener recomendaciones personalizadas
              </Text>
            </View>
          )}
        </View>

        {/* Nearby places based on your location and interests */}
        {!locationGranted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lugares cerca de ti</Text>
            <View style={styles.noRecommendations}>
              <MaterialCommunityIcons
                name="map-marker-off"
                size={48}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.noRecommendationsTitle}>
                Activa la ubicación para sugerencias cercanas
              </Text>
              <Text style={styles.noRecommendationsSubtitle}>
                Solo la pediremos una vez y se ocultará este aviso
              </Text>
              <AnimatedPressable style={styles.locationButton} onPress={requestLocation}>
                <Text style={styles.locationButtonText}>Conceder permisos</Text>
              </AnimatedPressable>
            </View>
          </View>
        )}

        {locationGranted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lugares cerca de ti</Text>
            {!userLocation ? (
              <View style={styles.noRecommendations}>
                <ActivityIndicator size="small" color={theme.colors.primary.main} />
                <Text style={styles.noRecommendationsTitle}>
                  Obteniendo tu ubicación...
                </Text>
              </View>
            ) : nearbyPlaces.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
              >
                {nearbyPlaces.map((place) => (
                  <RecommendationCard
                    key={place.id}
                    recommendation={place}
                    onPress={() => showPlaceReview(place, place.name)}
                    onFavorite={() => handleAddFavorite(place)}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noRecommendations}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.noRecommendationsTitle}>
                  Buscando sitios cercanos...
                </Text>
                <Text style={styles.noRecommendationsSubtitle}>
                  Actualiza tus intereses para mejorar las sugerencias
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actividad</Text>

          {/* Saved Itineraries */}
          <View style={styles.subsection}>
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Itinerarios guardados</Text>
              {itineraries.length > 0 && (
                <Pressable onPress={() => setAllItinerariesVisible(true)}>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </Pressable>
              )}
            </View>
            {itineraries.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
              >
                {itineraries.map((itinerary) => (
                  <CardItinerario
                    key={itinerary.id}
                    itinerary={itinerary}
                    onPress={() => handleOpenItinerary(itinerary)}
                    onDelete={handleDeleteItinerary}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="map-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>
                  No tienes itinerarios guardados
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Crea tu primer itinerario para verlo aquí
                </Text>
              </View>
            )}
          </View>

          {/* Favorites */}
          <View style={styles.subsection}>
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Favoritos</Text>
              {favorites.length > 0 && (
                <Pressable onPress={() => setAllFavoritesVisible(true)}>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </Pressable>
              )}
            </View>
            {favorites.length > 0 ? (
              <View style={styles.favoritesList}>
                {favorites.slice(0, 4).map((favorite, index) => (
                  <View key={favorite.id}>
                    <AnimatedPressable
                      style={styles.favoriteItem}
                      onPress={() => showPlaceReview(favorite, favorite.title)}
                      accessibilityRole="button"
                      accessibilityLabel={`Favorite place ${favorite.title}`}
                    >
                      <View style={styles.favoriteIconContainer}>
                        <MaterialCommunityIcons
                          name="heart"
                          size={20}
                          color={theme.colors.error.main}
                        />
                      </View>
                      <View style={styles.favoriteInfo}>
                        <Text style={styles.favoriteTitle}>{favorite.title}</Text>
                        <Text style={styles.favoriteSubtitle}>{favorite.subtitle}</Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={16}
                        color={theme.colors.text.tertiary}
                      />
                    </AnimatedPressable>
                    <Pressable
                      onPress={() => handleRemoveFavorite(favorite.placeId)}
                      style={styles.removeFavoriteButton}
                      accessibilityLabel="Eliminar favorito"
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={18}
                        color={theme.colors.error.main}
                      />
                    </Pressable>
                    {index < Math.min(favorites.length, 4) - 1 && (
                      <View style={styles.favoritesDivider} />
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="heart-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>
                  No tienes lugares favoritos
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Marca lugares como favoritos para verlos aquí
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Modal de Itinerario */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedItinerary?.title}</Text>
            <View style={styles.modalHeaderRight}>
              <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary.main} />
              <Text style={styles.modalCity}>{selectedItinerary?.city}</Text>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedItinerary?.days && Array.isArray(selectedItinerary.days) && selectedItinerary.days.map((day: any, dayIndex: number) => (
              <View key={dayIndex} style={styles.dayContainer}>
                <View style={styles.dayHeader}>
                  <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary.main} />
                  <Text style={styles.dayTitle}>Día {day.day}</Text>
                </View>

                {day.activities && Array.isArray(day.activities) && day.activities.map((activity: any, activityIndex: number) => (
                  <View key={activityIndex} style={styles.activityCard}>
                    <View style={styles.activityHeader}>
                      <View style={styles.activityTime}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.activityTimeText}>
                          {activity.start} - {activity.end}
                        </Text>
                      </View>
                      <View style={styles.activityPrice}>
                        <Text style={styles.activityPriceText}>{activity.price_display}</Text>
                      </View>
                    </View>

                    <Text style={styles.activityName}>{activity.place_name}</Text>
                    <Text style={styles.activityNotes}>{activity.notes}</Text>
                  </View>
                ))}
              </View>
            ))}

            {selectedItinerary?.reasoning && (
              <View style={styles.reasoningContainer}>
                <Text style={styles.reasoningTitle}>💡 Sobre este itinerario</Text>
                <Text style={styles.reasoningText}>{selectedItinerary.reasoning}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Burbuja de Notificaciones Flotante */}
      <NotificationBubble
        notifications={notifications}
        onNotificationPress={(notification) => {
          markAsRead(notification.id);
          // Manejar navegación según tipo de notificación
          if (notification.onAction) {
            notification.onAction();
          }
        }}
        onNotificationDismiss={dismiss}
        onClearAll={clearAll}
      />

      {/* Modal ver todos los favoritos */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={allFavoritesVisible}
        onRequestClose={() => setAllFavoritesVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setAllFavoritesVisible(false)}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Todos los favoritos</Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent}>
            {favorites.map((favorite) => (
              <View key={favorite.id} style={styles.favoriteItemContainer}>
                <AnimatedPressable
                  style={styles.favoriteItem}
                  onPress={() => showPlaceReview(favorite, favorite.title)}
                  accessibilityRole="button"
                  accessibilityLabel={`Favorite place ${favorite.title}`}
                >
                  <View style={styles.favoriteIconContainer}>
                    <MaterialCommunityIcons
                      name="heart"
                      size={20}
                      color={theme.colors.error.main}
                    />
                  </View>
                  <View style={styles.favoriteInfo}>
                    <Text style={styles.favoriteTitle}>{favorite.title}</Text>
                    <Text style={styles.favoriteSubtitle}>{favorite.subtitle}</Text>
                  </View>
                </AnimatedPressable>
                <Pressable
                  onPress={() => handleRemoveFavorite(favorite.placeId)}
                  style={styles.removeFavoriteButton}
                  accessibilityLabel="Eliminar favorito"
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={20}
                    color={theme.colors.error.main}
                  />
                </Pressable>
              </View>
            ))}
            {favorites.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="heart-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>
                  No tienes lugares favoritos
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal ver todos los itinerarios */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={allItinerariesVisible}
        onRequestClose={() => setAllItinerariesVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setAllItinerariesVisible(false)}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Todos los itinerarios</Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent}>
            {itineraries.map((itinerary) => (
              <CardItinerario
                key={itinerary.id}
                itinerary={itinerary}
                onPress={() => {
                  setAllItinerariesVisible(false);
                  handleOpenItinerary(itinerary);
                }}
                onDelete={handleDeleteItinerary}
              />
            ))}
            {itineraries.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="map-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>
                  No tienes itinerarios guardados
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
              <MaterialCommunityIcons name="close" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedPlaceDetails?.displayTitle || 'Detalles del lugar'}
            </Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingReviews ? (
              <View style={styles.loadingReviewsContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.main} />
                <Text style={styles.loadingReviewsText}>Cargando información...</Text>
              </View>
            ) : selectedPlaceDetails?.error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color={theme.colors.error.main}
                />
                <Text style={styles.errorText}>{selectedPlaceDetails.error}</Text>
              </View>
            ) : (
              <>
                {/* Información general */}
                {selectedPlaceDetails && (
                  <View style={styles.placeDetailsContainer}>
                    {/* Rating */}
                    {selectedPlaceDetails.rating && (
                      <View style={styles.placeRatingContainer}>
                        <MaterialCommunityIcons
                          name="star"
                          size={24}
                          color="#FFD700"
                        />
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
                        <MaterialCommunityIcons
                          name="map-marker"
                          size={20}
                          color={theme.colors.text.secondary}
                        />
                        <Text style={styles.placeInfoText}>
                          {selectedPlaceDetails.formatted_address}
                        </Text>
                      </View>
                    )}

                    {/* Teléfono */}
                    {selectedPlaceDetails.formatted_phone_number && (
                      <View style={styles.placeInfoRow}>
                        <MaterialCommunityIcons
                          name="phone"
                          size={20}
                          color={theme.colors.text.secondary}
                        />
                        <Text style={styles.placeInfoText}>
                          {selectedPlaceDetails.formatted_phone_number}
                        </Text>
                      </View>
                    )}

                    {/* Horario actual */}
                    {selectedPlaceDetails.opening_hours?.open_now !== undefined && (
                      <View style={styles.placeInfoRow}>
                        <MaterialCommunityIcons
                          name={selectedPlaceDetails.opening_hours.open_now ? "clock-check" : "clock-alert"}
                          size={20}
                          color={selectedPlaceDetails.opening_hours.open_now ? "#10b981" : "#ef4444"}
                        />
                        <Text style={[
                          styles.placeInfoText,
                          { color: selectedPlaceDetails.opening_hours.open_now ? "#10b981" : "#ef4444" }
                        ]}>
                          {selectedPlaceDetails.opening_hours.open_now ? "Abierto ahora" : "Cerrado"}
                        </Text>
                      </View>
                    )}

                    {/* Resumen editorial */}
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
                      <Text style={styles.reviewsSectionTitle}>Reseñas</Text>
                      {(() => {
                        const reviews = selectedPlaceDetails.reviews || selectedPlaceDetails.tripadvisor_reviews || [];
                        if (!Array.isArray(reviews) || reviews.length === 0) {
                          return (
                            <View style={styles.noReviewsContainer}>
                              <MaterialCommunityIcons
                                name="comment-text-outline"
                                size={48}
                                color={theme.colors.text.tertiary}
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
                              <Text style={styles.reviewAuthor}>
                                {review.author_name || review.user?.name || 'Usuario anónimo'}
                              </Text>
                              {review.rating && (
                                <View style={styles.reviewRating}>
                                  <MaterialCommunityIcons
                                    name="star"
                                    size={14}
                                    color="#FFD700"
                                  />
                                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                                </View>
                              )}
                            </View>
                            {review.relative_time_description && (
                              <Text style={styles.reviewTime}>
                                {review.relative_time_description}
                              </Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
  },
  loginText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  subsection: {
    marginBottom: theme.spacing.xl,
  },
  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary.main,
    fontWeight: '500',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: -theme.spacing.xs,
  },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  interestBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.main,
    marginLeft: theme.spacing.xs,
  },
  noInterestsHome: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  noInterestsText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  horizontalList: {
    paddingLeft: theme.spacing.lg,
  },
  nearbyList: {
    paddingLeft: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  itineraryCard: {
    width: 140,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    position: 'relative',
  },
  deleteItineraryButton: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.radius.sm,
    padding: 6,
    ...theme.shadows.sm,
  },
  itineraryImageContainer: {
    position: 'relative',
  },
  itineraryContent: {
    padding: theme.spacing.sm,
    minHeight: 60,
  },
  itineraryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itineraryMetaText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginLeft: 4,
    flex: 1,
  },
  itineraryDateBadge: {
    position: 'absolute',
    bottom: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  itineraryDateText: {
    fontSize: 10,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  itineraryImage: {
    height: 80,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    overflow: 'hidden',
  },
  itineraryImageContent: {
    width: '100%',
    height: '100%',
  },
  itineraryImagePlaceholder: {
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  itineraryCity: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    lineHeight: 16,
  },
  itineraryDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  favoritesList: {
    paddingHorizontal: theme.spacing.lg,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  favoriteItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  favoriteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  favoriteTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  favoriteSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  removeFavoriteButton: {
    padding: theme.spacing.xs,
  },
  favoritesDivider: {
    height: 1,
    backgroundColor: theme.colors.border.secondary,
    marginLeft: 44,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  demoSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  demoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  // Header styles
  headerContainer: {
    backgroundColor: theme.colors.background.primary,
    paddingTop: 20,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  greetingSection: {
    flex: 1,
  },
  headerIcon: {
    marginLeft: theme.spacing.md,
  },
  demoButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...theme.shadows.sm,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.sm,
  },
  // Recommendations styles
  recommendationsSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    marginTop: -theme.spacing.sm,
  },
  noRecommendations: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  noRecommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  noRecommendationsSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  recommendationCard: {
    width: 280,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    position: 'relative',
    ...theme.shadows.sm,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  openStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: 4,
  },
  openStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  recommendationRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginLeft: 2,
  },
  recommendationDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationReason: {
    fontSize: 12,
    color: theme.colors.primary.main,
    fontWeight: '500',
    flex: 1,
  },
  priceLevel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  matchScoreBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.accent.main,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  matchScoreText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  favoriteButton: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error.main,
  },
  favoriteButtonText: {
    color: theme.colors.error.main,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    backgroundColor: theme.colors.surface.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  modalCity: {
    fontSize: 14,
    color: theme.colors.primary.main,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  dayContainer: {
    marginBottom: theme.spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary.main,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  activityCard: {
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary.main,
    ...theme.shadows.sm,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  activityTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  activityTimeText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  activityPrice: {
    backgroundColor: theme.colors.accent.light,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  activityPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent.main,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  activityNotes: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  reasoningContainer: {
    backgroundColor: theme.colors.primary.light,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary.main,
    marginBottom: theme.spacing.sm,
  },
  reasoningText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  locationButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.radius.sm,
  },
  locationButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  // Reviews modal styles
  loadingReviewsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  loadingReviewsText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.error.main,
    textAlign: 'center',
  },
  placeDetailsContainer: {
    paddingBottom: theme.spacing.xl,
  },
  placeRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  placeRatingText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
  },
  placeRatingCount: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  placeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  placeInfoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  reviewsSection: {
    marginTop: theme.spacing.lg,
  },
  reviewsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  noReviewsText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary.main,
    ...theme.shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginLeft: 2,
  },
  reviewTime: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.sm,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});

export default HomeScreen;
