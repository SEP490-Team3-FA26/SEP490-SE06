// GradientCard.tsx - Gradient Backed Card for KPIs and Feature Banners
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  gradientVariant?: 'emerald' | 'indigo' | 'sunset' | 'ocean' | 'dark' | 'glass';
  style?: StyleProp<ViewStyle>;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

const GRADIENT_PALETTES = {
  emerald: ['#065F46', '#047857', '#059669'] as const,
  indigo: ['#312E81', '#4338CA', '#4F46E5'] as const,
  sunset: ['#9A3412', '#C2410C', '#EA580C'] as const,
  ocean: ['#0E7490', '#0891B2', '#06B6D4'] as const,
  dark: ['#1E293B', '#0F172A'] as const,
  glass: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)'] as const,
};

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  colors,
  gradientVariant = 'emerald',
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}) => {
  const selectedColors = colors || GRADIENT_PALETTES[gradientVariant];

  return (
    <LinearGradient
      colors={selectedColors}
      start={start}
      end={end}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
});
