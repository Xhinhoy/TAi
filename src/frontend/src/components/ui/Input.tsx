import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  AccessibilityInfo,
} from 'react-native';
import { theme } from '../../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: any;
  inputStyle?: any;
  required?: boolean;
  disabled?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      required = false,
      disabled = false,
      accessibilityLabel,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={[styles.label, hasError && styles.labelError]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <View style={[
          styles.inputContainer,
          hasError && styles.inputContainerError,
          disabled && styles.inputContainerDisabled
        ]}>
          {leftIcon && (
            <View style={styles.leftIcon}>
              {leftIcon}
            </View>
          )}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              rightIcon && styles.inputWithRightIcon,
              inputStyle
            ]}
            placeholderTextColor={theme.colors.text.tertiary}
            editable={!disabled}
            accessibilityLabel={accessibilityLabel || label}
            accessibilityHint={helperText}
            accessibilityRequired={required}
            nativeID={inputId}
            {...props}
          />

          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              accessibilityRole="button"
              accessibilityLabel="Acción del campo"
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>

        {(error || helperText) && (
          <Text style={[
            styles.helperText,
            hasError && styles.errorText
          ]}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  labelError: {
    color: theme.colors.error.main,
  },
  required: {
    color: theme.colors.error.main,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface.primary,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
  },
  inputContainerError: {
    borderColor: theme.colors.error.main,
    borderWidth: 2,
  },
  inputContainerDisabled: {
    backgroundColor: theme.colors.neutral[100],
    borderColor: theme.colors.border.secondary,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 0,
  },
  inputWithLeftIcon: {
    marginLeft: theme.spacing.sm,
  },
  inputWithRightIcon: {
    marginRight: theme.spacing.sm,
  },
  leftIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xs,
  },
  helperText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error.main,
  },
});

Input.displayName = 'Input';