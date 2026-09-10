// FlatButton.tsx - Glassmorphism & High-Performance Interactive Button for React Native
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export type FlatButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'warning'
  | 'success'
  | 'ghost'
  | 'glass';

export type FlatButtonSize = 'sm' | 'md' | 'lg';

export interface FlatButtonProps {
  title: string;
  onPress: () => void;
  variant?: FlatButtonVariant;
  size?: FlatButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export type GlassButtonProps = FlatButtonProps;

export const FlatButton: React.FC<FlatButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          gradient: ['#1E293B', '#0F172A'] as [string, string],
          border: 'rgba(255, 255, 255, 0.15)',
          text: styles.secondaryText,
          indicatorColor: '#FFFFFF',
          shadowColor: '#0F172A',
        };
      case 'outline':
        return {
          gradient: ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.65)'] as [string, string],
          border: 'rgba(5, 150, 105, 0.45)',
          text: styles.outlineText,
          indicatorColor: '#059669',
          shadowColor: 'rgba(5, 150, 105, 0.15)',
        };
      case 'danger':
        return {
          gradient: ['#EF4444', '#DC2626'] as [string, string],
          border: 'rgba(255, 255, 255, 0.25)',
          text: styles.dangerText,
          indicatorColor: '#FFFFFF',
          shadowColor: '#EF4444',
        };
      case 'warning':
        return {
          gradient: ['#F59E0B', '#D97706'] as [string, string],
          border: 'rgba(255, 255, 255, 0.25)',
          text: styles.warningText,
          indicatorColor: '#FFFFFF',
          shadowColor: '#F59E0B',
        };
      case 'success':
        return {
          gradient: ['#10B981', '#059669'] as [string, string],
          border: 'rgba(255, 255, 255, 0.25)',
          text: styles.successText,
          indicatorColor: '#FFFFFF',
          shadowColor: '#10B981',
        };
      case 'glass':
      case 'ghost':
        return {
          gradient: ['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.2)'] as [string, string],
          border: 'rgba(255, 255, 255, 0.5)',
          text: styles.ghostText,
          indicatorColor: '#059669',
          shadowColor: 'rgba(0, 0, 0, 0.05)',
        };
      case 'primary':
      default:
        return {
          gradient: ['#059669', '#047857'] as [string, string],
          border: 'rgba(255, 255, 255, 0.3)',
          text: styles.primaryText,
          indicatorColor: '#FFFFFF',
          shadowColor: '#059669',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          height: 38,
          paddingHorizontal: 14,
          borderRadius: 10,
          text: styles.smText,
          iconSize: 15,
        };
      case 'lg':
        return {
          height: 54,
          paddingHorizontal: 24,
          borderRadius: 16,
          text: styles.lgText,
          iconSize: 22,
        };
      case 'md':
      default:
        return {
          height: 46,
          paddingHorizontal: 18,
          borderRadius: 12,
          text: styles.mdText,
          iconSize: 18,
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonOuter,
        {
          borderRadius: sizeStyle.borderRadius,
          shadowColor: variantStyle.shadowColor,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabledButton,
        style,
      ]}
    >
      <LinearGradient
        colors={disabled ? ['#E2E8F0', '#CBD5E1'] : variantStyle.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientContainer,
          {
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            borderRadius: sizeStyle.borderRadius,
            borderColor: disabled ? 'transparent' : variantStyle.border,
          },
        ]}
      >
        {/* Specular Top Sheen */}
        {!disabled && <View style={styles.topSheen} />}

        {loading ? (
          <ActivityIndicator size="small" color={variantStyle.indicatorColor} />
        ) : (
          <View style={styles.contentRow}>
            {icon && iconPosition === 'left' && (
              <Ionicons
                name={icon}
                size={sizeStyle.iconSize}
                color={textStyle?.color || (variantStyle.text.color as string)}
                style={styles.leftIcon}
              />
            )}
            <Text
              style={[
                styles.baseText,
                variantStyle.text,
                sizeStyle.text,
                disabled && styles.disabledText,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Ionicons
                name={icon}
                size={sizeStyle.iconSize}
                color={textStyle?.color || (variantStyle.text.color as string)}
                style={styles.rightIcon}
              />
            )}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const GlassButton = FlatButton;

const styles = StyleSheet.create({
  buttonOuter: {
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradientContainer: {
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  baseText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },

  // Sizes
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 16,
  },

  // Text Colors
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#059669',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  warningText: {
    color: '#FFFFFF',
  },
  successText: {
    color: '#FFFFFF',
  },
  ghostText: {
    color: '#059669',
  },

  // Disabled
  disabledButton: {
    opacity: 0.65,
    elevation: 0,
    shadowOpacity: 0,
  },
  disabledText: {
    color: '#64748B',
  },
});
