// mobile/src/screens/auth/RegisterScreen.tsx
/**
 * =========================================================================
 * MÀN HÌNH ĐĂNG KÝ TÀI KHOẢN KHÁCH HÀNG (MOBILE - CHUẨN GPP & NGHỊ ĐỊNH 13)
 * - Tích hợp mục "Quy định bảo mật thông tin người dùng & dữ liệu y tế"
 * - Modal xem chi tiết chính sách bảo mật cá nhân & an toàn dược phẩm
 * - Thanh đo độ an toàn mật khẩu (Password Strength Bar) trực quan 4 cấp
 * - Tối ưu hóa UI/UX React Native: không falsy-&&, toàn bộ text trong <Text>
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { FlatCard, FlatInput, FlatButton, FlatBadge } from '../../components/flat';
import { showToast } from '../../components/ui/toastHelper';
import { PrivacyPolicyModal } from '../../components/clinical/PrivacyPolicyModal';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { register, verifyEmail, resendVerification } = useAuth();
  const [step, setStep] = useState<'REGISTER' | 'OTP'>('REGISTER');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');

  const [agreePrivacy, setAgreePrivacy] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Tính toán độ an toàn mật khẩu (4 cấp độ trực quan)
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabels = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Rất an toàn'];
  const strengthColors = ['#E2E8F0', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
      return;
    }

    if (password !== confirmPassword) {
      showToast.error('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (password.length < 6) {
      showToast.error('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 6 ký tự để đảm bảo an toàn.');
      return;
    }

    // Ràng buộc bảo vệ dữ liệu y tế cá nhân theo Nghị định 13
    if (!agreePrivacy) {
      showToast.error(
        'Chưa đồng ý quy định',
        'Vui lòng đọc và tích chọn đồng ý với Quy định bảo mật thông tin để hoàn tất đăng ký.'
      );
      return;
    }

    setLoading(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    setLoading(false);

    if (result?.success) {
      if (result.requiresEmailVerification) {
        setStep('OTP');
        showToast.success(
          'Đăng ký thành công',
          'Mã OTP 6 số đã được gửi tới email của bạn. Hãy nhập mã để kích hoạt!'
        );
      } else {
        showToast.success('Đăng ký thành công', 'Chào mừng bạn đến với ABC Pharmacy!');
        navigation.goBack();
      }
    } else {
      let friendlyMsg = result?.message || 'Email hoặc số điện thoại có thể đã được đăng ký trên hệ thống.';
      if (friendlyMsg.includes('E11000') && friendlyMsg.includes('phone')) {
        friendlyMsg = 'Số điện thoại này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc dùng số điện thoại khác.';
      } else if (friendlyMsg.includes('E11000') && friendlyMsg.includes('email')) {
        friendlyMsg = 'Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc dùng email khác.';
      } else if (friendlyMsg.includes('E11000')) {
        friendlyMsg = 'Thông tin đăng ký đã tồn tại trên hệ thống. Vui lòng kiểm tra lại.';
      }

      showToast.error(
        'Đăng ký thất bại',
        friendlyMsg
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showToast.error('Lỗi', 'Vui lòng nhập mã OTP.');
      return;
    }

    setLoading(true);
    const success = await verifyEmail(email, otp.trim());
    setLoading(false);

    if (success) {
      showToast.success('Xác thực thành công', 'Email đã được kích hoạt. Hãy đăng nhập để tiếp tục!');
      navigation.goBack();
    } else {
      showToast.error('Xác thực thất bại', 'Mã OTP không chính xác hoặc đã hết hạn.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HeaderBar chuẩn màu Xanh y tế */}
      <HeaderBar
        title={step === 'REGISTER' ? 'Tạo Tài Khoản' : 'Xác Thực Email'}
        subtitle="Hệ thống thành viên Dược phẩm GPP"
        onBack={() => (step === 'OTP' ? setStep('REGISTER') : navigation.goBack())}
        gradientVariant="sky"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <FlatCard
            glassIntensity="medium"
            title={step === 'REGISTER' ? 'Thông Tin Cá Nhân' : 'Xác Thực OTP'}
            subtitle={
              step === 'REGISTER'
                ? 'Đăng ký tài khoản để tích điểm, nhận voucher ưu đãi và bảo vệ an toàn dùng thuốc.'
                : `Mã OTP đã gửi tới ${email}`
            }
            headerIcon={step === 'REGISTER' ? 'person-add-outline' : 'shield-checkmark-outline'}
            footer={
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                <AnimatedTouchable onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.footerLink}>Đăng nhập ngay</Text>
                </AnimatedTouchable>
              </View>
            }
          >
            {step === 'REGISTER' ? (
              <View style={{ marginTop: 8 }}>
                <View style={styles.stepHeaderRow}>
                  <Text style={styles.stepTitle}>Bước 1: Điền biểu mẫu đăng ký</Text>
                  <FlatBadge label="Bước 1/2" status="info" variant="glass" size="sm" icon="create-outline" />
                </View>

                {/* Họ và tên */}
                <FlatInput
                  label="Họ và tên *"
                  placeholder="VD: Nguyễn Văn A"
                  value={name}
                  onChangeText={setName}
                  leftIcon="person-outline"
                />

                {/* Email liên hệ */}
                <FlatInput
                  label="Email liên hệ *"
                  placeholder="example@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                />

                {/* Số điện thoại */}
                <FlatInput
                  label="Số điện thoại"
                  placeholder="VD: 0901234567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  leftIcon="call-outline"
                />

                {/* Mật khẩu */}
                <FlatInput
                  label="Mật khẩu *"
                  placeholder="Tối thiểu 6 ký tự"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                {/* Thanh đo độ an toàn mật khẩu */}
                {password.length > 0 ? (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((stepVal) => (
                        <View
                          key={stepVal}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                passwordStrength >= stepVal
                                  ? strengthColors[passwordStrength]
                                  : '#E2E8F0',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.strengthRow}>
                      <Text style={styles.strengthTextLabel}>Độ an toàn:</Text>
                      <Text style={[styles.strengthTextValue, { color: strengthColors[passwordStrength] }]}>
                        {strengthLabels[passwordStrength]}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Xác nhận mật khẩu */}
                <FlatInput
                  label="Xác nhận mật khẩu *"
                  placeholder="Nhập lại mật khẩu vừa tạo"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  leftIcon="shield-checkmark-outline"
                />

                {/* ============================================================ */}
                {/* MỤC QUY ĐỊNH BẢO MẬT THÔNG TIN NGƯỜI DÙNG (MOBILE)            */}
                {/* ============================================================ */}
                <View style={styles.privacyCard}>
                  <View style={styles.privacyHeaderRow}>
                    <AnimatedTouchable
                      onPress={() => setAgreePrivacy(!agreePrivacy)}
                      style={styles.checkboxTouch}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View
                        style={[
                          styles.checkboxBox,
                          agreePrivacy ? styles.checkboxChecked : styles.checkboxUnchecked,
                        ]}
                      >
                        {agreePrivacy ? (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        ) : null}
                      </View>
                    </AnimatedTouchable>

                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.privacyLabel}>
                        Tôi đồng ý với{' '}
                        <Text
                          onPress={() => setShowPrivacyModal(true)}
                          style={styles.privacyLink}
                        >
                          Quy định bảo mật thông tin
                        </Text>{' '}
                        và bảo vệ dữ liệu y tế cá nhân.
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.privacySubtext}>
                    🔒 Thông tin sức khỏe và tiền sử dị ứng được bảo mật tuyệt đối theo Nghị định 13/2023/NĐ-CP & Chuẩn GPP.
                  </Text>
                </View>

                {/* Nút Đăng Ký Tài Khoản */}
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
                    <Ionicons name="mail-unread" size={42} color="#0284C7" />
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
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.resendText}>Không nhận được mã? Gửi lại mã OTP</Text>
                </AnimatedTouchable>
              </View>
            )}
          </FlatCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Xem Chi Tiết Quy Định Bảo Mật Thông Tin */}
      <PrivacyPolicyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => setAgreePrivacy(true)}
      />
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
    paddingBottom: 32,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  strengthContainer: {
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  strengthTextLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  strengthTextValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  privacyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxTouch: {
    paddingTop: 1,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  checkboxUnchecked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  privacyLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
    fontWeight: '500',
  },
  privacyLink: {
    color: '#0284C7',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  privacySubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 16,
  },
  otpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  resendText: {
    fontSize: 13,
    color: '#0284C7',
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
    color: '#0284C7',
  },
});

export default RegisterScreen;
