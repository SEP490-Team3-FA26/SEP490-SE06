// WarehouseDispatchSection.tsx - Quản Lý Phiếu Xuất Kho Tổng Hai Giai Đoạn Trên Mobile Thủ Kho
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Camera } from 'expo-camera';
import { DispatchMobileService } from '../../services/inventory/dispatch.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { DispatchOrder, Medicine } from '../../types/pharmacy.types';
import { showToast } from '../ui/toastHelper';
import { ToteManagerModal } from './ToteManagerModal';

interface WarehouseDispatchSectionProps {
  navigation: any;
  medicines: Medicine[];
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Sẵn sàng nhặt' },
  { key: 'PICKING', label: 'Đang nhặt' },
  { key: 'STAGED', label: 'Đã tập kết' },
  { key: 'DISPATCHED', label: 'Đã xuất' },
];

export const WarehouseDispatchSection: React.FC<WarehouseDispatchSectionProps> = ({
  navigation,
  medicines,
}) => {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showToteModal, setShowToteModal] = useState<boolean>(false);

  // Modal Tạo Phiếu Xuất Mới (Từ PR chi nhánh hoặc Xuất Hủy)
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [createType, setCreateType] = useState<'TRANSFER' | 'DISPOSE'>('TRANSFER');
  const [pendingPrs, setPendingPrs] = useState<any[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<string>('');
  const [disposalCode, setDisposalCode] = useState<string>('BB-HUY-2026-01');
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [disposeQty, setDisposeQty] = useState<string>('1');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);
  // Yêu cầu quyền truy cập Camera ngay khi bấm nút và chuyển hướng vào màn hình nhặt hàng
  const handleOpenPicking = useCallback(async (orderId: string) => {
    try {
      const perm = await Camera.getCameraPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) {
        await Camera.requestCameraPermissionsAsync();
      }
    } catch (e: any) {
      console.warn('[WarehouseDispatchSection] Lỗi xin quyền camera:', e?.message);
    }
    navigation.navigate('PickingScreen', { orderId });
  }, [navigation]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DispatchMobileService.getDispatchOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn('Lỗi tải danh sách phiếu xuất:', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  useEffect(() => {
    void loadOrders();
    const unsub = SocketService.subscribe((n) => {
      if (
        [
          'DISPATCH_CREATED',
          'DISPATCH_APPROVED',
          'DISPATCH_UPDATED',
          'DISPATCH_COMPLETED',
          'DISPATCH_STALE',
        ].includes(n?.type)
      ) {
        void loadOrders();
      } else if (n?.type === 'DISPATCH_ACTION_REJECTED') {
        showToast.error('Không thể thực hiện', n?.reason || 'Yêu cầu xuất kho bị từ chối.');
      }
    });
    return unsub;
  }, [loadOrders]);

  const openCreateModal = async () => {
    setCreateModalVisible(true);
    try {
      const prs = await ApiService.getPurchaseRequisitions();
      const eligible = (prs || []).filter((p: any) =>
        ['SUBMITTED', 'CONSOLIDATED'].includes(p.status),
      );
      setPendingPrs(eligible);
      if (eligible.length > 0) setSelectedPrId(eligible[0]._id || eligible[0].id);
    } catch {}
    if (medicines.length > 0 && !selectedMedId) {
      setSelectedMedId(medicines[0].id || medicines[0]._id || '');
    }
  };

  const handleSubmitCreate = async () => {
    try {
      setSubmittingCreate(true);
      let createdCode = '';
      if (createType === 'TRANSFER') {
        if (!selectedPrId) {
          showToast.error('Thiếu yêu cầu PR', 'Không có yêu cầu nhập hàng chi nhánh nào để lập phiếu.');
          return;
        }
        const res = await DispatchMobileService.createDispatchOrderSync({
          type: 'TRANSFER',
          referenceId: selectedPrId,
        });
        createdCode = res?.data?.dispatchCode || '';
      } else {
        if (!disposalCode.trim() || !selectedMedId) {
          showToast.error('Thiếu thông tin', 'Nhập mã biên bản tiêu hủy và chọn thuốc cần hủy.');
          return;
        }
        const res = await DispatchMobileService.createDispatchOrderSync({
          type: 'DISPOSE',
          disposalReportCode: disposalCode.trim(),
          items: [{ medicineId: selectedMedId, quantity: Math.max(1, parseInt(disposeQty, 10) || 1) }],
        });
        createdCode = res?.data?.dispatchCode || '';
      }
      showToast.success(
        'Đã lập phiếu xuất',
        createdCode
          ? `Phiếu ${createdCode} đã gửi Giám đốc / Dược sĩ PIC chờ duyệt.`
          : 'Phiếu đã gửi Giám đốc / Dược sĩ PIC chờ duyệt.',
      );
      setCreateModalVisible(false);
      await loadOrders();
    } catch (e: any) {
      showToast.error('Lỗi lập phiếu', e?.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    if (statusFilter === 'DISPATCHED') {
      return orders.filter((o) => ['DISPATCHED', 'PARTIALLY_DISPATCHED'].includes(o.status));
    }
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'DISPATCHED':
      case 'PARTIALLY_DISPATCHED':
        return { bg: '#F0F9FF', color: '#0284C7' };
      case 'PENDING_APPROVAL':
      case 'PICKING':
      case 'STAGED':
        return { bg: '#FFFBEB', color: '#D97706' };
      default:
        return { bg: '#FEF2F2', color: '#DC2626' };
    }
  };

  return (
    <View>
      {/* Thanh tác vụ đầu tab */}
      <View style={styles.topActionRow}>
        <TouchableOpacity onPress={() => void openCreateModal()} style={styles.createBtn}>
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Lập Phiếu Xuất</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowToteModal(true)} style={styles.toteBtn}>
          <Ionicons name="basket-outline" size={17} color="#0284C7" />
          <Text style={styles.toteBtnText}>Quản lý Tote</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void loadOrders()} style={styles.reloadBtn}>
          <Ionicons name="refresh" size={17} color="#0284C7" />
          <Text style={styles.reloadBtnText}>Tải lại</Text>
        </TouchableOpacity>
      </View>

      {/* Bộ lọc trạng thái */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setStatusFilter(f.key)}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator size="small" color="#0284C7" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Chưa có phiếu xuất nào ở trạng thái này</Text>
          <Text style={styles.emptySub}>Nhấn &quot;Lập Phiếu Xuất&quot; từ PR của chi nhánh hoặc tải lại danh sách.</Text>
          <TouchableOpacity onPress={() => void loadOrders()} style={styles.emptyReloadBtn}>
            <Ionicons name="refresh" size={15} color="#FFFFFF" />
            <Text style={styles.emptyReloadBtnText}>Tải lại danh sách</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filteredOrders.map((o) => {
          const badge = getBadgeStyle(o.status);
          return (
            <TouchableOpacity
              key={o._id || o.dispatchCode}
              onPress={() => navigation.navigate('DispatchOrderDetailScreen', { orderId: o._id })}
              style={styles.orderCard}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeText}>{o.dispatchCode}</Text>
                  <Text style={styles.destText}>
                    {o.type === 'DISPOSE'
                      ? `Xuất Hủy • ${o.disposalReportCode || ''}`
                      : `Tới: ${o.toBranchName || o.toBranchId}`}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{o.status}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{`${o.pickingList?.length || 0} dòng hàng`}</Text>
                <Text style={styles.metaText}>{`Trong giỏ: ${o.totalPicked || 0}`}</Text>
                {o.isStale ? <Text style={styles.staleTag}>TREO &gt;4H</Text> : null}
                {o.hasControlledDrugs ? <Text style={styles.picTag}>CẦN PIC</Text> : null}
              </View>

              {(o.status === 'APPROVED' || o.status === 'PICKING') ? (
                <TouchableOpacity
                  onPress={() => void handleOpenPicking(o._id)}
                  style={styles.quickPickBtn}
                >
                  <Ionicons name="scan" size={16} color="#FFFFFF" />
                  <Text style={styles.quickPickText}>
                    {o.status === 'APPROVED' ? 'Vào Kệ Quét Nhặt Hàng' : 'Tiếp Tục Quét Nhặt'}
                  </Text>
                </TouchableOpacity>
              ) : o.status === 'STAGED' ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('DispatchConfirmScreen', { orderId: o._id })}
                  style={styles.quickConfirmBtn}
                >
                  <Ionicons name="send-outline" size={16} color="#0284C7" />
                  <Text style={styles.quickConfirmText}>Bàn Giao & Xuất Kho Thật</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        })
      )}

      <ToteManagerModal visible={showToteModal} onClose={() => setShowToteModal(false)} />

      {/* Modal Lập Phiếu Xuất Kho */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Lập Phiếu Xuất Kho Mới</Text>

            <View style={styles.typeSwitch}>
              <TouchableOpacity
                onPress={() => setCreateType('TRANSFER')}
                style={[styles.typeBtn, createType === 'TRANSFER' ? styles.typeBtnActive : null]}
              >
                <Text style={[styles.typeText, createType === 'TRANSFER' ? { color: '#FFFFFF' } : null]}>
                  Chuyển Kho (PR)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCreateType('DISPOSE')}
                style={[styles.typeBtn, createType === 'DISPOSE' ? styles.typeBtnActive : null]}
              >
                <Text style={[styles.typeText, createType === 'DISPOSE' ? { color: '#FFFFFF' } : null]}>
                  Xuất Tiêu Hủy
                </Text>
              </TouchableOpacity>
            </View>

            {createType === 'TRANSFER' ? (
              <ScrollView style={{ maxHeight: 220 }}>
                <Text style={styles.inputLabel}>Chọn Yêu Cầu Nhập Hàng (PR) từ Chi Nhánh:</Text>
                {pendingPrs.length === 0 ? (
                  <Text style={styles.emptySub}>Hiện chưa có PR nào ở trạng thái chờ xuất.</Text>
                ) : (
                  pendingPrs.map((pr) => {
                    const prId = pr._id || pr.id;
                    const chosen = selectedPrId === prId;
                    return (
                      <TouchableOpacity
                        key={prId}
                        onPress={() => setSelectedPrId(prId)}
                        style={[styles.prOption, chosen ? styles.prOptionActive : null]}
                      >
                        <Text style={styles.prCode}>{`${pr.prCode} — ${pr.branchName}`}</Text>
                        <Text style={styles.prSub}>{`${pr.items?.length || 0} mặt hàng yêu cầu`}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <View>
                <Text style={styles.inputLabel}>Mã Biên Bản Hội Đồng Tiêu Hủy *</Text>
                <TextInput
                  style={styles.input}
                  value={disposalCode}
                  onChangeText={setDisposalCode}
                  placeholder="VD: BB-HUY-2026-01"
                />
                <Text style={styles.inputLabel}>Số lượng cần hủy</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={disposeQty}
                  onChangeText={setDisposeQty}
                />
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.cancelModalBtn}
              >
                <Text style={styles.cancelModalText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={submittingCreate}
                onPress={() => void handleSubmitCreate()}
                style={styles.submitModalBtn}
              >
                <Text style={styles.submitModalText}>
                  {submittingCreate ? 'Đang gửi...' : 'Tạo & Gửi Duyệt'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  topActionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  createBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  toteBtn: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    gap: 4,
  },
  toteBtnText: { color: '#0284C7', fontWeight: '800', fontSize: 13 },
  reloadBtn: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    gap: 4,
  },
  reloadBtnText: { color: '#0284C7', fontWeight: '800', fontSize: 13 },
  emptyReloadBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  emptyReloadBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  filterScroll: { marginBottom: 12 },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#0284C7' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 10 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  codeText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  destText: { fontSize: 13, fontWeight: '600', color: '#0284C7', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  staleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  picTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7E22CE',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quickPickBtn: {
    marginTop: 10,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickPickText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  quickConfirmBtn: {
    marginTop: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickConfirmText: { color: '#0284C7', fontWeight: '800', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  typeSwitch: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#0284C7' },
  typeText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 8, marginBottom: 6 },
  prOption: { padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', marginBottom: 8 },
  prOptionActive: { backgroundColor: '#E0F2FE' },
  prCode: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  prSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalText: { color: '#475569', fontWeight: '700' },
  submitModalBtn: {
    flex: 1.5,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitModalText: { color: '#FFFFFF', fontWeight: '800' },
});
