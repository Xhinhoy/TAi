import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

export default function InterestTag({ label, selected, onPress, testID }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tag, selected && styles.tagSelected]}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    backgroundColor: theme.colors.surface.primary,
    margin: theme.spacing.xs,
  },
  tagSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary.main,
  },
  text: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  textSelected: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeights.semiBold,
  },
});