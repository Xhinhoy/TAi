import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../../styles/theme';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  checkboxStyle?: ViewStyle;
  accessibilityLabel?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  label,
  children,
  disabled = false,
  error = false,
  size = 'md',
  containerStyle,
  labelStyle,
  checkboxStyle,
  accessibilityLabel,
}) => {
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && styles.containerDisabled,
        containerStyle,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel || label}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          sizeStyles.checkbox,
          checked && styles.checkboxChecked,
          error && styles.checkboxError,
          disabled && styles.checkboxDisabled,
          checkboxStyle,
        ]}
      >
        {checked && (
          <Text
            style={[
              styles.checkmark,
              sizeStyles.checkmark,
              disabled && styles.checkmarkDisabled,
            ]}
          >
            ✓
          </Text>
        )}
      </View>

      {(label || children) && (
        <View style={styles.labelContainer}>
          {label && (
            <Text
              style={[
                styles.label,
                sizeStyles.label,
                error && styles.labelError,
                disabled && styles.labelDisabled,
                labelStyle,
              ]}
            >
              {label}
            </Text>
          )}
          {children}
        </View>
      )}
    </TouchableOpacity>
  );
};

const getSizeStyles = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return {
        checkbox: { width: 16, height: 16 },
        checkmark: { fontSize: 10 },
        label: { fontSize: theme.typography.fontSizes.xs },
      };
    case 'lg':
      return {
        checkbox: { width: 24, height: 24 },
        checkmark: { fontSize: 16 },
        label: { fontSize: theme.typography.fontSizes.lg },
      };
    default: // md
      return {
        checkbox: { width: 20, height: 20 },
        checkmark: { fontSize: 14 },
        label: { fontSize: theme.typography.fontSizes.sm },
      };
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  checkbox: {
    borderWidth: 2,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.colors.surface.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  checkboxError: {
    borderColor: theme.colors.error.main,
  },
  checkboxDisabled: {
    backgroundColor: theme.colors.neutral[100],
    borderColor: theme.colors.neutral[300],
  },
  checkmark: {
    color: theme.colors.neutral.white,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 1,
  },
  checkmarkDisabled: {
    color: theme.colors.neutral[400],
  },
  labelContainer: {
    flex: 1,
    marginTop: -2, // Pequeño ajuste para alineación visual
  },
  label: {
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeights.normal * theme.typography.fontSizes.sm,
  },
  labelError: {
    color: theme.colors.error.main,
  },
  labelDisabled: {
    color: theme.colors.text.disabled,
  },
});