// FlatBadge.tsx - Glassmorphism & Status Badge Capsule for React Native
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FlatBadgeStatus =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple';

export type FlatBadgeVariant = 'subtle' | 'solid' | 'outline' | 'glass';
export type FlatBadgeSize = 'sm' | 'md';

export interface FlatBadgeProps {
  label: string;
  status?: FlatBadgeStatus;
  variant?: FlatBadgeVariant;
  size?: FlatBadgeSize;
  icon?: keyof typeof Ionicons.glyphMap;
  pill?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export type GlassBadgeProps = FlatBadgeProps;

export const FlatBadge: React.FC<FlatBadgeProps> = ({
  label,
  status = 'neutral',
  variant = 'subtle',
  size = 'md',
  icon,
  pill = false,
  style,
  textStyle,
}) => {
  const getColorConfig = () => {
    switch (status) {
      case 'success':
        return {
          solidBg: '#10B981',
          glassBg: 'rgba(16, 185, 129, 0.15)',
          text: '#047857',
          border: 'rgba(16, 185, 129, 0.45)',
        };
      case 'warning':
        return {
          solidBg: '#F59E0B',
          glassBg: 'rgba(245, 158, 11, 0.15)',
          text: '#B45309',
          border: 'rgba(245, 158, 11, 0.45)',
        };
      case 'danger':
        return {
          solidBg: '#EF4444',
          glassBg: 'rgba(239, 68, 68, 0.15)',
          text: '#B91C1C',
          border: 'rgba(239, 68, 68, 0.45)',
        };
      case 'info':
        return {
          solidBg: '#3B82F6',
          glassBg: 'rgba(59, 130, 246, 0.15)',
          text: '#1D4ED8',
          border: 'rgba(59, 130, 246, 0.45)',
        };
      case 'purple':
        return {
          solidBg: '#8B5CF6',
          glassBg: 'rgba(139, 92, 246, 0.15)',
          text: '#6D28D9',
          border: 'rgba(139, 92, 246, 0.45)',
        };
      case 'neutral':
      default:
        return {
          solidBg: '#64748B',
          glassBg: 'rgba(100, 116, 139, 0.15)',
          text: '#334155',
          border: 'rgba(148, 163, 184, 0.45)',
        };
    }
  };

  const colors = getColorConfig();

  const getContainerStyle = () => {
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: colors.solidBg,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
        };
      case 'outline':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          borderWidth: 1.2,
          borderColor: colors.border,
        };
      case 'glass':
      case 'subtle':
      default:
        return {
          backgroundColor: colors.glassBg,
          borderWidth: 1,
          borderColor: colors.border,
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'solid') return '#FFFFFF';
    return colors.text;
  };

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 11 : 13;

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.smBadge : styles.mdBadge,
        pill ? styles.pill : styles.rounded,
        getContainerStyle(),
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={textStyle?.color || getTextColor()}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          isSmall ? styles.smText : styles.mdText,
          { color: getTextColor() },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const GlassBadge = FlatBadge;

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pill: {
    borderRadius: 9999,
  },
  rounded: {
    borderRadius: 8,
  },
  smBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mdBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  smText: {
    fontSize: 11,
  },
  mdText: {
    fontSize: 12,
  },
});
