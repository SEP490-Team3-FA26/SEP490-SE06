// ForgotPasswordScreen.tsx - Password Recovery Flow with OTP verification and password reset
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { GradientButton } from '../../components/ui/GradientButton';
import { HeaderBar } from '../../components/ui/HeaderBar';

import { FlatCard, FlatInput, FlatButton, FlatBadge } from '../../components/flat';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState<'REQUEST' | 'RESET'>('REQUEST');

  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email đăng ký.');
      return;
    }

    setLoading(true);
    const success = await forgotPassword(email.trim().toLowerCase());
    setLoading(false);

    if (success) {
      Alert.alert('Đã gửi mã', 'Mã OTP đặt lại mật khẩu đã được gửi tới email của bạn.');
      setStep('RESET');
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy tài khoản với email đã nhập.');
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền mã OTP và mật khẩu mới.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }

    setLoading(true);
    const success = await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
    setLoading(false);

    if (success) {
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi thành công. Vui lòng đăng nhập lại!', [
        { text: 'Đăng nhập ngay', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Lỗi', 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Quên Mật Khẩu"
        subtitle="Khôi phục quyền truy cập tài khoản"
        onBack={() => (step === 'RESET' ? setStep('REQUEST') : navigation.goBack())}
        gradientVariant="indigo"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <FlatCard
            glassIntensity="medium"
            title={step === 'REQUEST' ? 'Quên Mật Khẩu?' : 'Đặt Lại Mật Khẩu'}
            subtitle={
              step === 'REQUEST'
                ? 'Nhập địa chỉ email đăng ký tài khoản của bạn để nhận mã OTP xác thực khôi phục mật khẩu.'
                : `Nhập mã OTP gửi tới ${email} và thiết lập mật khẩu mới.`
            }
            headerIcon={step === 'REQUEST' ? 'key-outline' : 'lock-open-outline'}
          >
            {step === 'REQUEST' ? (
              <View style={{ marginTop: 8 }}>
                <View style={{ alignItems: 'center', marginVertical: 14 }}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="key" size={38} color="#4F46E5" />
                  </View>
                  <FlatBadge label="Bước 1: Xác thực Email" status="info" variant="glass" size="md" icon="mail-outline" style={{ marginTop: 8 }} />
                </View>

                <FlatInput
                  label="Email của bạn"
                  placeholder="example@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                />

                <FlatButton
                  title="GỬI MÃ XÁC THỰC"
                  onPress={handleSendOtp}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon="paper-plane-outline"
                  iconPosition="right"
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <View style={{ alignItems: 'center', marginVertical: 14 }}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="lock-open" size={38} color="#4F46E5" />
                  </View>
                  <FlatBadge label="Bước 2: Mật khẩu mới" status="success" variant="glass" size="md" icon="shield-checkmark-outline" style={{ marginTop: 8 }} />
                </View>

                <FlatInput
                  label="Mã OTP 6 số"
                  placeholder="123456"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  leftIcon="key-outline"
                  style={{ letterSpacing: 4 }}
                />

                <FlatInput
                  label="Mật khẩu mới"
                  placeholder="Tối thiểu 6 ký tự"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <FlatInput
                  label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  leftIcon="shield-checkmark-outline"
                />

                <FlatButton
                  title="ĐẶT LẠI MẬT KHẨU"
                  onPress={handleResetPassword}
                  loading={loading}
                  variant="success"
                  size="lg"
                  fullWidth
                  icon="checkmark-done-outline"
                  iconPosition="right"
                  style={{ marginTop: 8 }}
                />
              </View>
            )}
          </FlatCard>
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
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 18,
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
  actionBtn: {
    marginTop: 10,
    marginBottom: 16,
  },
});
