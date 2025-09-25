import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

interface GradientViewProps {
  gradient?: keyof typeof theme.gradients;
  colors?: string[];
  start?: [number, number];
  end?: [number, number];
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const GradientView: React.FC<GradientViewProps> = ({
  gradient = 'primary',
  colors,
  start = [0, 0],
  end = [1, 1],
  style,
  children,
}) => {
  const gradientColors = colors || theme.gradients[gradient];

  return (
    <LinearGradient
      colors={gradientColors}
      start={start}
      end={end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
};

// Gradiente como fondo de pantalla
export const GradientBackground: React.FC<{
  gradient?: keyof typeof theme.gradients;
  children: React.ReactNode;
}> = ({ gradient = 'subtle', children }) => (
  <GradientView
    gradient={gradient}
    style={{ flex: 1 }}
    start={[0, 0]}
    end={[0, 1]}
  >
    {children}
  </GradientView>
);

// Gradiente para cards
export const GradientCard: React.FC<{
  gradient?: keyof typeof theme.gradients;
  style?: ViewStyle;
  children: React.ReactNode;
}> = ({ gradient = 'primary', style, children }) => (
  <GradientView
    gradient={gradient}
    style={[
      {
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
      },
      style,
    ]}
  >
    {children}
  </GradientView>
);