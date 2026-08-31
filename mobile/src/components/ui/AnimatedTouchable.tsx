// AnimatedTouchable.tsx - Interactive button with smooth spring bounce animation
import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface AnimatedTouchableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  activeOpacity?: number;
}

export const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  children,
  style,
  scaleTo = 0.96,
  activeOpacity = 0.85,
  onPress,
  disabled,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleTo,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(opacityAnim, {
        toValue: activeOpacity,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};
