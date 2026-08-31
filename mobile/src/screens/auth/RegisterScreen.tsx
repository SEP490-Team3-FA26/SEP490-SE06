// RegisterScreen.tsx - Customer Registration Screen with validation & email OTP step
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
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { GradientButton } from '../../components/ui/GradientButton';
import { HeaderBar } from '../../components/ui/HeaderBar';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { register, verifyEmail, resendVerification } = useAuth();
  const [step, setStep] = useState<'REGISTER' | 'OTP'>('REGISTER');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    const res = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
    });
    setLoading(false);

    if (res.success) {
      if (res.requiresEmailVerification) {
        Alert.alert('Đăng ký thành công', 'Mã OTP xác thực đã được gửi tới email của bạn.');
        setStep('OTP');
      } else {
        Alert.alert('Đăng ký thành công', 'Tài khoản của bạn đã được khởi tạo thành công!', [
          { text: 'Đăng nhập ngay', onPress: () => navigation.goBack() },
        ]);
      }
    } else {
      Alert.alert('Đăng ký thất bại', res.message || 'Email hoặc số điện thoại đã tồn tại.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP.');
      return;
    }

    setLoading(true);
    const success = await verifyEmail(email, otp.trim());
    setLoading(false);

    if (success) {
      Alert.alert('Xác thực thành công', 'Email của bạn đã được kích hoạt. Hãy đăng nhập để tiếp tục!', [
        { text: 'Đăng nhập', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Xác thực thất bại', 'Mã OTP không chính xác hoặc đã hết hạn.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title={step === 'REGISTER' ? 'Tạo Tài Khoản' : 'Xác Thực Email'}
        subtitle="Hệ thống thành viên Dược phẩm"
        onBack={() => (step === 'OTP' ? setStep('REGISTER') : navigation.goBack())}
        gradientVariant="emerald"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {step === 'REGISTER' ? (
              <>
                <Text style={styles.cardTitle}>Thông Tin Cá Nhân</Text>
                <Text style={styles.cardSubtitle}>
                  Đăng ký tài khoản để tích điểm, nhận voucher ưu đãi và mua thuốc trực tuyến.
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#059669" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Họ và tên"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#059669" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#059669" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#059669" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#059669" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Xác nhận mật khẩu"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <GradientButton
                  title="ĐĂNG KÝ"
                  onPress={handleRegister}
                  loading={loading}
                  gradientVariant="primary"
                  size="lg"
                  style={styles.actionBtn}
                />
              </>
            ) : (
              <>
                <View style={styles.otpIconContainer}>
                  <Ionicons name="mail-unread" size={48} color="#059669" />
                </View>
                <Text style={styles.cardTitle}>Nhập Mã Xác Thực</Text>
                <Text style={styles.cardSubtitle}>
                  Chúng tôi đã gửi mã xác nhận 6 số tới: <Text style={{ fontWeight: '700' }}>{email}</Text>
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color="#059669" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 4, fontWeight: '700', fontSize: 18 }]}
                    placeholder="123456"
                    placeholderTextColor="#94A3B8"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <GradientButton
                  title="XÁC THỰC"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  gradientVariant="success"
                  size="lg"
                  style={styles.actionBtn}
                />

                <AnimatedTouchable
                  onPress={() => resendVerification(email)}
                  style={styles.resendBtn}
                >
                  <Text style={styles.resendText}>Không nhận được mã? Gửi lại</Text>
                </AnimatedTouchable>
              </>
            )}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <AnimatedTouchable onPress={() => navigation.goBack()}>
                <Text style={styles.footerLink}>Đăng nhập</Text>
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
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  otpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
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
  resendBtn: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});
