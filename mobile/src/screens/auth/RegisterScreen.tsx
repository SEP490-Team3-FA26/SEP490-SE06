// RegisterScreen.tsx - Customer Registration Screen with validation & email OTP step
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
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { HeaderBar } from '../../components/ui/HeaderBar';

import { FlatCard, FlatInput, FlatButton, FlatBadge } from '../../components/flat';

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
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    const success = await register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    setLoading(false);

    if (success) {
      setStep('OTP');
      Alert.alert(
        'Đăng ký thành công',
        'Một mã xác thực OTP 6 số đã được gửi tới email của bạn. Hãy nhập mã để kích hoạt tài khoản!'
      );
    } else {
      Alert.alert('Đăng ký thất bại', 'Email hoặc số điện thoại có thể đã được đăng ký.');
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
          <FlatCard
            glassIntensity="medium"
            title={step === 'REGISTER' ? 'Thông Tin Cá Nhân' : 'Xác Thực OTP'}
            subtitle={
              step === 'REGISTER'
                ? 'Đăng ký tài khoản để tích điểm, nhận voucher ưu đãi và mua thuốc trực tuyến.'
                : `Mã OTP đã gửi tới ${email}`
            }
            headerIcon={step === 'REGISTER' ? 'person-add-outline' : 'shield-checkmark-outline'}
            footer={
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                <AnimatedTouchable onPress={() => navigation.goBack()}>
                  <Text style={styles.footerLink}>Đăng nhập</Text>
                </AnimatedTouchable>
              </View>
            }
          >
            {step === 'REGISTER' ? (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Bước 1: Điền biểu mẫu</Text>
                  <FlatBadge label="Bước 1/2" status="info" variant="glass" size="sm" icon="create-outline" />
                </View>

                <FlatInput
                  label="Họ và tên"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChangeText={setName}
                  leftIcon="person-outline"
                />

                <FlatInput
                  label="Email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                />

                <FlatInput
                  label="Số điện thoại"
                  placeholder="0901234567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  leftIcon="call-outline"
                />

                <FlatInput
                  label="Mật khẩu"
                  placeholder="Tối thiểu 6 ký tự"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <FlatInput
                  label="Xác nhận mật khẩu"
                  placeholder="Nhập lại mật khẩu"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  leftIcon="shield-checkmark-outline"
                />

                <FlatButton
                  title="ĐĂNG KÝ TÀI KHOẢN"
                  onPress={handleRegister}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon="arrow-forward-outline"
                  iconPosition="right"
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                  <View style={styles.otpIconContainer}>
                    <Ionicons name="mail-unread" size={42} color="#059669" />
                  </View>
                  <FlatBadge label="Mã OTP 6 số" status="success" variant="glass" size="md" icon="key-outline" style={{ marginTop: 10 }} />
                </View>

                <FlatInput
                  label="Mã xác thực Email"
                  placeholder="123456"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  leftIcon="key-outline"
                  style={{ letterSpacing: 4 }}
                />

                <FlatButton
                  title="XÁC THỰC KÍCH HOẠT"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  variant="success"
                  size="lg"
                  fullWidth
                  icon="checkmark-circle-outline"
                  iconPosition="right"
                  style={{ marginTop: 8 }}
                />

                <AnimatedTouchable
                  onPress={() => resendVerification(email)}
                  style={styles.resendBtn}
                >
                  <Text style={styles.resendText}>Không nhận được mã? Gửi lại</Text>
                </AnimatedTouchable>
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
