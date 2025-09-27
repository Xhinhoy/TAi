import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useLogger } from '../utils/logger';

interface Props {
  label: string;
  uri?: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

export default function InterestTile({ label, uri, icon, selected, onPress, testID }: Props) {
  const logger = useLogger('InterestTile');

  const handlePress = () => {
    logger.debug('handlePress', {
      label,
      selected,
      testID,
      onPressExists: !!onPress
    });

    if (onPress) {
      logger.info('executing onPress', { label });
      onPress();
    } else {
      logger.warn('onPress not provided', { label });
    }
  };

  logger.debug('render', {
    label,
    selected,
    testID,
    uri: !!uri,
    icon: !!icon
  });

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.content}>
        {uri ? (
          <Image source={{ uri }} style={styles.img} />
        ) : icon ? (
          <View style={[styles.img, styles.iconContainer]}>
            <MaterialCommunityIcons
              name={icon as any}
              size={40}
              color={selected ? theme.colors.primary.main : theme.colors.neutral[600]}
            />
          </View>
        ) : (
          <View style={[styles.img, styles.placeholder]} />
        )}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.text, selected && styles.textSelected]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    backgroundColor: theme.colors.surface.primary,
    ...theme.shadows.sm,
  },
  cardSelected: {
    borderColor: theme.colors.primary.main,
    borderWidth: 2,
    backgroundColor: theme.colors.primary[50],
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  content: {
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: 110,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
  },
  placeholder: {
    backgroundColor: theme.colors.neutral[100],
  },
  footer: {
    padding: theme.spacing.sm,
  },
  text: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeights.medium,
    textAlign: 'center',
  },
  textSelected: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeights.semiBold,
  },
});