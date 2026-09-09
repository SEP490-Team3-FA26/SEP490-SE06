// LoginScreen.tsx - Modern Pharma Login Screen with Gradients, Animations, Demo Quick-Logins & Google Webview
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { GradientButton } from '../../components/ui/GradientButton';
import { UserRole } from '../../types/pharmacy.types';

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
    { role: UserRole.BRANCH, title: 'Quản Lý Cơ Sở', email: 'manager@vinapharmacy.com', color: '#06B6D4', icon: 'storefront' },
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

  const handleQuickDemo = (item: (typeof DEMO_USERS)[0]) => {
    setEmailOrPhone(item.email);
    setPassword('123456');
    setSelectedDemoRole(item.role);
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Visual */}
          <LinearGradient
            colors={['#065F46', '#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.logoCircle}>
              <Ionicons name="medkit" size={44} color="#059669" />
            </View>
            <Text style={styles.appTitle}>Pharma ERP</Text>
            <Text style={styles.appSubtitle}>Hệ Thống Quản Lý Chuỗi Nhà Thuốc Thông Minh</Text>
          </LinearGradient>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Đăng Nhập</Text>
            <Text style={styles.hintText}>Truy cập hệ thống quản trị & bán lẻ dược phẩm</Text>

            {/* Email / Phone Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#059669" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email hoặc Số điện thoại"
                placeholderTextColor="#94A3B8"
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#059669" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <AnimatedTouchable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </AnimatedTouchable>
            </View>

            {/* Forgot Password Link */}
            <AnimatedTouchable
              onPress={() => navigation.navigate('ForgotPasswordScreen')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </AnimatedTouchable>

            {/* Login Button */}
            <GradientButton
              title="ĐĂNG NHẬP"
              onPress={handleLogin}
              loading={loading}
              gradientVariant="primary"
              size="lg"
              style={styles.loginBtn}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC CHỌN TÀI KHOẢN DEMO</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Demo Role Badges */}
            <View style={styles.demoGrid}>
              {DEMO_USERS.map((d) => {
                const isSelected = selectedDemoRole === d.role;
                return (
                  <AnimatedTouchable
                    key={d.role}
                    onPress={() => handleQuickDemo(d)}
                    style={[
                      styles.demoChip,
                      { borderColor: isSelected ? d.color : '#E2E8F0' },
                      isSelected && { backgroundColor: `${d.color}15` },
                    ]}
                  >
                    <Ionicons name={d.icon as any} size={16} color={d.color} />
                    <Text
                      style={[
                        styles.demoChipText,
                        { color: isSelected ? d.color : '#475569', fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {d.title}
                    </Text>
                  </AnimatedTouchable>
                );
              })}
            </View>

            {/* Google OAuth Button */}
            <AnimatedTouchable onPress={handleGoogleLogin} style={styles.googleBtn}>
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={styles.googleBtnText}>Đăng nhập với Google</Text>
            </AnimatedTouchable>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Chưa có tài khoản khách hàng? </Text>
              <AnimatedTouchable onPress={() => navigation.navigate('RegisterScreen')}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </AnimatedTouchable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  heroBanner: {
    paddingTop: 40,
    paddingBottom: 45,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#E6FFFA',
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    marginTop: -20,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  hintText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
  },
  forgotText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  loginBtn: {
    marginBottom: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  demoChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  demoChipText: {
    fontSize: 12,
    marginLeft: 6,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },
  googleBtnText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
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
    fontWeight: '700',
    color: '#059669',
  },
});
