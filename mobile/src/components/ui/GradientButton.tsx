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
  gradientVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'indigo' | 'cyan' | 'purple';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

const GRADIENT_PRESETS = {
  primary: ['#059669', '#10B981'] as const, // Emerald Medical
  success: ['#10B981', '#34D399'] as const, // Fresh Mint
  warning: ['#D97706', '#F59E0B'] as const, // Amber
  danger: ['#DC2626', '#EF4444'] as const,  // Rose
  indigo: ['#4F46E5', '#6366F1'] as const, // Deep Indigo
  cyan: ['#0891B2', '#06B6D4'] as const,   // Medical Cyan
  purple: ['#7C3AED', '#8B5CF6'] as const, // Royal Purple
};

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  colors,
  gradientVariant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = 'md',
}) => {
  const selectedColors = colors || GRADIENT_PRESETS[gradientVariant];

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13, borderRadius: 10 },
    md: { paddingVertical: 13, paddingHorizontal: 20, fontSize: 15, borderRadius: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 26, fontSize: 17, borderRadius: 16 },
  }[size];

  return (
    <AnimatedTouchable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={selectedColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.9 }}
        style={[
          styles.gradient,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderRadius: sizeStyles.borderRadius,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
            <Text
              style={[
                styles.text,
                { fontSize: sizeStyles.fontSize },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
