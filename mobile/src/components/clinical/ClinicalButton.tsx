// ClinicalButton.tsx - Medical Clinical Button with Tactile Physics & Variant System
import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import {
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
} from '../../theme/tokens';

export type ClinicalButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ClinicalButtonSize = 'sm' | 'md' | 'lg';

export interface ClinicalButtonProps {
  title: string;
  onPress: () => void;
  variant?: ClinicalButtonVariant;
  size?: ClinicalButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const ClinicalButton: React.FC<ClinicalButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.btnPrimary, ShadowTokens.sm];
      case 'secondary':
        return styles.btnSecondary;
      case 'outline':
        return styles.btnOutline;
      case 'ghost':
        return styles.btnGhost;
      case 'danger':
        return [styles.btnDanger, ShadowTokens.sm];
      default:
        return styles.btnPrimary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return styles.textWhite;
      case 'secondary':
        return styles.textEmerald;
      case 'outline':
        return styles.textSlate;
      case 'ghost':
        return styles.textEmerald;
      default:
        return styles.textWhite;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      case 'md':
      default:
        return styles.sizeMd;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.textSizeSm;
      case 'lg':
        return styles.textSizeLg;
      case 'md':
      default:
        return styles.textSizeMd;
    }
  };

  const spinnerColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : ColorTokens.emerald[600];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getSizeStyle(),
        getContainerStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.baseText,
              getTextSizeStyle(),
              getTextStyle(),
              textStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RadiusTokens.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
  iconLeft: {
    marginRight: SpacingTokens.sm,
  },
  iconRight: {
    marginLeft: SpacingTokens.sm,
  },

  // Sizes
  sizeSm: {
    paddingVertical: 7,
    paddingHorizontal: SpacingTokens.md,
    minHeight: 34,
  },
  sizeMd: {
    paddingVertical: 11,
    paddingHorizontal: SpacingTokens.base,
    minHeight: 46,
  },
  sizeLg: {
    paddingVertical: 14,
    paddingHorizontal: SpacingTokens.xl,
    minHeight: 52,
  },

  // Text
  baseText: {
    fontWeight: TypographyTokens.weights.semibold,
  },
  textSizeSm: {
    fontSize: TypographyTokens.sizes.sm,
  },
  textSizeMd: {
    fontSize: TypographyTokens.sizes.base,
  },
  textSizeLg: {
    fontSize: TypographyTokens.sizes.lg,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textEmerald: {
    color: ColorTokens.emerald[700],
  },
  textSlate: {
    color: ColorTokens.slate[700],
  },

  // Variants
  btnPrimary: {
    backgroundColor: ColorTokens.emerald[600],
    borderColor: ColorTokens.emerald[700],
  },
  btnSecondary: {
    backgroundColor: ColorTokens.emerald[50],
    borderColor: ColorTokens.emerald[200],
  },
  btnOutline: {
    backgroundColor: ColorTokens.surface.card,
    borderColor: ColorTokens.slate[200],
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  btnDanger: {
    backgroundColor: ColorTokens.semantic.danger,
    borderColor: '#B91C1C',
  },
});
