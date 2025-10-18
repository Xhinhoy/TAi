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
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getIdToken } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

// Firebase services
import { auth, db } from '../../services/firebase';

// UI / hooks
import { theme } from '../../styles/theme';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { usePreferences } from '../../contexts/PreferencesContext';
import { recommendationsService, PersonalizedRecommendation } from '../../api/services';
import { TOURIST_INTERESTS } from '../../components/ui/InterestSelector';

// Tipos locales
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

// Mostrar intereses visualmente
const getDisplayableInterests = (userInterests: string[]) =>
  TOURIST_INTERESTS.filter((i) => userInterests.includes(i.id));

const InterestBadge = ({ interest }: { interest: typeof TOURIST_INTERESTS[0] }) => (
  <View style={styles.interestBadge}>
    <MaterialCommunityIcons name={interest.icon as any} size={16} color={theme.colors.primary.main} />
    <Text style={styles.interestBadgeText}>{interest.name}</Text>
  </View>
);

// Tarjeta de recomendación
interface RecommendationCardProps {
  recommendation: {
    id: string;
    name: string;
    description: string;
    rating: number;
    reason: string;
    matchScore: number;
    priceLevel?: number;
    openNow?: boolean | null; // ✅ nuevo campo
  };
  onPress: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onPress }) => {
  const getPriceText = (priceLevel?: number) =>
    priceLevel ? '€'.repeat(priceLevel) + '€'.repeat(4 - priceLevel) : 'Precio no disponible';

  return (
    <AnimatedPressable style={styles.recommendationCard} onPress={onPress}>
      <View style={styles.recommendationContent}>
        <View style={styles.recommendationHeader}>
          <Text style={styles.recommendationName} numberOfLines={1}>
            {recommendation.name}
          </Text>
          <View style={styles.recommendationRating}>
            <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{recommendation.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.recommendationDescription} numberOfLines={2}>
          {recommendation.description}
        </Text>
      <View style={{ marginTop: 4 }}>
      <Text
        style={{
          fontSize: 12,
          color: recommendation.openNow ? 'green' : theme.colors.text.secondary,
          fontWeight: '500',
        }}
      >
        {recommendation.openNow === true
          ? '🟢 Abierto ahora'
          : recommendation.openNow === false
          ? '🔴 Cerrado'
          : 'Horario no disponible'}
      </Text>

      {/* Mostrar los horarios semanales si existen */}
      {recommendation?.opening_hours?.weekday_text?.length > 0 && (
        <View style={{ marginTop: 4 }}>
          {recommendation.opening_hours.weekday_text.map((line: string, idx: number) => (
            <Text key={idx} style={{ fontSize: 10, color: theme.colors.text.tertiary }}>
              {line}
            </Text>
          ))}
        </View>
      )}

<Text style={{ fontSize: 10, color: theme.colors.text.tertiary, marginTop: 4 }}>
  Última actualización: {new Date().toLocaleTimeString()}
</Text>
</View>

        <Text style={{ fontSize: 10, color: theme.colors.text.tertiary, marginTop: 2 }}>
          Última actualización: {new Date().toLocaleTimeString()}
        </Text>
        <View style={styles.recommendationFooter}>
          <Text style={styles.recommendationReason} numberOfLines={1}>
            {recommendation.reason}
          </Text>
          {recommendation.priceLevel && (
            <Text style={styles.priceLevel}>{getPriceText(recommendation.priceLevel)}</Text>
          )}
        </View>

        <View style={styles.matchScoreBadge}>
          <Text style={styles.matchScoreText}>{Math.round(recommendation.matchScore * 100)}% match</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
};

// Tarjeta itinerario
const CardItinerario = ({ itinerary, onPress }: { itinerary: Itinerary; onPress: () => void }) => {
  const formatDate = (dateISO: string) =>
    new Date(dateISO).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

  return (
    <AnimatedPressable style={styles.itineraryCard} onPress={onPress}>
      <View style={styles.itineraryImageContainer}>
        {itinerary.image ? (
          <Image source={{ uri: itinerary.image }} style={styles.itineraryImage} />
        ) : (
          <View style={[styles.itineraryImage, styles.itineraryImagePlaceholder]}>
            <MaterialCommunityIcons name="map-marker" size={32} color={theme.colors.primary.main} />
          </View>
        )}
        <View style={styles.itineraryDateBadge}>
          <Text style={styles.itineraryDateText}>{formatDate(itinerary.dateISO)}</Text>
        </View>
      </View>
      <View style={styles.itineraryContent}>
        <Text style={styles.itineraryCity} numberOfLines={1}>
          {itinerary.city}
        </Text>
        <View style={styles.itineraryMeta}>
          <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.text.secondary} />
          <Text style={styles.itineraryMetaText}>Próximo viaje</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
};

// Componente principal
const HomeScreen: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { preferences } = usePreferences();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) setupUserData(user);
      else setLoading(false);
    });
    return unsubscribe;
  }, []);
// ✅ NUEVO BLOQUE: obtener el token JWT de Firebase
useEffect(() => {
  const fetchToken = async () => {
    if (auth.currentUser) {
      const token = await getIdToken(auth.currentUser);
      console.log("🔑 TOKEN FIREBASE:", token);
    } else {
      console.log("⚠️ No hay usuario autenticado todavía.");
    }
  };

  fetchToken();
}, [user]);

  useEffect(() => {
    const generateRecommendations = async () => {
      if (!user || preferences.interests.length === 0) {
        setRecommendations([]);
        return;
      }
      try {
        const response = await recommendationsService.getPersonalized({
          user_id: user.uid,
          location: { latitude: -33.45, longitude: -70.66 },
          limit: 10,
        });
        setRecommendations(response.recommendations || []);
      } catch (error) {
        console.error('❌ Error obteniendo recomendaciones:', error);
        setRecommendations([]);
      }
    };
    setTimeout(() => generateRecommendations(), 300);
  }, [user, preferences.interests]);

  const setupUserData = async (user: FirebaseUser) => {
    try {
      const itinerariesQuery = query(
        collection(db, 'users', user.uid, 'itineraries'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      onSnapshot(itinerariesQuery, (snap) =>
        setItineraries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Itinerary)))
      );

      const favoritesQuery = query(
        collection(db, 'users', user.uid, 'favorites'),
        orderBy('createdAt', 'desc'),
        limit(8)
      );
      onSnapshot(favoritesQuery, (snap) =>
        setFavorites(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Favorite)))
      );

      setLoading(false);
    } catch (error) {
      console.error('Error setting up user data:', error);
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    if (!user) return;
    try {
      const itinerariesRef = collection(db, 'users', user.uid, 'itineraries');
      const favoritesRef = collection(db, 'users', user.uid, 'favorites');
      await Promise.all([
        addDoc(itinerariesRef, { city: 'Providencia', dateISO: '2024-03-15', createdAt: Timestamp.now() }),
        addDoc(favoritesRef, {
          title: 'Cerro San Cristóbal',
          subtitle: 'Santiago, Chile',
          placeId: 'place1',
          createdAt: Timestamp.now(),
        }),
      ]);
    } catch (error) {
      console.error('Error loading demo data:', error);
    }
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );

  if (!user)
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Inicia sesión para ver tu contenido</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View style={styles.greetingSection}>
              <Text style={styles.welcomeText}>¡Hola de nuevo!</Text>
              <Text style={styles.subtitle}>¿Listo para tu próxima aventura?</Text>
            </View>
            <MaterialCommunityIcons name="airplane" size={28} color={theme.colors.primary.main} />
          </View>
        </View>

        {/* Intereses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus intereses turísticos</Text>
          {preferences.interests.length > 0 ? (
            <View style={styles.interestsGrid}>
              {getDisplayableInterests(preferences.interests).map((i) => (
                <InterestBadge key={i.id} interest={i} />
              ))}
            </View>
          ) : (
            <View style={styles.noInterestsHome}>
              <MaterialCommunityIcons name="heart-plus-outline" size={32} color={theme.colors.text.tertiary} />
              <Text style={styles.noInterestsText}>Ve a tu perfil para seleccionar tus intereses turísticos</Text>
            </View>
          )}
        </View>

        {/* Recomendaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendaciones para ti</Text>
          {recommendations.length > 0 ? (
            <>
              <Text style={styles.recommendationsSubtitle}>Basado en tus intereses turísticos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                {recommendations.map((rec, i) => (
                  <RecommendationCard
                    key={i}
                    recommendation={{
                      id: rec.place.id,
                      name: rec.place.name,
                      description: rec.reasoning,
                      rating: rec.place.rating || 0,
                      reason: rec.match_interests?.join(', ') || '',
                      matchScore: rec.score || 0,
                      priceLevel: rec.place.priceLevel,
                      openNow: rec.place.opening_hours?.open_now ?? null, // ✅ agregado
                    }}
                    onPress={() => console.log('Abrir lugar:', rec.place.name)}
                  />
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.noRecommendations}>
              <MaterialCommunityIcons name="heart-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={styles.noRecommendationsTitle}>Selecciona tus intereses</Text>
              <Text style={styles.noRecommendationsSubtitle}>
                Ve a tu perfil y elige tus preferencias turísticas para obtener recomendaciones personalizadas
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles: any = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  loginText: { fontSize: 16, color: theme.colors.text.secondary, textAlign: 'center' },
  headerContainer: { backgroundColor: theme.colors.background.primary, paddingVertical: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg },
  greetingSection: { flex: 1 },
  welcomeText: { fontSize: 28, fontWeight: '700', color: theme.colors.text.primary },
  subtitle: { fontSize: 16, color: theme.colors.text.secondary },
  section: { marginBottom: theme.spacing.xxl },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    margin: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  interestBadgeText: { fontSize: 12, fontWeight: '500', color: theme.colors.primary.main, marginLeft: theme.spacing.xs },
  noInterestsHome: { alignItems: 'center', paddingVertical: theme.spacing.xl },
  noInterestsText: { fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center' },
  recommendationsSubtitle: { fontSize: 14, color: theme.colors.text.secondary, paddingHorizontal: theme.spacing.lg },
  recommendationCard: {
    width: 260,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  recommendationHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  recommendationName: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary },
  recommendationRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.xs,
  },
  ratingText: { fontSize: 12, marginLeft: 2 },
  recommendationDescription: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm },
  recommendationFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  recommendationReason: { fontSize: 12, color: theme.colors.primary.main },
  matchScoreBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.accent.main,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.xs,
  },
  matchScoreText: { fontSize: 10, fontWeight: '600', color: theme.colors.text.inverse },
});

export default HomeScreen;
