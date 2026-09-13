// LoginScreen.tsx - Luxury Glassmorphism Pharma Login Screen with Ambient Lighting & Demo Roles
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { FlatButton, FlatBadge } from '../../components/flat';
import { UserRole } from '../../types/pharmacy.types';

const { width } = Dimensions.get('window');

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login } = useAuth();
  const [emailOrPhone, setEmailOrPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole | null>(null);

  const DEMO_USERS = [
    { role: UserRole.ADMIN, title: 'Admin', email: 'admin@vinapharmacy.com', color: '#EF4444', icon: 'shield-checkmark' },
    { role: UserRole.HEAD_BRANCH, title: 'Giám Đốc', email: 'director@vinapharmacy.com', color: '#8B5CF6', icon: 'business' },
    { role: UserRole.WAREHOUSE, title: 'Thủ Kho', email: 'warehouse@vinapharmacy.com', color: '#F59E0B', icon: 'cube' },
    { role: UserRole.PHARMACIST, title: 'Dược Sĩ', email: 'pharmacist@vinapharmacy.com', color: '#10B981', icon: 'medkit' },
    { role: UserRole.BRANCH, title: 'Quản Lý', email: 'manager@vinapharmacy.com', color: '#06B6D4', icon: 'storefront' },
    { role: UserRole.CUSTOMER, title: 'Khách Hàng', email: 'user@vinapharmacy.com', color: '#3B82F6', icon: 'cart' },
  ];

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email / Số điện thoại và Mật khẩu.');
      return;
    }

    setLoading(true);
    const res = await login(emailOrPhone, password);
    setLoading(false);

    if (!res.success) {
      Alert.alert('Đăng nhập thất bại', res.message || 'Sai thông tin tài khoản hoặc mật khẩu.');
    }
  };

  const handleQuickDemo = async (item: (typeof DEMO_USERS)[0]) => {
    setEmailOrPhone(item.email);
    setPassword('123456');
    setSelectedDemoRole(item.role);
    setLoading(true);
    const res = await login(item.email, '123456');
    setLoading(false);
    if (!res.success) {
      Alert.alert('Thông báo', res.message || 'Không thể đăng nhập tài khoản demo.');
    }
  };

  const handleGoogleLogin = () => {
    navigation.navigate('WebViewScreen', {
      title: 'Đăng nhập với Google',
      url: 'https://accounts.google.com',
      onSuccessToken: async (token: string) => {
        // Token received from OAuth
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Ambient Gradient Background */}
      <LinearGradient
        colors={['#042F2E', '#064E3B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Floating Glowing Orbs for Glass Refraction */}
      <View style={styles.ambientOrb1} />
      <View style={styles.ambientOrb2} />
      <View style={styles.ambientOrb3} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Hero Branding */}
            <View style={styles.heroSection}>
              <View style={styles.glassBadgePill}>
                <Ionicons name="shield-checkmark" size={14} color="#34D399" style={{ marginRight: 6 }} />
                <Text style={styles.glassBadgeText}>VinaPharmacy Enterprise Cloud</Text>
              </View>

              {/* 3D Glowing Glass Logo Container */}
              <View style={styles.logoGlassGlow}>
                <View style={styles.logoGlassContainer}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.08)']}
                    style={styles.logoGlassInner}
                  >
                    <Ionicons name="medkit" size={44} color="#34D399" />
                  </LinearGradient>
                </View>
              </View>

              <Text style={styles.appTitle}>Pharma ERP</Text>
              <Text style={styles.appSubtitle}>Hệ Thống Quản Trị & Bán Lẻ Dược Phẩm</Text>
            </View>

            {/* Master Frosted Glass Card Container */}
            <View style={styles.glassCardWrapper}>
              <View style={styles.glassCard}>
                {/* Top Specular Sheen Reflection Line */}
                <View style={styles.topSheen} />

                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Đăng Nhập</Text>
                  <Text style={styles.cardSubtitle}>Chào mừng trở lại! Vui lòng nhập thông tin.</Text>
                </View>

                {/* Email / Phone Input Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tài khoản</Text>
                  <View style={styles.glassInputBox}>
                    <Ionicons name="mail-outline" size={20} color="#059669" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email hoặc Số điện thoại"
                      placeholderTextColor="#94A3B8"
                      value={emailOrPhone}
                      onChangeText={setEmailOrPhone}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {/* Password Input Field */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Mật khẩu</Text>
                    <AnimatedTouchable
                      onPress={() => navigation.navigate('ForgotPasswordScreen')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.forgotPassLink}>Quên mật khẩu?</Text>
                    </AnimatedTouchable>
                  </View>
                  <View style={styles.glassInputBox}>
                    <Ionicons name="lock-closed-outline" size={20} color="#059669" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nhập mật khẩu của bạn"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <AnimatedTouchable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748B"
                      />
                    </AnimatedTouchable>
                  </View>
                </View>

                {/* Primary Glass Action Button */}
                <FlatButton
                  title="ĐĂNG NHẬP HỆ THỐNG"
                  variant="primary"
                  size="lg"
                  onPress={handleLogin}
                  loading={loading}
                  fullWidth
                  icon="log-in-outline"
                  iconPosition="right"
                  style={styles.loginBtn}
                />

                {/* Glass Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>HOẶC TRẢI NGHIỆM TÀI KHOẢN DEMO</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Glass Demo Role Grid */}
                <View style={styles.demoRoleGrid}>
                  {DEMO_USERS.map((d) => {
                    const isSelected = selectedDemoRole === d.role;
                    return (
                      <AnimatedTouchable
                        key={d.role}
                        onPress={() => handleQuickDemo(d)}
                        style={[
                          styles.demoRoleChip,
                          {
                            borderColor: isSelected ? d.color : 'rgba(226, 232, 240, 0.8)',
                            backgroundColor: isSelected ? `${d.color}20` : 'rgba(248, 250, 252, 0.7)',
                          },
                          isSelected && styles.demoRoleChipSelected,
                        ]}
                      >
                        <View style={[styles.demoIconCircle, { backgroundColor: `${d.color}20` }]}>
                          <Ionicons name={d.icon as any} size={15} color={d.color} />
                        </View>
                        <Text
                          style={[
                            styles.demoRoleText,
                            {
                              color: isSelected ? d.color : '#334155',
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {d.title}
                        </Text>
                      </AnimatedTouchable>
                    );
                  })}
                </View>

                {/* Google OAuth Glass Button */}
                <AnimatedTouchable onPress={handleGoogleLogin} style={styles.googleGlassBtn}>
                  <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
                  <Text style={styles.googleBtnText}>Tiếp tục với tài khoản Google</Text>
                </AnimatedTouchable>

                {/* Register Row */}
                <View style={styles.registerRow}>
                  <Text style={styles.registerPrompt}>Chưa có tài khoản khách hàng? </Text>
                  <AnimatedTouchable onPress={() => navigation.navigate('RegisterScreen')}>
                    <Text style={styles.registerLink}>Đăng ký ngay</Text>
                  </AnimatedTouchable>
                </View>

                {/* Glass UI Kit Showcase Link */}
                <View style={styles.showcaseLinkBox}>
                  <AnimatedTouchable
                    onPress={() => navigation.navigate('FlatComponentsShowcase')}
                    style={styles.showcaseBtn}
                  >
                    <Ionicons name="sparkles" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.showcaseText}>
                      Khám phá Glass & Flat UI Components
                    </Text>
                  </AnimatedTouchable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#042F2E',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Floating Ambient Orbs for Glass Refraction
  ambientOrb1: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(16, 185, 129, 0.28)',
  },
  ambientOrb2: {
    position: 'absolute',
    top: 240,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(6, 182, 212, 0.22)',
  },
  ambientOrb3: {
    position: 'absolute',
    bottom: -40,
    left: 40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
  },

  // Hero Section
  heroSection: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  glassBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20,
  },
  glassBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.2,
  },
  logoGlassGlow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 16,
  },
  logoGlassContainer: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoGlassInner: {
    flex: 1,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#A7F3D0',
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 280,
  },

  // Master Glass Card
  glassCardWrapper: {
    paddingHorizontal: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 28,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 7,
  },
  forgotPassLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  glassInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },

  // Action Button
  loginBtn: {
    marginTop: 6,
    marginBottom: 20,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },

  // Demo Grid
  demoRoleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  demoRoleChip: {
    width: (width - 40 - 48 - 8) / 2, // 2 columns exactly
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  demoRoleChipSelected: {
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  demoIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  demoRoleText: {
    fontSize: 12,
    flex: 1,
  },

  // Google OAuth
  googleGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 18,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Register Row
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  registerPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },

  // Showcase Box
  showcaseLinkBox: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.6)',
    paddingTop: 14,
  },
  showcaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  showcaseText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
});
