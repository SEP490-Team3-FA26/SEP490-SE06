// ClinicalBadge.tsx - Status badge component with semantic medical themes
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import {
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  RadiusTokens,
} from '../../theme/tokens';

export type ClinicalBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'emerald';

export interface ClinicalBadgeProps {
  label: string;
  variant?: ClinicalBadgeVariant;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const ClinicalBadge: React.FC<ClinicalBadgeProps> = ({
  label,
  variant = 'neutral',
  icon,
  size = 'md',
  style,
  textStyle,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'success':
      case 'emerald':
        return {
          bg: ColorTokens.semantic.successBg,
          border: ColorTokens.semantic.successBorder,
          text: ColorTokens.emerald[800],
        };
      case 'warning':
        return {
          bg: ColorTokens.semantic.warningBg,
          border: ColorTokens.semantic.warningBorder,
          text: ColorTokens.semantic.warning,
        };
      case 'danger':
        return {
          bg: ColorTokens.semantic.dangerBg,
          border: ColorTokens.semantic.dangerBorder,
          text: ColorTokens.semantic.danger,
        };
      case 'info':
        return {
          bg: ColorTokens.semantic.infoBg,
          border: ColorTokens.semantic.infoBorder,
          text: ColorTokens.semantic.info,
        };
      case 'neutral':
      default:
        return {
          bg: ColorTokens.slate[100],
          border: ColorTokens.slate[200],
          text: ColorTokens.slate[600],
        };
    }
  };

  const theme = getBadgeStyle();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : SpacingTokens.sm,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            color: theme.text,
            fontSize: isSm ? TypographyTokens.sizes.xs : TypographyTokens.sizes.sm,
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RadiusTokens.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontWeight: TypographyTokens.weights.bold,
  },
});
