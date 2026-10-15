// ClinicalModalSheet.tsx - Bottom Sheet Modal with Inertial Physics & Safe Area Padding
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ColorTokens,
  TypographyTokens,
  RadiusTokens,
  SpacingTokens,
  MotionTokens,
} from '../../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';

export interface ClinicalModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: number | string;
  showCloseButton?: boolean;
  style?: StyleProp<ViewStyle>;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ClinicalModalSheet: React.FC<ClinicalModalSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = SCREEN_HEIGHT * 0.85,
  showCloseButton = true,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      progress.value = 0;
      requestAnimationFrame(() => {
        progress.value = withTiming(1, MotionTokens.timingOpen);
      });
    } else {
      progress.value = withTiming(0, MotionTokens.timingClose, (finished) => {
        if (finished) {
          runOnJS(setModalVisible)(false);
        }
      });
    }
  }, [visible, progress]);

  const handleBackdropPress = () => {
    onClose();
  };

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [MotionTokens.scale.enterStart, MotionTokens.scale.default],
          Extrapolation.CLAMP
        ),
      },
      {
        translateY: interpolate(progress.value, [0, 1], [50, 0], Extrapolation.CLAMP),
      },
    ] as any,
  }));

  if (!modalVisible) return null;

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable style={styles.backdropPressable} onPress={handleBackdropPress} />
        </Animated.View>

        {/* Sheet Content */}
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: maxHeight as any,
              paddingBottom: Math.max(insets.bottom, SpacingTokens.base),
            },
            sheetAnimatedStyle,
            style,
          ]}
        >
          {/* Grabber Bar */}
          <View style={styles.grabberContainer}>
            <View style={styles.grabber} />
          </View>

          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              {showCloseButton && (
                <AnimatedPressable
                  onPress={onClose}
                  style={styles.closeBtn}
                  pressedScale={0.9}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={ColorTokens.slate[600]} />
                </AnimatedPressable>
              )}
            </View>
          )}

          {/* Body */}
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: ColorTokens.surface.overlay,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: ColorTokens.surface.card,
    borderTopLeftRadius: RadiusTokens.xl,
    borderTopRightRadius: RadiusTokens.xl,
    borderWidth: 1,
    borderColor: ColorTokens.slate[200],
    paddingTop: SpacingTokens.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: RadiusTokens.full,
    backgroundColor: ColorTokens.slate[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SpacingTokens.base,
    paddingBottom: SpacingTokens.sm,
    borderBottomWidth: 1,
    borderBottomColor: ColorTokens.slate[100],
  },
  titleContainer: {
    flex: 1,
    marginRight: SpacingTokens.sm,
  },
  title: {
    fontSize: TypographyTokens.sizes.lg,
    fontWeight: TypographyTokens.weights.bold,
    color: ColorTokens.slate[900],
  },
  subtitle: {
    fontSize: TypographyTokens.sizes.sm,
    color: ColorTokens.slate[500],
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RadiusTokens.full,
    backgroundColor: ColorTokens.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: SpacingTokens.base,
    paddingTop: SpacingTokens.sm,
  },
});
