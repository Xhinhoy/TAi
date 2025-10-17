import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

// TypeScript interfaces

interface Itinerary {
  id: string;
  city: string;
  dateISO: string;
  image?: string;
  createdAt: Timestamp;
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
    return '€'.repeat(priceLevel) + '€'.repeat(4 - priceLevel);
  };

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
}

const CardItinerario: React.FC<CardItinerarioProps> = ({ itinerary, onPress }) => {
  const formatDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AnimatedPressable
      style={styles.itineraryCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Itinerary for ${itinerary.city}`}
    >
      <View style={styles.itineraryImageContainer}>
        {itinerary.image ? (
          <Image source={{ uri: itinerary.image }} style={styles.itineraryImage} />
        ) : (
          <View style={[styles.itineraryImage, styles.itineraryImagePlaceholder]}>
            <MaterialCommunityIcons
              name="map-marker"
              size={32}
              color={theme.colors.primary.main}
            />
          </View>
        )}
        <View style={styles.itineraryDateBadge}>
          <Text style={styles.itineraryDateText}>
            {formatDate(itinerary.dateISO)}
          </Text>
        </View>
      </View>
      <View style={styles.itineraryContent}>
        <Text style={styles.itineraryCity} numberOfLines={1}>
          {itinerary.city}
        </Text>
        <View style={styles.itineraryMeta}>
          <MaterialCommunityIcons
            name="calendar"
            size={14}
            color={theme.colors.text.secondary}
          />
          <Text style={styles.itineraryMetaText}>Próximo viaje</Text>
        </View>
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

  // Use new preferences system
  const { preferences } = usePreferences();

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
      // Setup real-time listeners

      const itinerariesQuery = query(
        collection(db, 'users', user.uid, 'itineraries'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const unsubscribeItineraries = onSnapshot(itinerariesQuery, (snapshot) => {
        const itinerariesData: Itinerary[] = [];
        snapshot.forEach((doc) => {
          itinerariesData.push({ id: doc.id, ...doc.data() } as Itinerary);
        });
        setItineraries(itinerariesData);
      });

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
        unsubscribeItineraries();
        unsubscribeFavorites();
      };
    } catch (error) {
      console.error('Error setting up user data:', error);
      setLoading(false);
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
                    onPress={() => console.log('Open itinerary:', itinerary.id)}
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
    width: 120,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    ...theme.shadows.sm,
  },
  itineraryImageContainer: {
    position: 'relative',
  },
  itineraryContent: {
    padding: theme.spacing.sm,
  },
  itineraryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itineraryMetaText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  itineraryDateBadge: {
    position: 'absolute',
    bottom: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
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
    backgroundColor: theme.colors.border.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itineraryCity: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    padding: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
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
});

export default HomeScreen;
