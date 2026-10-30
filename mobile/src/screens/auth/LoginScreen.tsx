// LoginScreen.tsx - Modern Medical Light Blue Luxury Glassmorphism Login Screen with Demo Roles & Guest Access
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
import { showToast } from '../../components/ui/toastHelper';
import { UserRole } from '../../types/pharmacy.types';
import { ColorTokens, TypographyTokens } from '../../theme/tokens';
import { EnvService } from '../../services/env.service';

const { width } = Dimensions.get('window');

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    login,
    loginWithBiometrics,
    isBiometricSupported,
    isBiometricEnabled,
    savedBiometricUser,
    toggleBiometrics,
  } = useAuth();
  const [emailOrPhone, setEmailOrPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState<boolean>(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole | null>(null);

  const DEMO_USERS = [
    { role: UserRole.ADMIN, title: 'Admin IT', subtitle: 'Quản trị hệ thống', email: 'admin@vinapharmacy.com', color: '#EF4444', icon: 'shield-checkmark' },
    { role: UserRole.HEAD_BRANCH, title: 'Giám Đốc', subtitle: 'Ban điều hành chuỗi', email: 'director@vinapharmacy.com', color: '#8B5CF6', icon: 'business' },
    { role: UserRole.WAREHOUSE, title: 'Kho Tổng', subtitle: 'Xuất nhập & GRN', email: 'warehouse@vinapharmacy.com', color: '#F59E0B', icon: 'cube' },
    { role: UserRole.PHARMACIST, title: 'Dược Sĩ', subtitle: 'Bán lẻ POS quầy', email: 'pharmacist@vinapharmacy.com', color: '#0284C7', icon: 'medkit' },
    { role: UserRole.BRANCH, title: 'Quản Lý', subtitle: 'Cơ sở & Duyệt ca', email: 'manager@vinapharmacy.com', color: '#0EA5E9', icon: 'storefront' },
    { role: UserRole.CUSTOMER, title: 'Khách Hàng', subtitle: 'Mua sắm trực tuyến', email: 'user@vinapharmacy.com', color: '#0284C7', icon: 'cart' },
  ];

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    const res = await loginWithBiometrics();
    setBiometricLoading(false);

    if (res.success) {
      showToast.success('Đăng nhập thành công', `Chào mừng ${res.user?.name || ''} quay trở lại!`);
    } else {
      if (res.message && res.message !== 'Đã hủy xác thực sinh trắc học') {
        showToast.error('Đăng nhập thất bại', res.message);
      }
    }
  };

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password.trim()) {
      showToast.info('Thông báo', 'Vui lòng nhập đầy đủ Email / Số điện thoại và Mật khẩu.');
      return;
    }

    setLoading(true);
    const res = await login(emailOrPhone, password);
    setLoading(false);

    if (!res.success) {
      showToast.error('Đăng nhập thất bại', res.message || 'Sai thông tin tài khoản hoặc mật khẩu.');
    } else {
      // Kiểm tra xem tài khoản này đã kích hoạt sinh trắc học trên máy chưa
      const currentIdentifier = emailOrPhone.toLowerCase().trim();
      const savedIdentifier = (savedBiometricUser?.userIdentifier || '').toLowerCase().trim();
      const isAccountEnrolled = isBiometricEnabled && savedIdentifier === currentIdentifier;

      // Nếu máy có hỗ trợ vân tay, nhưng TÀI KHOẢN NÀY chưa kích hoạt sinh trắc học:
      if (isBiometricSupported && !isAccountEnrolled) {
        setTimeout(() => {
          Alert.alert(
            'Kích Hoạt Sinh Trắc Học',
            `Bạn có muốn kích hoạt Đăng nhập Sinh trắc học cho tài khoản ${res.user?.name || currentIdentifier} trên thiết bị này không?`,
            [
              { text: 'Để sau', style: 'cancel' },
              {
                text: 'Kích hoạt ngay',
                onPress: async () => {
                  try {
                    const bioRes = await toggleBiometrics(true);
                    if (bioRes.success) {
                      showToast.success('Thành công', 'Đã kích hoạt đăng nhập sinh trắc học cho tài khoản này!');
                    } else if (bioRes.message && bioRes.message !== 'HỦY_BỎ' && bioRes.message !== 'Đã hủy xác thực sinh trắc học') {
                      showToast.error('Thông báo', bioRes.message);
                    }
                  } catch (err: any) {
                    showToast.error('Lỗi', err?.message || 'Không thể kích hoạt sinh trắc học');
                  }
                },
              },
            ]
          );
        }, 800);
      }
    }
  };

  const handleQuickFillRole = (item: (typeof DEMO_USERS)[0]) => {
    setEmailOrPhone(item.email);
    setPassword('123456');
    setSelectedDemoRole(item.role);
    showToast.info('Đã chọn vai trò', `${item.title}: ${item.email}`);
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Đăng Nhập Google',
      'Hệ thống đang tích hợp Google OAuth 2.0.\n\nVui lòng sử dụng đăng nhập Email/Mật khẩu hoặc chọn nhanh Vai Trò Mẫu bên dưới.',
      [{ text: 'Đã Hiểu', style: 'default' }]
    );
  };

  const handleGuestExplore = () => {
    navigation.navigate('CustomerScreen');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Light Sky Blue Medical Gradient Background */}
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Floating Soft Light Blue Orbs */}
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
            {/* Header Hero Branding - Medical Light Blue Identity */}
            <View style={styles.heroSection}>
              <View style={styles.glassBadgePill}>
                <Ionicons name="shield-checkmark" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.glassBadgeText}>ABC Pharmacy • Chuẩn GPP Toàn Quốc</Text>
              </View>

              {/* Glowing Medical Cross Logo Container */}
              <View style={styles.logoGlassGlow}>
                <LinearGradient
                  colors={['#0284C7', '#38BDF8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGlassInner}
                >
                  <Ionicons name="medkit" size={40} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <Text style={styles.appTitle}>ABC PHARMACY</Text>
              <Text style={styles.appSubtitle}>Hệ Thống Quản Trị & Bán Lẻ Dược Phẩm Chính Hãng</Text>

              {/* Guest Discovery Button */}
              <AnimatedTouchable onPress={handleGuestExplore} style={styles.guestPillBtn}>
                <Ionicons name="storefront-outline" size={15} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.guestPillBtnText}>Khám phá nhà thuốc (Khách vãng lai)</Text>
                <Ionicons name="chevron-forward" size={14} color="#0284C7" />
              </AnimatedTouchable>
            </View>

            {/* Master Frosted Card Container */}
            <View style={styles.glassCardWrapper}>
              <View style={styles.glassCard}>
                {/* Top Sky Sheen Reflection */}
                <View style={styles.topSheen} />

                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Đăng Nhập Tài Khoản</Text>
                  <Text style={styles.cardSubtitle}>Đăng nhập để xem lịch sử đơn, tích điểm và quản lý ca trực</Text>
                </View>

                {/* Email / Phone Input Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tài khoản</Text>
                  <View style={styles.glassInputBox}>
                    <Ionicons name="mail-outline" size={20} color="#0284C7" style={styles.inputIcon} />
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
                    <Ionicons name="lock-closed-outline" size={20} color="#0284C7" style={styles.inputIcon} />
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

                {/* Primary Action Button - Medical Blue Gradient */}
                <AnimatedTouchable
                  onPress={handleLogin}
                  disabled={loading || biometricLoading}
                  style={styles.loginBtnTouch}
                >
                  <LinearGradient
                    colors={['#0284C7', '#0EA5E9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginBtnGradient}
                  >
                    <Text style={styles.loginBtnText}>
                      {loading ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP HỆ THỐNG'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </AnimatedTouchable>

                {/* Biometric Login Button (Android BiometricPrompt & Keystore) */}
                {isBiometricEnabled && (
                  <AnimatedTouchable
                    onPress={handleBiometricLogin}
                    disabled={loading || biometricLoading}
                    style={styles.biometricBtnTouch}
                  >
                    <LinearGradient
                      colors={['#047857', '#10B981']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.biometricBtnGradient}
                    >
                      <Ionicons name="finger-print" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
                      <View style={{ flexShrink: 1, alignItems: 'flex-start' }}>
                        <Text style={styles.biometricBtnText}>
                          {biometricLoading ? 'ĐANG XÁC THỰC SINH TRẮC HỌC...' : 'ĐĂNG NHẬP SINH TRẮC HỌC'}
                        </Text>
                        {savedBiometricUser?.userName ? (
                          <Text style={styles.biometricBtnSubText} numberOfLines={1}>
                            {savedBiometricUser.userName} • {savedBiometricUser.userIdentifier}
                          </Text>
                        ) : null}
                      </View>
                    </LinearGradient>
                  </AnimatedTouchable>
                )}

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>HOẶC CHỌN VAI TRÒ MẪU 1 CHẠM</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Demo Role Grid */}
                <View style={styles.demoRoleGrid}>
                  {DEMO_USERS.map((d) => {
                    const isSelected = selectedDemoRole === d.role;
                    return (
                      <AnimatedTouchable
                        key={d.role}
                        onPress={() => handleQuickFillRole(d)}
                        style={[
                          styles.demoRoleCard,
                          {
                            borderColor: isSelected ? d.color : '#E0F2FE',
                            backgroundColor: isSelected ? `${d.color}12` : '#FFFFFF',
                          },
                          isSelected && styles.demoRoleCardSelected,
                        ]}
                      >
                        <View style={[styles.demoIconCircle, { backgroundColor: `${d.color}15` }]}>
                          <Ionicons name={d.icon as any} size={18} color={d.color} />
                        </View>
                        <View style={styles.demoTextCol}>
                          <Text
                            style={[
                              styles.demoRoleTitle,
                              { color: isSelected ? d.color : '#0F172A' },
                            ]}
                            numberOfLines={1}
                          >
                            {d.title}
                          </Text>
                          <Text style={styles.demoRoleSubtitle} numberOfLines={1}>
                            {d.subtitle}
                          </Text>
                        </View>
                      </AnimatedTouchable>
                    );
                  })}
                </View>

                {/* Google OAuth Button */}
                <AnimatedTouchable onPress={handleGoogleLogin} style={styles.googleGlassBtn}>
                  <Ionicons name="logo-google" size={19} color="#EA4335" style={{ marginRight: 10 }} />
                  <Text style={styles.googleBtnText}>Tiếp tục với tài khoản Google</Text>
                </AnimatedTouchable>

                {/* Register Row */}
                <View style={styles.registerRow}>
                  <Text style={styles.registerPrompt}>Chưa có tài khoản khách hàng? </Text>
                  <AnimatedTouchable onPress={() => navigation.navigate('RegisterScreen')}>
                    <Text style={styles.registerLink}>Đăng ký ngay</Text>
                  </AnimatedTouchable>
                </View>

                {/* Server Connection Indicator - Chỉ hiển thị trong môi trường DEV nội bộ, tuyệt đối không hiện ở bản Production */}
                {__DEV__ && EnvService.getApiBaseUrl().includes('localhost') && (
                  <View style={styles.serverInfoRow}>
                    <Ionicons
                      name="hardware-chip-outline"
                      size={13}
                      color="#0284C7"
                      style={{ marginRight: 5 }}
                    />
                    <Text style={styles.serverInfoText}>
                      USB DEBUG LOCALHOST: {EnvService.getApiBaseUrl()}
                    </Text>
                  </View>
                )}
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
    backgroundColor: '#F0F9FF',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Floating Ambient Orbs for Light Sky Blue Refraction
  ambientOrb1: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  ambientOrb2: {
    position: 'absolute',
    top: 220,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  ambientOrb3: {
    position: 'absolute',
    bottom: 20,
    left: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(186, 230, 253, 0.35)',
  },

  // Hero Section
  heroSection: {
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  glassBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  glassBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: 0.2,
  },
  logoGlassGlow: {
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 12,
  },
  logoGlassInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#0369A1',
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 290,
    marginBottom: 14,
  },
  guestPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  guestPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    marginRight: 4,
  },

  // Master Frosted Card
  glassCardWrapper: {
    paddingHorizontal: 20,
  },
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E0F2FE',
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#0284C7',
  },
  cardHeader: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 20,
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
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  forgotPassLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  glassInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
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
  loginBtnTouch: {
    marginTop: 6,
    marginBottom: 18,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  biometricBtnTouch: {
    marginTop: -4,
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  biometricBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  biometricBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  biometricBtnSubText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    marginTop: 2,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },

  // Demo Grid
  demoRoleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    rowGap: 9,
    marginBottom: 16,
  },
  demoRoleCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1.2,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  demoRoleCardSelected: {
    borderWidth: 1.5,
  },
  demoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  demoTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  demoRoleTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  demoRoleSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },

  // Google OAuth
  googleGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },

  // Register Row
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  serverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignSelf: 'center',
  },
  serverInfoText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
