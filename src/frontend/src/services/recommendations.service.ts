import { UserPreferences } from '../hooks/useUserPreferences';
import { TOURIST_INTERESTS, TouristInterest } from '../components/ui/InterestSelector';
import { recommendationsService, itinerariesService } from '../api/services';
import { Place } from '../types/domain';

export interface PlaceRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  rating: number;
  priceLevel?: 1 | 2 | 3 | 4;
  photos: string[];
  openingHours?: {
    isOpenNow: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  types: string[];
  matchScore: number; // 0-1 score based on user interests
  reason: string; // Why this place was recommended
}

export interface ItineraryRecommendation {
  id: string;
  title: string;
  description: string;
  duration: number; // in hours
  places: PlaceRecommendation[];
  totalDistance: number; // in kilometers
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  difficulty: 'easy' | 'moderate' | 'challenging';
  tags: string[];
}

export class RecommendationsService {
  private static instance: RecommendationsService;

  public static getInstance(): RecommendationsService {
    if (!RecommendationsService.instance) {
      RecommendationsService.instance = new RecommendationsService();
    }
    return RecommendationsService.instance;
  }

  /**
   * Convert Place to PlaceRecommendation format
   */
  private convertToPlaceRecommendation(
    place: Place,
    score: number = 0,
    reason: string = ''
  ): PlaceRecommendation {
    return {
      id: place.id,
      name: place.name,
      description: place.description || '',
      category: place.categories?.[0] || 'other',
      location: {
        latitude: place.coords?.latitude || 0,
        longitude: place.coords?.longitude || 0,
        address: place.address || '',
      },
      rating: place.rating || 0,
      priceLevel: place.priceLevel as 1 | 2 | 3 | 4,
      photos: place.photos || [],
      types: place.categories || [],
      matchScore: score,
      reason: reason,
    };
  }

  /**
   * Calculate the match score between user interests and a place
   */
  private calculateMatchScore(place: any, userInterests: string[]): number {
    if (userInterests.length === 0) return 0; // No score if no interests selected

    let totalScore = 0;
    let matchCount = 0;

    for (const interestId of userInterests) {
      const interest = TOURIST_INTERESTS.find(i => i.id === interestId);
      if (!interest) continue;

      // Check if place types match the interest category
      const categoryMatch = this.doesPlaceMatchInterest(place, interest);
      if (categoryMatch) {
        totalScore += categoryMatch;
        matchCount++;
      }
    }

    return matchCount > 0 ? totalScore / matchCount : 0; // Return 0 if no matches
  }

  /**
   * Check if a place matches a specific tourist interest
   */
  private doesPlaceMatchInterest(place: any, interest: TouristInterest): number {
    const placeTypes = place.types || [];

    // Define mappings between interests and Google Places types
    const interestToTypesMap: Record<string, { types: string[]; score: number }[]> = {
      'museos': [
        { types: ['museum', 'art_gallery'], score: 1.0 },
        { types: ['cultural_center', 'historical_landmark'], score: 0.8 }
      ],
      'monumentos': [
        { types: ['historical_landmark', 'monument'], score: 1.0 },
        { types: ['church', 'castle', 'archaeological_site'], score: 0.9 }
      ],
      'parques': [
        { types: ['park', 'national_park'], score: 1.0 },
        { types: ['botanical_garden', 'zoo'], score: 0.8 }
      ],
      'restaurantes': [
        { types: ['restaurant'], score: 1.0 },
        { types: ['meal_takeaway', 'food'], score: 0.7 }
      ],
      'bares': [
        { types: ['bar', 'cafe'], score: 1.0 },
        { types: ['night_club', 'liquor_store'], score: 0.8 }
      ],
      'playa': [
        { types: ['beach', 'waterfront'], score: 1.0 },
        { types: ['marina', 'pier'], score: 0.7 }
      ],
      'senderismo': [
        { types: ['hiking_trail', 'nature_preserve'], score: 1.0 },
        { types: ['mountain', 'forest'], score: 0.8 }
      ],
      'vida-nocturna': [
        { types: ['night_club', 'bar'], score: 1.0 },
        { types: ['live_music_venue', 'theater'], score: 0.8 }
      ],
      'compras': [
        { types: ['shopping_mall', 'store'], score: 1.0 },
        { types: ['market', 'souvenir_store'], score: 0.8 }
      ],
      'arquitectura': [
        { types: ['historical_landmark', 'church'], score: 1.0 },
        { types: ['skyscraper', 'bridge'], score: 0.8 }
      ],
      'mercados': [
        { types: ['market', 'farmers_market'], score: 1.0 },
        { types: ['grocery_or_supermarket', 'food'], score: 0.6 }
      ],
      'deportes': [
        { types: ['sports_complex', 'stadium'], score: 1.0 },
        { types: ['gym', 'swimming_pool'], score: 0.7 }
      ]
    };

    const mappings = interestToTypesMap[interest.id] || [];

    for (const mapping of mappings) {
      for (const type of mapping.types) {
        if (placeTypes.includes(type)) {
          return mapping.score;
        }
      }
    }

    return 0;
  }

  /**
   * Generate recommendations based on user preferences
   * Now using the backend AI-powered recommendation engine
   */
  public async generateRecommendations(
    preferences: UserPreferences,
    userId: string,
    location?: { latitude: number; longitude: number },
    limit: number = 10
  ): Promise<PlaceRecommendation[]> {
    try {
      // Call the backend API for personalized recommendations
      const recommendations = await recommendationsService.getPersonalized({
        user_id: userId,
        location,
        limit,
        categories: preferences.interests,
      });

      // Convert to PlaceRecommendation format
      return recommendations.map(rec =>
        this.convertToPlaceRecommendation(rec.place, rec.score, rec.reasoning)
      );
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);

      // Fallback to local mock data if backend fails
      return this.getFallbackRecommendations(preferences, limit);
    }
  }

  /**
   * Fallback recommendations using local mock data
   */
  private getFallbackRecommendations(
    preferences: UserPreferences,
    limit: number = 10
  ): PlaceRecommendation[] {
    const mockPlaces = this.getMockPlaces();

    // Calculate match scores for each place
    const scoredPlaces = mockPlaces.map(place => ({
      ...place,
      matchScore: this.calculateMatchScore(place, preferences.interests),
      reason: this.generateRecommendationReason(place, preferences.interests)
    }));

    // Only show places that match user interests
    const filteredPlaces = scoredPlaces.filter(place => place.matchScore > 0);

    // If user has no interests selected, return empty array
    if (preferences.interests.length === 0) {
      return [];
    }

    // Sort by match score and return
    return filteredPlaces
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Generate a reason why a place was recommended
   */
  private generateRecommendationReason(place: any, userInterests: string[]): string {
    const matchingInterests = userInterests
      .map(interestId => TOURIST_INTERESTS.find(i => i.id === interestId))
      .filter(interest => interest && this.doesPlaceMatchInterest(place, interest) > 0)
      .map(interest => interest!.name);

    if (matchingInterests.length === 0) {
      return 'Lugar recomendado';
    }

    if (matchingInterests.length === 1) {
      return `Recomendado porque te gusta ${matchingInterests[0].toLowerCase()}`;
    }

    if (matchingInterests.length === 2) {
      return `Ideal para ${matchingInterests[0].toLowerCase()} y ${matchingInterests[1].toLowerCase()}`;
    }

    return `Perfecto para tus intereses en ${matchingInterests.slice(0, 2).join(', ').toLowerCase()} y más`;
  }

  /**
   * Get mock places data for Santiago, Providencia (in real app, this would come from APIs)
   */
  private getMockPlaces(): any[] {
    return [
      {
        id: 'museo-nacional-bellas-artes',
        name: 'Museo Nacional de Bellas Artes',
        description: 'El principal museo de artes visuales de Chile',
        category: 'museum',
        location: {
          latitude: -33.4372,
          longitude: -70.6506,
          address: 'José Miguel de la Barra 650, Santiago'
        },
        rating: 4.4,
        priceLevel: 1,
        photos: [],
        types: ['museum', 'art_gallery', 'tourist_attraction'],
      },
      {
        id: 'parque-metropolitano',
        name: 'Parque Metropolitano (Cerro San Cristóbal)',
        description: 'El parque urbano más grande de Santiago con vistas panorámicas',
        category: 'park',
        location: {
          latitude: -33.4172,
          longitude: -70.6344,
          address: 'Pío Nono 450, Recoleta'
        },
        rating: 4.6,
        priceLevel: 1,
        photos: [],
        types: ['park', 'tourist_attraction', 'nature_preserve'],
      },
      {
        id: 'barrio-bellavista',
        name: 'Barrio Bellavista',
        description: 'Vibrante barrio bohemio con arte, restaurantes y vida nocturna',
        category: 'neighborhood',
        location: {
          latitude: -33.4267,
          longitude: -70.6344,
          address: 'Bellavista, Santiago'
        },
        rating: 4.3,
        priceLevel: 2,
        photos: [],
        types: ['neighborhood', 'bar', 'restaurant', 'art_gallery'],
      },
      {
        id: 'costanera-center',
        name: 'Costanera Center',
        description: 'Moderno centro comercial con el rascacielos más alto de Sudamérica',
        category: 'shopping',
        location: {
          latitude: -33.4181,
          longitude: -70.6061,
          address: 'Av. Andrés Bello 2425, Providencia'
        },
        rating: 4.2,
        priceLevel: 3,
        photos: [],
        types: ['shopping_mall', 'restaurant', 'tourist_attraction'],
      },
      {
        id: 'mercado-central',
        name: 'Mercado Central',
        description: 'Histórico mercado con mariscos frescos y gastronomía chilena',
        category: 'market',
        location: {
          latitude: -33.4370,
          longitude: -70.6506,
          address: 'San Pablo 967, Santiago'
        },
        rating: 4.1,
        priceLevel: 2,
        photos: [],
        types: ['market', 'food', 'restaurant', 'tourist_attraction'],
      },
      {
        id: 'plaza-de-armas',
        name: 'Plaza de Armas',
        description: 'La plaza principal e histórica de Santiago de Chile',
        category: 'landmark',
        location: {
          latitude: -33.4372,
          longitude: -70.6506,
          address: 'Plaza de Armas, Santiago Centro'
        },
        rating: 4.0,
        priceLevel: 1,
        photos: [],
        types: ['tourist_attraction', 'historical_landmark'],
      },
      {
        id: 'barrio-providencia',
        name: 'Barrio Providencia',
        description: 'Elegante distrito con restaurantes, cafés y tiendas de diseño',
        category: 'neighborhood',
        location: {
          latitude: -33.4189,
          longitude: -70.6061,
          address: 'Providencia, Santiago'
        },
        rating: 4.4,
        priceLevel: 3,
        photos: [],
        types: ['neighborhood', 'restaurant', 'shopping', 'cafe'],
      },
      {
        id: 'cerro-santa-lucia',
        name: 'Cerro Santa Lucía',
        description: 'Histórico cerro con jardines y vistas de la ciudad',
        category: 'park',
        location: {
          latitude: -33.4408,
          longitude: -70.6431,
          address: 'Santa Lucía, Santiago Centro'
        },
        rating: 4.3,
        priceLevel: 1,
        photos: [],
        types: ['park', 'tourist_attraction', 'historical_landmark'],
      },
    ];
  }

  /**
   * Create a personalized itinerary based on user preferences
   * Now using the backend AI-powered itinerary generator
   */
  public async createItinerary(
    userId: string,
    preferences: UserPreferences,
    destination: string,
    startDate: string,
    endDate: string,
    duration: number, // in hours
    location?: { latitude: number; longitude: number }
  ): Promise<ItineraryRecommendation> {
    try {
      // Call the backend API to generate an AI-powered itinerary
      const itinerary = await itinerariesService.generate({
        user_id: userId,
        destination,
        start_date: startDate,
        end_date: endDate,
        preferences: {
          budget: preferences.budget,
          interests: preferences.interests,
          pace: 'moderate' as const,
        },
      });

      // Convert to ItineraryRecommendation format
      return {
        id: itinerary.id,
        title: itinerary.title,
        description: itinerary.description || 'Itinerario generado por IA',
        duration,
        places: itinerary.places?.map(place =>
          this.convertToPlaceRecommendation(place, 1.0, 'Recomendado por IA')
        ) || [],
        totalDistance: 0, // TODO: Calculate from itinerary data
        estimatedCost: {
          min: 15000,
          max: 50000,
          currency: 'CLP'
        },
        difficulty: 'moderate',
        tags: preferences.interests.slice(0, 3)
      };
    } catch (error) {
      console.error('Error generating itinerary:', error);

      // Fallback to local generation
      return this.createFallbackItinerary(userId, preferences, duration, location);
    }
  }

  /**
   * Fallback itinerary creation using local logic
   */
  private async createFallbackItinerary(
    userId: string,
    preferences: UserPreferences,
    duration: number,
    location?: { latitude: number; longitude: number }
  ): Promise<ItineraryRecommendation> {
    const places = await this.generateRecommendations(preferences, userId, location, 8);

    // Simple itinerary creation logic
    const selectedPlaces = places.slice(0, Math.min(5, places.length));

    return {
      id: `itinerary-${Date.now()}`,
      title: 'Tu itinerario personalizado',
      description: 'Itinerary creado basado en tus intereses turísticos',
      duration,
      places: selectedPlaces,
      totalDistance: 5.2, // Mock distance
      estimatedCost: {
        min: 15000,
        max: 50000,
        currency: 'CLP'
      },
      difficulty: 'easy',
      tags: preferences.interests.slice(0, 3)
    };
  }

  /**
   * Get trending places from the backend
   */
  public async getTrendingPlaces(limit: number = 10): Promise<PlaceRecommendation[]> {
    try {
      const places = await recommendationsService.getTrending(limit);
      return places.map(place =>
        this.convertToPlaceRecommendation(place, 1.0, 'Trending ahora')
      );
    } catch (error) {
      console.error('Error getting trending places:', error);
      return [];
    }
  }

  /**
   * Get recommendations by category
   */
  public async getRecommendationsByCategory(
    category: string,
    limit: number = 10
  ): Promise<PlaceRecommendation[]> {
    try {
      const places = await recommendationsService.getByCategory(category, limit);
      return places.map(place =>
        this.convertToPlaceRecommendation(place, 1.0, `Recomendado en ${category}`)
      );
    } catch (error) {
      console.error('Error getting category recommendations:', error);
      return [];
    }
  }
}

export const localRecommendationsService = RecommendationsService.getInstance();