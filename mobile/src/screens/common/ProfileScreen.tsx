// ProfileScreen.tsx - User profile management, security settings & logout
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { GradientButton } from '../../components/ui/GradientButton';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { showToast } from '../../components/ui/toastHelper';
import { USER_ROLE_LABELS } from '../../types/pharmacy.types';
import { ApiService } from '../../services/api.service';
import { AttendanceCheckInModal } from '../../components/attendance/AttendanceCheckInModal';
import { StaffPayslipModal } from '../../components/payroll/StaffPayslipModal';
import { StaffLeaveModal } from '../../components/attendance/StaffLeaveModal';
import { StaffScheduleModal } from '../../components/schedule/StaffScheduleModal';
import { ShiftSwapModal } from '../../components/schedule/ShiftSwapModal';
import { StaffCertificateModal } from '../../components/certificate/StaffCertificateModal';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, updateProfile, refreshUser } = useAuth();

  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [address, setAddress] = useState<string>(user?.address || '');
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);

  const [pwModalVisible, setPwModalVisible] = useState<boolean>(false);
  const [currentPw, setCurrentPw] = useState<string>('');
  const [newPw, setNewPw] = useState<string>('');
  const [confirmPw, setConfirmPw] = useState<string>('');
  const [loadingPw, setLoadingPw] = useState<boolean>(false);

  // Attendance & Payroll Modals
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showShiftSwapModal, setShowShiftSwapModal] = useState<boolean>(false);
  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [initialSwapShift, setInitialSwapShift] = useState<any>(null);
  const [leavePrefillShift, setLeavePrefillShift] = useState<any | null>(null);

  // VIP Loyalty Info
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    points?: number;
    accumulatedPoints?: number;
    tier?: string;
    multiplier?: number;
    conversionRate?: number;
  } | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    ApiService.getMyLoyalty().then((data) => {
      if (isMounted && data) {
        setLoyaltyInfo(data);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const roleLabel = user?.role ? USER_ROLE_LABELS[user.role] || user.role : 'Thành viên';

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showToast.error('Lỗi', 'Họ tên không được để trống.');
      return;
    }

    setLoadingUpdate(true);
    const ok = await updateProfile({ name: name.trim(), phone: phone.trim(), address: address.trim() });
    setLoadingUpdate(false);

    if (ok) {
      setEditModalVisible(false);
      showToast.success('Thành công', 'Thông tin cá nhân đã được cập nhật.');
    } else {
      showToast.error('Lỗi', 'Không thể cập nhật thông tin lúc này.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) {
      showToast.error('Lỗi', 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }

    if (newPw !== confirmPw) {
      showToast.error('Lỗi', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (newPw.length < 6) {
      showToast.error('Lỗi', 'Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }

    setLoadingPw(true);
    try {
      const res = await ApiService.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setLoadingPw(false);
      if (res.success !== false) {
        setPwModalVisible(false);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        showToast.success('Thành công', 'Đổi mật khẩu thành công!');
      } else {
        showToast.error('Lỗi', res.message || 'Mật khẩu hiện tại không đúng.');
      }
    } catch {
      setLoadingPw(false);
      showToast.error('Lỗi', 'Không thể kết nối máy chủ.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Hồ Sơ Cá Nhân"
        subtitle="Quản lý thông tin & bảo mật tài khoản"
        onBack={() => navigation.goBack()}
        gradientVariant="emerald"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <LinearGradient
          colors={['#065F46', '#059669', '#10B981']}
          style={styles.profileHeaderCard}
        >
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={44} color="#059669" />
          </View>
          <Text style={styles.userName}>{user?.name || 'Chưa cập nhật tên'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>

          {user?.branchName ? (
            <Text style={styles.branchText}>
              <Ionicons name="location-outline" size={14} color="#D1FAE5" /> {user.branchName}
            </Text>
          ) : null}
        </LinearGradient>

        {/* VIP Loyalty Membership Card */}
        <LinearGradient
          colors={
            loyaltyInfo?.tier === 'Diamond'
              ? ['#0F172A', '#1E293B', '#334155']
              : loyaltyInfo?.tier === 'Gold'
              ? ['#78350F', '#B45309', '#D97706']
              : loyaltyInfo?.tier === 'Silver'
              ? ['#334155', '#475569', '#64748B']
              : ['#064E3B', '#047857', '#059669']
          }
          style={styles.loyaltyCard}
        >
          <View style={styles.loyaltyTopRow}>
            <View>
              <Text style={styles.loyaltySubHeader}>THẺ HỘI VIÊN CHUỖI NHÀ THUỐC</Text>
              <Text style={styles.loyaltyBrandTitle}>ABC Pharmacy Club</Text>
            </View>
            <View style={styles.loyaltyTierTag}>
              <Ionicons name="sparkles" size={12} color="#FEF3C7" />
              <Text style={styles.loyaltyTierText}>
                {loyaltyInfo?.tier ? `HẠNG ${String(loyaltyInfo.tier).toUpperCase()}` : 'HẠNG ĐỒNG'}
              </Text>
            </View>
          </View>

          <View style={styles.loyaltyPointsContainer}>
            <Text style={styles.loyaltyPointsLabel}>Điểm Thưởng Khả Dụng</Text>
            <Text style={styles.loyaltyPointsNumber}>
              {(loyaltyInfo?.points ?? (user as any)?.points ?? 0).toLocaleString('vi-VN')}
              <Text style={styles.loyaltyPointsUnit}> điểm ({(loyaltyInfo?.points ?? (user as any)?.points ?? 0).toLocaleString('vi-VN')} ₫)</Text>
            </Text>
          </View>

          <View style={styles.loyaltyBottomRow}>
            <View style={styles.loyaltyBenefitItem}>
              <Ionicons name="checkmark-circle" size={14} color="#A7F3D0" />
              <Text style={styles.loyaltyBenefitText}>Tích 1% mỗi đơn mua</Text>
            </View>
            <View style={styles.loyaltyBenefitItem}>
              <Ionicons name="checkmark-circle" size={14} color="#A7F3D0" />
              <Text style={styles.loyaltyBenefitText}>Trừ tiền trực tiếp tại POS & App</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Info Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông Tin Liên Hệ</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail" size={18} color="#059669" />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call" size={18} color="#059669" />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Chưa cập nhật'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="home" size={18} color="#059669" />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              <Text style={styles.infoValue}>{user?.address || 'Chưa thiết lập địa chỉ'}</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cài Đặt & Bảo Mật</Text>

          <AnimatedTouchable
            onPress={() => {
              setName(user?.name || '');
              setPhone(user?.phone || '');
              setAddress(user?.address || '');
              setEditModalVisible(true);
            }}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="create-outline" size={22} color="#059669" />
              <Text style={styles.menuText}>Chỉnh sửa thông tin</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setPwModalVisible(true)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="lock-closed-outline" size={22} color="#4F46E5" />
              <Text style={styles.menuText}>Đổi mật khẩu</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => navigation.navigate('NotificationListScreen')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={22} color="#D97706" />
              <Text style={styles.menuText}>Trung tâm thông báo</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => navigation.navigate('MedicineReminderScreen')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="alarm-outline" size={22} color="#0891B2" />
              <Text style={styles.menuText}>Lịch nhắc uống thuốc (Ngoại tuyến)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </AnimatedTouchable>

          {/* HR & Attendance for Staff */}
          {user?.role !== 'customer' && (
            <>
              <AnimatedTouchable
                onPress={() => setShowCheckInModal(true)}
                style={styles.menuItem}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="location-outline" size={22} color="#059669" />
                  <Text style={styles.menuText}>Điểm danh ca trực (GPS)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => setShowPayslipModal(true)}
                style={styles.menuItem}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="receipt-outline" size={22} color="#0284C7" />
                  <Text style={styles.menuText}>Phiếu lương cá nhân</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => setShowLeaveModal(true)}
                style={styles.menuItem}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="calendar-outline" size={22} color="#059669" />
                  <Text style={styles.menuText}>Nghỉ phép & Quỹ phép năm</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => setShowScheduleModal(true)}
                style={styles.menuItem}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="calendar" size={22} color="#0284C7" />
                  <Text style={styles.menuText}>Lịch làm việc của tôi</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => setShowShiftSwapModal(true)}
                style={styles.menuItem}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="swap-horizontal" size={22} color="#8B5CF6" />
                  <Text style={styles.menuText}>Đổi ca làm việc</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => setShowCertModal(true)}
                style={styles.menuItem}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="ribbon-outline" size={22} color="#D97706" />
                  <Text style={styles.menuText}>Chứng chỉ & Bằng cấp (CCHN)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
            </>
          )}
        </View>

        {/* Logout Button */}
        <GradientButton
          title="ĐĂNG XUẤT"
          onPress={handleLogout}
          gradientVariant="danger"
          size="lg"
          icon={<Ionicons name="log-out-outline" size={20} color="#FFFFFF" />}
          style={{ marginTop: 10, marginBottom: 30 }}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cập Nhật Thông Tin</Text>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput style={styles.modalInput} value={name} onChangeText={setName} />
            </View>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput style={styles.modalInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Địa chỉ</Text>
              <TextInput style={styles.modalInput} value={address} onChangeText={setAddress} />
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </AnimatedTouchable>
              <GradientButton
                title="LƯU THAY ĐỔI"
                onPress={handleSaveProfile}
                loading={loadingUpdate}
                gradientVariant="primary"
                size="md"
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={pwModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Đổi Mật Khẩu</Text>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
              <TextInput style={styles.modalInput} secureTextEntry value={currentPw} onChangeText={setCurrentPw} />
            </View>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
              <TextInput style={styles.modalInput} secureTextEntry value={newPw} onChangeText={setNewPw} />
            </View>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
              <TextInput style={styles.modalInput} secureTextEntry value={confirmPw} onChangeText={setConfirmPw} />
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setPwModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </AnimatedTouchable>
              <GradientButton
                title="CẬP NHẬT"
                onPress={handleChangePassword}
                loading={loadingPw}
                gradientVariant="indigo"
                size="md"
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance Check-in Modal */}
      <AttendanceCheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
      />

      {/* Staff Payslip Modal */}
      <StaffPayslipModal
        visible={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
      />

      {/* Staff Leave Management Modal */}
      <StaffLeaveModal
        visible={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          setLeavePrefillShift(null);
        }}
        prefillShift={leavePrefillShift}
      />

      {/* Staff Schedule Calendar Modal */}
      <StaffScheduleModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onRequestSwap={(shift) => {
          setShowScheduleModal(false);
          setInitialSwapShift(shift);
          setShowShiftSwapModal(true);
        }}
        onOpenLeave={(shift) => {
          setShowScheduleModal(false);
          setLeavePrefillShift(shift);
          setShowLeaveModal(true);
        }}
      />

      {/* Shift Swap Requests Modal */}
      <ShiftSwapModal
        visible={showShiftSwapModal}
        onClose={() => {
          setShowShiftSwapModal(false);
          setInitialSwapShift(null);
        }}
        initialShift={initialSwapShift}
      />

      {/* CCHN Certificate Modal */}
      <StaffCertificateModal
        visible={showCertModal}
        onClose={() => setShowCertModal(false)}
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
  },
  profileHeaderCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  branchText: {
    color: '#E6FFFA',
    fontSize: 13,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  modalInputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roleItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  activeRoleItem: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  roleItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  roleItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  loyaltyCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  loyaltyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  loyaltySubHeader: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#A7F3D0',
    textTransform: 'uppercase',
  },
  loyaltyBrandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  loyaltyTierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loyaltyTierText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEF3C7',
    letterSpacing: 0.5,
  },
  loyaltyPointsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    padding: 12,
    marginVertical: 4,
  },
  loyaltyPointsLabel: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '600',
  },
  loyaltyPointsNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  loyaltyPointsUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  loyaltyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  loyaltyBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loyaltyBenefitText: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '600',
  },
});
