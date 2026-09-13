// FlatCard.tsx - Glassmorphism & Modern Card Container for React Native
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FlatCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  headerIcon?: keyof typeof Ionicons.glyphMap;
  headerIconColor?: string;
  footer?: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  borderVariant?: 'default' | 'primary' | 'warning' | 'danger' | 'success';
  glassIntensity?: 'light' | 'medium' | 'deep';
}

export type GlassCardProps = FlatCardProps;

export const FlatCard: React.FC<FlatCardProps> = ({
  children,
  title,
  subtitle,
  headerRight,
  headerIcon,
  headerIconColor = '#059669',
  footer,
  onPress,
  padded = true,
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
  borderVariant = 'default',
  glassIntensity = 'medium',
}) => {
  const getBorderColor = () => {
    switch (borderVariant) {
      case 'primary':
        return 'rgba(5, 150, 105, 0.45)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.45)';
      case 'danger':
        return 'rgba(239, 68, 68, 0.45)';
      case 'success':
        return 'rgba(16, 185, 129, 0.45)';
      case 'default':
      default:
        return 'rgba(255, 255, 255, 0.6)';
    }
  };

  const getGlassBackground = () => {
    switch (glassIntensity) {
      case 'light':
        return 'rgba(255, 255, 255, 0.6)';
      case 'deep':
        return 'rgba(255, 255, 255, 0.88)';
      case 'medium':
      default:
        return 'rgba(255, 255, 255, 0.75)';
    }
  };

  const hasHeader = Boolean(title || subtitle || headerRight || headerIcon);

  const cardContent = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getGlassBackground(),
          borderColor: getBorderColor(),
        },
        style,
      ]}
    >
      {/* Top Specular Highlight Refraction Line */}
      <View style={styles.topSpecularLine} />

      {hasHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {headerIcon && (
              <View style={[styles.iconBox, { backgroundColor: `${headerIconColor}18`, borderColor: `${headerIconColor}30` }]}>
                <Ionicons name={headerIcon} size={18} color={headerIconColor} />
              </View>
            )}
            <View style={styles.titleColumn}>
              {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
              {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
            </View>
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}

      <View style={[padded && styles.bodyPadded, contentStyle]}>{children}</View>

      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

export const GlassCard = FlatCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  topSpecularLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.4)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 8,
  },
  bodyPadded: {
    padding: 18,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.4)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(248, 250, 252, 0.45)',
  },
});
