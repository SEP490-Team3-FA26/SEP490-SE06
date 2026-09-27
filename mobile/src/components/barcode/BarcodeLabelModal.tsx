// BarcodeLabelModal.tsx - 50x30mm Thermal Label Viewer & GS1 EAN-13 Barcode Generator for Mobile
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarcodeSVG } from './BarcodeSVG';
import { ApiService } from '../../services/api.service';
import { showToast } from '../ui/toastHelper';
import { Medicine } from '../../types/pharmacy.types';

interface BarcodeLabelModalProps {
  visible: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  onBarcodeUpdated?: (updatedMedicine: Medicine, newBarcode: string) => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  visible,
  onClose,
  medicine,
  onBarcodeUpdated,
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentBarcode, setCurrentBarcode] = useState<string>('');

  // Synchronize when medicine changes
  React.useEffect(() => {
    if (medicine) {
      const defaultCode =
        medicine.barcode ||
        (Array.isArray(medicine.units) && medicine.units[0]?.barcode) ||
        medicine.sku ||
        '';
      setCurrentBarcode(defaultCode);
      const defaultUnit =
        (Array.isArray(medicine.units) && (medicine.units[0]?.unitName || medicine.units[0]?.name)) ||
        medicine.unit ||
        'Hộp';
      setSelectedUnit(defaultUnit);
    }
  }, [medicine]);

  const activeUnitInfo = useMemo(() => {
    if (!medicine) return { name: 'Hộp', price: 0, barcode: currentBarcode };
    if (Array.isArray(medicine.units) && medicine.units.length > 0) {
      const found = medicine.units.find(
        (u) => (u as any).unitName === selectedUnit || u.name === selectedUnit
      );
      if (found) {
        return {
          name: (found as any).unitName || found.name || 'Hộp',
          price: found.price,
          barcode: found.barcode || currentBarcode || medicine.barcode || medicine.sku || '',
        };
      }
    }
    return {
      name: medicine.unit || 'Hộp',
      price: medicine.price || 0,
      barcode: currentBarcode || medicine.barcode || medicine.sku || '',
    };
  }, [medicine, selectedUnit, currentBarcode]);

  const handleCopyBarcode = () => {
    const code = activeUnitInfo.barcode || currentBarcode;
    Clipboard.setString(code);
    showToast.success('Đã sao chép', `Đã chép mã ${code} vào bộ nhớ tạm!`);
  };

  const handleRegenerateBarcode = async () => {
    if (!medicine?.id && !medicine?._id) return;
    const medId = medicine.id || medicine._id || '';

    Alert.alert(
      'Sinh Lại Mã Vạch GS1 EAN-13',
      `Bạn có chắc muốn cấp mã EAN-13 mới cho thuốc "${medicine.name}"? Mã cũ sẽ được thay thế trên toàn hệ thống.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý sinh mã',
          onPress: async () => {
            try {
              setIsGenerating(true);
              const res = await ApiService.generateBarcode(medId);
              if (res && res.barcode) {
                setCurrentBarcode(res.barcode);
                showToast.success('Thành công', `Đã cấp mã mới: ${res.barcode}`);
                if (onBarcodeUpdated) {
                  onBarcodeUpdated({ ...medicine, barcode: res.barcode }, res.barcode);
                }
              } else {
                showToast.error('Thất bại', res?.message || 'Không thể sinh mã vạch.');
              }
            } catch (e: any) {
              showToast.error('Lỗi', e?.message || 'Có lỗi xảy ra khi sinh mã.');
            } finally {
              setIsGenerating(false);
            }
          },
        },
      ]
    );
  };

  if (!medicine) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="barcode" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Tem Nhãn Dược Phẩm</Text>
                <Text style={styles.headerSub}>Chuẩn In Nhiệt 50x30mm · GSP</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Unit Selector */}
            {Array.isArray(medicine.units) && medicine.units.length > 1 && (
              <View style={styles.unitSelectorContainer}>
                <Text style={styles.unitLabel}>Chọn quy cách in tem:</Text>
                <View style={styles.unitPillsRow}>
                  {medicine.units.map((u, idx) => {
                    const uName = (u as any).unitName || u.name || `Đơn vị ${idx + 1}`;
                    const isSelected = selectedUnit === uName || selectedUnit === u.name;
                    return (
                      <TouchableOpacity
                        key={`unit-${idx}`}
                        onPress={() => {
                          setSelectedUnit(uName);
                          if (u.barcode) setCurrentBarcode(u.barcode);
                        }}
                        style={[
                          styles.unitPill,
                          isSelected && styles.unitPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitPillText,
                            isSelected && styles.unitPillTextActive,
                          ]}
                        >
                          {uName} ({u.price.toLocaleString('vi-VN')} ₫)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 50x30mm Thermal Label Preview Card */}
            <Text style={styles.previewTitle}>BẢN XEM TRƯỚC TEM NHÃN THỰC TẾ (50x30mm)</Text>
            <View style={styles.thermalLabelCard}>
              {/* Top Row: Brand & Unit Badge */}
              <View style={styles.labelHeader}>
                <Text style={styles.brandTitle}>PHARMACHAIN GSP</Text>
                <View style={styles.labelUnitBadge}>
                  <Text style={styles.labelUnitText}>{activeUnitInfo.name.toUpperCase()}</Text>
                </View>
              </View>

              {/* Medicine Name */}
              <Text style={styles.labelMedName} numberOfLines={2}>
                {medicine.name}
              </Text>

              {/* SKU & Price */}
              <View style={styles.labelMetaRow}>
                <Text style={styles.labelSku}>SKU: {medicine.sku || 'MED-GEN'}</Text>
                <Text style={styles.labelPrice}>{activeUnitInfo.price.toLocaleString('vi-VN')} đ</Text>
              </View>

              {/* Barcode Vector Canvas */}
              <View style={styles.barcodeCanvasWrapper}>
                <BarcodeSVG
                  barcode={activeUnitInfo.barcode || currentBarcode}
                  width={240}
                  height={58}
                  fontSize={11}
                  showText={true}
                  barColor="#000000"
                  bgColor="#FFFFFF"
                />
              </View>

              {/* Footer info: Expiration & Badge */}
              <View style={styles.labelFooter}>
                <Text style={styles.labelExp}>
                  HSD: {medicine.batches?.[0]?.expDate ? new Date(medicine.batches[0].expDate).toLocaleDateString('vi-VN') : '2027-12-31'}
                </Text>
                <Text style={styles.labelStandard}>✓ Đạt chuẩn GSP</Text>
              </View>
            </View>

            {/* Details Meta */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Mã Barcode GS1:</Text>
                <TouchableOpacity onPress={handleCopyBarcode} style={styles.copyRow}>
                  <Text style={styles.metaValue}>{activeUnitInfo.barcode || currentBarcode}</Text>
                  <Ionicons name="copy-outline" size={15} color="#0284C7" />
                </TouchableOpacity>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Hoạt chất chính:</Text>
                <Text style={styles.metaValue}>{medicine.active || 'N/A'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tồn kho hiện tại:</Text>
                <Text style={[styles.metaValue, { color: '#059669', fontWeight: 'bold' }]}>
                  {medicine.stock} {medicine.unit}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleRegenerateBarcode}
                disabled={isGenerating}
                style={[styles.btn, styles.btnOutline]}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color="#0284C7" />
                    <Text style={styles.btnOutlineText}>Sinh lại EAN-13</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCopyBarcode} style={[styles.btn, styles.btnPrimary]}>
                <Ionicons name="copy" size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>Chép Mã Vạch</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
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
  unitSelectorContainer: {
    marginBottom: 14,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  unitPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  unitPillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  thermalLabelCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 14,
  },
  labelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  labelUnitBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  labelUnitText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  labelMedName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    lineHeight: 17,
  },
  labelMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 6,
  },
  labelSku: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  labelPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  barcodeCanvasWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
  },
  labelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 4,
    marginTop: 4,
  },
  labelExp: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#334155',
  },
  labelStandard: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#059669',
  },
  metaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
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
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  btnOutlineText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: 'bold',
  },
  btnPrimary: {
    backgroundColor: '#0284C7',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
