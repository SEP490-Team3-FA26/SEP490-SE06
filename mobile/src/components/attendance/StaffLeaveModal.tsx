import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { showToast } from '../ui/toastHelper';
import { useAuth } from '../../context/AuthContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StaffLeaveModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillShift?: {
    date?: string;
    shiftId?: string;
    shiftName?: string;
    shiftStart?: string;
    shiftEnd?: string;
  } | null;
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const LEAVE_TYPES = [
  { id: 'ANNUAL_PAID', label: 'Phép năm (Có lương)', desc: 'Trừ 1 ngày vào quỹ phép năm' },
  { id: 'SICK_LEAVE', label: 'Nghỉ ốm (BHXH)', desc: 'Cần giấy ra viện / chứng nhận y tế' },
  { id: 'UNPAID', label: 'Nghỉ không lương', desc: 'Nghỉ việc riêng không hưởng lương' },
  { id: 'SPECIAL_PAID', label: 'Việc riêng (Có lương)', desc: 'Cưới hỏi, tang chế theo Luật' },
];

const SHIFT_OPTIONS = [
  { id: 'shift-1', name: 'Ca Sáng', start: '06:30', end: '14:30' },
  { id: 'shift-2', name: 'Ca Chiều', start: '14:30', end: '22:00' },
  { id: 'shift-3', name: 'Ca Đêm', start: '22:00', end: '06:30' },
];

export const StaffLeaveModal: React.FC<StaffLeaveModalProps> = ({
  visible,
  onClose,
  onSuccess,
  prefillShift,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myUserId = user?.id || (user as any)?._id || (user as any)?.sub;
  const isManager = user?.role === 'branch' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'CREATE' | 'MINE' | 'APPROVAL'>(
    isManager ? 'APPROVAL' : 'CREATE'
  );

  // Pharmacist State
  const [balance, setBalance] = useState<number>(12);
  const [used, setUsed] = useState<number>(0);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState<boolean>(false);
  const [myUpcomingShifts, setMyUpcomingShifts] = useState<any[]>([]);

  // Create Form State
  const [shiftDate, setShiftDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [selectedShift, setSelectedShift] = useState(SHIFT_OPTIONS[0]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('ANNUAL_PAID');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Manager Approval State
  const [branchLeaves, setBranchLeaves] = useState<any[]>([]);
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadMyData = useCallback(async () => {
    setLoadingLeaves(true);
    try {
      const now = new Date();
      const thisMon = formatDate(getMonday(now));
      const nextMonDate = new Date(getMonday(now));
      nextMonDate.setDate(nextMonDate.getDate() + 7);
      const nextMon = formatDate(nextMonDate);

      const [res, schedThisWeek, schedNextWeek] = await Promise.all([
        ApiService.getMyLeaves(),
        ApiService.getMyWeekSchedule(thisMon),
        ApiService.getMyWeekSchedule(nextMon),
      ]);
      setMyLeaves(res.leaves || []);
      setBalance(res.balance ?? 12);
      setUsed(res.used ?? 0);

      // Aggregate upcoming shifts across this week & next week
      const allAssignments = [
        ...(schedThisWeek?.assignments || []),
        ...(schedNextWeek?.assignments || []),
      ];
      const todayStr = formatDate(now);
      const myShifts = allAssignments.filter((a: any) => {
        const aDate = a.date ? a.date.slice(0, 10) : '';
        return String(a.employeeId) === String(myUserId) && aDate >= todayStr;
      });
      myShifts.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
      setMyUpcomingShifts(myShifts);
    } catch (e) {
      console.warn('Lỗi loadMyData:', e);
    } finally {
      setLoadingLeaves(false);
    }
  }, [myUserId]);

  const loadBranchData = useCallback(async () => {
    if (!isManager) return;
    setLoadingBranch(true);
    try {
      const list = await ApiService.getBranchLeaves();
      setBranchLeaves(list || []);
    } catch (e) {
      console.warn('Lỗi loadBranchData:', e);
    } finally {
      setLoadingBranch(false);
    }
  }, [isManager]);

  useEffect(() => {
    if (visible) {
      loadMyData();
      if (isManager) loadBranchData();

      if (prefillShift) {
        if (prefillShift.date) setShiftDate(prefillShift.date);
        if (prefillShift.shiftId || prefillShift.shiftName) {
          const found = SHIFT_OPTIONS.find(
            (s) =>
              s.id === prefillShift.shiftId ||
              s.name.toLowerCase() === (prefillShift.shiftName || '').toLowerCase()
          );
          if (found) {
            setSelectedShift(found);
          } else if (prefillShift.shiftName) {
            setSelectedShift({
              id: prefillShift.shiftId || 'custom-shift',
              name: prefillShift.shiftName,
              start: prefillShift.shiftStart || '08:00',
              end: prefillShift.shiftEnd || '16:00',
            });
          }
        }
        setActiveTab('CREATE');
      }
    }
  }, [visible, isManager, prefillShift, loadMyData, loadBranchData]);

  const handleCreateSubmit = async () => {
    if (submitting) return;
    if (!reason.trim() || reason.trim().length < 5) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do xin nghỉ cụ thể (tối thiểu 5 ký tự).');
      return;
    }

    if (selectedLeaveType === 'ANNUAL_PAID' && balance < 1) {
      Alert.alert(
        'Hết phép năm',
        'Số dư phép năm của bạn còn 0 ngày. Vui lòng chọn loại Nghỉ không lương.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiService.createLeaveRequest({
        shiftDate,
        shiftId: selectedShift.id,
        shiftName: `${selectedShift.name} (${selectedShift.start} - ${selectedShift.end})`,
        startTime: selectedShift.start,
        endTime: selectedShift.end,
        leaveType: selectedLeaveType,
        reason: reason.trim(),
      });

      if (res.success) {
        showToast.success('Nộp đơn thành công', 'Đơn xin nghỉ ca đã được chuyển đến Quản lý chi nhánh.');
        setReason('');
        await loadMyData();
        setActiveTab('MINE');
        onSuccess?.();
      } else {
        Alert.alert('Không thể tạo đơn', res.error || 'Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    Alert.alert('Xác nhận hủy', 'Bạn có chắc chắn muốn hủy đơn xin nghỉ này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          const res = await ApiService.cancelLeaveRequest(id, 'Nhân viên hủy đơn');
          if (res.success) {
            showToast.success('Đã hủy', 'Đơn xin nghỉ đã được hủy.');
            loadMyData();
          } else {
            Alert.alert('Lỗi', res.error || 'Không thể hủy đơn.');
          }
        },
      },
    ]);
  };

  const handleManagerRespond = async (leave: any, action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'Phê duyệt' : 'Từ chối';
    const warningMsg = leave.isWarningGppUnderstaffed && action === 'approve'
      ? '\n\nCẢNH BÁO ĐỊNH BIÊN GPP: Sau khi duyệt, ca trực này sẽ thiếu người! Quản lý cần chủ động điều phối người trực thay.'
      : '';

    Alert.alert(
      `Xác nhận ${actionLabel}`,
      `Bạn có chắc chắn muốn ${actionLabel.toLowerCase()} đơn xin nghỉ của ${leave.requesterName}?${warningMsg}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setActionLoadingId(leave._id);
            try {
              const res = await ApiService.respondLeaveRequest(
                leave._id,
                action,
                action === 'approve' ? 'Quản lý duyệt trên Mobile' : 'Từ chối do thiếu nhân sự'
              );
              if (res.success) {
                showToast.success('Đã cập nhật', `Đã ${actionLabel.toLowerCase()} đơn thành công.`);
                loadBranchData();
                onSuccess?.();
              } else {
                Alert.alert('Lỗi', res.error || 'Không thể xử lý đơn');
              }
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.headerIcon}>
                <Ionicons name="calendar" size={20} color="#059669" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.title}>Nghỉ Phép & Nghỉ Ca</Text>
                <Text style={styles.subtitle}>Quản lý phép năm & phê duyệt chi nhánh</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabsRow}>
            {isManager && (
              <TouchableOpacity
                onPress={() => setActiveTab('APPROVAL')}
                style={[styles.tabBtn, activeTab === 'APPROVAL' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={15}
                  color={activeTab === 'APPROVAL' ? '#059669' : '#64748B'}
                />
                <Text
                  style={[styles.tabBtnText, activeTab === 'APPROVAL' && styles.tabBtnTextActive]}
                >
                  Duyệt Đơn
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setActiveTab('CREATE')}
              style={[styles.tabBtn, activeTab === 'CREATE' && styles.tabBtnActive]}
            >
              <Ionicons
                name="add-circle"
                size={15}
                color={activeTab === 'CREATE' ? '#059669' : '#64748B'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'CREATE' && styles.tabBtnTextActive]}
              >
                Tạo Đơn
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('MINE')}
              style={[styles.tabBtn, activeTab === 'MINE' && styles.tabBtnActive]}
            >
              <Ionicons
                name="list"
                size={15}
                color={activeTab === 'MINE' ? '#059669' : '#64748B'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'MINE' && styles.tabBtnTextActive]}
              >
                Lịch Sử ({myLeaves.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* TAB 1: DUYỆT ĐƠN (MANAGER) */}
            {activeTab === 'APPROVAL' && (
              <View style={{ paddingBottom: 24 }}>
                <Text style={styles.sectionHeader}>Danh Sách Đơn Cần Phê Duyệt</Text>
                {loadingBranch ? (
                  <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 20 }} />
                ) : branchLeaves.filter((l) => l.status === 'PENDING').length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="checkmark-done-circle" size={40} color="#10B981" />
                    <Text style={styles.emptyText}>Hiện không có đơn nào đang chờ duyệt</Text>
                  </View>
                ) : (
                  branchLeaves
                    .filter((l) => l.status === 'PENDING')
                    .map((item) => (
                      <View key={item._id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <View>
                            <Text style={styles.cardEmpName}>{item.requesterName}</Text>
                            <Text style={styles.cardSub}>
                              {item.shiftName} - Ngày {item.shiftDate}
                            </Text>
                          </View>
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>Chờ duyệt</Text>
                          </View>
                        </View>

                        {item.isWarningGppUnderstaffed && (
                          <View style={styles.warningGppBox}>
                            <Ionicons name="warning" size={16} color="#B45309" />
                            <Text style={styles.warningGppText}>
                              Cảnh báo GPP: Sau khi duyệt, ca này sẽ không còn nhân sự trực!
                            </Text>
                          </View>
                        )}

                        <View style={styles.reasonBox}>
                          <Text style={styles.reasonLabel}>Lý do: </Text>
                          <Text style={styles.reasonText}>{item.reason}</Text>
                        </View>

                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            onPress={() => handleManagerRespond(item, 'reject')}
                            disabled={actionLoadingId === item._id}
                            style={[styles.btnAction, styles.btnReject]}
                          >
                            <Ionicons name="close-circle" size={16} color="#DC2626" />
                            <Text style={styles.btnRejectText}>Từ chối</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleManagerRespond(item, 'approve')}
                            disabled={actionLoadingId === item._id}
                            style={[styles.btnAction, styles.btnApprove]}
                          >
                            {actionLoadingId === item._id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                                <Text style={styles.btnApproveText}>Phê duyệt</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                )}
              </View>
            )}

            {/* TAB 2: TẠO ĐƠN (CREATE) */}
            {activeTab === 'CREATE' && (
              <View style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}>
                {/* Quota Banner */}
                <View style={styles.quotaBanner}>
                  <View>
                    <Text style={styles.quotaTitle}>Phép Năm Còn Lại</Text>
                    <Text style={styles.quotaValue}>{balance} ngày</Text>
                  </View>
                  <View style={styles.quotaDivider} />
                  <View>
                    <Text style={styles.quotaTitle}>Đã Sử Dụng</Text>
                    <Text style={styles.quotaSub}>{used} ngày</Text>
                  </View>
                </View>

                {/* Chọn nhanh ca đã xếp lịch tuần này & tuần sau */}
                {myUpcomingShifts.length > 0 && (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.formSubLabel}>
                      Chọn nhanh ca trực của bạn (Tuần này & Tuần sau):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {myUpcomingShifts.map((s, idx) => {
                        const sDate = s.date ? s.date.slice(0, 10) : '';
                        const isSelected = shiftDate === sDate;
                        return (
                          <TouchableOpacity
                            key={`quick_shift_${idx}`}
                            onPress={() => {
                              setShiftDate(sDate);
                              const found = SHIFT_OPTIONS.find(
                                (opt) => opt.name.toLowerCase() === (s.shiftName || '').toLowerCase()
                              );
                              if (found) setSelectedShift(found);
                              else {
                                setSelectedShift({
                                  id: s.shiftId || `shift-${idx}`,
                                  name: s.shiftName || 'Ca trực',
                                  start: s.shiftStart || '08:00',
                                  end: s.shiftEnd || '16:00',
                                });
                              }
                            }}
                            style={[styles.quickShiftPill, isSelected && styles.quickShiftPillActive]}
                          >
                            <Text style={[styles.quickShiftDate, isSelected && styles.quickShiftDateActive]}>
                              {sDate}
                            </Text>
                            <Text style={[styles.quickShiftName, isSelected && styles.quickShiftNameActive]}>
                              {s.shiftName || 'Ca trực'}
                            </Text>
                            <Text style={[styles.quickShiftTime, isSelected && styles.quickShiftTimeActive]}>
                              {s.shiftStart} - {s.shiftEnd}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Ngày xin nghỉ */}
                <Text style={styles.formLabel}>Ngày Xin Nghỉ (YYYY-MM-DD) *</Text>
                <TextInput
                  value={shiftDate}
                  onChangeText={setShiftDate}
                  placeholder="2026-10-15"
                  style={styles.input}
                />

                {/* Ca làm việc */}
                <Text style={styles.formLabel}>Chọn Ca Trực *</Text>
                <View style={styles.shiftPickerRow}>
                  {SHIFT_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedShift(s)}
                      style={[
                        styles.shiftOption,
                        selectedShift.id === s.id && styles.shiftOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.shiftOptionName,
                          selectedShift.id === s.id && styles.shiftOptionNameActive,
                        ]}
                      >
                        {s.name}
                      </Text>
                      <Text style={styles.shiftOptionTime}>
                        {s.start} - {s.end}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Loại nghỉ */}
                <Text style={styles.formLabel}>Loại Nghỉ Phép *</Text>
                {LEAVE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelectedLeaveType(t.id)}
                    style={[
                      styles.typeOption,
                      selectedLeaveType === t.id && styles.typeOptionActive,
                    ]}
                  >
                    <Ionicons
                      name={selectedLeaveType === t.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedLeaveType === t.id ? '#059669' : '#94A3B8'}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.typeTitle}>{t.label}</Text>
                      <Text style={styles.typeDesc}>{t.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Lý do */}
                <Text style={styles.formLabel}>Lý Do Cụ Thể *</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Ghi rõ lý do xin nghỉ ca này..."
                  multiline
                  numberOfLines={3}
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                />

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleCreateSubmit}
                  disabled={submitting}
                  style={styles.submitBtn}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>Gửi Đơn Xin Nghỉ</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: LỊCH SỬ CỦA TÔI (MINE) */}
            {activeTab === 'MINE' && (
              <View style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}>
                <Text style={styles.sectionHeader}>Đơn Xin Nghỉ Của Tôi</Text>
                {loadingLeaves ? (
                  <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 20 }} />
                ) : myLeaves.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
                    <Text style={styles.emptyText}>Bạn chưa có đơn xin nghỉ nào</Text>
                  </View>
                ) : (
                  myLeaves.map((item) => (
                    <View key={item._id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardEmpName}>{item.shiftName}</Text>
                          <Text style={styles.cardSub}>Ngày: {item.shiftDate}</Text>
                        </View>
                        <View
                          style={[
                            styles.badgeCommon,
                            item.status === 'APPROVED'
                              ? styles.badgeApproved
                              : item.status === 'REJECTED'
                              ? styles.badgeRejected
                              : styles.badgePending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeCommonText,
                              item.status === 'APPROVED'
                                ? styles.badgeApprovedText
                                : item.status === 'REJECTED'
                                ? styles.badgeRejectedText
                                : styles.badgePendingText,
                            ]}
                          >
                            {item.status === 'APPROVED'
                              ? 'Đã Duyệt'
                              : item.status === 'REJECTED'
                              ? 'Bị Từ Chối'
                              : item.status === 'CANCELLED'
                              ? 'Đã Hủy'
                              : 'Chờ Duyệt'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonText}>{item.reason}</Text>
                      </View>

                      {item.managerNote ? (
                        <View style={styles.managerNoteBox}>
                          <Text style={styles.managerNoteText}>
                            Quản lý phản hồi: {item.managerNote}
                          </Text>
                        </View>
                      ) : null}

                      {item.status === 'PENDING' && (
                        <TouchableOpacity
                          onPress={() => handleCancelLeave(item._id)}
                          style={styles.cancelBtn}
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
                          <Text style={styles.cancelBtnText}>Hủy đơn này</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '65%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#059669',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  quotaBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  quotaTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    textTransform: 'uppercase',
  },
  quotaValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14532D',
    marginTop: 2,
  },
  quotaDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#BBF7D0',
  },
  quotaSub: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  formSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 6,
  },
  quickShiftPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minWidth: 100,
  },
  quickShiftPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  quickShiftDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  quickShiftDateActive: {
    color: '#059669',
  },
  quickShiftName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  quickShiftNameActive: {
    color: '#059669',
  },
  quickShiftTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  quickShiftTimeActive: {
    color: '#059669',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  shiftPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  shiftOption: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  shiftOptionActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  shiftOptionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  shiftOptionNameActive: {
    color: '#059669',
  },
  shiftOptionTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  typeOptionActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  typeDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardEmpName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  warningGppBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    gap: 6,
  },
  warningGppText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    flex: 1,
  },
  reasonBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  reasonText: {
    fontSize: 12,
    color: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  btnReject: {
    backgroundColor: '#FEE2E2',
  },
  btnRejectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  btnApprove: {
    backgroundColor: '#059669',
  },
  btnApproveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeCommon: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCommonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeApproved: {
    backgroundColor: '#D1FAE5',
  },
  badgeApprovedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  badgeRejectedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  managerNoteBox: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  managerNoteText: {
    fontSize: 11,
    color: '#1D4ED8',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  cancelBtnText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
});
