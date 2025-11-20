import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface PasswordStrengthBarProps {
  password: string;
  style?: any;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label = '';
  let color = '';

  switch (score) {
    case 0:
    case 1:
      label = 'Muy débil';
      color = theme.colors.error.main;
      break;
    case 2:
      label = 'Débil';
      color = theme.colors.warning.main;
      break;
    case 3:
      label = 'Regular';
      color = theme.colors.warning.main;
      break;
    case 4:
      label = 'Fuerte';
      color = theme.colors.success.main;
      break;
    case 5:
      label = 'Muy fuerte';
      color = theme.colors.success.main;
      break;
    default:
      label = '';
      color = theme.colors.neutral[300];
  }

  return { score, label, color, checks };
};

export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({
  password,
  style,
}) => {
  const strength = calculatePasswordStrength(password);

  if (!password) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.barContainer}>
        {[...Array(5)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor:
                  index < strength.score
                    ? strength.color
                    : theme.colors.neutral[200],
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.info}>
        <Text style={[styles.label, { color: strength.color }]}>
          {strength.label}
        </Text>

        <View style={styles.requirements}>
          <RequirementItem
            met={strength.checks.length}
            text="Mínimo 8 caracteres"
          />
          <RequirementItem
            met={strength.checks.lowercase}
            text="Una minúscula"
          />
          <RequirementItem
            met={strength.checks.uppercase}
            text="Una mayúscula"
          />
          <RequirementItem
            met={strength.checks.number}
            text="Un número"
          />
          <RequirementItem
            met={strength.checks.special}
            text="Un carácter especial"
          />
        </View>
      </View>
    </View>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => (
  <View style={styles.requirement}>
    <View
      style={[
        styles.checkmark,
        {
          backgroundColor: met
            ? theme.colors.success.main
            : theme.colors.neutral[300],
        },
      ]}
    >
      <Text style={styles.checkmarkText}>{met ? '✓' : '○'}</Text>
    </View>
    <Text
      style={[
        styles.requirementText,
        {
          color: met ? theme.colors.success.main : theme.colors.text.secondary,
        },
      ]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.sm,
  },
  barContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neutral[200],
  },
  info: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    textAlign: 'center',
  },
  requirements: {
    gap: theme.spacing.xs,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 10,
    color: theme.colors.neutral.white,
    fontWeight: theme.typography.fontWeights.bold,
  },
  requirementText: {
    fontSize: theme.typography.fontSizes.xs,
    flex: 1,
  },
});