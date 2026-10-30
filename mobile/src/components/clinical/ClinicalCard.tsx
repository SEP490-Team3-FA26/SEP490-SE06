// ClinicalCard.tsx - Crisp 1px bordered card with optional tactile spring interaction
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import {
  ColorTokens,
  RadiusTokens,
  SpacingTokens,
  ShadowTokens,
} from '../../theme/tokens';

export interface ClinicalCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  elevation?: 'none' | 'sm' | 'md';
  activeBorderColor?: string;
  bordered?: boolean;
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  children,
  style,
  onPress,
  padded = true,
  elevation = 'sm',
  activeBorderColor,
  bordered = true,
}) => {
  const getElevationStyle = () => {
    switch (elevation) {
      case 'none':
        return null;
      case 'md':
        return ShadowTokens.md;
      case 'sm':
      default:
        return ShadowTokens.sm;
    }
  };

  const cardStyle = [
    styles.card,
    padded && styles.padded,
    bordered && styles.bordered,
    activeBorderColor ? { borderColor: activeBorderColor } : null,
    getElevationStyle(),
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} style={cardStyle} pressedScale={0.98}>
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: ColorTokens.surface.card,
    borderRadius: RadiusTokens.lg,
  },
  padded: {
    padding: SpacingTokens.base,
  },
  bordered: {
    borderWidth: 1,
    borderColor: ColorTokens.surface.border,
  },
});
