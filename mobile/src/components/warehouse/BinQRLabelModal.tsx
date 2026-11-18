// BinQRLabelModal.tsx - Hiển thị & In Tem Mã QR Vị Trí Khay Kệ (BIN-{zone}-{rack}-S{shelf}-B{bin})
import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { showToast } from '../ui/toastHelper';

interface BinQRLabelModalProps {
  visible: boolean;
  onClose: () => void;
  zone: string;
  rack: string;
  shelf: number;
  bin: number;
  medicineName?: string;
}

/**
 * Modal hiển thị tem QR chuẩn vị trí ô khay để dán lên kệ kho hoặc test quét camera trên Mobile
 */
export const BinQRLabelModal: React.FC<BinQRLabelModalProps> = ({
  visible,
  onClose,
  zone,
  rack,
  shelf,
  bin,
  medicineName,
}) => {
  const binCode = `BIN-${String(zone || 'A').toUpperCase()}-${String(rack || 'A1').toUpperCase()}-S${Number(shelf || 1)}-B${Number(bin || 1)}`;

  const handleCopy = () => {
    Clipboard.setString(binCode);
    showToast.success('Đã sao chép', `Đã chép mã khay ${binCode}`);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="qr-code-outline" size={16} color="#0284C7" />
              <Text style={styles.badgeText}>TEM MÃ QR KHAY KỆ GSP</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.qrBox}>
            <QRCode value={binCode} size={180} color="#0F172A" backgroundColor="#FFFFFF" />
            <Text style={styles.binCodeText}>{binCode}</Text>
            {Boolean(medicineName) ? (
              <Text style={styles.medNameText} numberOfLines={2}>
                {medicineName}
              </Text>
            ) : null}
            <Text style={styles.hintText}>
              Thủ kho quét tem này ở Bước 1 trước khi quét GS1 hộp thuốc.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
              <Ionicons name="copy-outline" size={16} color="#0284C7" />
              <Text style={styles.copyText}>Sao chép mã</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  badgeText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  binCodeText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  medNameText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#0284C7',
    textAlign: 'center',
  },
  hintText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  copyText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 14,
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
