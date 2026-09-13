// FlatEmptyState.tsx - Glassmorphism & High-End Empty State View for React Native
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlatButton } from './FlatButton';

export interface FlatEmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export type GlassEmptyStateProps = FlatEmptyStateProps;

export const FlatEmptyState: React.FC<FlatEmptyStateProps> = ({
  icon = 'file-tray-outline',
  iconColor = '#059669',
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15`, borderColor: `${iconColor}30` }]}>
        <View style={styles.topSheen} />
        <Ionicons name={icon} size={38} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionTitle && onAction && (
        <FlatButton
          title={actionTitle}
          variant="outline"
          size="md"
          onPress={onAction}
          style={styles.actionBtn}
        />
      )}
    </View>
  );
};

export const GlassEmptyState = FlatEmptyState;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: 4,
    minWidth: 150,
  },
});
