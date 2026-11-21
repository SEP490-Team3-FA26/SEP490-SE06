// ToteManagerModal.tsx - Hiển thị danh sách Giỏ Gom Hàng (Tote) và mã QR để quét khi nhặt/bàn giao
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { DispatchMobileService } from '../../services/inventory/dispatch.service';
import { ToteItem } from '../../types/pharmacy.types';

interface ToteManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTote?: (toteCode: string) => void;
}

/**
 * Modal hiển thị tất cả Giỏ Gom Hàng (TOTE-01..10) kèm mã QR để thủ kho quét thật hoặc chọn nhanh
 */
export const ToteManagerModal: React.FC<ToteManagerModalProps> = ({
  visible,
  onClose,
  onSelectTote,
}) => {
  const [totes, setTotes] = useState<ToteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [qrToteCode, setQrToteCode] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      void loadTotes();
    }
  }, [visible]);

  const loadTotes = async () => {
    try {
      setLoading(true);
      const data = await DispatchMobileService.getTotes();
      setTotes(data);
    } catch (e) {
      console.warn('Không tải được danh sách Tote:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Giỏ Gom Hàng (Tote)</Text>
              <Text style={styles.subtitle}>Quét hoặc chọn giỏ trống để gắn với phiếu xuất</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Đang tải danh sách Tote...</Text>
            </View>
          ) : totes.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="basket-outline" size={44} color="#94A3B8" />
              <Text style={styles.loadingText}>Chưa có dữ liệu Tote. Hãy chạy script migration v6.0.</Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {totes.map((t) => {
                const isAvailable = t.status === 'AVAILABLE';
                return (
                  <View key={t._id || t.toteCode} style={styles.toteCard}>
                    <View style={styles.toteRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.toteCode}>{t.toteCode}</Text>
                        <Text style={styles.toteLabel}>{t.label || 'Giỏ nhựa kho tổng'}</Text>
                        {Boolean(t.currentDispatchCode) ? (
                          <Text style={styles.toteOrderText}>
                            Đang dùng cho phiếu: {t.currentDispatchCode}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isAvailable ? '#F0F9FF' : '#FFFBEB' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: isAvailable ? '#0284C7' : '#D97706' },
                          ]}
                        >
                          {isAvailable ? 'ĐANG RẢNH' : 'ĐANG DÙNG'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.toteActions}>
                      <TouchableOpacity
                        onPress={() => setQrToteCode(t.toteCode)}
                        style={styles.qrBtn}
                      >
                        <Ionicons name="qr-code-outline" size={16} color="#0284C7" />
                        <Text style={styles.qrBtnText}>Hiện QR</Text>
                      </TouchableOpacity>

                      {onSelectTote && isAvailable ? (
                        <TouchableOpacity
                          onPress={() => {
                            onSelectTote(t.toteCode);
                            onClose();
                          }}
                          style={styles.pickBtn}
                        >
                          <Text style={styles.pickBtnText}>Chọn Giỏ Này</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {qrToteCode ? (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setQrToteCode(null)}>
          <View style={styles.qrOverlay}>
            <View style={styles.qrModalCard}>
              <Text style={styles.qrTitle}>Mã QR Giỏ {qrToteCode}</Text>
              <View style={styles.qrInner}>
                <QRCode value={qrToteCode} size={190} color="#0F172A" backgroundColor="#FFFFFF" />
              </View>
              <Text style={styles.qrSub}>Dùng camera khi nhặt hoặc tập kết để quét mã này.</Text>
              <TouchableOpacity onPress={() => setQrToteCode(null)} style={styles.qrCloseBtn}>
                <Text style={styles.qrCloseText}>Đóng QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
  },
  scroll: {
    marginBottom: 12,
  },
  toteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toteCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  toteLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  toteOrderText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toteActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  qrBtnText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  pickBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  qrTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  qrInner: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
  },
  qrSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 14,
  },
  qrCloseBtn: {
    width: '100%',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
