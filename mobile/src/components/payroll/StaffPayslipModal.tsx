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
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';

interface StaffPayslipModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StaffPayslipModal: React.FC<StaffPayslipModalProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiService.getMyPayslips();
      setPayslips(data || []);
      if (data && data.length > 0) {
        setSelectedSlip(data[0]);
      }
    } catch (err) {
      console.warn('Lỗi tải phiếu lương:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadPayslips();
    }
  }, [visible, loadPayslips]);

  const formatVnd = (num: number = 0) => {
    return (num || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={styles.badgeSuccessText}>
              {status === 'PAID' ? 'ĐÃ CHI TRẢ' : 'QUẢN LÝ ĐÃ DUYỆT'}
            </Text>
          </View>
        );
      case 'PENDING_APPROVAL':
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={styles.badgePendingText}>CHỜ DUYỆT</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, styles.badgeDraft]}>
            <Text style={styles.badgeDraftText}>DỰ THẢO</Text>
          </View>
        );
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
                <Ionicons name="receipt" size={22} color="#059669" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Phiếu Lương Cá Nhân</Text>
                <Text style={styles.sheetSubtitle}>Thu nhập & Phụ cấp ngành Dược chuẩn hóa</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.loadingText}>Đang tải phiếu lương từ máy chủ...</Text>
            </View>
          ) : payslips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Chưa có phiếu lương</Text>
              <Text style={styles.emptySubtitle}>
                Bảng lương tháng của bạn chưa được quản lý chi nhánh khởi tạo hoặc chốt duyệt.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
              {/* Selector tháng */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {payslips.map((slip) => {
                  const isSelected = selectedSlip?._id === slip._id || selectedSlip?.monthYear === slip.monthYear;
                  return (
                    <TouchableOpacity
                      key={slip._id || slip.monthYear}
                      onPress={() => setSelectedSlip(slip)}
                      style={[styles.monthTab, isSelected && styles.monthTabActive]}
                    >
                      <Text style={[styles.monthTabText, isSelected && styles.monthTabTextActive]}>
                        Tháng {slip.monthYear}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedSlip && (
                <View style={styles.slipCard}>
                  {/* Top card */}
                  <View style={styles.topCard}>
                    <View>
                      <Text style={styles.netTitle}>THỰC LĨNH THÁNG {selectedSlip.monthYear}</Text>
                      <Text style={styles.netAmount}>{formatVnd(selectedSlip.netSalary)}</Text>
                    </View>
                    {renderStatusBadge(selectedSlip.status)}
                  </View>

                  {/* Summary row */}
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCol}>
                      <Text style={styles.summaryLabel}>Lương cơ bản</Text>
                      <Text style={styles.summaryVal}>{formatVnd(selectedSlip.baseSalary)}</Text>
                    </View>
                    <View style={styles.summaryCol}>
                      <Text style={styles.summaryLabel}>Số ca thực tế</Text>
                      <Text style={styles.summaryVal}>{selectedSlip.actualShifts} ca</Text>
                    </View>
                    <View style={styles.summaryCol}>
                      <Text style={styles.summaryLabel}>Đi muộn</Text>
                      <Text style={styles.summaryVal}>{selectedSlip.lateCount || 0} lần</Text>
                    </View>
                  </View>

                  {/* Detailed breakdown */}
                  <View style={styles.breakdownBox}>
                    <Text style={styles.sectionHeader}>CHI TIẾT THU NHẬP & PHỤ CẤP</Text>

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Tiền lương theo số ca làm:</Text>
                      <Text style={styles.lineValue}>{formatVnd(selectedSlip.calculatedShiftSalary)}</Text>
                    </View>

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Phụ cấp Chứng chỉ hành nghề (CCHN):</Text>
                      <Text style={[styles.lineValue, styles.bonusText]}>
                        +{formatVnd(selectedSlip.cchnAllowance)}
                      </Text>
                    </View>

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Phụ cấp Phụ trách chuyên môn (PTCM):</Text>
                      <Text style={[styles.lineValue, styles.bonusText]}>
                        +{formatVnd(selectedSlip.ptcmAllowance)}
                      </Text>
                    </View>

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Phụ cấp ăn trưa (35k/ca):</Text>
                      <Text style={[styles.lineValue, styles.bonusText]}>
                        +{formatVnd(selectedSlip.lunchAllowance)}
                      </Text>
                    </View>

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Hoa hồng doanh số POS (1.0%):</Text>
                      <Text style={[styles.lineValue, styles.bonusText]}>
                        +{formatVnd(selectedSlip.posCommission)}
                      </Text>
                    </View>

                    {selectedSlip.personalPosRevenue > 0 && (
                      <Text style={styles.subNote}>
                        Doanh số bán lẻ tại quầy: {formatVnd(selectedSlip.personalPosRevenue)}
                      </Text>
                    )}

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Thưởng hoàn thành chỉ tiêu:</Text>
                      <Text style={[styles.lineValue, styles.bonusText]}>
                        +{formatVnd(selectedSlip.targetBonus)}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionHeader}>CÁC KHOẢN GIẢM TRỪ</Text>

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Phạt đi muộn (50k/lần):</Text>
                      <Text style={[styles.lineValue, styles.deductText]}>
                        -{formatVnd(selectedSlip.latePenalty)}
                      </Text>
                    </View>

                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Bảo hiểm & Giảm trừ khác:</Text>
                      <Text style={[styles.lineValue, styles.deductText]}>
                        -{formatVnd(selectedSlip.otherDeductions)}
                      </Text>
                    </View>

                    {selectedSlip.manualAdjustment !== 0 && (
                      <View style={styles.lineItem}>
                        <Text style={styles.lineLabel}>Điều chỉnh thủ công từ quản lý:</Text>
                        <Text style={styles.lineValue}>
                          {selectedSlip.manualAdjustment > 0 ? '+' : ''}
                          {formatVnd(selectedSlip.manualAdjustment)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>TỔNG CỘNG THỰC LĨNH:</Text>
                      <Text style={styles.totalValue}>{formatVnd(selectedSlip.netSalary)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
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
    backgroundColor: '#D1FAE5',
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
  centerLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  bodyContent: {
    padding: 20,
    gap: 16,
  },
  monthScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  monthTabActive: {
    backgroundColor: '#059669',
  },
  monthTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  monthTabTextActive: {
    color: '#FFFFFF',
  },
  slipCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  topCard: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  netTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  netAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  badgeDraft: {
    backgroundColor: '#E2E8F0',
  },
  badgeDraftText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  breakdownBox: {
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineLabel: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  lineValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  bonusText: {
    color: '#059669',
  },
  deductText: {
    color: '#DC2626',
  },
  subNote: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: -4,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#059669',
  },
});
