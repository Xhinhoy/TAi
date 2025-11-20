import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface ErrorNoticeProps {
  message: string;
  variant?: 'error' | 'success' | 'info';
  onClose?: () => void;
  testID?: string;
}

export const ErrorNotice: React.FC<ErrorNoticeProps> = ({
  message,
  variant = 'error',
  onClose,
  testID,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.success[50],
          borderColor: theme.colors.success.main,
          iconColor: theme.colors.success.main,
          textColor: theme.colors.success[700],
          iconName: 'check-circle' as const,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.primary[50],
          borderColor: theme.colors.primary.main,
          iconColor: theme.colors.primary.main,
          textColor: theme.colors.primary[700],
          iconName: 'information' as const,
        };
      default: // error
        return {
          backgroundColor: theme.colors.error[50],
          borderColor: theme.colors.error.main,
          iconColor: theme.colors.error.main,
          textColor: theme.colors.error[700],
          iconName: 'alert-circle' as const,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={variantStyles.iconName}
          size={20}
          color={variantStyles.iconColor}
          style={styles.icon}
        />
        <Text
          style={[
            styles.message,
            { color: variantStyles.textColor },
          ]}
          accessibilityLabel={`${variant === 'error' ? 'Error' : variant === 'success' ? 'Éxito' : 'Información'}: ${message}`}
        >
          {message}
        </Text>
        {onClose && (
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Cerrar notificación"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={variantStyles.iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: theme.spacing.md,
    right: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    lineHeight: theme.typography.lineHeights.normal * theme.typography.fontSizes.sm,
  },
  closeButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
});