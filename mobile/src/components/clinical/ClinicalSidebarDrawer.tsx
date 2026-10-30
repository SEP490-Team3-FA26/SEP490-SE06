// ClinicalSidebarDrawer.tsx - Tactile Sidebar Drawer for Pharmacist & Branch Staff
import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { ClinicalBadge } from './ClinicalBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

export interface DrawerMenuItem {
  id: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  color?: string;
  active?: boolean;
}

export interface ClinicalSidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  user: {
    name?: string;
    fullName?: string;
    email?: string;
    role?: string;
    branchName?: string;
    branchId?: string;
  } | null;
  roleTitle: string;
  menuItems: DrawerMenuItem[];
  onLogout: () => void;
}

export const ClinicalSidebarDrawer: React.FC<ClinicalSidebarDrawerProps> = ({
  visible,
  onClose,
  user,
  roleTitle,
  menuItems,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(visible);
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const progress = useSharedValue(0);

  const openDrawer = useCallback(() => {
    setModalVisible(true);
    translateX.value = -DRAWER_WIDTH;
    progress.value = 0;
    requestAnimationFrame(() => {
      translateX.value = withSpring(0, MotionTokens.sheetSpring);
      progress.value = withTiming(1, MotionTokens.timingOpen);
    });
  }, [translateX, progress]);

  const closeDrawer = useCallback(
    (velocity?: number) => {
      progress.value = withTiming(0, MotionTokens.timingClose);

      if (velocity && velocity < -300) {
        translateX.value = withSpring(
          -DRAWER_WIDTH,
          {
            ...MotionTokens.sheetSpring,
            velocity,
            overshootClamping: true,
          },
          (finished) => {
            if (finished) runOnJS(setModalVisible)(false);
          }
        );
      } else {
        translateX.value = withTiming(-DRAWER_WIDTH, MotionTokens.timingClose, (finished) => {
          if (finished) runOnJS(setModalVisible)(false);
        });
      }
    },
    [translateX, progress]
  );

  useEffect(() => {
    if (visible) {
      openDrawer();
    } else {
      closeDrawer();
    }
  }, [visible, openDrawer, closeDrawer]);

  const handleBackdropPress = () => {
    onClose();
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất ca làm việc hiện tại không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            onClose();
            onLogout();
          },
        },
      ]
    );
  };

  // Pan Gesture kéo vuốt mép đóng Drawer
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = event.translationX;
        progress.value = interpolate(
          event.translationX,
          [-DRAWER_WIDTH, 0],
          [0, 1]
        );
      }
    })
    .onEnd((event) => {
      if (event.translationX < -DRAWER_WIDTH * 0.3 || event.velocityX < -400) {
        runOnJS(onClose)();
        runOnJS(closeDrawer)(event.velocityX);
      } else {
        translateX.value = withSpring(0, MotionTokens.sheetSpring);
        progress.value = withTiming(1, MotionTokens.timingOpen);
      }
    });

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!modalVisible) return null;

  const displayName =
    user?.fullName || user?.name || user?.email?.split('@')[0] || 'Dược Sĩ ABC';
  const displayBranch = user?.branchName || 'Cơ Sở Chi Nhánh ABC';
  const initials = displayName
    .split(' ')
    .slice(-2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');

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

        {/* Drawer Content */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.drawer,
              {
                width: DRAWER_WIDTH,
                paddingTop: Math.max(insets.top, SpacingTokens.base),
                paddingBottom: Math.max(insets.bottom, SpacingTokens.base),
              },
              drawerAnimatedStyle,
            ]}
          >
            {/* User Profile Header */}
            <View style={styles.header}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials || 'NV'}</Text>
                </View>
                <AnimatedPressable
                  onPress={onClose}
                  style={styles.closeBtn}
                  pressedScale={0.9}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={ColorTokens.slate[500]} />
                </AnimatedPressable>
              </View>

              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.branchName} numberOfLines={1}>
                <Ionicons name="location-outline" size={13} color={ColorTokens.slate[500]} />{' '}
                {displayBranch}
              </Text>

              <View style={styles.roleBadgeRow}>
                <ClinicalBadge
                  label={roleTitle}
                  variant="emerald"
                  size="sm"
                  icon={<Ionicons name="shield-checkmark" size={12} color={ColorTokens.emerald[700]} />}
                />
              </View>
            </View>

            {/* Menu Items List */}
            <ScrollView
              style={styles.menuScrollView}
              contentContainerStyle={styles.menuContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionTitle}>NGHIỆP VỤ & CA TRỰC</Text>
              {menuItems.map((item) => {
                const itemColor = item.color || ColorTokens.slate[700];
                return (
                  <AnimatedPressable
                    key={item.id}
                    onPress={() => {
                      onClose();
                      item.onPress();
                    }}
                    style={[
                      styles.menuItem,
                      item.active && styles.menuItemActive,
                    ]}
                    pressedScale={0.98}
                  >
                    <View
                      style={[
                        styles.menuIconBox,
                        item.active && styles.menuIconBoxActive,
                      ]}
                    >
                      <Ionicons
                        name={item.iconName}
                        size={19}
                        color={item.active ? ColorTokens.emerald[700] : itemColor}
                      />
                    </View>
                    <Text
                      style={[
                        styles.menuItemLabel,
                        item.active && styles.menuItemLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {item.badge && (
                      <ClinicalBadge
                        label={item.badge}
                        variant={item.badgeVariant || 'info'}
                        size="sm"
                      />
                    )}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {/* Footer / Logout */}
            <View style={styles.footer}>
              <AnimatedPressable
                onPress={handleLogoutPress}
                style={styles.logoutBtn}
                pressedScale={0.97}
              >
                <Ionicons name="log-out-outline" size={20} color={ColorTokens.semantic.danger} />
                <Text style={styles.logoutText}>Đăng Xuất Ca Trực</Text>
              </AnimatedPressable>

              <Text style={styles.versionText}>ABC Pharmacy v1.0 • Chuẩn Y Tế GPP</Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: ColorTokens.surface.overlay,
  },
  backdropPressable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: ColorTokens.surface.card,
    borderRightWidth: 1,
    borderRightColor: ColorTokens.slate[200],
    shadowColor: '#0F172A',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: SpacingTokens.base,
    paddingBottom: SpacingTokens.base,
    borderBottomWidth: 1,
    borderBottomColor: ColorTokens.slate[100],
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SpacingTokens.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RadiusTokens.full,
    backgroundColor: ColorTokens.emerald[100],
    borderWidth: 1.5,
    borderColor: ColorTokens.emerald[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: TypographyTokens.sizes.md,
    fontWeight: TypographyTokens.weights.bold,
    color: ColorTokens.emerald[800],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RadiusTokens.full,
    backgroundColor: ColorTokens.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: TypographyTokens.sizes.lg,
    fontWeight: TypographyTokens.weights.bold,
    color: ColorTokens.slate[900],
    marginBottom: 2,
  },
  branchName: {
    fontSize: TypographyTokens.sizes.sm,
    color: ColorTokens.slate[500],
    marginBottom: SpacingTokens.sm,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuScrollView: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: SpacingTokens.sm,
    paddingTop: SpacingTokens.base,
    paddingBottom: SpacingTokens.base,
  },
  sectionTitle: {
    fontSize: TypographyTokens.sizes.xs,
    fontWeight: TypographyTokens.weights.bold,
    color: ColorTokens.slate[400],
    letterSpacing: 0.8,
    marginBottom: SpacingTokens.sm,
    marginLeft: SpacingTokens.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SpacingTokens.sm,
    borderRadius: RadiusTokens.md,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: ColorTokens.emerald[50],
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: RadiusTokens.sm,
    backgroundColor: ColorTokens.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SpacingTokens.md,
  },
  menuIconBoxActive: {
    backgroundColor: ColorTokens.emerald[100],
  },
  menuItemLabel: {
    flex: 1,
    fontSize: TypographyTokens.sizes.base,
    fontWeight: TypographyTokens.weights.medium,
    color: ColorTokens.slate[700],
  },
  menuItemLabelActive: {
    fontWeight: TypographyTokens.weights.bold,
    color: ColorTokens.emerald[800],
  },
  footer: {
    paddingHorizontal: SpacingTokens.base,
    paddingTop: SpacingTokens.sm,
    borderTopWidth: 1,
    borderTopColor: ColorTokens.slate[100],
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SpacingTokens.sm,
    borderRadius: RadiusTokens.md,
    backgroundColor: ColorTokens.semantic.dangerBg,
    borderWidth: 1,
    borderColor: ColorTokens.semantic.dangerBorder,
    marginBottom: SpacingTokens.sm,
  },
  logoutText: {
    fontSize: TypographyTokens.sizes.base,
    fontWeight: TypographyTokens.weights.semibold,
    color: ColorTokens.semantic.danger,
    marginLeft: SpacingTokens.sm,
  },
  versionText: {
    fontSize: TypographyTokens.sizes.xs,
    color: ColorTokens.slate[400],
    textAlign: 'center',
  },
});
