import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
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
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

// Import Firebase services
import { auth, db } from '../../services/firebase';

// Import components and services
import { theme } from '../../styles/theme';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { usePreferences } from '../../contexts/PreferencesContext';
import { localRecommendationsService, PlaceRecommendation } from '../../services/recommendations.service';
import { TOURIST_INTERESTS } from '../../components/ui/InterestSelector';
import { itinerariesService } from '../../api/services';
import { useNavigation } from '@react-navigation/native';
import { NotificationBubble } from '../../components/Notifications/NotificationBubble';
import { useNotifications } from '../../hooks/useNotifications';
import * as Location from 'expo-location';

// TypeScript interfaces

interface Itinerary {
  id: string;
  title: string;
  city: string;
  days: any[];
  created_at: string;
  user_id?: string;
}

interface Favorite {
  id: string;
  title: string;
  subtitle: string;
  placeId: string;
  createdAt: Timestamp;
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
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onPress }) => {
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
    const currentTime = now.getHours() * 100 + now.getMinutes();

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

      {/* Botón de eliminar */}
      <View
        style={styles.deleteItineraryButton}
        onTouchEnd={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Eliminar itinerario"
      >
        <MaterialCommunityIcons
          name="delete-outline"
          size={20}
          color={theme.colors.error}
        />
      </View>
    </AnimatedPressable>
  );
};

// Main Home Screen Component
const HomeScreen: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recommendations, setRecommendations] = useState<PlaceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const navigation = useNavigation();

  // Use new preferences system
  const { preferences } = usePreferences();

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
      console.log(`✅ Itinerarios cargados: ${userItineraries.length}`);
      setItineraries(userItineraries);
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

  // Obtener ubicación del usuario para notificaciones contextuales
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error obteniendo ubicación:', error);
      }
    })();
  }, []);

  // Recargar itinerarios cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      if (user) {
        console.log('🔄 Pantalla Home enfocada - recargando itinerarios...');
        loadItineraries(user.uid);
      }
    }, [user])
  );

// Generate recommendations once per session or when interests truly change
useEffect(() => {
  let hasFetched = false;

  const generateRecommendations = async () => {
    if (hasFetched) return;
    hasFetched = true;

    if (!user || preferences.interests.length === 0) {
      setRecommendations([]);
      return;
    }

    try {
      const recs = await localRecommendationsService.generateRecommendations(
        preferences,
        user.uid,
        undefined,
        10
      );
      setRecommendations(recs);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      setRecommendations([]);
    }
  };

  // Ejecutar una vez con un ligero delay (evita render conflict)
  const timeout = setTimeout(() => generateRecommendations(), 300);

  return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // 👈 Se ejecuta solo una vez


  const setupUserData = async (user: FirebaseUser) => {
    try {
      // Cargar itinerarios desde el backend
      await loadItineraries(user.uid);

      // Setup real-time listeners para favoritos
      // (Los itinerarios se cargan una vez al inicio)

      const favoritesQuery = query(
        collection(db, 'users', user.uid, 'favorites'),
        orderBy('createdAt', 'desc'),
        limit(8)
      );
      const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
        const favoritesData: Favorite[] = [];
        snapshot.forEach((doc) => {
          favoritesData.push({ id: doc.id, ...doc.data() } as Favorite);
        });
        setFavorites(favoritesData);
      });

      setLoading(false);

      // Cleanup function
      return () => {
        unsubscribeFavorites();
      };
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


  const handleLoadDemo = async () => {
    if (!user) return;

    try {
      // Add demo itineraries
      const itinerariesRef = collection(db, 'users', user.uid, 'itineraries');
      const demoItineraries = [
        { city: 'Providencia', dateISO: '2024-03-15', createdAt: Timestamp.now() },
        { city: 'Las Condes', dateISO: '2024-04-20', createdAt: Timestamp.now() },
        { city: 'Ñuñoa', dateISO: '2024-05-10', createdAt: Timestamp.now() },
      ];

      for (const itinerary of demoItineraries) {
        await addDoc(itinerariesRef, itinerary);
      }

      // Add demo favorites
      const favoritesRef = collection(db, 'users', user.uid, 'favorites');
      const demoFavorites = [
        { title: 'Cerro San Cristóbal', subtitle: 'Santiago, Chile', placeId: 'place1', createdAt: Timestamp.now() },
        { title: 'Museo Bellas Artes', subtitle: 'Santiago Centro, Chile', placeId: 'place2', createdAt: Timestamp.now() },
        { title: 'Barrio Bellavista', subtitle: 'Santiago, Chile', placeId: 'place3', createdAt: Timestamp.now() },
        { title: 'Costanera Center', subtitle: 'Providencia, Chile', placeId: 'place4', createdAt: Timestamp.now() },
        { title: 'Mercado Central', subtitle: 'Santiago Centro, Chile', placeId: 'place5', createdAt: Timestamp.now() },
      ];

      for (const favorite of demoFavorites) {
        await addDoc(favoritesRef, favorite);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
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
                    onPress={() => console.log('Open recommendation:', recommendation.id)}
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

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actividad</Text>

          {/* Saved Itineraries */}
          <View style={styles.subsection}>
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Itinerarios guardados</Text>
              {itineraries.length > 0 && (
                <Pressable onPress={() => console.log('Ver todos los itinerarios')}>
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
                  color={theme.colors.textLight}
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
                <Pressable onPress={() => console.log('Ver todos los favoritos')}>
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
                      onPress={() => console.log('Open favorite:', favorite.id)}
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
                  color={theme.colors.textLight}
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

        {/* Demo Button */}
        {(itineraries.length === 0 || favorites.length === 0) && (
          <View style={styles.demoSection}>
            <AnimatedPressable
              onPress={handleLoadDemo}
              style={styles.demoButton}
            >
              <MaterialCommunityIcons
                name="magic-staff"
                size={20}
                color={theme.colors.text.inverse}
              />
              <Text style={styles.demoButtonText}>Cargar datos de demo</Text>
            </AnimatedPressable>
          </View>
        )}
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
              <MaterialCommunityIcons name="close" size={28} color={theme.colors.text} />
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
                        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.textLight} />
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
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
    color: theme.colors.text,
  },
  activityCard: {
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.textLight,
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
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  activityNotes: {
    fontSize: 14,
    color: theme.colors.textLight,
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
    color: theme.colors.text,
    lineHeight: 20,
  },
});

export default HomeScreen;
