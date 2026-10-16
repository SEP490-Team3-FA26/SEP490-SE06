import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '../ui/toastHelper';

interface ShiftSwapModalProps {
  visible: boolean;
  onClose: () => void;
  prefillShift?: any;
  initialShift?: any;
  onSuccess?: () => void;
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

export const ShiftSwapModal: React.FC<ShiftSwapModalProps> = ({
  visible,
  onClose,
  prefillShift,
  initialShift,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isManager = user?.role === 'branch' || user?.role === 'admin';
  const myUserId = user?.id || (user as any)?._id || (user as any)?.sub;
  const targetPrefill = prefillShift || initialShift;

  const [activeMainTab, setActiveMainTab] = useState<'MY_SWAPS' | 'CREATE' | 'APPROVAL'>(
    isManager ? 'APPROVAL' : 'MY_SWAPS'
  );
  const [subSwapTab, setSubSwapTab] = useState<'INCOMING' | 'OUTGOING'>('INCOMING');

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Swaps lists
  const [mySwaps, setMySwaps] = useState<any[]>([]);
  const [branchSwaps, setBranchSwaps] = useState<any[]>([]);

  // Create Form State
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [myUpcomingShifts, setMyUpcomingShifts] = useState<any[]>([]);
  const [selectedMyShift, setSelectedMyShift] = useState<any | null>(null);
  const [selectedColleague, setSelectedColleague] = useState<any | null>(null);
  const [showColleagueDropdown, setShowColleagueDropdown] = useState<boolean>(false);
  const [colleagueSearch, setColleagueSearch] = useState<string>('');
  const [showMyShiftDropdown, setShowMyShiftDropdown] = useState<boolean>(false);

  const filteredColleagues = useMemo(() => {
    if (!colleagueSearch.trim()) return colleagues;
    const q = colleagueSearch.toLowerCase();
    return colleagues.filter((c: any) => {
      const name = (c.fullName || c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const role = (c.role || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || role.includes(q);
    });
  }, [colleagues, colleagueSearch]);
  const [targetShiftDate, setTargetShiftDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  });
  const [targetShiftName, setTargetShiftName] = useState<string>('Ca Sáng (06:30 - 14:30)');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Action / Reject Modal
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState<boolean>(false);
  const [rejectingSwap, setRejectingSwap] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isManagerRejectAction, setIsManagerRejectAction] = useState<boolean>(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const now = new Date();
      const thisMon = formatDate(getMonday(now));
      const nextMonDate = new Date(getMonday(now));
      nextMonDate.setDate(nextMonDate.getDate() + 7);
      const nextMon = formatDate(nextMonDate);

      const [mySwapsRes, branchSwapsRes, colleaguesRes, scheduleThisWeek, scheduleNextWeek] = await Promise.all([
        ApiService.listMySwaps(),
        isManager ? ApiService.listBranchSwaps() : Promise.resolve([]),
        ApiService.getColleagues(),
        ApiService.getMyWeekSchedule(thisMon),
        ApiService.getMyWeekSchedule(nextMon),
      ]);

      setMySwaps(mySwapsRes || []);
      setBranchSwaps(branchSwapsRes || []);
      setColleagues(colleaguesRes || []);

      // Extract my upcoming shifts from schedule (cả tuần này và tuần sau)
      const allAssignments = [
        ...(scheduleThisWeek?.assignments || []),
        ...(scheduleNextWeek?.assignments || []),
      ];
      const todayStr = formatDate(now);
      const myShifts = allAssignments.filter((a: any) => {
        const aDate = a.date ? a.date.slice(0, 10) : '';
        return String(a.employeeId) === String(myUserId) && aDate >= todayStr;
      });
      myShifts.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
      setMyUpcomingShifts(myShifts);
      if (myShifts.length > 0 && !selectedMyShift) {
        setSelectedMyShift(myShifts[0]);
      }
    } catch (e) {
      console.warn('Lỗi tải dữ liệu đổi ca:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManager, myUserId, selectedMyShift]);

  useEffect(() => {
    if (visible) {
      loadData();
      if (targetPrefill) {
        setSelectedMyShift(targetPrefill);
        setActiveMainTab('CREATE');
      }
    }
  }, [visible, loadData, targetPrefill]);

  // Phân tách Incoming vs Outgoing
  const incomingSwaps = useMemo(() => {
    return mySwaps.filter((s) => String(s.targetId) === String(myUserId) && s.status === 'pending_target');
  }, [mySwaps, myUserId]);

  const outgoingSwaps = useMemo(() => {
    return mySwaps.filter((s) => String(s.requesterId) === String(myUserId));
  }, [mySwaps, myUserId]);

  const pendingManagerSwaps = useMemo(() => {
    return branchSwaps.filter((s) => s.status === 'pending_manager');
  }, [branchSwaps]);

  // Submit Create Swap
  const handleCreateSwap = async () => {
    if (!selectedMyShift) {
      showToast.error('Thiếu thông tin', 'Vui lòng chọn ca làm việc của bạn muốn đổi.');
      return;
    }
    if (!selectedColleague) {
      showToast.error('Thiếu thông tin', 'Vui lòng chọn đồng nghiệp bạn muốn đổi ca.');
      return;
    }
    if (!targetShiftDate.trim()) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập ngày ca làm việc của đồng nghiệp.');
      return;
    }
    if (!reason.trim()) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập lý do xin đổi ca.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        requesterShiftDate: selectedMyShift.date ? selectedMyShift.date.slice(0, 10) : formatDate(new Date()),
        requesterShiftId: selectedMyShift.shiftId || 'shift-1',
        requesterShiftName: selectedMyShift.shiftName || 'Ca làm việc',
        targetId: selectedColleague._id || selectedColleague.id,
        targetName: selectedColleague.fullName || selectedColleague.name || 'Đồng nghiệp',
        targetShiftDate: targetShiftDate.trim(),
        targetShiftId: 'shift-target',
        targetShiftName: targetShiftName.trim(),
        reason: reason.trim(),
      };

      const res = await ApiService.createShiftSwap(payload);
      if (res.success) {
        showToast.success('Thành công', 'Đã gửi yêu cầu đổi ca tới đồng nghiệp!');
        setReason('');
        setActiveMainTab('MY_SWAPS');
        setSubSwapTab('OUTGOING');
        loadData();
        if (onSuccess) onSuccess();
      } else {
        showToast.error('Lỗi', res.error || 'Không thể tạo yêu cầu đổi ca.');
      }
    } catch (err: any) {
      showToast.error('Lỗi kết nối', err.message || 'Không thể kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Đồng nghiệp chấp thuận đổi ca (Target Approve)
  const handleTargetApprove = async (swapId: string) => {
    try {
      setActionLoadingId(swapId);
      const res = await ApiService.targetRespondSwap(swapId, 'approved');
      if (res.success) {
        showToast.success('Đã chấp thuận', 'Bạn đã đồng ý đổi ca. Yêu cầu đã chuyển tới Quản lý chi nhánh phê duyệt.');
        loadData();
        if (onSuccess) onSuccess();
      } else {
        showToast.error('Lỗi', res.error || 'Lỗi khi đồng ý đổi ca.');
      }
    } catch (e: any) {
      showToast.error('Lỗi', e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mở modal từ chối
  const openRejectDialog = (swap: any, isManagerAction = false) => {
    setRejectingSwap(swap);
    setIsManagerRejectAction(isManagerAction);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  // Xác nhận từ chối
  const handleConfirmReject = async () => {
    if (!rejectingSwap) return;
    if (!rejectReason.trim()) {
      showToast.error('Lỗi', 'Vui lòng nhập lý do từ chối.');
      return;
    }

    try {
      setActionLoadingId(rejectingSwap._id || rejectingSwap.id);
      const swapId = rejectingSwap._id || rejectingSwap.id;
      let res;
      if (isManagerRejectAction) {
        res = await ApiService.managerRespondSwap(swapId, 'rejected', rejectReason.trim());
      } else {
        res = await ApiService.targetRespondSwap(swapId, 'rejected', rejectReason.trim());
      }

      if (res.success) {
        showToast.success('Đã từ chối', 'Đã từ chối yêu cầu đổi ca.');
        setRejectModalVisible(false);
        setRejectingSwap(null);
        loadData();
        if (onSuccess) onSuccess();
      } else {
        showToast.error('Lỗi', res.error || 'Lỗi khi từ chối.');
      }
    } catch (e: any) {
      showToast.error('Lỗi', e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quản lý chi nhánh phê duyệt hoán đổi lịch
  const handleManagerApprove = async (swapId: string) => {
    Alert.alert(
      'Phê Duyệt Đổi Ca',
      'Bạn có chắc chắn muốn duyệt yêu cầu đổi ca này? Lịch làm việc chi nhánh sẽ tự động hoán đổi ngay lập tức.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê Duyệt Ngay',
          onPress: async () => {
            try {
              setActionLoadingId(swapId);
              const res = await ApiService.managerRespondSwap(swapId, 'approved');
              if (res.success) {
                showToast.success('Thành công', 'Quản lý đã phê duyệt đổi ca! Lịch trực đã được hoán đổi.');
                loadData();
                if (onSuccess) onSuccess();
              } else {
                showToast.error('Lỗi', res.error || 'Lỗi khi phê duyệt.');
              }
            } catch (e: any) {
              showToast.error('Lỗi', e.message);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_target':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>Chờ đồng nghiệp đồng ý</Text>
          </View>
        );
      case 'pending_manager':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FFEDD5' }]}>
            <Text style={[styles.statusBadgeText, { color: '#C2410C' }]}>Chờ Quản lý duyệt</Text>
          </View>
        );
      case 'approved':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statusBadgeText, { color: '#047857' }]}>Đã đổi lịch thành công</Text>
          </View>
        );
      case 'rejected':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statusBadgeText, { color: '#B91C1C' }]}>Đã từ chối</Text>
          </View>
        );
      default:
        return (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{status}</Text>
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
                <Ionicons name="swap-horizontal" size={22} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Đổi Ca Chéo Chi Nhánh</Text>
                <Text style={styles.sheetSubtitle}>Quy trình thỏa thuận & Quản lý duyệt chuẩn GPP</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Main Navigation Tabs */}
          <View style={styles.mainTabsContainer}>
            <TouchableOpacity
              onPress={() => setActiveMainTab('MY_SWAPS')}
              style={[styles.mainTabBtn, activeMainTab === 'MY_SWAPS' && styles.mainTabBtnActive]}
            >
              <Ionicons
                name="list"
                size={16}
                color={activeMainTab === 'MY_SWAPS' ? '#0284C7' : '#64748B'}
              />
              <Text style={[styles.mainTabText, activeMainTab === 'MY_SWAPS' && styles.mainTabTextActive]}>
                Yêu Cầu Của Tôi ({incomingSwaps.length > 0 ? `+${incomingSwaps.length}` : mySwaps.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveMainTab('CREATE')}
              style={[styles.mainTabBtn, activeMainTab === 'CREATE' && styles.mainTabBtnActive]}
            >
              <Ionicons
                name="add-circle"
                size={16}
                color={activeMainTab === 'CREATE' ? '#0284C7' : '#64748B'}
              />
              <Text style={[styles.mainTabText, activeMainTab === 'CREATE' && styles.mainTabTextActive]}>
                Tạo Yêu Cầu
              </Text>
            </TouchableOpacity>

            {isManager && (
              <TouchableOpacity
                onPress={() => setActiveMainTab('APPROVAL')}
                style={[styles.mainTabBtn, activeMainTab === 'APPROVAL' && styles.mainTabBtnActive]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={activeMainTab === 'APPROVAL' ? '#0284C7' : '#64748B'}
                />
                <Text style={[styles.mainTabText, activeMainTab === 'APPROVAL' && styles.mainTabTextActive]}>
                  Duyệt Cơ Sở ({pendingManagerSwaps.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Đang tải danh sách đổi ca...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#0284C7']} />}
            >
              {/* TAB 1: MY SWAPS */}
              {activeMainTab === 'MY_SWAPS' && (
                <View>
                  {/* Sub tabs */}
                  <View style={styles.subTabRow}>
                    <TouchableOpacity
                      onPress={() => setSubSwapTab('INCOMING')}
                      style={[styles.subTabBtn, subSwapTab === 'INCOMING' && styles.subTabBtnActive]}
                    >
                      <Text style={[styles.subTabText, subSwapTab === 'INCOMING' && styles.subTabTextActive]}>
                        Yêu cầu nhận được ({incomingSwaps.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setSubSwapTab('OUTGOING')}
                      style={[styles.subTabBtn, subSwapTab === 'OUTGOING' && styles.subTabBtnActive]}
                    >
                      <Text style={[styles.subTabText, subSwapTab === 'OUTGOING' && styles.subTabTextActive]}>
                        Yêu cầu gửi đi ({outgoingSwaps.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* INCOMING */}
                  {subSwapTab === 'INCOMING' && (
                    <View style={{ gap: 10 }}>
                      {incomingSwaps.length === 0 ? (
                        <View style={styles.emptyContainer}>
                          <Ionicons name="checkmark-done-circle-outline" size={44} color="#94A3B8" />
                          <Text style={styles.emptyText}>Không có đồng nghiệp nào đang nhờ bạn đổi ca.</Text>
                        </View>
                      ) : (
                        incomingSwaps.map((item) => (
                          <View key={item._id || item.id} style={styles.swapCard}>
                            <View style={styles.swapCardHeader}>
                              <Text style={styles.requesterTitle}>
                                <Text style={{ fontWeight: '800', color: '#0284C7' }}>{item.requesterName}</Text> muốn đổi ca với bạn
                              </Text>
                              {renderStatusBadge(item.status)}
                            </View>

                            <View style={styles.exchangeBox}>
                              <View style={styles.exchangeItem}>
                                <Text style={styles.exchangeLabel}>Ca của đối phương:</Text>
                                <Text style={styles.exchangeVal}>{item.requesterShiftName}</Text>
                                <Text style={styles.exchangeDate}>{item.requesterShiftDate}</Text>
                              </View>

                              <Ionicons name="arrow-forward" size={18} color="#94A3B8" />

                              <View style={styles.exchangeItem}>
                                <Text style={styles.exchangeLabel}>Ca của bạn muốn đổi:</Text>
                                <Text style={styles.exchangeVal}>{item.targetShiftName}</Text>
                                <Text style={styles.exchangeDate}>{item.targetShiftDate}</Text>
                              </View>
                            </View>

                            <Text style={styles.reasonText}>
                              <Text style={{ fontWeight: '700' }}>Lý do:</Text> {item.reason || 'Bận việc riêng'}
                            </Text>

                            <View style={styles.actionBtnRow}>
                              <TouchableOpacity
                                onPress={() => openRejectDialog(item, false)}
                                style={styles.rejectBtn}
                                disabled={actionLoadingId === (item._id || item.id)}
                              >
                                <Ionicons name="close" size={16} color="#EF4444" />
                                <Text style={styles.rejectBtnText}>Từ chối</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleTargetApprove(item._id || item.id)}
                                style={styles.approveBtn}
                                disabled={actionLoadingId === (item._id || item.id)}
                              >
                                {actionLoadingId === (item._id || item.id) ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <>
                                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                    <Text style={styles.approveBtnText}>Đồng ý đổi ca</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}

                  {/* OUTGOING */}
                  {subSwapTab === 'OUTGOING' && (
                    <View style={{ gap: 10 }}>
                      {outgoingSwaps.length === 0 ? (
                        <View style={styles.emptyContainer}>
                          <Ionicons name="paper-plane-outline" size={44} color="#94A3B8" />
                          <Text style={styles.emptyText}>Bạn chưa gửi yêu cầu đổi ca nào.</Text>
                        </View>
                      ) : (
                        outgoingSwaps.map((item) => (
                          <View key={item._id || item.id} style={styles.swapCard}>
                            <View style={styles.swapCardHeader}>
                              <Text style={styles.requesterTitle}>
                                Bạn xin đổi với <Text style={{ fontWeight: '800', color: '#0F172A' }}>{item.targetName}</Text>
                              </Text>
                              {renderStatusBadge(item.status)}
                            </View>

                            <View style={styles.exchangeBox}>
                              <View style={styles.exchangeItem}>
                                <Text style={styles.exchangeLabel}>Ca của bạn:</Text>
                                <Text style={styles.exchangeVal}>{item.requesterShiftName}</Text>
                                <Text style={styles.exchangeDate}>{item.requesterShiftDate}</Text>
                              </View>

                              <Ionicons name="arrow-forward" size={18} color="#94A3B8" />

                              <View style={styles.exchangeItem}>
                                <Text style={styles.exchangeLabel}>Ca muốn nhận:</Text>
                                <Text style={styles.exchangeVal}>{item.targetShiftName}</Text>
                                <Text style={styles.exchangeDate}>{item.targetShiftDate}</Text>
                              </View>
                            </View>

                            <Text style={styles.reasonText}>
                              <Text style={{ fontWeight: '700' }}>Lý do:</Text> {item.reason || 'Bận việc riêng'}
                            </Text>

                            {item.targetRejectReason && (
                              <Text style={[styles.reasonText, { color: '#DC2626' }]}>
                                <Text style={{ fontWeight: '700' }}>Đồng nghiệp từ chối:</Text> {item.targetRejectReason}
                              </Text>
                            )}

                            {item.managerRejectReason && (
                              <Text style={[styles.reasonText, { color: '#DC2626' }]}>
                                <Text style={{ fontWeight: '700' }}>Quản lý từ chối:</Text> {item.managerRejectReason}
                              </Text>
                            )}
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 2: CREATE SWAP */}
              {activeMainTab === 'CREATE' && (
                <View style={styles.createCard}>
                  <Text style={styles.formSectionHeader}>1. CHỌN CA CỦA BẠN MUỐN ĐỔI</Text>

                  {myUpcomingShifts.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setShowMyShiftDropdown(true)}
                      style={styles.dropdownSelectorBox}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownSelectorLeft}>
                        <View style={[styles.dropdownIconCircle, { backgroundColor: '#F0FDF4' }]}>
                          <Ionicons name="calendar" size={16} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownSelectorLabel}>Ca làm việc cần đổi</Text>
                          <Text
                            style={[
                              styles.dropdownSelectorValue,
                              !selectedMyShift && styles.dropdownSelectorPlaceholder,
                            ]}
                            numberOfLines={1}
                          >
                            {selectedMyShift
                              ? `${selectedMyShift.date?.slice(0, 10)} - ${selectedMyShift.shiftName} (${selectedMyShift.shiftStart} - ${selectedMyShift.shiftEnd})`
                              : 'Chạm để chọn ca trực của bạn...'}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-down" size={18} color="#64748B" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.warningNoteText}>
                      Không tìm thấy ca trực sắp tới trong tuần. Bạn có thể chọn ngày bên dưới.
                    </Text>
                  )}

                  <Text style={styles.formSectionHeader}>2. CHỌN ĐỒNG NGHIỆP CÙNG CHI NHÁNH</Text>
                  <TouchableOpacity
                    onPress={() => setShowColleagueDropdown(true)}
                    style={styles.dropdownSelectorBox}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownSelectorLeft}>
                      <View style={[styles.dropdownIconCircle, { backgroundColor: '#F0F9FF' }]}>
                        <Ionicons name="person" size={16} color="#0284C7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownSelectorLabel}>Đồng nghiệp nhận đổi ca</Text>
                        <Text
                          style={[
                            styles.dropdownSelectorValue,
                            !selectedColleague && styles.dropdownSelectorPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedColleague
                            ? `${selectedColleague.fullName || selectedColleague.name}${
                                selectedColleague.role
                                  ? ` (${selectedColleague.role === 'pharmacist' ? 'Dược Sĩ' : selectedColleague.role === 'branch' ? 'Quản Lý' : selectedColleague.role})`
                                  : ''
                              }`
                            : 'Chạm để chọn đồng nghiệp cùng chi nhánh...'}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#64748B" />
                  </TouchableOpacity>

                  <Text style={styles.formSectionHeader}>3. THÔNG TIN CA ĐỒNG NGHIỆP BẠN MUỐN ĐỔI</Text>

                  <Text style={styles.inputLabel}>Ngày ca trực đồng nghiệp (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={targetShiftDate}
                    onChangeText={setTargetShiftDate}
                    placeholder="2026-10-15"
                  />

                  <Text style={styles.inputLabel}>Ca làm việc muốn đổi sang</Text>
                  <TextInput
                    style={styles.textInput}
                    value={targetShiftName}
                    onChangeText={setTargetShiftName}
                    placeholder="Ca Sáng (06:30 - 14:30) / Ca Chiều..."
                  />

                  <Text style={styles.inputLabel}>Lý do xin đổi ca (Bắt buộc)</Text>
                  <TextInput
                    style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Ghi rõ lý do: Bận việc gia đình, học CCHN, đổi ca trực hộ..."
                    multiline
                  />

                  <TouchableOpacity
                    onPress={handleCreateSwap}
                    style={styles.submitCreateBtn}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                        <Text style={styles.submitCreateBtnText}>GỬI YÊU CẦU ĐỔI CA</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB 3: MANAGER APPROVAL */}
              {activeMainTab === 'APPROVAL' && isManager && (
                <View style={{ gap: 12 }}>
                  {pendingManagerSwaps.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="shield-checkmark-outline" size={44} color="#94A3B8" />
                      <Text style={styles.emptyText}>Hiện không có yêu cầu đổi ca nào đang chờ duyệt cơ sở.</Text>
                    </View>
                  ) : (
                    pendingManagerSwaps.map((item) => (
                      <View key={item._id || item.id} style={styles.swapCard}>
                        <View style={styles.swapCardHeader}>
                          <Text style={styles.requesterTitle}>
                            <Text style={{ fontWeight: '800', color: '#0284C7' }}>{item.requesterName}</Text> ↔{' '}
                            <Text style={{ fontWeight: '800', color: '#059669' }}>{item.targetName}</Text>
                          </Text>
                          {renderStatusBadge(item.status)}
                        </View>

                        <Text style={styles.subNote}>
                          Đồng nghiệp đã chấp thuận! Chờ Quản lý chi nhánh phê duyệt để hoán đổi lịch trực.
                        </Text>

                        <View style={styles.exchangeBox}>
                          <View style={styles.exchangeItem}>
                            <Text style={styles.exchangeLabel}>{item.requesterName}:</Text>
                            <Text style={styles.exchangeVal}>{item.requesterShiftName}</Text>
                            <Text style={styles.exchangeDate}>{item.requesterShiftDate}</Text>
                          </View>

                          <Ionicons name="swap-horizontal" size={20} color="#0284C7" />

                          <View style={styles.exchangeItem}>
                            <Text style={styles.exchangeLabel}>{item.targetName}:</Text>
                            <Text style={styles.exchangeVal}>{item.targetShiftName}</Text>
                            <Text style={styles.exchangeDate}>{item.targetShiftDate}</Text>
                          </View>
                        </View>

                        <Text style={styles.reasonText}>
                          <Text style={{ fontWeight: '700' }}>Lý do:</Text> {item.reason || 'Bận việc riêng'}
                        </Text>

                        <View style={styles.actionBtnRow}>
                          <TouchableOpacity
                            onPress={() => openRejectDialog(item, true)}
                            style={styles.rejectBtn}
                            disabled={actionLoadingId === (item._id || item.id)}
                          >
                            <Ionicons name="close" size={16} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Từ chối</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleManagerApprove(item._id || item.id)}
                            style={[styles.approveBtn, { backgroundColor: '#059669' }]}
                            disabled={actionLoadingId === (item._id || item.id)}
                          >
                            {actionLoadingId === (item._id || item.id) ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                                <Text style={styles.approveBtnText}>Phê Duyệt Đổi Ca</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* Dialog nhập lý do từ chối */}
          <Modal visible={rejectModalVisible} transparent animationType="fade">
            <View style={styles.dialogOverlay}>
              <View style={styles.dialogCard}>
                <Text style={styles.dialogTitle}>Lý Do Từ Chối Đổi Ca</Text>
                <Text style={styles.dialogSubtitle}>
                  Vui lòng cung cấp lý do để thông báo rõ ràng cho nhân viên.
                </Text>

                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', marginTop: 10 }]}
                  placeholder="Ví dụ: Bận việc gia đình, thiếu nhân sự ca tối..."
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                />

                <View style={styles.dialogBtnRow}>
                  <TouchableOpacity
                    onPress={() => setRejectModalVisible(false)}
                    style={styles.dialogCancelBtn}
                  >
                    <Text style={styles.dialogCancelBtnText}>Hủy bỏ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmReject}
                    style={styles.dialogConfirmBtn}
                  >
                    <Text style={styles.dialogConfirmBtnText}>Xác nhận từ chối</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal Dropdown: Chọn Ca của bạn */}
          <Modal
            visible={showMyShiftDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMyShiftDropdown(false)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowMyShiftDropdown(false)}
            >
              <View
                style={[styles.dropdownSheetCard, { paddingBottom: Math.max(insets.bottom, 20) }]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.dropdownSheetHeader}>
                  <View>
                    <Text style={styles.dropdownSheetTitle}>Chọn Ca Trực Của Bạn</Text>
                    <Text style={styles.dropdownSheetSubtitle}>
                      Các ca trực sắp tới (tuần này & tuần sau)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowMyShiftDropdown(false)}
                    style={styles.dropdownCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={true}>
                  {myUpcomingShifts.map((s, idx) => {
                    const isSelected =
                      selectedMyShift?.date === s.date && selectedMyShift?.shiftId === s.shiftId;
                    return (
                      <TouchableOpacity
                        key={`shift_dd_${idx}`}
                        onPress={() => {
                          setSelectedMyShift(s);
                          setShowMyShiftDropdown(false);
                        }}
                        style={[
                          styles.dropdownItemRow,
                          isSelected && styles.dropdownItemRowActive,
                        ]}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <View
                            style={[
                              styles.dropdownIconCircle,
                              { backgroundColor: isSelected ? '#059669' : '#F1F5F9' },
                            ]}
                          >
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={isSelected ? '#FFFFFF' : '#475569'}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.dropdownItemName,
                                isSelected && { color: '#059669', fontWeight: '800' },
                              ]}
                            >
                              {s.date?.slice(0, 10)} — {s.shiftName}
                            </Text>
                            <Text style={styles.dropdownItemRole}>
                              Thời gian: {s.shiftStart} - {s.shiftEnd}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#059669" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Modal Dropdown: Chọn Đồng Nghiệp */}
          <Modal
            visible={showColleagueDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowColleagueDropdown(false)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowColleagueDropdown(false)}
            >
              <View
                style={[styles.dropdownSheetCard, { paddingBottom: Math.max(insets.bottom, 20) }]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.dropdownSheetHeader}>
                  <View>
                    <Text style={styles.dropdownSheetTitle}>Chọn Đồng Nghiệp Cùng Chi Nhánh</Text>
                    <Text style={styles.dropdownSheetSubtitle}>
                      Chạm vào một nhân sự để chọn người nhận yêu cầu đổi ca
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowColleagueDropdown(false)}
                    style={styles.dropdownCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {colleagues.length > 4 && (
                  <View style={styles.dropdownSearchBox}>
                    <Ionicons name="search" size={16} color="#94A3B8" />
                    <TextInput
                      style={styles.dropdownSearchInput}
                      value={colleagueSearch}
                      onChangeText={setColleagueSearch}
                      placeholder="Tìm theo tên hoặc số điện thoại..."
                      placeholderTextColor="#94A3B8"
                    />
                    {colleagueSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setColleagueSearch('')}>
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={true}>
                  {filteredColleagues.length > 0 ? (
                    filteredColleagues.map((c) => {
                      const isSelected =
                        selectedColleague?._id === c._id || selectedColleague?.id === c.id;
                      return (
                        <TouchableOpacity
                          key={c._id || c.id}
                          onPress={() => {
                            setSelectedColleague(c);
                            setShowColleagueDropdown(false);
                          }}
                          style={[
                            styles.dropdownItemRow,
                            isSelected && styles.dropdownItemRowActive,
                          ]}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <View
                              style={[
                                styles.avatarInitials,
                                isSelected && { backgroundColor: '#0284C7' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.avatarInitialsText,
                                  isSelected && { color: '#FFFFFF' },
                                ]}
                              >
                                {(c.fullName || c.name || '?').slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.dropdownItemName,
                                  isSelected && styles.dropdownItemNameActive,
                                ]}
                              >
                                {c.fullName || c.name}
                              </Text>
                              {c.role && (
                                <Text style={styles.dropdownItemRole}>
                                  {c.role === 'pharmacist'
                                    ? 'Dược Sĩ'
                                    : c.role === 'branch'
                                    ? 'Quản Lý Cơ Sở'
                                    : c.role}
                                </Text>
                              )}
                            </View>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color="#0284C7" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Ionicons name="people-outline" size={32} color="#CBD5E1" />
                      <Text style={{ marginTop: 8, fontSize: 13, color: '#94A3B8' }}>
                        Không tìm thấy đồng nghiệp nào
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
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
    backgroundColor: '#E0F2FE',
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
  mainTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  mainTabBtnActive: {
    borderBottomColor: '#0284C7',
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  mainTabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  subTabText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    textAlign: 'center',
  },
  swapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  swapCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requesterTitle: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  exchangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exchangeItem: {
    flex: 1,
  },
  exchangeLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  exchangeVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  exchangeDate: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 1,
  },
  reasonText: {
    fontSize: 12,
    color: '#334155',
    marginVertical: 4,
  },
  subNote: {
    fontSize: 11,
    color: '#0284C7',
    marginBottom: 6,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  selectShiftPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  selectShiftPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  selectShiftDate: {
    fontSize: 11,
    color: '#64748B',
  },
  selectShiftDateActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  selectShiftName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectShiftNameActive: {
    color: '#0369A1',
  },
  selectShiftTime: {
    fontSize: 11,
    color: '#64748B',
  },
  selectShiftTimeActive: {
    color: '#0284C7',
  },
  warningNoteText: {
    fontSize: 12,
    color: '#D97706',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  colleagueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  colleagueChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  colleagueName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  colleagueNameActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  submitCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
  },
  submitCreateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  dialogCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  dialogConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dropdownSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dropdownSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownSelectorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownSelectorValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  dropdownSelectorPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  dropdownSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '80%',
  },
  dropdownSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 12,
  },
  dropdownSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dropdownSheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  dropdownCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  dropdownSearchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    marginLeft: 8,
    color: '#0F172A',
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dropdownItemRowActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarInitials: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownItemNameActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  dropdownItemRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
