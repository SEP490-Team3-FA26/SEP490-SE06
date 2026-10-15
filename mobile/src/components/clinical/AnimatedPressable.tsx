// AnimatedPressable.tsx - Tactile Spring Pressable using Reanimated 4 Worklets
import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MotionTokens } from '../../theme/tokens';

export interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  pressedScale = MotionTokens.scale.pressed,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.55 : 1,
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    scale.value = withSpring(pressedScale, MotionTokens.buttonSpring);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;
    scale.value = withSpring(MotionTokens.scale.default, MotionTokens.buttonSpring);
    onPressOut?.(e);
  };

  return (
    <ReanimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </ReanimatedPressable>
  );
};
