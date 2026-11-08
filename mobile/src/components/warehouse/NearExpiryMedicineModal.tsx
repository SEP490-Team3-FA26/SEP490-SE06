/**
 * NearExpiryMedicineModal.tsx - Modal chi tiết dược phẩm cận hạn & đề xuất điều phối FEFO chuẩn GSP
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatDaysLeftLabel,
  getFefoPriorityRecommendation,
} from '../../services/nearExpiryHelper';

interface NearExpiryMedicineModalProps {
  visible: boolean;
  onClose: () => void;
  medicine: any | null;
  onLocateOnMap?: (location: { zone: string; rack: string; shelf: number }) => void;
}

export const NearExpiryMedicineModal: React.FC<NearExpiryMedicineModalProps> = ({
  visible,
  onClose,
  medicine,
  onLocateOnMap,
}) => {
  if (!medicine) return null;

  const daysLeft = typeof medicine.daysLeft === 'number' ? medicine.daysLeft : 999;
  const badgeInfo = formatDaysLeftLabel(daysLeft);
  const fefoRec = getFefoPriorityRecommendation(medicine);

  const zone = medicine.location?.zone || 'A';
  const rack = medicine.location?.rack || 'A1';
  const shelf = medicine.location?.shelf || 2;

  const handleLocate = () => {
    onClose();
    if (onLocateOnMap) {
      onLocateOnMap({ zone, rack, shelf });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header Modal */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.headerBadge}>
                <Ionicons name="medical" size={13} color="#0284C7" />
                <Text style={styles.headerBadgeText}>Chi Tiết Dược Phẩm Cận Hạn GSP</Text>
              </View>
              <Text style={styles.skuText} numberOfLines={1}>
                SĐK / SKU: {medicine.registrationNumber || medicine.regNo || medicine.sku || medicine.id || 'VN-GSP-2026'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Banner Cảnh Báo Hạn Dùng */}
            <View style={[styles.alertBanner, { backgroundColor: badgeInfo.bg, borderColor: badgeInfo.border }]}>
              <Ionicons name={badgeInfo.icon} size={24} color={badgeInfo.text} />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: badgeInfo.text }]}>
                  {badgeInfo.isExpired ? 'DƯỢC PHẨM ĐÃ QUÁ HẠN DÙNG' : `CẢNH BÁO CẬN HẠN DÙNG (${badgeInfo.label.toUpperCase()})`}
                </Text>
                <Text style={styles.alertDesc}>
                  {fefoRec.actionText}
                </Text>
              </View>
            </View>

            {/* Thông Tin Dược Lý & Quy Cách */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                <Text style={styles.sectionTitle}>Thông Tin Dược Lâm Sàng & Quy Cách</Text>
              </View>

              <Text style={styles.medFullName}>{medicine.name}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hoạt chất chính:</Text>
                <Text style={styles.infoValue}>
                  {medicine.activeIngredient || medicine.activeSubstance || 'Theo Dược điển Việt Nam'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nhóm dược lý:</Text>
                <Text style={styles.infoValue}>{medicine.category || 'Thuốc không kê đơn (OTC)'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dạng bào chế:</Text>
                <Text style={styles.infoValue}>{medicine.dosageForm || medicine.form || 'Viên nén / Hộp tiêu chuẩn'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hãng sản xuất:</Text>
                <Text style={styles.infoValue}>
                  {medicine.manufacturer || 'Công ty CP Dược phẩm'} • {medicine.origin || 'Việt Nam'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bảo quản GSP:</Text>
                <Text style={styles.infoValue}>
                  {medicine.storageCondition || 'Nhiệt độ 15-25°C, độ ẩm < 70%, tránh ánh sáng trực tiếp'}
                </Text>
              </View>
            </View>

            {/* Thông Tin Lô & Vị Trí Lưu Kho */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="cube-outline" size={18} color="#0284C7" />
                <Text style={styles.sectionTitle}>Lô Hàng & Tồn Kho Thực Tế GSP</Text>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Số Lô (Batch)</Text>
                  <Text style={styles.metricValueBold} numberOfLines={1}>{medicine.batchNo}</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Hạn Sử Dụng</Text>
                  <Text style={[styles.metricValueBold, { color: badgeInfo.text }]}>{medicine.expDate}</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Tồn Kho Cần Xuất</Text>
                  <Text style={[styles.metricValueBold, { color: '#E11D48' }]}>
                    {medicine.stock} {medicine.unit}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Số Ngày Còn Lại</Text>
                  <Text style={[styles.metricValueBold, { color: badgeInfo.text }]}>
                    {daysLeft < 0 ? `Quá ${Math.abs(daysLeft)} ngày` : `${daysLeft} ngày`}
                  </Text>
                </View>
              </View>

              <View style={styles.locationBanner}>
                <Ionicons name="location" size={18} color="#0284C7" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle}>Vị Trí Trên Sơ Đồ Kho GSP</Text>
                  <Text style={styles.locationSubtitle}>
                    Phân Khu {zone} · Kệ Lưu Trữ {rack} · Tầng Kệ Số {shelf}
                  </Text>
                </View>
              </View>
            </View>

            {/* Khuyến Nghị Điều Phối FEFO */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="swap-horizontal-outline" size={18} color="#0284C7" />
                <Text style={styles.sectionTitle}>Khuyến Nghị Điều Phối FEFO</Text>
              </View>

              <View style={styles.fefoBadgeRow}>
                <View style={[styles.fefoPill, { backgroundColor: badgeInfo.bg, borderColor: badgeInfo.border }]}>
                  <Text style={[styles.fefoPillText, { color: badgeInfo.text }]}>
                    {fefoRec.levelTitle}
                  </Text>
                </View>
              </View>

              <Text style={styles.fefoDetailText}>
                • Đưa lô thuốc vào danh mục xuất ưu tiên (FEFO First Expired First Out) cho các đơn thuốc ngoại trú.{'\n'}
                • Hạn chế nhập thêm số lượng lớn từ nhà cung cấp cho đến khi giải phóng hết lượng hàng cận hạn.{'\n'}
                • Quét mã QR thùng kiện khi đóng gói điều chuyển để đảm bảo dữ liệu truy vết lô GS1 toàn chuỗi.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Hành Động */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={handleLocate}
              activeOpacity={0.8}
            >
              <Ionicons name="map" size={18} color="#FFFFFF" />
              <Text style={styles.mapBtnText}>Định Vị Trên Sơ Đồ Kho (2D)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Đóng</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 4,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  skuText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  medFullName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0369A1',
    lineHeight: 20,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  infoLabel: {
    fontSize: 11.5,
    color: '#64748B',
    width: '38%',
  },
  infoValue: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '600',
    width: '62%',
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 3,
  },
  metricValueBold: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  locationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  locationSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0369A1',
  },
  fefoBadgeRow: {
    marginBottom: 8,
  },
  fefoPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  fefoPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  fefoDetailText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
  },
  mapBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  mapBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },
});

