import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { INTERESTS, InterestKey } from '../../constants/interests';
import { useLogger } from '../../utils/logger';

interface InterestSelectorProps {
  selected: InterestKey[];
  onChange: (next: InterestKey[]) => void;
  multi?: boolean;
  testID?: string;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  selected,
  onChange,
  multi = true,
  testID,
}) => {
  const logger = useLogger('InterestSelector');

  logger.debug('render', {
    selectedCount: selected.length,
    selected,
    multi,
    testID,
    onChangeExists: !!onChange,
    interestsTotal: INTERESTS.length
  });

  const isSelected = (interestKey: InterestKey) => {
    const result = selected.includes(interestKey);
    logger.debug('isSelected', { interestKey, result, selected });
    return result;
  };

  const handleToggle = (interestKey: InterestKey) => {
    logger.info('handleToggle start', {
      interestKey,
      currentSelected: selected,
      isCurrentlySelected: isSelected(interestKey),
      multi
    });

    let newSelected: InterestKey[];

    if (isSelected(interestKey)) {
      // Deseleccionar
      newSelected = selected.filter(key => key !== interestKey);
      logger.info('deselecting', { interestKey, newSelected });
    } else {
      // Seleccionar
      if (multi) {
        newSelected = [...selected, interestKey];
        logger.info('selecting (multi)', { interestKey, newSelected });
      } else {
        newSelected = [interestKey];
        logger.info('selecting (single)', { interestKey, newSelected });
      }
    }

    logger.info('calling onChange', {
      oldSelected: selected,
      newSelected,
      interestKey
    });

    try {
      onChange(newSelected);
      logger.info('onChange called successfully', { newSelected });
    } catch (error) {
      logger.error('onChange failed', error, { newSelected });
    }
  };

  const renderInterest = ({ item: interest }: { item: typeof INTERESTS[0] }) => {
    const isInterestSelected = isSelected(interest.key);

    logger.debug('renderInterest', {
      interestKey: interest.key,
      interestLabel: interest.label,
      isInterestSelected
    });

    const handleInterestPress = () => {
      logger.info('interest pressed', {
        interestKey: interest.key,
        interestLabel: interest.label,
        isCurrentlySelected: isInterestSelected
      });
      handleToggle(interest.key);
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.interestCard,
          isInterestSelected && styles.interestCardSelected,
          pressed && styles.interestCardPressed,
        ]}
        onPress={handleInterestPress}
        accessibilityRole="button"
        accessibilityLabel={`${interest.label}`}
        accessibilityState={{ selected: isInterestSelected }}
        testID={`interest-${interest.key}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.interestIcon}>
          <MaterialCommunityIcons
            name={interest.icon as any || 'help-circle'}
            size={24}
            color={
              isInterestSelected
                ? theme.colors.primary.main
                : theme.colors.neutral[600]
            }
          />
        </View>
        <Text
          style={[
            styles.interestName,
            isInterestSelected && styles.interestNameSelected,
          ]}
        >
          {interest.label}
        </Text>
        {isInterestSelected && (
          <View style={styles.checkmark}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={theme.colors.primary.main}
            />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        data={INTERESTS}
        renderItem={renderInterest}
        keyExtractor={(item) => item.key}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  interestCard: {
    width: '30%',
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    minHeight: 90,
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
  interestCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  interestIcon: {
    marginBottom: theme.spacing.xs,
  },
  interestName: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  interestNameSelected: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeights.semiBold,
  },
  checkmark: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
  },
});

export default InterestSelector;