// ForgotPasswordScreen.tsx - Password Recovery Flow with OTP verification and password reset
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { GradientButton } from '../../components/ui/GradientButton';
import { HeaderBar } from '../../components/ui/HeaderBar';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState<'REQUEST' | 'RESET'>('REQUEST');

  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
          <View style={styles.card}>
            {step === 'REQUEST' ? (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="key" size={40} color="#4F46E5" />
                </View>
                <Text style={styles.title}>Quên Mật Khẩu?</Text>
                <Text style={styles.subtitle}>
                  Nhập địa chỉ email đăng ký tài khoản của bạn để nhận mã OTP xác thực khôi phục mật khẩu.
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#4F46E5" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email của bạn"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <GradientButton
                  title="GỬI MÃ XÁC THỰC"
                  onPress={handleSendOtp}
                  loading={loading}
                  gradientVariant="indigo"
                  size="lg"
                  style={styles.actionBtn}
                />
              </>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-open" size={40} color="#4F46E5" />
                </View>
                <Text style={styles.title}>Đặt Lại Mật Khẩu</Text>
                <Text style={styles.subtitle}>
                  Nhập mã OTP gửi tới <Text style={{ fontWeight: '700' }}>{email}</Text> và mật khẩu mới.
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color="#4F46E5" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 4, fontWeight: '700', fontSize: 18 }]}
                    placeholder="OTP 6 số"
                    placeholderTextColor="#94A3B8"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#4F46E5" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu mới"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#4F46E5" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Xác nhận mật khẩu mới"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <GradientButton
                  title="ĐẶT LẠI MẬT KHẨU"
                  onPress={handleResetPassword}
                  loading={loading}
                  gradientVariant="indigo"
                  size="lg"
                  style={styles.actionBtn}
                />
              </>
            )}
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
