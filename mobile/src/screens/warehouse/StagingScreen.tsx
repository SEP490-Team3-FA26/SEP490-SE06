// StagingScreen.tsx - Tập Kết & Đối Chiếu Giỏ Gom Hàng (Tote) tại Khu Bàn Giao (DISPATCH-AREA-01)
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
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';
import { showToast } from '../../components/ui/toastHelper';
import { useDispatchOrder } from '../../hooks/useDispatchOrder';
import { parseToteQRCode } from '../../utils/gs1Parser';

export const StagingScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const orderId: string = route?.params?.orderId || '';
  const { order, loading, submitting, stageOrder, reload } = useDispatchOrder(orderId, (fb) => {
    if (fb.type === 'error') showToast.error('Lỗi tập kết', fb.message);
    else if (fb.type === 'success') showToast.success('Hoàn tất tập kết', fb.message);
  });

  const [scannedTote, setScannedTote] = useState<string>('');
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);

  const expectedTotes = order?.toteCodes || (order?.toteCode ? [order.toteCode] : []);

  const handleToteScanned = (raw: string) => {
    const parsed = parseToteQRCode(raw);
    if (!parsed.valid || !parsed.toteCode) {
      showToast.error('Sai mã Tote', parsed.error || 'Mã không hợp lệ.');
      return;
    }
    if (!expectedTotes.includes(parsed.toteCode)) {
      showToast.error('Không đúng giỏ của phiếu', `Phiếu này dùng ${expectedTotes.join(', ')}`);
      return;
    }
    setScannedTote(parsed.toteCode);
    showToast.success('Khớp giỏ hàng', `Đã nhận diện ${parsed.toteCode} tại khu bàn giao`);
  };

  const handleConfirmStage = async () => {
    const targetTote = scannedTote.trim().toUpperCase();
    if (!targetTote) {
      showToast.error('Chưa quét giỏ', 'Hãy quét mã QR trên giỏ gom hàng trước.');
      return;
    }
    const ok = await stageOrder(targetTote);
    if (ok) {
      setTimeout(() => {
        navigation.navigate('DispatchConfirmScreen', { orderId });
      }, 700);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <HeaderBar
        title="Tập Kết Bàn Giao"
        subtitle={order?.dispatchCode ? `${order.dispatchCode} • DISPATCH-AREA-01` : 'DISPATCH-AREA-01'}
        gradientVariant="sky"
        leftAction={{ icon: 'arrow-back', onPress: () => navigation.goBack() }}
      />

      {loading && !order ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Quét Mã Giỏ Gom Hàng Tại Cửa Kho</Text>
            <Text style={styles.cardSub}>
              {`Giỏ thuộc phiếu: ${expectedTotes.join(', ') || 'Chưa gắn giỏ'}`}
            </Text>

            <TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanBtn}>
              <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
              <Text style={styles.scanBtnText}>
                {scannedTote ? `ĐÃ QUÉT: ${scannedTote}` : 'MỞ CAMERA QUÉT MÃ TOTE'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={scannedTote}
              onChangeText={(t) => setScannedTote(t.toUpperCase())}
              placeholder="Hoặc nhập mã giỏ (VD: TOTE-01)"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Đối Chiếu Danh Sách Thuốc Trong Giỏ</Text>
            {(order?.pickingList || []).map((line) => (
              <View key={line.lineId} style={styles.lineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{line.medicineName}</Text>
                  <Text style={styles.metaText}>{`Lô: ${line.batchNo} • Khay: ${line.suggestedLocation.binCode}`}</Text>
                </View>
                <View style={styles.qtyBox}>
                  <Text style={styles.qtyVal}>{`${line.pickedQty}/${line.requestedQty}`}</Text>
                  <Text
                    style={[
                      styles.statusLabel,
                      { color: line.itemStatus === 'SHORTAGE' ? '#D97706' : '#0284C7' },
                    ]}
                  >
                    {line.itemStatus}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('PickingScreen', { orderId })}
            style={styles.backToPickBtn}
          >
            <Ionicons name="return-up-back-outline" size={18} color="#D97706" />
            <Text style={styles.backToPickText}>Phát hiện hàng lỗi / Cần trả lại kệ?</Text>
          </TouchableOpacity>

          {order?.status === 'STAGED' ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('DispatchConfirmScreen', { orderId })}
              style={styles.confirmBtn}
            >
              <Text style={styles.confirmBtnText}>SANG BƯỚC XÁC NHẬN XUẤT KHO</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              disabled={submitting || !scannedTote}
              onPress={() => void handleConfirmStage()}
              style={[styles.confirmBtn, (!scannedTote || submitting) ? styles.disabledBtn : null]}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                {submitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN TẬP KẾT (STAGED)'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => void reload()} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Tải lại dữ liệu mới nhất</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleToteScanned}
        mode="QR"
        title="Quét Mã Giỏ Gom Hàng (Tote)"
        subtitle="Đưa mã QR dán trên thành giỏ vào khung ngắm"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
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
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  scanBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  scanBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  medName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  metaText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  qtyBox: { alignItems: 'flex-end', marginLeft: 12 },
  qtyVal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statusLabel: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  backToPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  backToPickText: { color: '#D97706', fontWeight: '700', fontSize: 13 },
  confirmBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledBtn: { backgroundColor: '#94A3B8' },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  refreshBtn: { alignItems: 'center', marginTop: 14 },
  refreshText: { color: '#0284C7', fontWeight: '700', fontSize: 13 },
});
