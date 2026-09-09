// HeaderBar.tsx - Modern Header with Gradient and Back / Action Buttons
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedTouchable } from './AnimatedTouchable';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    badgeCount?: number;
  };
  secondaryRightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  gradientVariant?: 'emerald' | 'indigo' | 'ocean' | 'dark';
}

const GRADIENTS = {
  emerald: ['#064E3B', '#059669', '#10B981'] as const,
  indigo: ['#1E1B4B', '#3730A3', '#4F46E5'] as const,
  ocean: ['#164E63', '#0891B2', '#06B6D4'] as const,
  dark: ['#0F172A', '#1E293B', '#334155'] as const,
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  secondaryRightAction,
  gradientVariant = 'emerald',
}) => {
  return (
    <LinearGradient
      colors={GRADIENTS[gradientVariant]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
      style={styles.headerContainer}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.contentRow}>
        {onBack ? (
          <AnimatedTouchable onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </AnimatedTouchable>
        ) : null}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {secondaryRightAction ? (
            <AnimatedTouchable
              onPress={secondaryRightAction.onPress}
              style={styles.iconButton}
            >
              <Ionicons
                name={secondaryRightAction.icon}
                size={22}
                color="#FFFFFF"
              />
            </AnimatedTouchable>
          ) : null}

          {rightAction ? (
            <AnimatedTouchable
              onPress={rightAction.onPress}
              style={styles.iconButton}
            >
              <Ionicons name={rightAction.icon} size={22} color="#FFFFFF" />
              {rightAction.badgeCount && rightAction.badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {rightAction.badgeCount > 99 ? '99+' : rightAction.badgeCount}
                  </Text>
                </View>
              ) : null}
            </AnimatedTouchable>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 28) + 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
