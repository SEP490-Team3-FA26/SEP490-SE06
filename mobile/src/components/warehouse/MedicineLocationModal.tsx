/**
 * MedicineLocationModal.tsx
 * Modal hiển thị vị trí chuẩn GSP của thuốc trên sơ đồ kho 3D sau khi quét mã Barcode
 * Cho phép chuyển nhanh đến vị trí kệ 3D hoặc bắt đầu kiểm kê thuốc ngay lập tức.
 * Tuân thủ chuẩn WDP301/SEP490 Playbook v2.0 - Chú thích Tiếng Việt 100%.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatWarehouseLocationLabel } from '../../services/inventoryCheckHelper';

interface MedicineLocationModalProps {
  visible: boolean;
  onClose: () => void;
  medicine: {
    id?: string;
    _id?: string;
    name: string;
    category?: string;
    sku?: string;
    barcode?: string;
    image?: string;
    image_url?: string;
    stock?: number;
    unit?: string;
    fefoBatch?: {
      batchNo?: string;
      expDate?: string;
      stock?: number;
      location?: {
        zone: string;
        rack: string;
        shelf: number;
      };
    };
    location?: {
      zone: string;
      rack: string;
      shelf: number;
    };
  } | null;
  onLocateOn3DMap: (location: { zone: string; rack: string; shelf: number }) => void;
  onStartCheckMedicine?: (medicine: any, location: { zone: string; rack: string; shelf: number }) => void;
}

export const MedicineLocationModal: React.FC<MedicineLocationModalProps> = ({
  visible,
  onClose,
  medicine,
  onLocateOn3DMap,
  onStartCheckMedicine,
}) => {
  if (!medicine) return null;

  const loc = medicine.location || medicine.fefoBatch?.location || { zone: 'A', rack: 'A1', shelf: 1 };
  const locationLabel = formatWarehouseLocationLabel(loc);
  const fefoBatch = medicine.fefoBatch;
  const imageUri = medicine.image || medicine.image_url;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.badge3D}>
                <Ionicons name="cube" size={14} color="#38BDF8" />
                <Text style={styles.badge3DText}>Vị Trí Sơ Đồ Kho 3D GSP</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Medicine Info Header */}
          <View style={styles.medicineCard}>
            <View style={styles.avatarBox}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.medImg} />
              ) : (
                <View style={styles.placeholderImg}>
                  <Ionicons name="medkit" size={26} color="#0284C7" />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.medName} numberOfLines={2}>
                {medicine.name}
              </Text>
              <Text style={styles.medCategory}>{medicine.category || 'Dược phẩm thiết yếu'}</Text>

              <View style={styles.codeRow}>
                <View style={styles.codePill}>
                  <Text style={styles.codeLabel}>SKU: </Text>
                  <Text style={styles.codeVal}>{medicine.sku || 'N/A'}</Text>
                </View>
                <View style={[styles.codePill, { borderColor: '#38BDF8' }]}>
                  <Ionicons name="barcode-outline" size={12} color="#0284C7" />
                  <Text style={[styles.codeVal, { color: '#0284C7' }]}>{medicine.barcode || 'Chưa gán'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3D Location Coordinates Box */}
          <View style={styles.locationContainer}>
            <View style={styles.locHeaderRow}>
              <Ionicons name="navigate-circle" size={18} color="#0284C7" />
              <Text style={styles.locSectionTitle}>Tọa Độ Lưu Trữ Thực Tế</Text>
            </View>

            <View style={styles.locGrid}>
              <View style={[styles.locBlock, { borderColor: '#0284C7', backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                <Text style={styles.locBlockLabel}>PHÂN KHU</Text>
                <Text style={[styles.locBlockVal, { color: '#0284C7' }]}>Khu {loc.zone}</Text>
              </View>
              <View style={[styles.locBlock, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Text style={styles.locBlockLabel}>KỆ HÀNG</Text>
                <Text style={[styles.locBlockVal, { color: '#D97706' }]}>Kệ {loc.rack}</Text>
              </View>
              <View style={[styles.locBlock, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Text style={styles.locBlockLabel}>TẦNG LƯU TRỮ</Text>
                <Text style={[styles.locBlockVal, { color: '#059669' }]}>Tầng {loc.shelf}</Text>
              </View>
            </View>

            <View style={styles.summaryBar}>
              <Ionicons name="location-sharp" size={16} color="#0284C7" />
              <Text style={styles.summaryText}>{locationLabel}</Text>
            </View>
          </View>

          {/* FEFO Lot & Stock Info */}
          <View style={styles.stockInfoCard}>
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>Tồn khả dụng:</Text>
              <Text style={styles.stockVal}>
                {(fefoBatch ? fefoBatch.stock : medicine.stock || 0).toLocaleString('vi-VN')} {medicine.unit || 'Hộp'}
              </Text>
            </View>
            {fefoBatch?.batchNo && (
              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>Lô ưu tiên xuất (FEFO):</Text>
                <Text style={[styles.stockVal, { color: '#0284C7', fontWeight: 'bold' }]}>
                  {fefoBatch.batchNo} {fefoBatch.expDate ? `(HSD: ${new Date(fefoBatch.expDate).toLocaleDateString('vi-VN')})` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => {
                onClose();
                onLocateOn3DMap(loc);
              }}
              style={styles.primary3DBtn}
            >
              <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primary3DBtnText}>Xem Trên Sơ Đồ 3D</Text>
            </TouchableOpacity>

            {onStartCheckMedicine && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onStartCheckMedicine(medicine, loc);
                }}
                style={styles.secondaryCheckBtn}
              >
                <Ionicons name="clipboard-outline" size={18} color="#0284C7" />
                <Text style={styles.secondaryCheckBtnText}>Kiểm Kê Thuốc Này</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer Close */}
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge3D: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  badge3DText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  medName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  medCategory: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  codeLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  codeVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  locationContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  locHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0369A1',
    textTransform: 'uppercase',
  },
  locGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  locBlock: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  locBlockLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  locBlockVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  stockInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  stockLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  stockVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  primary3DBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primary3DBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryCheckBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
  },
  secondaryCheckBtnText: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});

