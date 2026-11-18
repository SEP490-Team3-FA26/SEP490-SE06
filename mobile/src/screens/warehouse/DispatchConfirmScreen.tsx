// DispatchConfirmScreen.tsx - Bước 3: Bàn Giao Tài Xế & Xác Nhận Trừ Tồn Kho Thật (Giai Đoạn 2)
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { TransferQRModal } from '../../components/warehouse/TransferQRModal';
import { showToast } from '../../components/ui/toastHelper';
import { useDispatchOrder } from '../../hooks/useDispatchOrder';
import { ApiService } from '../../services/api.service';

export const DispatchConfirmScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const orderId: string = route?.params?.orderId || '';
  const { order, loading, submitting, confirmDispatch } = useDispatchOrder(orderId, (fb) => {
    if (fb.type === 'error') showToast.error('Bị chặn xuất kho', fb.message);
    else if (fb.type === 'success') showToast.success('Đã xác nhận xuất', fb.message);
  });

  const [driverName, setDriverName] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [carrierNote, setCarrierNote] = useState<string>('');
  const [transferForQR, setTransferForQR] = useState<any | null>(null);

  const handleDispatchPress = async () => {
    if (!driverName.trim()) {
      showToast.error('Thiếu người nhận', 'Bắt buộc nhập tên tài xế hoặc người nhận bàn giao.');
      return;
    }

    showToast.info('Đang xử lý', 'Hệ thống đang xác nhận xuất kho và trừ tồn kho...');
    const ok = await confirmDispatch({
      driverName: driverName.trim(),
      vehiclePlate: vehiclePlate.trim(),
      carrierNote: carrierNote.trim(),
    });
    if (ok) {
      setTimeout(async () => {
        if (order?.stockTransferId) {
          const list = await ApiService.getStockTransfers();
          const found = list.find((t: any) => (t._id || t.id) === order.stockTransferId);
          if (found) setTransferForQR(found);
        }
      }, 1000);
    }
  };

  const isCompleted = order?.status === 'DISPATCHED' || order?.status === 'PARTIALLY_DISPATCHED';

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <HeaderBar
        title="Xác Nhận Xuất Kho"
        subtitle={order?.dispatchCode || ''}
        gradientVariant="sky"
        leftAction={{ icon: 'arrow-back', onPress: () => navigation.goBack() }}
      />

      {loading && !order ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Tóm Tắt Kiện Hàng Bàn Giao</Text>
            <Text style={styles.summaryBig}>{`${order?.totalPicked ?? 0} Đơn Vị`}</Text>
            <Text style={styles.summarySub}>
              {order?.type === 'DISPOSE'
                ? `Xuất tiêu hủy • Biên bản ${order?.disposalReportCode || 'N/A'}`
                : `Chuyển tới: ${order?.toBranchName || order?.toBranchId || 'Chi nhánh'}`}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông Tin Người Nhận Bàn Giao</Text>

            <Text style={styles.label}>Tên tài xế / Người vận chuyển *</Text>
            <TextInput
              style={styles.input}
              value={driverName}
              onChangeText={setDriverName}
              editable={!isCompleted}
              placeholder="VD: Nguyễn Văn Tài (Xe lạnh GSP #2)"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Biển số xe (nếu có)</Text>
            <TextInput
              style={styles.input}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              editable={!isCompleted}
              placeholder="VD: 51D-889.12"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Ghi chú niêm phong / nhiệt độ thùng</Text>
            <TextInput
              style={styles.input}
              value={carrierNote}
              onChangeText={setCarrierNote}
              editable={!isCompleted}
              placeholder="VD: Đã đồng kiểm đủ niêm phong, nhiệt độ 22°C"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {isCompleted ? (
            <View style={styles.doneCard}>
              <Ionicons name="checkmark-circle" size={32} color="#0284C7" />
              <Text style={styles.doneTitle}>{`Đã Xuất Kho (${order?.status})`}</Text>
              {Boolean(order?.stockTransferCode) ? (
                <Text style={styles.doneSub}>
                  {`Mã vận đơn chuyển kho: ${order?.stockTransferCode} (Tồn chi nhánh chưa tăng tới khi bấm nhận)`}
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={() => navigation.navigate('WarehouseScreen')}
                style={styles.backHomeBtn}
              >
                <Text style={styles.backHomeText}>Quay Về Bảng Điều Khiển Kho</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              disabled={submitting}
              onPress={handleDispatchPress}
              style={[styles.dispatchBtn, submitting ? styles.disabledBtn : null]}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.dispatchBtnText}>
                {submitting ? 'ĐANG XỬ LÝ XUẤT...' : 'XÁC NHẬN XUẤT KHO & TRỪ TỒN THẬT'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <TransferQRModal
        visible={Boolean(transferForQR)}
        onClose={() => setTransferForQR(null)}
        transfer={transferForQR}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#0369A1',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  summaryTitle: { color: '#BAE6FD', fontSize: 12, fontWeight: '700' },
  summaryBig: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginVertical: 4 },
  summarySub: { color: '#E0F2FE', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  dispatchBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledBtn: { backgroundColor: '#94A3B8' },
  dispatchBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  doneCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  doneTitle: { fontSize: 18, fontWeight: '800', color: '#0284C7', marginTop: 8 },
  doneSub: { fontSize: 13, color: '#0369A1', textAlign: 'center', marginTop: 6 },
  backHomeBtn: {
    marginTop: 14,
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backHomeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
