import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const isDisabled = disabled || loading;
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles.button,
        sizeStyles.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.buttonDisabled,
        isDisabled && variantStyles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size={sizeStyles.spinnerSize}
            color={variantStyles.text.color}
            style={styles.spinner}
          />
        ) : (
          <>
            {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
            <Text
              style={[
                styles.text,
                variantStyles.text,
                sizeStyles.text,
                isDisabled && styles.textDisabled,
                isDisabled && variantStyles.textDisabled,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const getVariantStyles = (variant: ButtonProps['variant']) => {
  switch (variant) {
    case 'secondary':
      return {
        button: {
          backgroundColor: theme.colors.secondary.main,
          borderColor: theme.colors.secondary.main,
          borderWidth: 1,
        },
        buttonDisabled: {
          backgroundColor: theme.colors.neutral[200],
          borderColor: theme.colors.neutral[200],
        },
        text: {
          color: theme.colors.neutral.white,
        },
        textDisabled: {
          color: theme.colors.text.disabled,
        },
      };

    case 'outline':
      return {
        button: {
          backgroundColor: 'transparent',
          borderColor: theme.colors.primary.main,
          borderWidth: 1,
        },
        buttonDisabled: {
          backgroundColor: 'transparent',
          borderColor: theme.colors.neutral[300],
        },
        text: {
          color: theme.colors.primary.main,
        },
        textDisabled: {
          color: theme.colors.text.disabled,
        },
      };

    case 'ghost':
      return {
        button: {
          backgroundColor: 'transparent',
        },
        buttonDisabled: {
          backgroundColor: 'transparent',
        },
        text: {
          color: theme.colors.primary.main,
        },
        textDisabled: {
          color: theme.colors.text.disabled,
        },
      };

    case 'danger':
      return {
        button: {
          backgroundColor: theme.colors.error.main,
          borderColor: theme.colors.error.main,
          borderWidth: 1,
        },
        buttonDisabled: {
          backgroundColor: theme.colors.neutral[200],
          borderColor: theme.colors.neutral[200],
        },
        text: {
          color: theme.colors.neutral.white,
        },
        textDisabled: {
          color: theme.colors.text.disabled,
        },
      };

    default: // primary
      return {
        button: {
          backgroundColor: theme.colors.primary.main,
          borderColor: theme.colors.primary.main,
          borderWidth: 1,
        },
        buttonDisabled: {
          backgroundColor: theme.colors.neutral[200],
          borderColor: theme.colors.neutral[200],
        },
        text: {
          color: theme.colors.neutral.white,
        },
        textDisabled: {
          color: theme.colors.text.disabled,
        },
      };
  }
};

const getSizeStyles = (size: ButtonProps['size']) => {
  switch (size) {
    case 'sm':
      return {
        button: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          minHeight: 36,
        },
        text: {
          fontSize: theme.typography.fontSizes.sm,
        },
        spinnerSize: 'small' as const,
      };

    case 'lg':
      return {
        button: {
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing.lg,
          minHeight: 56,
        },
        text: {
          fontSize: theme.typography.fontSizes.lg,
        },
        spinnerSize: 'large' as const,
      };

    default: // md
      return {
        button: {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          minHeight: 48,
        },
        text: {
          fontSize: theme.typography.fontSizes.base,
        },
        spinnerSize: 'small' as const,
      };
  }
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: theme.typography.fontWeights.semiBold,
    textAlign: 'center',
  },
  textDisabled: {
    // Estilos adicionales para texto deshabilitado se manejan en getVariantStyles
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: theme.spacing.sm,
  },
  spinner: {
    // El ActivityIndicator ya tiene su propio estilo
  },
});