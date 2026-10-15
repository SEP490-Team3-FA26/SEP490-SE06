// SplashScreen.tsx - Medical Brand Splash & Initialization Screen
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC<{ navigation?: any; onFinish?: () => void }> = ({
  navigation,
  onFinish,
}) => {
  const { auth, user } = useAuth();
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Logo entrance animation
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Subtle pulse effect on the halo ring
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );

    // Auto navigate / dismiss after 1.6 seconds
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
        return;
      }
      const role = user?.role || auth.role;
      if (navigation) {
        if (auth.isAuthenticated && role) {
          switch (role) {
            case 'admin':
              navigation.replace('AdminScreen');
              break;
            case 'headBranch':
            case 'director':
              navigation.replace('DirectorScreen');
              break;
            case 'warehouse':
              navigation.replace('WarehouseScreen');
              break;
            case 'pharmacist':
              navigation.replace('PharmacistScreen');
              break;
            case 'branch':
              navigation.replace('BranchScreen');
              break;
            default:
              navigation.replace('CustomerScreen');
              break;
          }
        } else {
          navigation.replace('CustomerScreen');
        }
      }
    }, 1600);

    return () => clearTimeout(timer);
  }, [auth.isAuthenticated, user?.role, navigation, onFinish]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0369A1', '#0284C7', '#38BDF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Central Brand Identity */}
        <Animated.View style={[styles.centerContent, animatedLogoStyle]}>
          {/* Animated Halo Glow */}
          <Animated.View style={[styles.haloRing, animatedPulseStyle]} />

          {/* White Circular Medkit Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="medkit" size={54} color="#0284C7" />
          </View>

          {/* Brand Name */}
          <Text style={styles.brandTitle}>ABC PHARMACY</Text>
          <View style={styles.gppBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.gppBadgeText}>CHUỖI NHÀ THUỐC CHUẨN GPP BỘ Y TẾ</Text>
          </View>
          <Text style={styles.tagline}>Chăm sóc sức khỏe gia đình bạn toàn diện 24/7</Text>
        </Animated.View>

        {/* Footer Indicators */}
        <View style={styles.footerContent}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginBottom: 12 }} />
          <Text style={styles.loadingText}>Đang đồng bộ dữ liệu y tế...</Text>
          <View style={styles.standardsRow}>
            <Text style={styles.standardTag}>GPP</Text>
            <Text style={styles.standardDot}>•</Text>
            <Text style={styles.standardTag}>GDP</Text>
            <Text style={styles.standardDot}>•</Text>
            <Text style={styles.standardTag}>GSP</Text>
            <Text style={styles.standardDot}>•</Text>
            <Text style={styles.standardTag}>ISO 9001</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  haloRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2.2,
    marginBottom: 10,
    textAlign: 'center',
  },
  gppBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 12,
  },
  gppBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: 13,
    color: '#E0F2FE',
    textAlign: 'center',
    maxWidth: width * 0.78,
    lineHeight: 18,
    fontWeight: '500',
  },
  footerContent: {
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginBottom: 12,
  },
  standardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardTag: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.5,
  },
  standardDot: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    marginHorizontal: 8,
  },
});
