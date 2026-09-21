// TransferQRModal.tsx - Modal generating & displaying Dispatch QR for Stock Transfers
import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Clipboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { showToast } from '../ui/toastHelper';
import { StockTransfer } from '../../types/pharmacy.types';

interface TransferQRModalProps {
  visible: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
}

export const TransferQRModal: React.FC<TransferQRModalProps> = ({
  visible,
  onClose,
  transfer,
}) => {
  if (!transfer) return null;

  const transferCode = transfer.transferCode || transfer.id || 'ST-2026-001';

  // Construct structured QR payload
  const qrPayload = JSON.stringify({
    type: 'STOCK_TRANSFER',
    transferCode: transferCode,
    id: transfer.id || transfer._id,
    fromBranchId: transfer.fromBranchId,
    toBranchId: transfer.toBranchId,
    itemCount: transfer.items?.length || 0,
  });

  const handleCopyCode = () => {
    Clipboard.setString(transferCode);
    showToast.success('Đã sao chép', `Đã chép mã phiếu: ${transferCode}`);
  };

  const totalQty = (transfer.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="qr-code" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Mã QR Phiếu Xuất Kho</Text>
                <Text style={styles.headerSub}>Dán Kiện Hàng & Xác Nhận Nhận Hàng</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* QR Container */}
            <View style={styles.qrWrapper}>
              <View style={styles.qrInner}>
                <QRCode
                  value={qrPayload}
                  size={190}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={styles.qrCodeText}>{transferCode}</Text>
              <Text style={styles.qrHelpText}>
                Chi nhánh nhận dùng Camera trên Mobile quét mã này để xác nhận nhập kho tức thì.
              </Text>
            </View>

            {/* Transfer Metadata */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Nơi xuất hàng:</Text>
                <Text style={styles.metaValue}>
                  {transfer.fromBranchId === 'CENTRAL_WH' ? 'Kho Tổng GSP Trung Tâm' : transfer.fromBranchName || transfer.fromBranchId}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Nơi nhận hàng:</Text>
                <Text style={[styles.metaValue, { color: '#0284C7', fontWeight: 'bold' }]}>
                  {transfer.toBranchName || transfer.toBranchId}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tổng số mặt hàng:</Text>
                <Text style={styles.metaValue}>{transfer.items?.length || 0} loại thuốc ({totalQty} đơn vị)</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Trạng thái:</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{transfer.status || 'SHIPPING'}</Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={16} color="#0284C7" />
                <Text style={styles.copyBtnText}>Sao Chép Mã Phiếu</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeActionBtn}>
                <Text style={styles.closeActionBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
  },
  qrWrapper: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  qrInner: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  qrCodeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'monospace',
    marginTop: 12,
    letterSpacing: 1,
  },
  qrHelpText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  metaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
    gap: 6,
  },
  copyBtnText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: 'bold',
  },
  closeActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
