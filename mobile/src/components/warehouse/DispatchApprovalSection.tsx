// DispatchApprovalSection.tsx - Khối Phê Duyệt Lệnh Xuất Kho Dùng Chung Cho Giám Đốc & Dược Sĩ PIC
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DispatchMobileService } from '../../services/inventory/dispatch.service';
import { SocketService } from '../../services/socket.service';
import { DispatchOrder } from '../../types/pharmacy.types';
import { showToast } from '../ui/toastHelper';

interface DispatchApprovalSectionProps {
  mode: 'DIRECTOR' | 'PIC_PHARMACIST';
  currentUserId?: string;
}

/**
 * Hiển thị các phiếu xuất kho đang ở trạng thái PENDING_APPROVAL phù hợp với vai trò:
 * - DIRECTOR: duyệt chuyển kho thuốc thường & phiếu xuất hủy (DISPOSE). Thuốc đặc biệt chỉ hiển thị khóa chờ PIC.
 * - PIC_PHARMACIST: duyệt thuốc kiểm soát đặc biệt (hasControlledDrugs = true) & phiếu xuất hủy.
 */
export const DispatchApprovalSection: React.FC<DispatchApprovalSectionProps> = ({
  mode,
  currentUserId,
}) => {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [rejectModalOrder, setRejectModalOrder] = useState<DispatchOrder | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [busyId, setBusyId] = useState<string>('');

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const list = await DispatchMobileService.getDispatchOrders({ status: 'PENDING_APPROVAL' });
      const filtered = list.filter((o) => {
        if (mode === 'PIC_PHARMACIST') {
          return o.hasControlledDrugs || o.type === 'DISPOSE';
        }
        return true;
      });
      setOrders(filtered);
    } catch (e: any) {
      console.warn('Lỗi tải phiếu xuất chờ duyệt:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadPending();
    const unsub = SocketService.subscribe((n) => {
      if (['DISPATCH_CREATED', 'DISPATCH_APPROVED', 'DISPATCH_UPDATED'].includes(n?.type)) {
        void loadPending();
      } else if (n?.type === 'DISPATCH_ACTION_REJECTED') {
        showToast.error('Từ chối bởi hệ thống', n?.reason || 'Không đủ thẩm quyền duyệt.');
        void loadPending();
      }
    });
    return unsub;
  }, [loadPending]);

  const handleApprove = async (order: DispatchOrder) => {
    if (currentUserId && String(order.createdBy) === String(currentUserId)) {
      showToast.error('Kiểm soát 2 người', 'Bạn là người lập phiếu nên không được tự phê duyệt.');
      return;
    }
    try {
      setBusyId(order._id);
      await DispatchMobileService.approveDispatchOrder(order._id, `Duyệt bởi ${mode}`);
      showToast.success('Đã gửi phê duyệt', `Phiếu ${order.dispatchCode} đang được mở khóa cho Thủ kho.`);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      setTimeout(() => void loadPending(), 700);
    } catch (e: any) {
      showToast.error('Lỗi duyệt phiếu', e?.message);
    } finally {
      setBusyId('');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    if (!rejectReason.trim()) {
      showToast.error('Thiếu lý do', 'Bắt buộc nhập lý do khi từ chối phiếu.');
      return;
    }
    try {
      setBusyId(rejectModalOrder._id);
      await DispatchMobileService.rejectDispatchOrder(rejectModalOrder._id, rejectReason.trim());
      showToast.info('Đã từ chối', `Phiếu ${rejectModalOrder.dispatchCode} đã chuyển sang hủy.`);
      setRejectModalOrder(null);
      setRejectReason('');
      setTimeout(() => void loadPending(), 700);
    } catch (e: any) {
      showToast.error('Lỗi từ chối', e?.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {mode === 'PIC_PHARMACIST'
            ? `Duyệt Xuất Thuốc Đặc Biệt / Hủy (PIC) (${orders.length})`
            : `Phiếu Xuất Kho Chờ Giám Đốc Duyệt (${orders.length})`}
        </Text>
        <TouchableOpacity onPress={() => void loadPending()} style={styles.reloadChip}>
          <Ionicons name="refresh" size={14} color="#0284C7" />
          <Text style={styles.reloadText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator size="small" color="#0284C7" />
          <Text style={styles.emptySub}>Đang tải danh sách phiếu chờ duyệt...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={38} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Không có phiếu xuất nào chờ duyệt</Text>
          <Text style={styles.emptySub}>Mọi phiếu xuất đủ điều kiện đều đã được xử lý.</Text>
        </View>
      ) : (
        orders.map((order) => {
          const isControlledLockedForDirector =
            mode === 'DIRECTOR' && Boolean(order.hasControlledDrugs);
          const isSelfCreated = Boolean(currentUserId && String(order.createdBy) === String(currentUserId));
          return (
            <View key={order._id || order.dispatchCode} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeText}>{order.dispatchCode}</Text>
                  <Text style={styles.metaText}>
                    {order.type === 'DISPOSE'
                      ? `Xuất Hủy • Biên bản: ${order.disposalReportCode || 'N/A'}`
                      : `Chuyển tới: ${order.toBranchName || order.toBranchId || 'Chi nhánh'}`}
                  </Text>
                  <Text style={styles.metaSub}>
                    {`Người lập: ${order.createdByName || order.createdBy} • ${order.pickingList?.length || 0} dòng FEFO`}
                  </Text>
                </View>

                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: order.hasControlledDrugs ? '#F3E8FF' : '#F0F9FF' },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      { color: order.hasControlledDrugs ? '#7E22CE' : '#0284C7' },
                    ]}
                  >
                    {order.hasControlledDrugs
                      ? 'KIỂM SOÁT ĐẶC BIỆT'
                      : order.type === 'DISPOSE'
                      ? 'XUẤT HỦY'
                      : 'THUỐC THƯỜNG'}
                  </Text>
                </View>
              </View>

              {/* Danh sách tóm tắt thuốc */}
              <View style={styles.itemsBox}>
                {(order.pickingList || []).slice(0, 3).map((line) => (
                  <Text key={line.lineId} style={styles.itemText} numberOfLines={1}>
                    {`• ${line.medicineName}: ${line.requestedQty} ${line.unit} (Lô ${line.batchNo})`}
                  </Text>
                ))}
                {(order.pickingList?.length || 0) > 3 ? (
                  <Text style={styles.moreText}>{`+ ${(order.pickingList?.length || 0) - 3} dòng khác...`}</Text>
                ) : null}
              </View>

              {isControlledLockedForDirector ? (
                <View style={styles.lockBox}>
                  <Ionicons name="lock-closed" size={14} color="#7E22CE" />
                  <Text style={styles.lockText}>
                    Phiếu chứa thuốc kiểm soát đặc biệt — chỉ Dược sĩ phụ trách chuyên môn (PIC) được duyệt.
                  </Text>
                </View>
              ) : isSelfCreated ? (
                <View style={styles.lockBox}>
                  <Ionicons name="person-remove-outline" size={14} color="#DC2626" />
                  <Text style={[styles.lockText, { color: '#DC2626' }]}>
                    Bạn là người lập phiếu này (Kiểm soát 2 người chặn tự duyệt).
                  </Text>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    disabled={busyId === order._id}
                    onPress={() => setRejectModalOrder(order)}
                    style={styles.rejectBtn}
                  >
                    <Text style={styles.rejectText}>Từ Chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={busyId === order._id}
                    onPress={() => void handleApprove(order)}
                    style={styles.approveBtn}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.approveText}>
                      {busyId === order._id ? 'Đang gửi...' : 'Phê Duyệt Xuất'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Modal nhập lý do từ chối bắt buộc */}
      <Modal visible={Boolean(rejectModalOrder)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Từ Chối Phiếu {rejectModalOrder?.dispatchCode}</Text>
            <Text style={styles.modalSub}>Vui lòng ghi rõ lý do từ chối để Thủ kho nắm thông tin:</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="VD: Số lượng đề xuất vượt định mức chi nhánh..."
              multiline
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => {
                  setRejectModalOrder(null);
                  setRejectReason('');
                }}
                style={styles.rejectBtn}
              >
                <Text style={styles.rejectText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleConfirmReject()}
                style={[styles.approveBtn, { backgroundColor: '#DC2626' }]}
              >
                <Text style={styles.approveText}>Xác Nhận Từ Chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', flex: 1 },
  reloadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  reloadText: { color: '#0284C7', fontWeight: '700', fontSize: 12 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 10 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  codeText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  metaText: { fontSize: 13, fontWeight: '600', color: '#0284C7', marginTop: 2 },
  metaSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  itemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  itemText: { fontSize: 13, color: '#334155', marginBottom: 2 },
  moreText: { fontSize: 12, color: '#0284C7', fontWeight: '700', marginTop: 2 },
  lockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  lockText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#7E22CE' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  approveBtn: {
    flex: 1.6,
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 10 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
});
