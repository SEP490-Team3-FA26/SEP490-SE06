import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '../ui/toastHelper';

interface BranchPayrollModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BranchPayrollModal: React.FC<BranchPayrollModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isManager = user?.role === 'branch' || user?.role === 'admin';

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [payroll, setPayroll] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadPayroll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const list = await ApiService.getBranchPayrolls(selectedYear);
      const found = list.find((p: any) => p.month === selectedMonth && p.year === selectedYear);
      setPayroll(found || null);
    } catch (e) {
      console.warn('Lỗi tải bảng lương chi nhánh:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (visible) {
      loadPayroll();
    }
  }, [visible, loadPayroll]);

  const handleCalculateDraft = async () => {
    if (!isManager) {
      showToast.error('Từ chối quyền', 'Chỉ Quản lý chi nhánh mới có quyền tính toán dự thảo bảng lương cơ sở.');
      return;
    }
    try {
      setCalculating(true);
      const res = await ApiService.calculateBranchPayroll(selectedMonth, selectedYear);
      setPayroll(res);
      showToast.success('Thành công', `Đã tính bảng lương dự thảo Tháng ${selectedMonth}/${selectedYear}!`);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      showToast.error('Lỗi tính lương', e.message || 'Không thể tính bảng lương');
    } finally {
      setCalculating(false);
    }
  };

  const handleApprovePayroll = () => {
    if (!isManager) {
      showToast.error('Từ chối quyền', 'Chỉ Quản lý chi nhánh mới có quyền phê duyệt bảng lương cơ sở.');
      return;
    }
    if (!payroll?._id && !payroll?.id) return;
    const payrollId = payroll._id || payroll.id;

    Alert.alert(
      'PHÊ DUYỆT BẢNG LƯƠNG CƠ SỞ',
      `Xác nhận phê duyệt bảng lương Tháng ${selectedMonth}/${selectedYear} cho toàn bộ nhân sự chi nhánh?\n\nQuản lý chi nhánh có toàn quyền tự quyết và chịu trách nhiệm về bảng lương này (không cần Admin hay Giám đốc duyệt).`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Phê Duyệt Ngay',
          onPress: async () => {
            try {
              setApproving(true);
              const res = await ApiService.approveBranchPayroll(payrollId);
              setPayroll(res);
              showToast.success('Thành công', 'Quản lý cơ sở đã phê duyệt bảng lương thành công! Phiếu lương đã công bố.');
              loadPayroll();
              if (onSuccess) onSuccess();
            } catch (e: any) {
              showToast.error('Lỗi', e.message || 'Lỗi khi phê duyệt bảng lương.');
            } finally {
              setApproving(false);
            }
          },
        },
      ]
    );
  };

  const formatVnd = (num: number = 0) => {
    return (num || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const isApproved = payroll?.status === 'APPROVED' || payroll?.status === 'PAID';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="calculator" size={22} color="#059669" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Bảng Lương Chi Nhánh</Text>
                <Text style={styles.sheetSubtitle}>Phê duyệt bảng lương cơ sở (Quyền tự quyết)</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Month Selector */}
          <View style={styles.monthNavRow}>
            <View style={styles.monthLabelBox}>
              <Ionicons name="calendar-outline" size={16} color="#059669" />
              <Text style={styles.monthLabelText}>Kỳ lương: Tháng {selectedMonth}/{selectedYear}</Text>
            </View>

            <View style={styles.monthBtnGroup}>
              <TouchableOpacity
                onPress={() => setSelectedMonth((m) => (m > 1 ? m - 1 : 12))}
                style={styles.monthChangeBtn}
              >
                <Ionicons name="chevron-back" size={16} color="#059669" />
              </TouchableOpacity>
              <Text style={styles.monthCurrentText}>T{selectedMonth}</Text>
              <TouchableOpacity
                onPress={() => setSelectedMonth((m) => (m < 12 ? m + 1 : 1))}
                style={styles.monthChangeBtn}
              >
                <Ionicons name="chevron-forward" size={16} color="#059669" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.loadingText}>Đang tải bảng lương chi nhánh...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPayroll(true)} colors={['#059669']} />}
            >
              {payroll ? (
                <View>
                  {/* Summary Card */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeaderRow}>
                      <View>
                        <Text style={styles.summaryTitle}>TỔNG QUỸ LƯƠNG CHI TRẢ</Text>
                        <Text style={styles.totalNetText}>{formatVnd(payroll.totalNet)}</Text>
                      </View>
                      <View style={[styles.statusBadge, isApproved ? styles.statusBadgeApproved : styles.statusBadgeDraft]}>
                        <Text style={[styles.statusBadgeText, isApproved ? styles.statusBadgeTextApproved : styles.statusBadgeTextDraft]}>
                          {isApproved ? 'ĐÃ PHÊ DUYỆT' : 'DỰ THẢO'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Nhân sự</Text>
                        <Text style={styles.metricVal}>{payroll.items?.length || 0} người</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Tổng Gross</Text>
                        <Text style={styles.metricVal}>{formatVnd(payroll.totalGross)}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Tiền ăn định mức</Text>
                        <Text style={styles.metricVal}>{formatVnd(payroll.mealAllowanceRate || 50000)}/ca</Text>
                      </View>
                    </View>
                  </View>

                  {/* Staff List */}
                  <Text style={styles.sectionTitle}>CHI TIẾT NHÂN SỰ CƠ SỞ</Text>
                  <View style={{ gap: 8 }}>
                    {payroll.items?.map((item: any, idx: number) => (
                      <View key={`staff_${idx}`} style={styles.staffCard}>
                        <View style={styles.staffCardHeader}>
                          <View>
                            <Text style={styles.staffName}>{item.employeeName || 'Nhân viên cơ sở'}</Text>
                            <Text style={styles.staffRole}>Chức danh: {item.role === 'pharmacist' ? 'Dược sĩ bán hàng' : 'Nhân sự'}</Text>
                          </View>
                          <Text style={styles.staffNet}>{formatVnd(item.netSalary)}</Text>
                        </View>

                        <View style={styles.staffDetailsGrid}>
                          <Text style={styles.staffDetailItem}>Ca thực tế: <Text style={{ fontWeight: '700' }}>{item.actualShifts} ca</Text></Text>
                          {item.certificateAllowance > 0 && (
                            <Text style={styles.staffDetailItem}>Phụ cấp CCHN: <Text style={{ fontWeight: '700', color: '#047857' }}>+{formatVnd(item.certificateAllowance)}</Text></Text>
                          )}
                          {item.mealAllowance > 0 && (
                            <Text style={styles.staffDetailItem}>Tiền ăn: <Text style={{ fontWeight: '700' }}>+{formatVnd(item.mealAllowance)}</Text></Text>
                          )}
                          {item.branchBonus > 0 && (
                            <Text style={styles.staffDetailItem}>Thưởng: <Text style={{ fontWeight: '700', color: '#047857' }}>+{formatVnd(item.branchBonus)}</Text></Text>
                          )}
                          {item.penalties > 0 && (
                            <Text style={styles.staffDetailItem}>Phạt/Trừ: <Text style={{ fontWeight: '700', color: '#DC2626' }}>-{formatVnd(item.penalties)}</Text></Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>Chưa khởi tạo bảng lương tháng {selectedMonth}/{selectedYear}</Text>
                  <Text style={styles.emptySubtitle}>
                    Quản lý cơ sở hãy bấm nút bên dưới để hệ thống tự động tổng hợp số ca trực, chấm công GPS và phụ cấp CCHN của nhân viên.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Action Footer */}
          <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            {isManager ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={handleCalculateDraft}
                  style={[styles.actionBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}
                  disabled={calculating || isApproved}
                >
                  {calculating ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={16} color="#334155" />
                      <Text style={[styles.actionBtnText, { color: '#334155' }]}>Tính Tự Động</Text>
                    </>
                  )}
                </TouchableOpacity>

                {payroll && !isApproved && (
                  <TouchableOpacity
                    onPress={handleApprovePayroll}
                    style={[styles.actionBtn, { backgroundColor: '#059669', flex: 2 }]}
                    disabled={approving}
                  >
                    {approving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Duyệt Lương Cơ Sở</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.readOnlyNoticeBox}>
                <Ionicons name="lock-closed" size={16} color="#64748B" />
                <Text style={styles.readOnlyNoticeText}>
                  Chế độ chỉ đọc: Chỉ Quản lý cơ sở mới có quyền tính toán và duyệt bảng lương chi nhánh.
                </Text>
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
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
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
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  monthChangeBtn: {
    padding: 4,
  },
  monthCurrentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
  },
  scrollContent: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  totalNetText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeApproved: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadgeTextDraft: {
    color: '#B45309',
  },
  statusBadgeTextApproved: {
    color: '#047857',
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 12,
    paddingTop: 10,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  staffRole: {
    fontSize: 11,
    color: '#64748B',
  },
  staffNet: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  staffDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 6,
  },
  staffDetailItem: {
    fontSize: 11,
    color: '#475569',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  readOnlyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readOnlyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
