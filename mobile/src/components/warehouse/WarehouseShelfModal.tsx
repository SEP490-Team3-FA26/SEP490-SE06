// WarehouseShelfModal.tsx - Modal viewing detail of a specific shelf in Warehouse Map
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
import { ApiService } from '../../services/api.service';

interface WarehouseShelfModalProps {
  visible: boolean;
  onClose: () => void;
  zone: string;
  rack: string;
  shelf: number;
  onSelectMedicine?: (medicine: any) => void;
}

export const WarehouseShelfModal: React.FC<WarehouseShelfModalProps> = ({
  visible,
  onClose,
  zone,
  rack,
  shelf,
  onSelectMedicine,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [shelfData, setShelfData] = useState<any>(null);

  useEffect(() => {
    if (visible && zone && rack && shelf) {
      loadShelfDetail();
    }
  }, [visible, zone, rack, shelf]);

  const loadShelfDetail = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getShelfDetail(zone, rack, shelf);
      setShelfData(res);
    } catch (e) {
      console.warn('Error loading shelf detail:', e);
    } finally {
      setLoading(false);
    }
  };

  const batches = shelfData?.batches || [];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Khu {zone} · Kệ {rack} · Tầng {shelf}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Chi Tiết Thuốc Trên Tầng Kệ</Text>
          <Text style={styles.subtitle}>
            Quản lý tồn kho theo chuẩn GSP · Định vị theo vị trí Zone / Kệ / Tầng
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Đang tải dữ liệu kệ hàng...</Text>
            </View>
          ) : batches.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="cube-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Tầng kệ này hiện đang trống hoặc chưa xếp hàng.</Text>
            </View>
          ) : (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {batches.map((item: any, idx: number) => {
                const batchList = Array.isArray(item.batches) ? item.batches : [];
                return (
                  <View key={`shelf-med-${idx}`} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.medName}>{item.name}</Text>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{item.category || 'Thuốc'}</Text>
                      </View>
                    </View>

                    <View style={styles.metaGrid}>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Mã SKU:</Text>
                        <Text style={styles.metaVal}>{item.sku || 'N/A'}</Text>
                      </View>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Barcode GS1:</Text>
                        <Text style={[styles.metaVal, { color: '#0284C7' }]}>{item.barcode || 'Chưa gán'}</Text>
                      </View>
                    </View>

                    {/* Batches inside this shelf */}
                    <Text style={styles.batchSectionTitle}>Các Lô Thuốc Lưu Tại Kệ:</Text>
                    {batchList.map((b: any, bIdx: number) => (
                      <View key={`b-${bIdx}`} style={styles.batchPill}>
                        <View>
                          <Text style={styles.batchNo}>Số Lô: {b.batchNo}</Text>
                          <Text style={styles.expDate}>
                            HSD: {b.expDate ? new Date(b.expDate).toLocaleDateString('vi-VN') : '2027-12-31'}
                          </Text>
                        </View>
                        <View style={styles.stockBadge}>
                          <Text style={styles.stockText}>
                            {b.stock} {item.unit || 'Hộp'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Footer button */}
          <TouchableOpacity onPress={onClose} style={styles.footerBtn}>
            <Text style={styles.footerBtnText}>Đóng</Text>
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
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 14,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 10,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  listScroll: {
    maxHeight: 380,
  },
  itemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  catBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
  },
  metaGrid: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  metaVal: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  batchSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  batchPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  batchNo: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
  },
  expDate: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  stockBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  footerBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  footerBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
