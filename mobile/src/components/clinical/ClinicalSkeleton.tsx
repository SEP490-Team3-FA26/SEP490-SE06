// ClinicalSkeleton.tsx - Reanimated UI-thread shimmer skeleton loaders
import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ColorTokens, RadiusTokens, SpacingTokens } from '../../theme/tokens';

export interface ClinicalSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const ClinicalSkeleton: React.FC<ClinicalSkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = RadiusTokens.sm,
  style,
}) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 750, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const ClinicalMedicineSkeletonGrid: React.FC<{ count?: number }> = ({
  count = 4,
}) => {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.cardSkeleton}>
          <ClinicalSkeleton height={110} borderRadius={RadiusTokens.md} style={styles.imageSkeleton} />
          <View style={styles.contentSkeleton}>
            <ClinicalSkeleton width="45%" height={12} style={styles.categorySkeleton} />
            <ClinicalSkeleton width="85%" height={16} style={styles.titleSkeleton} />
            <ClinicalSkeleton width="60%" height={14} style={styles.priceSkeleton} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: ColorTokens.slate[200],
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SpacingTokens.base,
    paddingTop: SpacingTokens.sm,
  },
  cardSkeleton: {
    width: '48%',
    backgroundColor: ColorTokens.surface.card,
    borderRadius: RadiusTokens.lg,
    borderWidth: 1,
    borderColor: ColorTokens.slate[200],
    padding: SpacingTokens.sm,
    marginBottom: SpacingTokens.md,
  },
  imageSkeleton: {
    marginBottom: SpacingTokens.sm,
  },
  contentSkeleton: {
    paddingHorizontal: 2,
  },
  categorySkeleton: {
    marginBottom: 6,
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  priceSkeleton: {
    marginTop: 4,
  },
});
