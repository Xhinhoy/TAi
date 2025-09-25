import React from 'react';
import {
  Pressable,
  PressableProps,
  ViewStyle,
} from 'react-native';

interface AnimatedPressableProps extends PressableProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  style,
  children,
  ...props
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        style,
        pressed && { opacity: 0.7 }
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
};