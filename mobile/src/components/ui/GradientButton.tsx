// GradientButton.tsx - Modern Gradient Action Button with animation
import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedTouchable } from './AnimatedTouchable';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  colors?: readonly [string, string, ...string[]];
  gradientVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'indigo' | 'cyan' | 'purple' | 'sky';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

const GRADIENT_PRESETS = {
  primary: ['#0284C7', '#0EA5E9'] as const, // Xanh Auth chuẩn dự án
  sky: ['#0284C7', '#38BDF8'] as const,     // Xanh biển tươi sáng
  success: ['#0284C7', '#38BDF8'] as const, // Đồng bộ màu Xanh Auth
  warning: ['#D97706', '#F59E0B'] as const, // Amber
  danger: ['#DC2626', '#EF4444'] as const,  // Rose
  indigo: ['#0369A1', '#0EA5E9'] as const, // Deep Sky Blue
  cyan: ['#0284C7', '#06B6D4'] as const,   // Medical Cyan
  purple: ['#7C3AED', '#8B5CF6'] as const, // Royal Purple
};

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  colors,
  gradientVariant = 'sky',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = 'md',
}) => {
  const selectedColors = colors || GRADIENT_PRESETS[gradientVariant] || GRADIENT_PRESETS.sky;

  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };

  const textSizes = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={disabled ? ['#CBD5E1', '#94A3B8'] : selectedColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyles[size]]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.text, textSizes[size], textStyle]}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 17,
  },
});
