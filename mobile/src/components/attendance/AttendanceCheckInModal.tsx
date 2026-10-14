import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { showToast } from '../ui/toastHelper';
import { useAuth } from '../../context/AuthContext';

interface AttendanceCheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onAttendanceSuccess?: () => void;
}

// Công thức tính khoảng cách mặt cầu Haversine theo mét
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const AttendanceCheckInModal: React.FC<AttendanceCheckInModalProps> = ({
  visible,
  onClose,
  onAttendanceSuccess,
}) => {
  const { user } = useAuth();
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [branchInfo, setBranchInfo] = useState<any | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const loadDataAndLocation = useCallback(async () => {
    setPermissionError(null);
    setLoadingLocation(true);

    try {
      // 1. Tải thông tin chi nhánh
      const branchId = user?.branchId;
      let branch = null;
      if (branchId) {
        try {
          branch = await ApiService.getBranchById(branchId);
        } catch {
          // Bỏ qua lỗi gọi lẻ
        }
      }
      if (!branch) {
        const branches = await ApiService.getBranches();
        if (branches && branches.length > 0) {
          branch = branches.find((b: any) => b.id === branchId || b._id === branchId) || branches[0];
        }
      }
      setBranchInfo(branch);

      // 2. Tải lịch sử điểm danh hôm nay
      try {
        const todayRec = await ApiService.getMyTodayAttendance();
        setTodayAttendance(todayRec);
      } catch {
        // Chưa có bản ghi điểm danh
      }

      // 3. Yêu cầu quyền GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError('Ứng dụng bị từ chối quyền truy cập vị trí. Vui lòng cấp quyền vị trí trong cài đặt thiết bị để điểm danh.');
        setLoadingLocation(false);
        return;
      }

      // 4. Lấy vị trí GPS hiện tại
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLat = location.coords.latitude;
      const userLng = location.coords.longitude;
      setCurrentCoords({ latitude: userLat, longitude: userLng });

      // 5. Tính khoảng cách tới chi nhánh nếu chi nhánh đã cấu hình tọa độ GPS
      if (branch?.latitude != null && branch?.longitude != null) {
        const branchLat = Number(branch.latitude);
        const branchLng = Number(branch.longitude);
        const dist = calculateDistanceMeters(userLat, userLng, branchLat, branchLng);
        setDistance(dist);
      } else {
        setDistance(null);
      }
    } catch (err: any) {
      setPermissionError(err.message || 'Không thể xác định vị trí hiện tại của thiết bị');
    } finally {
      setLoadingLocation(false);
    }
  }, [user?.branchId]);

  useEffect(() => {
    if (visible) {
      loadDataAndLocation();
    }
  }, [visible, loadDataAndLocation]);

  const maxRadius = branchInfo?.checkInRadiusMeters || 200;
  const isWithinRadius = distance !== null && distance <= maxRadius;
  const hasCheckedIn = !!todayAttendance?.checkInTime;
  const hasCheckedOut = !!todayAttendance?.checkOutTime;

  const handleCheckIn = async () => {
    if (!currentCoords) {
      showToast.error('Lỗi', 'Chưa xác định được vị trí GPS.');
      return;
    }
    if (branchInfo?.latitude == null || branchInfo?.longitude == null) {
      showToast.error('Chưa cấu hình vị trí', 'Chi nhánh chưa được cài đặt tọa độ GPS điểm danh. Vui lòng liên hệ Quản lý cấu hình vị trí.');
      return;
    }
    if (!isWithinRadius) {
      showToast.error('Ngoài phạm vi', `Bạn đang ở cách chi nhánh ${distance}m (cho phép tối đa ${maxRadius}m).`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await ApiService.checkInAttendance(
        currentCoords.latitude,
        currentCoords.longitude,
        undefined,
        'Điểm danh qua ứng dụng Mobile'
      );
      showToast.success('Thành công', res?.message || 'Điểm danh vào ca thành công!');
      if (onAttendanceSuccess) onAttendanceSuccess();
      loadDataAndLocation();
    } catch (err: any) {
      showToast.error('Điểm danh thất bại', err.message || 'Không thể điểm danh vào ca.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentCoords) {
      showToast.error('Lỗi', 'Chưa xác định được vị trí GPS.');
      return;
    }
    if (branchInfo?.latitude == null || branchInfo?.longitude == null) {
      showToast.error('Chưa cấu hình vị trí', 'Chi nhánh chưa được cài đặt tọa độ GPS điểm danh. Vui lòng liên hệ Quản lý cấu hình vị trí.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await ApiService.checkOutAttendance(
        currentCoords.latitude,
        currentCoords.longitude,
        'Tan ca qua ứng dụng Mobile'
      );
      showToast.success('Thành công', res?.message || 'Điểm danh tan ca thành công!');
      if (onAttendanceSuccess) onAttendanceSuccess();
      loadDataAndLocation();
    } catch (err: any) {
      showToast.error('Tan ca thất bại', err.message || 'Không thể check-out.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={22} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Điểm Danh Ca Trực (GPS)</Text>
                <Text style={styles.sheetSubtitle}>Xác thực định vị nhà thuốc chuẩn GPP</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Chi nhánh làm việc */}
            <View style={styles.infoCard}>
              <View style={styles.cardRow}>
                <Ionicons name="business" size={18} color="#0284C7" />
                <Text style={styles.cardTitle}>Chi Nhánh Phân Công</Text>
              </View>
              <Text style={styles.branchNameText}>
                {branchInfo?.name || 'Chi Nhánh Nhà Thuốc Trung Tâm'}
              </Text>
              <Text style={styles.branchAddressText}>
                {branchInfo?.address || '123 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM'}
              </Text>
              <View style={styles.radiusBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#0369A1" />
                <Text style={styles.radiusBadgeText}>Bán kính cho phép: {maxRadius}m</Text>
              </View>
            </View>

            {/* Trạng thái GPS */}
            <View style={styles.gpsCard}>
              <View style={styles.cardRowBetween}>
                <View style={styles.cardRow}>
                  <Ionicons name="navigate-circle" size={20} color="#0284C7" />
                  <Text style={styles.cardTitle}>Vị Trí Hiện Tại Của Bạn</Text>
                </View>
                <TouchableOpacity
                  onPress={loadDataAndLocation}
                  disabled={loadingLocation}
                  style={styles.refreshBtn}
                >
                  <Ionicons name="refresh" size={16} color="#0284C7" />
                  <Text style={styles.refreshText}>Lấy lại GPS</Text>
                </TouchableOpacity>
              </View>

              {loadingLocation ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#0284C7" />
                  <Text style={styles.loadingText}>Đang lấy tọa độ GPS vệ tinh...</Text>
                </View>
              ) : permissionError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={20} color="#DC2626" />
                  <Text style={styles.errorText}>{permissionError}</Text>
                </View>
              ) : (
                <View style={styles.coordsBox}>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Vĩ độ (Lat):</Text>
                    <Text style={styles.coordValue}>{currentCoords?.latitude.toFixed(6)}</Text>
                  </View>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Kinh độ (Lng):</Text>
                    <Text style={styles.coordValue}>{currentCoords?.longitude.toFixed(6)}</Text>
                  </View>

                  {branchInfo?.latitude == null || branchInfo?.longitude == null ? (
                    <View style={[styles.distanceBox, styles.distanceBoxInvalid]}>
                      <Ionicons name="alert-circle" size={22} color="#DC2626" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.distanceTitle, { color: '#B91C1C' }]}>
                          Chi nhánh chưa cấu hình vị trí GPS
                        </Text>
                        <Text style={styles.distanceDesc}>
                          Quản lý chi nhánh cần cài đặt tọa độ cơ sở trước khi nhân viên có thể điểm danh.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.distanceBox, isWithinRadius ? styles.distanceBoxValid : styles.distanceBoxInvalid]}>
                      <Ionicons
                        name={isWithinRadius ? 'checkmark-circle' : 'close-circle'}
                        size={22}
                        color={isWithinRadius ? '#16A34A' : '#DC2626'}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.distanceTitle, { color: isWithinRadius ? '#15803D' : '#B91C1C' }]}>
                          {isWithinRadius
                            ? `Trong phạm vi chi nhánh (Cách ${distance}m)`
                            : `Ngoài phạm vi cho phép (Cách ${distance}m)`}
                        </Text>
                        <Text style={styles.distanceDesc}>
                          {isWithinRadius
                            ? 'Vị trí của bạn hợp lệ để thực hiện điểm danh ca trực.'
                            : `Bạn phải ở trong bán kính ${maxRadius}m quanh chi nhánh để điểm danh.`}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Trạng thái điểm danh hôm nay */}
            <View style={styles.statusCard}>
              <Text style={styles.cardTitle}>Lịch Sử Điểm Danh Hôm Nay</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusCol}>
                  <Text style={styles.statusLabel}>Giờ Check-in:</Text>
                  <Text style={styles.statusValue}>
                    {todayAttendance?.checkInTime
                      ? new Date(todayAttendance.checkInTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Chưa điểm danh'}
                  </Text>
                </View>
                <View style={styles.statusCol}>
                  <Text style={styles.statusLabel}>Giờ Check-out:</Text>
                  <Text style={styles.statusValue}>
                    {todayAttendance?.checkOutTime
                      ? new Date(todayAttendance.checkOutTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Chưa tan ca'}
                  </Text>
                </View>
              </View>

              {todayAttendance && (
                <View style={styles.shiftBadgeRow}>
                  <View
                    style={[
                      styles.shiftBadge,
                      todayAttendance.status === 'LATE'
                        ? styles.lateBadge
                        : todayAttendance.status === 'COMPLETED'
                        ? styles.completedBadge
                        : styles.onTimeBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.shiftBadgeText,
                        todayAttendance.status === 'LATE'
                          ? styles.lateBadgeText
                          : todayAttendance.status === 'COMPLETED'
                          ? styles.completedBadgeText
                          : styles.onTimeBadgeText,
                      ]}
                    >
                      {todayAttendance.status === 'LATE'
                        ? 'ĐI MUỘN (-50.000₫)'
                        : todayAttendance.status === 'COMPLETED'
                        ? 'ĐÃ HOÀN THÀNH CA'
                        : 'ĐÚNG GIỜ (+35.000₫ Ăn trưa)'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            {!hasCheckedIn ? (
              <TouchableOpacity
                onPress={handleCheckIn}
                disabled={!isWithinRadius || submitting || loadingLocation}
                style={[
                  styles.actionBtn,
                  isWithinRadius && !loadingLocation ? styles.checkInBtn : styles.disabledBtn,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="finger-print" size={20} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Xác Nhận Check-In Vào Ca</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : !hasCheckedOut ? (
              <TouchableOpacity
                onPress={handleCheckOut}
                disabled={submitting || loadingLocation}
                style={[styles.actionBtn, styles.checkOutBtn]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="log-out" size={20} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Xác Nhận Check-Out Tan Ca</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.completedBox}>
                <Ionicons name="checkmark-done-circle" size={22} color="#16A34A" />
                <Text style={styles.completedText}>Bạn đã hoàn thành ca làm việc hôm nay</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  bodyContent: {
    padding: 20,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  branchNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  branchAddressText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  radiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 10,
  },
  radiusBadgeText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  gpsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  coordsBox: {
    marginTop: 12,
    gap: 10,
  },
  coordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  coordLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  distanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  distanceBoxValid: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  distanceBoxInvalid: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  distanceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  distanceDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  statusCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  shiftBadgeRow: {
    marginTop: 10,
  },
  shiftBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shiftBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  onTimeBadge: {
    backgroundColor: '#DCFCE7',
  },
  onTimeBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  lateBadge: {
    backgroundColor: '#FEE2E2',
  },
  lateBadgeText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: '#E0E7FF',
  },
  completedBadgeText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
  },
  footerActions: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  checkInBtn: {
    backgroundColor: '#0284C7',
  },
  checkOutBtn: {
    backgroundColor: '#D97706',
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  completedText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '600',
  },
});
