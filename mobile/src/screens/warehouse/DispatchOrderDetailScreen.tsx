// DispatchOrderDetailScreen.tsx - Chi Tiết Phiếu Xuất Kho & Điều Hướng Từng Bước
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { showToast } from '../../components/ui/toastHelper';
import { useDispatchOrder } from '../../hooks/useDispatchOrder';
import { DispatchMobileService } from '../../services/inventory/dispatch.service';

export const DispatchOrderDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const orderId: string = route?.params?.orderId || '';
  const { order, loading, reload } = useDispatchOrder(orderId);

  const handleOpenPicking = async () => {
    if (!order) return;
    try {
      const perm = await Camera.getCameraPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) {
        await Camera.requestCameraPermissionsAsync();
      }
    } catch (e: any) {
      console.warn('[DispatchOrderDetailScreen] Lỗi xin quyền camera:', e?.message);
    }
    navigation.navigate('PickingScreen', { orderId: order._id });
  };

  const handleCancelOrder = () => {
    if (!order) return;
    if (order.totalPicked > 0) {
      showToast.error(
        'Không thể hủy phiếu',
        `Đang có ${order.totalPicked} hộp trong giỏ. Phải trả hết hàng về kệ trước khi hủy.`,
      );
      return;
    }

    Alert.alert('Hủy Phiếu Xuất Kho', `Xác nhận hủy phiếu ${order.dispatchCode}?`, [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy Phiếu',
        style: 'destructive',
        onPress: async () => {
          try {
            await DispatchMobileService.cancelDispatchOrder(order._id, 'Thủ kho hủy trên Mobile');
            showToast.success('Đã tiếp nhận hủy', 'Đang cập nhật trạng thái phiếu...');
            setTimeout(() => void reload(), 700);
          } catch (e: any) {
            showToast.error('Lỗi hủy phiếu', e?.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <HeaderBar
        title={order?.dispatchCode || 'Chi Tiết Phiếu Xuất'}
        subtitle={
          order?.type === 'DISPOSE'
            ? `Xuất hủy • BB ${order?.disposalReportCode || ''}`
            : `Chuyển tới: ${order?.toBranchName || order?.toBranchId || 'Kho'}`
        }
        gradientVariant="sky"
        leftAction={{ icon: 'arrow-back', onPress: () => navigation.goBack() }}
      />

      {loading && !order ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : order ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Banner cảnh báo kiểm soát đặc biệt / phiếu treo */}
          {order.hasControlledDrugs ? (
            <View style={styles.controlledBanner}>
              <Ionicons name="shield-checkmark" size={18} color="#9333EA" />
              <Text style={styles.controlledText}>
                Thuốc Kiểm Soát Đặc Biệt • Bắt buộc Dược sĩ chuyên môn (PIC) duyệt
              </Text>
            </View>
          ) : null}

          {order.isStale ? (
            <View style={styles.staleBanner}>
              <Ionicons name="time" size={18} color="#D97706" />
              <Text style={styles.staleText}>
                Cảnh báo Phiếu Treo &gt; 4 giờ: Hàng vẫn giữ chỗ trong giỏ, cần hoàn tất nhặt hoặc trả về kệ.
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.statusHeader}>
              <Text style={styles.cardTitle}>Trạng Thái Hiện Tại</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{order.status}</Text>
              </View>
            </View>

            <Text style={styles.metaLine}>{`Người lập: ${order.createdByName || order.createdBy}`}</Text>
            {Boolean(order.approvedByName) ? (
              <Text style={styles.metaLine}>{`Người duyệt: ${order.approvedByName}`}</Text>
            ) : null}
            {Boolean(order.toteCodes?.length) ? (
              <Text style={styles.metaLine}>{`Giỏ đang gắn: ${order.toteCodes.join(', ')}`}</Text>
            ) : null}
            <Text style={styles.metaLine}>{`Tổng đã giữ trong giỏ: ${order.totalPicked} đơn vị`}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Danh Sách Nhặt Hàng (FEFO)</Text>
            {order.pickingList.map((line) => (
              <View key={line.lineId} style={styles.lineItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.binTag}>{line.suggestedLocation.binCode}</Text>
                  <Text style={styles.medName}>{line.medicineName}</Text>
                  <Text style={styles.metaLine}>
                    {`Lô ${line.batchNo} • HSD ${new Date(line.expDate).toLocaleDateString('vi-VN')}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.qtyText}>{`${line.pickedQty}/${line.requestedQty}`}</Text>
                  <Text style={styles.statusSub}>{line.itemStatus}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Nút điều hướng hành động theo đúng trạng thái máy trạng thái */}
          {(order.status === 'APPROVED' || order.status === 'PICKING') ? (
            <TouchableOpacity
              onPress={() => void handleOpenPicking()}
              style={styles.primaryBtn}
            >
              <Ionicons name="scan" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                {order.status === 'APPROVED' ? 'BẮT ĐẦU QUÉT NHẶT HÀNG' : 'TIẾP TỤC NHẶT HÀNG'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {order.status === 'PICKING' && order.totalPicked > 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('StagingScreen', { orderId: order._id })}
              style={styles.secondaryBtn}
            >
              <Ionicons name="cube-outline" size={18} color="#0284C7" />
              <Text style={styles.secondaryBtnText}>ĐI ĐẾN KHU BÀN GIAO (TẬP KẾT)</Text>
            </TouchableOpacity>
          ) : null}

          {order.status === 'STAGED' ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('DispatchConfirmScreen', { orderId: order._id })}
              style={styles.primaryBtn}
            >
              <Ionicons name="send-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>BÀN GIAO & XÁC NHẬN XUẤT KHO</Text>
            </TouchableOpacity>
          ) : null}

          {!['DISPATCHED', 'PARTIALLY_DISPATCHED', 'CANCELLED'].includes(order.status) ? (
            <TouchableOpacity onPress={handleCancelOrder} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Hủy Phiếu Xuất (Chỉ khi giỏ trống = 0)</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  controlledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  controlledText: { flex: 1, color: '#7E22CE', fontWeight: '700', fontSize: 12 },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  staleText: { flex: 1, color: '#B45309', fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statusPill: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: { color: '#0284C7', fontWeight: '800', fontSize: 12 },
  metaLine: { fontSize: 13, color: '#475569', marginTop: 3 },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  binTag: { fontSize: 12, fontWeight: '800', color: '#0284C7' },
  medName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  qtyText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statusSub: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 },
  primaryBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  secondaryBtn: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  secondaryBtnText: { color: '#0284C7', fontWeight: '800', fontSize: 14 },
  cancelBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
});
