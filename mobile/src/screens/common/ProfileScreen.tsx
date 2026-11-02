// ProfileScreen.tsx - Quản lý Hồ sơ cá nhân & Nghiệp vụ Nhân sự chuẩn FPT Long Châu
// Tuân thủ 100% bộ quy chuẩn /abc-reactnative-improvement-ui-ux:
// Zero-Border, Typography to rõ cho người cao tuổi, Không crash falsy-&&, Toàn bộ text trong <Text>
// Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { GradientButton } from '../../components/ui/GradientButton';
import { showToast } from '../../components/ui/toastHelper';
import { USER_ROLE_LABELS } from '../../types/pharmacy.types';
import { ApiService } from '../../services/api.service';
import { AttendanceCheckInModal } from '../../components/attendance/AttendanceCheckInModal';
import { StaffPayslipModal } from '../../components/payroll/StaffPayslipModal';
import { StaffLeaveModal } from '../../components/attendance/StaffLeaveModal';
import { StaffScheduleModal } from '../../components/schedule/StaffScheduleModal';
import { ShiftSwapModal } from '../../components/schedule/ShiftSwapModal';
import { StaffCertificateModal } from '../../components/certificate/StaffCertificateModal';
import { DigitalHealthPassportModal } from '../../components/clinical';
import { StaffIdCardScanModal } from '../../components/attendance/StaffIdCardScanModal';
import { FlatModal } from '../../components/flat/FlatModal';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    user,
    auth,
    logout,
    updateProfile,
    refreshUser,
    isBiometricSupported,
    isBiometricEnabled,
    toggleBiometrics,
  } = useAuth();

  // State chỉnh sửa thông tin cá nhân
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [address, setAddress] = useState<string>(user?.address || '');
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);

  // State đổi mật khẩu
  const [pwModalVisible, setPwModalVisible] = useState<boolean>(false);
  const [currentPw, setCurrentPw] = useState<string>('');
  const [newPw, setNewPw] = useState<string>('');
  const [confirmPw, setConfirmPw] = useState<string>('');
  const [loadingPw, setLoadingPw] = useState<boolean>(false);

  // Modals Nghiệp Vụ Nhân Sự & Chấm Công
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showShiftSwapModal, setShowShiftSwapModal] = useState<boolean>(false);
  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [initialSwapShift, setInitialSwapShift] = useState<any>(null);
  const [leavePrefillShift, setLeavePrefillShift] = useState<any | null>(null);

  // Sổ Sức Khỏe Số (Digital Health Passport - UC-106)
  const [showPassportModal, setShowPassportModal] = useState<boolean>(false);

  // Modal Xác Nhận Đăng Xuất In-App (Không dùng Alert hệ điều hành)
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showDirectorStaffScanModal, setShowDirectorStaffScanModal] = useState<boolean>(false);

  // Phân quyền Ban Giám Đốc (Executive Director) & Quản Lý Chi Nhánh (Branch Manager) dựa trên RBAC chuẩn
  const userRole = String(user?.role || auth.role || '').toLowerCase().trim();
  const isDirector = Boolean(
    ['director', 'headbranch', 'head_branch'].includes(userRole) ||
    (Array.isArray((user as any)?.roles) &&
      (user as any).roles.some((r: string) =>
        ['director', 'headbranch', 'head_branch'].includes(String(r).toLowerCase())
      ))
  );

  const isBranchManager = Boolean(
    ['branch', 'headbranch', 'head_branch'].includes(userRole) ||
    (Array.isArray((user as any)?.roles) &&
      (user as any).roles.some((r: string) =>
        ['branch', 'headbranch', 'head_branch'].includes(String(r).toLowerCase())
      ))
  );

  // Thông tin Xu thưởng & Thẻ hội viên VIP
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    points?: number;
    accumulatedPoints?: number;
    tier?: string;
    multiplier?: number;
    conversionRate?: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    ApiService.getMyLoyalty()
      .then((data) => {
        if (isMounted && data) {
          setLoyaltyInfo(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const roleLabel = user?.role ? USER_ROLE_LABELS[user.role] || user.role : 'Khách hàng';
  const isStaff = user?.role && user.role !== 'customer';

  // Lưu thông tin cá nhân
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

  // Đổi mật khẩu
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
    setShowLogoutModal(true);
  };

  const pointsCount = loyaltyInfo?.points ?? (user as any)?.points ?? 0;

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* 1. HEADER XANH GRADIENT LIỀN MẠCH PHONG CÁCH FPT LONG CHÂU     */}
        {/* ============================================================== */}
        <LinearGradient
          colors={['#0047BA', '#0284C7', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Thanh tiêu đề & nút quay lại điều hướng */}
          <View style={styles.topNavRow}>
            <AnimatedTouchable
              style={styles.topBackBtn}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else if (isDirector) {
                  navigation.navigate('DirectorScreen');
                } else if (isStaff && user?.role === 'pharmacist') {
                  navigation.navigate('PharmacistScreen');
                } else if (!isStaff) {
                  navigation.navigate('CustomerScreen');
                }
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </AnimatedTouchable>
            <Text style={styles.topNavTitle}>
              {isDirector
                ? 'Hồ Sơ Ban Giám Đốc'
                : isStaff
                ? 'Hồ Sơ Nhân Sự Chi Nhánh'
                : 'Hồ Sơ Cá Nhân'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Hàng thông tin người dùng */}
          <View style={styles.userHeaderRow}>
            {/* Avatar bên trái */}
            <View style={styles.avatarGlowWrapper}>
              <View style={styles.avatarCircle}>
                <Ionicons
                  name={isDirector ? 'shield-checkmark' : 'person'}
                  size={32}
                  color="#FFFFFF"
                />
              </View>
            </View>

            {/* Tên & Số điện thoại */}
            <View style={styles.userInfoBox}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {user?.name || (isDirector ? 'Ban Giám Đốc' : 'Người dùng')}
              </Text>
              <Text style={styles.userPhoneText}>
                {user?.phone || 'Chưa cập nhật SĐT'}
              </Text>
              {isStaff ? (
                <View style={styles.staffRolePill}>
                  <Text style={styles.staffRoleText}>
                    {isDirector ? 'Giám Đốc Chuỗi' : roleLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Huy hiệu bên phải: Giám đốc hiển thị HQ, Dược sĩ hiển thị Cơ sở chi nhánh, Khách hàng hiển thị Xu Thưởng */}
            {isDirector ? (
              <View style={[styles.staffBranchBadge, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                <Ionicons name="business" size={13} color="#FFFFFF" />
                <Text style={styles.staffBranchBadgeText}>Trụ Sở Chính (HQ)</Text>
              </View>
            ) : isStaff ? (
              <View style={styles.staffBranchBadge}>
                <Ionicons name="business" size={13} color="#FFFFFF" />
                <Text style={styles.staffBranchBadgeText}>Cơ Sở CN1</Text>
              </View>
            ) : (
              <AnimatedTouchable
                style={styles.coinBadgeContainer}
                onPress={() => navigation.navigate('LoyaltyScreen')}
              >
                <View style={styles.goldCoinIcon}>
                  <Text style={styles.goldCoinLetter}>F</Text>
                </View>
                <Text style={styles.coinCountText}>{pointsCount.toLocaleString('vi-VN')}</Text>
              </AnimatedTouchable>
            )}
          </View>
        </LinearGradient>

        {/* ============================================================== */}
        {/* 2. KHỐI THAO TÁC NHANH: GIÁM ĐỐC vs DƯỢC SĨ vs KHÁCH HÀNG       */}
        {/* ============================================================== */}
        {isDirector ? (
          /* KHỐI DÀNH CHO BAN GIÁM ĐỐC: ĐIỀU HÀNH CHIẾN LƯỢC TOÀN CHUỖI */
          <View style={styles.ordersOverlappingCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="speedometer" size={16} color="#0284C7" />
                <Text style={styles.sectionTitleMuted}>Điều hành Ban Giám Đốc</Text>
              </View>
              <AnimatedTouchable
                style={styles.viewAllRow}
                onPress={() => navigation.navigate('DirectorScreen')}
              >
                <Text style={styles.viewAllText}>Vào Bảng Điều Hành</Text>
                <Ionicons name="arrow-forward-circle" size={15} color="#0284C7" />
              </AnimatedTouchable>
            </View>

            <View style={styles.orderActionsGrid}>
              {/* Dashboard Chuỗi */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => navigation.navigate('DirectorScreen')}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="pie-chart" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Doanh thu</Text>
              </AnimatedTouchable>

              {/* Quét Thẻ Nhân Sự GPP */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => setShowDirectorStaffScanModal(true)}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="qr-code" size={24} color="#0284C7" />
                  <View style={styles.activeBadgeDot} />
                </View>
                <Text style={styles.orderActionLabel}>Quét Thẻ GPP</Text>
              </AnimatedTouchable>

              {/* Duyệt PO */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => navigation.navigate('DirectorScreen')}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="checkbox" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Duyệt PO</Text>
              </AnimatedTouchable>

              {/* Dự Báo AI */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => navigation.navigate('DirectorScreen')}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="sparkles" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Dự báo AI</Text>
              </AnimatedTouchable>
            </View>
          </View>
        ) : isStaff ? (
          /* KHỐI DÀNH CHO DƯỢC SĨ / NHÂN VIÊN: CA TRỰC & QUẦY THUỐC */
          <View style={styles.ordersOverlappingCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="briefcase" size={16} color="#0284C7" />
                <Text style={styles.sectionTitleMuted}>Nghiệp vụ ca trực</Text>
              </View>
              {user?.role === 'pharmacist' ? (
                <AnimatedTouchable
                  style={styles.viewAllRow}
                  onPress={() => navigation.navigate('PharmacistScreen')}
                >
                  <Text style={styles.viewAllText}>Vào Quầy POS</Text>
                  <Ionicons name="arrow-forward-circle" size={15} color="#0284C7" />
                </AnimatedTouchable>
              ) : null}
            </View>

            <View style={styles.orderActionsGrid}>
              {/* Điểm danh GPS */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => setShowCheckInModal(true)}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="location" size={24} color="#0284C7" />
                  <View style={styles.activeBadgeDot} />
                </View>
                <Text style={styles.orderActionLabel}>Điểm danh GPS</Text>
              </AnimatedTouchable>

              {/* Lịch trực tuần */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => setShowScheduleModal(true)}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="calendar" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Lịch trực</Text>
              </AnimatedTouchable>

              {/* Phiếu lương */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => setShowPayslipModal(true)}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="receipt" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Phiếu lương</Text>
              </AnimatedTouchable>

              {/* Nghỉ phép */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => setShowLeaveModal(true)}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="time" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Nghỉ phép</Text>
              </AnimatedTouchable>
            </View>
          </View>
        ) : (
          /* KHỐI DÀNH CHO KHÁCH HÀNG: ĐƠN CỦA TÔI (4 TRẠNG THÁI GIAO HÀNG) */
          <View style={styles.ordersOverlappingCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleMuted}>Đơn của tôi</Text>
              <AnimatedTouchable
                style={styles.viewAllRow}
                onPress={() => navigation.navigate('CustomerScreen')}
              >
                <Text style={styles.viewAllText}>Xem tất cả</Text>
                <Ionicons name="chevron-forward" size={14} color="#0284C7" />
              </AnimatedTouchable>
            </View>

            <View style={styles.orderActionsGrid}>
              {/* Đang xử lý */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => navigation.navigate('CustomerScreen')}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="file-tray-full" size={24} color="#0284C7" />
                  <View style={styles.redBadgeCircle}>
                    <Text style={styles.redBadgeText}>1</Text>
                  </View>
                </View>
                <Text style={styles.orderActionLabel}>Đang xử lý</Text>
              </AnimatedTouchable>

              {/* Đang giao */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => navigation.navigate('CustomerScreen')}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="bus" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Đang giao</Text>
              </AnimatedTouchable>

              {/* Đã giao */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => navigation.navigate('CustomerScreen')}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="calendar-sharp" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Đã giao</Text>
              </AnimatedTouchable>

              {/* Đổi/Trả */}
              <AnimatedTouchable
                style={styles.orderActionItem}
                onPress={() => navigation.navigate('CustomerScreen')}
              >
                <View style={styles.orderIconWrapper}>
                  <Ionicons name="swap-horizontal" size={24} color="#0284C7" />
                </View>
                <Text style={styles.orderActionLabel}>Đổi/Trả</Text>
              </AnimatedTouchable>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 3. KHỐI NGHIỆP VỤ: GIÁM ĐỐC vs DƯỢC SĨ & NHÂN VIÊN CHI NHÁNH  */}
        {/* ============================================================== */}
        {isDirector ? (
          <View style={styles.sectionGroup}>
            <Text style={styles.groupHeading}>Nghiệp vụ Quản trị Ban Giám Đốc</Text>
            <View style={styles.whiteMenuCard}>
              {/* Bảng điều hành toàn chuỗi */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => navigation.navigate('DirectorScreen')}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="speedometer" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowTitle}>Bảng Điều Hành Ban Giám Đốc</Text>
                    <Text style={styles.menuRowSubtitle}>Tổng quan doanh thu chuỗi & KPI các chi nhánh</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Quét Thẻ Nhân Sự GPP */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowDirectorStaffScanModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="qr-code" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowTitle}>Quét & Tra Cứu Thẻ Nhân Sự GPP</Text>
                    <Text style={styles.menuRowSubtitle}>Kiểm tra CCHN, bằng cấp & trạng thái ca trực nhân viên</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Phê Duyệt PO */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => navigation.navigate('DirectorScreen')}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="checkbox" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowTitle}>Phê Duyệt Đơn Mua Hàng Chiến Lược (PO)</Text>
                    <Text style={styles.menuRowSubtitle}>Kiểm soát ngân sách & định mức nhập dược phẩm</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Dự báo AI */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => navigation.navigate('DirectorScreen')}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="sparkles" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowTitle}>Dự Báo Nhu Cầu & Rủi Ro Chuỗi (AI)</Text>
                    <Text style={styles.menuRowSubtitle}>Phân tích biến động doanh thu & cảnh báo đứt gãy</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
            </View>
          </View>
        ) : isStaff ? (
          <View style={styles.sectionGroup}>
            <Text style={styles.groupHeading}>Nghiệp vụ Dược & Nhân sự chi nhánh</Text>
            <View style={styles.whiteMenuCard}>
              {/* Nút vào quầy POS cho Dược sĩ */}
              {user?.role === 'pharmacist' ? (
                <>
                  <AnimatedTouchable
                    style={styles.menuRowItem}
                    onPress={() => navigation.navigate('PharmacistScreen')}
                  >
                    <View style={styles.menuRowLeft}>
                      <View style={[styles.menuIconCircle, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="cart" size={20} color="#0284C7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.menuRowTitle}>Quầy Bán Lẻ POS Dược Sĩ</Text>
                        <Text style={styles.menuRowSubtitle}>Kê đơn, tính tiền, trừ kho GSP tự động</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </AnimatedTouchable>
                  <View style={styles.menuDivider} />
                </>
              ) : null}

              {/* Quét & Tra Cứu Thẻ Nhân Sự Dành Cho Quản Lý Chi Nhánh */}
              {isBranchManager ? (
                <>
                  <AnimatedTouchable
                    style={styles.menuRowItem}
                    onPress={() => setShowDirectorStaffScanModal(true)}
                  >
                    <View style={styles.menuRowLeft}>
                      <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                        <Ionicons name="qr-code" size={20} color="#0284C7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.menuRowTitle}>Quét & Tra Cứu Thẻ Nhân Sự GPP</Text>
                        <Text style={styles.menuRowSubtitle}>Kiểm tra CCHN, chấm công GPS & bằng cấp nhân sự</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </AnimatedTouchable>
                  <View style={styles.menuDivider} />
                </>
              ) : null}

              {/* Thẻ Định Danh Nhân Sự GPP (Mã QR Thẻ Nhân Viên) */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowPassportModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="card" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowTitle}>Thẻ Định Danh Nhân Sự (GPP QR)</Text>
                    <Text style={styles.menuRowSubtitle}>Mã QR nhân viên, mã hóa CCHN cho Giám đốc / Quản lý quét</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Chứng chỉ & Bằng cấp (CCHN) */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowCertModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="ribbon" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowTitle}>Chứng chỉ & Bằng cấp (CCHN)</Text>
                    <Text style={styles.menuRowSubtitle}>Chứng chỉ hành nghề Dược, bằng tốt nghiệp</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Điểm danh ca trực GPS */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowCheckInModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="location" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.menuRowTitle}>Điểm danh ca trực GPS</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Lịch làm việc của tôi */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowScheduleModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="calendar" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.menuRowTitle}>Lịch làm việc của tôi</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Đổi ca làm việc */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowShiftSwapModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="swap-horizontal" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.menuRowTitle}>Đổi ca làm việc chéo</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Nghỉ phép & Quỹ phép năm */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowLeaveModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="time" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.menuRowTitle}>Nghỉ phép & Quỹ phép năm</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
              <View style={styles.menuDivider} />

              {/* Phiếu lương cá nhân */}
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowPayslipModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="receipt" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.menuRowTitle}>Phiếu lương cá nhân</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
            </View>
          </View>
        ) : null}

        {/* ============================================================== */}
        {/* 4. KHỐI "CÀI ĐẶT GIAO DIỆN"                                   */}
        {/* ============================================================== */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupHeading}>Cài đặt giao diện</Text>
          <View style={styles.whiteMenuCard}>
            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={() => showToast.info('Giao diện', 'Hệ thống đang áp dụng Tone Xanh Nước Biển Basic chuẩn dự án.')}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="color-palette" size={20} color="#0284C7" />
                </View>
                <Text style={styles.menuRowTitle}>Tuỳ chỉnh giao diện</Text>
                <View style={styles.redPillNew}>
                  <Text style={styles.redPillText}>Mới</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </AnimatedTouchable>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. KHỐI "SỔ SỨC KHỎE SỐ & Y TẾ" (CHỈ DÀNH CHO KHÁCH HÀNG)     */}
        {/* ============================================================== */}
        {!isStaff ? (
          <View style={styles.sectionGroup}>
            <Text style={styles.groupHeading}>Hồ sơ sức khỏe y tế</Text>
            <View style={styles.whiteMenuCard}>
              <AnimatedTouchable
                style={styles.menuRowItem}
                onPress={() => setShowPassportModal(true)}
              >
                <View style={styles.menuRowLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuRowTitle}>Sổ Sức Khỏe Số QR</Text>
                      <View style={styles.bluePillBadge}>
                        <Text style={styles.bluePillText}>Chuẩn BYT</Text>
                      </View>
                    </View>
                    <Text style={styles.menuRowSubtitle}>Toa thuốc GPP, nhóm máu, dị ứng & bệnh mãn tính</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
            </View>
          </View>
        ) : null}

        {/* ============================================================== */}
        {/* 6. KHỐI "TÀI KHOẢN"                                           */}
        {/* ============================================================== */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupHeading}>Tài khoản</Text>
          <View style={styles.whiteMenuCard}>
            {/* Thẻ định danh / Mã QR */}
            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={() => setShowPassportModal(true)}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="qr-code-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.menuRowTitle}>
                  {isStaff ? 'Thẻ định danh nhân sự QR' : 'Mã QR của tôi'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </AnimatedTouchable>
            <View style={styles.menuDivider} />

            {/* Thông tin cá nhân */}
            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={() => setEditModalVisible(true)}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="person-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.menuRowTitle}>Thông tin cá nhân</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </AnimatedTouchable>
            <View style={styles.menuDivider} />

            {/* Quản lý sổ địa chỉ (Chỉ hiển thị cho Khách hàng) */}
            {!isStaff ? (
              <>
                <AnimatedTouchable
                  style={styles.menuRowItem}
                  onPress={() => setEditModalVisible(true)}
                >
                  <View style={styles.menuRowLeft}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                      <Ionicons name="location-outline" size={20} color="#0284C7" />
                    </View>
                    <Text style={styles.menuRowTitle}>Quản lý sổ địa chỉ</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>
                <View style={styles.menuDivider} />

                {/* Quản lý phương thức thanh toán (Chỉ hiển thị cho Khách hàng) */}
                <AnimatedTouchable
                  style={styles.menuRowItem}
                  onPress={() => showToast.info('Thanh toán', 'Phương thức thanh toán VietQR & MoMo tự động kích hoạt khi tạo đơn hàng.')}
                >
                  <View style={styles.menuRowLeft}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                      <Ionicons name="card-outline" size={20} color="#0284C7" />
                    </View>
                    <Text style={styles.menuRowTitle}>Quản lý phương thức thanh toán</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>
                <View style={styles.menuDivider} />

                {/* Lịch sử tư vấn y tế (Chỉ hiển thị cho Khách hàng) */}
                <AnimatedTouchable
                  style={styles.menuRowItem}
                  onPress={() => showToast.info('Tư vấn', 'Lịch sử cuộc hội thoại tư vấn y tế cùng Dược sĩ & AI chuyên môn.')}
                >
                  <View style={styles.menuRowLeft}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                      <Ionicons name="book-outline" size={20} color="#0284C7" />
                    </View>
                    <Text style={styles.menuRowTitle}>Lịch sử tư vấn</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>
                <View style={styles.menuDivider} />
              </>
            ) : null}

            {/* Đổi mật khẩu tài khoản */}
            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={() => setPwModalVisible(true)}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.menuRowTitle}>Đổi mật khẩu tài khoản</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </AnimatedTouchable>

            {/* Bảo mật sinh trắc học */}
            {isBiometricSupported ? (
              <>
                <View style={styles.menuDivider} />
                <View style={styles.menuRowItem}>
                  <View style={styles.menuRowLeft}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                      <Ionicons name="finger-print" size={20} color="#0284C7" />
                    </View>
                    <Text style={styles.menuRowTitle}>Đăng nhập sinh trắc học</Text>
                  </View>
                  <Switch
                    value={isBiometricEnabled}
                    onValueChange={(val) => {
                      toggleBiometrics(val);
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* ============================================================== */}
        {/* 7. KHỐI "VỀ NHÀ THUỐC ABC PHARMACY"                            */}
        {/* ============================================================== */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupHeading}>Về Nhà thuốc ABC Pharmacy</Text>
          <View style={styles.whiteMenuCard}>
            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={() => showToast.info('ABC Pharmacy', 'Hệ thống chuỗi nhà thuốc đạt chuẩn GPP toàn quốc. Hotline: 1800 6821.')}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="help-circle-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.menuRowTitle}>Giới thiệu nhà thuốc</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </AnimatedTouchable>
            <View style={styles.menuDivider} />

            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={() => showToast.info('Giấy phép GPP', 'Giấy chứng nhận Thực hành Tốt Nhà thuốc GPP số 01/2026/GPP-BYT cấp bởi Sở Y Tế.')}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.menuRowTitle}>Giấy phép kinh doanh & GPP</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </AnimatedTouchable>
            <View style={styles.menuDivider} />

            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={() => showToast.info('Quy chế hoạt động', 'Hệ thống vận hành tuân thủ chặt chẽ Thông tư 02/2018/TT-BYT.')}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.menuRowTitle}>Quy chế hoạt động Dược</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </AnimatedTouchable>
            <View style={styles.menuDivider} />

            {/* Đăng xuất tài khoản / Ca trực */}
            <AnimatedTouchable
              style={styles.menuRowItem}
              onPress={handleLogout}
            >
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.menuRowTitle, { color: '#EF4444', fontWeight: '700' }]}>
                  {isStaff ? 'Đăng xuất ca trực' : 'Đăng xuất tài khoản'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#EF4444" />
            </AnimatedTouchable>
          </View>
        </View>

        {/* Khoảng cách đáy màn hình */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* 8. BOTTOM TAB BAR: PHÂN BIỆT RÕ DƯỢC SĨ vs KHÁCH HÀNG          */}
      {/* ============================================================== */}
      {isStaff ? (
        /* Tab Bar dành cho Dược sĩ & Nhân sự chi nhánh */
        <View style={styles.bottomTabBar}>
          <AnimatedTouchable
            style={styles.tabItem}
            onPress={() => {
              if (user?.role === 'pharmacist') {
                navigation.navigate('PharmacistScreen');
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="storefront-outline" size={22} color="#64748B" />
            <Text style={styles.tabLabel}>
              {user?.role === 'pharmacist' ? 'Quầy POS' : 'Trang chính'}
            </Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            style={styles.tabItem}
            onPress={() => setShowCheckInModal(true)}
          >
            <Ionicons name="location-outline" size={22} color="#64748B" />
            <Text style={styles.tabLabel}>Điểm danh</Text>
          </AnimatedTouchable>

          {/* Nút Lịch Trực Ca Nổi Giữa (Floating Action) */}
          <View style={styles.centerConsultWrapper}>
            <AnimatedTouchable
              style={styles.centerConsultButton}
              onPress={() => setShowScheduleModal(true)}
            >
              <Ionicons name="calendar" size={24} color="#FFFFFF" />
            </AnimatedTouchable>
            <Text style={styles.centerConsultLabel}>Lịch trực</Text>
          </View>

          <AnimatedTouchable
            style={styles.tabItem}
            onPress={() => navigation.navigate('NotificationListScreen')}
          >
            <View style={styles.cartIconWrapper}>
              <Ionicons name="notifications-outline" size={22} color="#64748B" />
            </View>
            <Text style={styles.tabLabel}>Thông báo</Text>
          </AnimatedTouchable>

          <AnimatedTouchable style={styles.tabItem}>
            <Ionicons name="person" size={22} color="#0284C7" />
            <Text style={[styles.tabLabel, { color: '#0284C7', fontWeight: '800' }]}>
              Hồ sơ
            </Text>
          </AnimatedTouchable>
        </View>
      ) : (
        /* Tab Bar dành cho Khách hàng mua thuốc */
        <View style={styles.bottomTabBar}>
          <AnimatedTouchable
            style={styles.tabItem}
            onPress={() => navigation.navigate('CustomerScreen')}
          >
            <Ionicons name="home-outline" size={22} color="#64748B" />
            <Text style={styles.tabLabel}>Trang chủ</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            style={styles.tabItem}
            onPress={() => showToast.info('Điểm thưởng', 'Bạn đang có điểm tích lũy thành viên ABC Club.')}
          >
            <Ionicons name="ribbon-outline" size={22} color="#64748B" />
            <Text style={styles.tabLabel}>Điểm thưởng</Text>
          </AnimatedTouchable>

          {/* Nút Tư Vấn Nổi Giữa */}
          <View style={styles.centerConsultWrapper}>
            <AnimatedTouchable
              style={styles.centerConsultButton}
              onPress={() => showToast.info('Tư vấn Dược sĩ', 'Đang kết nối Dược sĩ ABC Pharmacy & AI chuyên môn 24/7.')}
            >
              <Ionicons name="headset" size={24} color="#FFFFFF" />
            </AnimatedTouchable>
            <Text style={styles.centerConsultLabel}>Tư vấn</Text>
          </View>

          <AnimatedTouchable
            style={styles.tabItem}
            onPress={() => navigation.navigate('CustomerCheckoutScreen')}
          >
            <View style={styles.cartIconWrapper}>
              <Ionicons name="cart-outline" size={22} color="#64748B" />
              <View style={styles.cartBadgeCircle}>
                <Text style={styles.cartBadgeText}>1</Text>
              </View>
            </View>
            <Text style={styles.tabLabel}>Giỏ hàng</Text>
          </AnimatedTouchable>

          <AnimatedTouchable style={styles.tabItem}>
            <Ionicons name="person" size={22} color="#0284C7" />
            <Text style={[styles.tabLabel, { color: '#0284C7', fontWeight: '800' }]}>
              Tài khoản
            </Text>
          </AnimatedTouchable>
        </View>
      )}

      {/* ============================================================== */}
      {/* 9. MODALS NGHIỆP VỤ ĐI KÈM                                      */}
      {/* ============================================================== */}
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
              <TextInput
                style={styles.modalInput}
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
              <TextInput
                style={styles.modalInput}
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
              />
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setPwModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </AnimatedTouchable>
              <GradientButton
                title="ĐỔI MẬT KHẨU"
                onPress={handleChangePassword}
                loading={loadingPw}
                gradientVariant="primary"
                size="md"
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Digital Health Passport Modal */}
      <DigitalHealthPassportModal
        visible={showPassportModal}
        onClose={() => setShowPassportModal(false)}
      />

      {/* Modal Quét & Tra Cứu Thẻ Định Danh Nhân Sự GPP Dành Cho Ban Giám Đốc */}
      <StaffIdCardScanModal
        visible={showDirectorStaffScanModal}
        onClose={() => setShowDirectorStaffScanModal(false)}
        userRole="director"
      />

      {/* Attendance & Staff Modals */}
      <AttendanceCheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onAttendanceSuccess={() => setShowCheckInModal(false)}
      />

      <StaffPayslipModal
        visible={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
      />

      <StaffLeaveModal
        visible={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          setLeavePrefillShift(null);
        }}
        onSuccess={() => setShowLeaveModal(false)}
        prefillShift={leavePrefillShift}
      />

      <StaffScheduleModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onRequestSwap={(shift) => {
          setInitialSwapShift(shift);
          setShowShiftSwapModal(true);
        }}
        onRequestLeave={(shift) => {
          setLeavePrefillShift(shift);
          setShowLeaveModal(true);
        }}
      />

      <ShiftSwapModal
        visible={showShiftSwapModal}
        onClose={() => {
          setShowShiftSwapModal(false);
          setInitialSwapShift(null);
        }}
        onSuccess={() => setShowShiftSwapModal(false)}
        initialShift={initialSwapShift}
      />

      <StaffCertificateModal
        visible={showCertModal}
        onClose={() => setShowCertModal(false)}
      />

      {/* Modal Đăng Xuất In-App (Zero Alert OS) */}
      <FlatModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Đăng Xuất Tài Khoản"
        message="Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng ABC Pharmacy không?"
        icon="log-out-outline"
        iconColor="#EF4444"
        confirmText="ĐĂNG XUẤT"
        confirmVariant="danger"
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout();
        }}
        cancelText="Ở LẠI"
        onCancel={() => setShowLogoutModal(false)}
      />
    </View>
  );
};

// =========================================================================
// STYLES - CHUẨN ZERO-BORDER, SHADOW TỰ NHIÊN, FONT CHỮ TO RÕ LONG CHÂU
// =========================================================================
const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // 1. Header Gradient Phong Cách FPT Long Châu
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarGlowWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userInfoBox: {
    flex: 1,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  userPhoneText: {
    fontSize: 14,
    color: '#E0F2FE',
    marginTop: 2,
    fontWeight: '500',
  },
  staffRolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  staffRoleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  coinBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 6,
  },
  goldCoinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  goldCoinLetter: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  coinCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  staffBranchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 5,
  },
  staffBranchBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadgeDot: {
    position: 'absolute',
    top: 2,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#0284C7',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // 2. Khối Đơn Của Tôi (Card Trắng Chồng Mép Header)
  ordersOverlappingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: -22,
    padding: 16,
    // Zero-Border Soft Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  orderActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderActionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderIconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redBadgeCircle: {
    position: 'absolute',
    top: 0,
    right: 2,
    backgroundColor: '#EF4444',
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  orderActionLabel: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    marginTop: 4,
  },

  // 3. Khối Menu Trắng Zero-Border
  sectionGroup: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  whiteMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    minHeight: 48,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuRowSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 48,
  },
  redPillNew: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  redPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  bluePillBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bluePillText: {
    color: '#0369A1',
    fontSize: 10.5,
    fontWeight: '800',
  },

  // 4. Bottom Tab Bar (5 tabs phong cách FPT Long Châu)
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 14 : 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '600',
  },
  centerConsultWrapper: {
    alignItems: 'center',
    marginTop: -24,
    flex: 1,
  },
  centerConsultButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0052CC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0052CC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  centerConsultLabel: {
    fontSize: 10.5,
    color: '#0052CC',
    fontWeight: '700',
    marginTop: 2,
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadgeCircle: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});
