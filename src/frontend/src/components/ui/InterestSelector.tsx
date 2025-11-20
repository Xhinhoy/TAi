import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

export interface TouristInterest {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'cultura' | 'naturaleza' | 'gastronomia' | 'aventura' | 'entretenimiento' | 'historia';
}

export const TOURIST_INTERESTS: TouristInterest[] = [
  {
    id: 'museos',
    name: 'Museos',
    icon: 'bank',
    description: 'Explora arte, historia y cultura',
    category: 'cultura',
  },
  {
    id: 'monumentos',
    name: 'Monumentos',
    icon: 'chess-rook',
    description: 'Descubre arquitectura histórica',
    category: 'historia',
  },
  {
    id: 'parques',
    name: 'Parques',
    icon: 'tree',
    description: 'Disfruta de espacios naturales',
    category: 'naturaleza',
  },
  {
    id: 'restaurantes',
    name: 'Restaurantes',
    icon: 'silverware',
    description: 'Saborea la gastronomía local',
    category: 'gastronomia',
  },
  {
    id: 'bares',
    name: 'Bares y Cafés',
    icon: 'coffee',
    description: 'Relájate en ambientes únicos',
    category: 'gastronomia',
  },
  {
    id: 'playa',
    name: 'Playas',
    icon: 'beach',
    description: 'Disfruta del sol y el mar',
    category: 'naturaleza',
  },
  {
    id: 'senderismo',
    name: 'Senderismo',
    icon: 'hiking',
    description: 'Explora rutas naturales',
    category: 'aventura',
  },
  {
    id: 'vida-nocturna',
    name: 'Vida Nocturna',
    icon: 'music-note',
    description: 'Vive la noche de la ciudad',
    category: 'entretenimiento',
  },
  {
    id: 'compras',
    name: 'Compras',
    icon: 'shopping',
    description: 'Encuentra productos únicos',
    category: 'entretenimiento',
  },
  {
    id: 'arquitectura',
    name: 'Arquitectura',
    icon: 'city',
    description: 'Admira edificios emblemáticos',
    category: 'cultura',
  },
  {
    id: 'mercados',
    name: 'Mercados',
    icon: 'store',
    description: 'Descubre productos locales',
    category: 'gastronomia',
  },
  {
    id: 'deportes',
    name: 'Deportes',
    icon: 'basketball',
    description: 'Actividades deportivas',
    category: 'aventura',
  },
];

interface InterestSelectorProps {
  selectedInterests: string[];
  onInterestToggle: (interestId: string) => void;
  maxSelections?: number;
  showCategories?: boolean;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  selectedInterests,
  onInterestToggle,
  maxSelections,
  showCategories = false,
}) => {
  const isSelected = (interestId: string) => selectedInterests.includes(interestId);

  const canSelect = (interestId: string) => {
    if (isSelected(interestId)) return true;
    if (!maxSelections) return true;
    return selectedInterests.length < maxSelections;
  };

  const renderInterest = (interest: TouristInterest) => {
    const selected = isSelected(interest.id);
    const disabled = !canSelect(interest.id);

    return (
      <Pressable
        key={interest.id}
        style={[
          styles.interestCard,
          selected && styles.interestCardSelected,
          disabled && styles.interestCardDisabled,
        ]}
        onPress={() => {
          console.log('InterestSelector - Interest pressed:', interest.id, 'canSelect:', canSelect(interest.id));
          canSelect(interest.id) && onInterestToggle(interest.id);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${interest.name}: ${interest.description}`}
        accessibilityState={{ selected }}
      >
        <View style={styles.interestIcon}>
          <MaterialCommunityIcons
            name={interest.icon as any}
            size={20}
            color={
              selected
                ? theme.colors.primary.main
                : disabled
                ? theme.colors.neutral[400]
                : theme.colors.neutral[600]
            }
          />
        </View>
        <Text
          style={[
            styles.interestName,
            selected && styles.interestNameSelected,
            disabled && styles.interestNameDisabled,
          ]}
        >
          {interest.name}
        </Text>
        <Text
          style={[
            styles.interestDescription,
            selected && styles.interestDescriptionSelected,
            disabled && styles.interestDescriptionDisabled,
          ]}
        >
          {interest.description}
        </Text>
        {selected && (
          <View style={styles.checkmark}>
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={theme.colors.primary.main}
            />
          </View>
        )}
      </Pressable>
    );
  };

  if (showCategories) {
    const categorizedInterests = TOURIST_INTERESTS.reduce((acc, interest) => {
      if (!acc[interest.category]) {
        acc[interest.category] = [];
      }
      acc[interest.category].push(interest);
      return acc;
    }, {} as Record<string, TouristInterest[]>);

    const categoryNames = {
      cultura: 'Cultura',
      naturaleza: 'Naturaleza',
      gastronomia: 'Gastronomía',
      aventura: 'Aventura',
      entretenimiento: 'Entretenimiento',
      historia: 'Historia',
    };

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {Object.entries(categorizedInterests).map(([category, interests]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {categoryNames[category as keyof typeof categoryNames]}
            </Text>
            <View style={styles.interestsGrid}>
              {interests.map(renderInterest)}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.interestsGrid}>
        {TOURIST_INTERESTS.map(renderInterest)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categorySection: {
    marginBottom: theme.spacing.xxl,
  },
  categoryTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.sm,
    marginHorizontal: -theme.spacing.xs,
  },
  interestCard: {
    width: '31%',
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...theme.shadows.sm,
  },
  interestCardSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary.main,
    borderWidth: 2,
  },
  interestCardDisabled: {
    backgroundColor: theme.colors.neutral[100],
    borderColor: theme.colors.neutral[200],
    opacity: 0.6,
  },
  interestIcon: {
    marginBottom: theme.spacing.xs,
  },
  interestName: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  interestNameSelected: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeights.semiBold,
  },
  interestNameDisabled: {
    color: theme.colors.neutral[400],
  },
  interestDescription: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  interestDescriptionSelected: {
    color: theme.colors.primary[700],
  },
  interestDescriptionDisabled: {
    color: theme.colors.neutral[400],
  },
  checkmark: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
});

export default InterestSelector;