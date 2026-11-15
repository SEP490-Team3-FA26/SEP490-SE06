/**
 * InventoryCheckModal.tsx
 * Modal Thực Hiện Phiên Kiểm Kê Kho (BW07) Trên Mobile
 * Tích hợp Quét Barcode Đếm Hàng Siêu Tốc, Liên Kết Sơ Đồ Kho GSP, Tính Chênh Lệch & Tự Động Cân Bằng Kho.
 * Tuân thủ chuẩn WDP301/SEP490 Playbook v2.0 - Chú thích Tiếng Việt 100%.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import {
  InventoryCheckItem,
  calculateDiscrepancy,
  incrementStockByBarcode,
  validateInventoryCheckSubmission,
  formatWarehouseLocationLabel,
} from '../../services/inventoryCheckHelper';
import { showToast } from '../ui/toastHelper';
import { BarcodeScannerModal } from '../barcode/BarcodeScannerModal';

interface InventoryCheckModalProps {
  visible: boolean;
  onClose: () => void;
  initialItems: InventoryCheckItem[];
  shelfLocation?: { zone: string; rack: string; shelf: number };
  existingCheckId?: string;
  onCheckCompleted?: () => void;
}

const QUICK_REASONS = [
  'Hư hỏng do ẩm mốc / vỡ',
  'Thất thoát trong lưu trữ',
  'Bán lẻ chưa kịp quét xuất',
  'Lỗi sai số đếm nhập kho',
  'Thuốc hết hạn niêm phong',
];

export const InventoryCheckModal: React.FC<InventoryCheckModalProps> = ({
  visible,
  onClose,
  initialItems,
  shelfLocation,
  existingCheckId,
  onCheckCompleted,
}) => {
  const [items, setItems] = useState<InventoryCheckItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [scannerVisible, setScannerVisible] = useState<boolean>(false);

  // Danh mục thuốc & lô sẵn có trong kho (hỗ trợ thêm thuốc và chống Dead-end UX)
  const [warehouseMedicines, setWarehouseMedicines] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [batchSelectorVisible, setBatchSelectorVisible] = useState<boolean>(false);
  const [selectorSearch, setSelectorSearch] = useState<string>('');

  // Tải danh mục thuốc và các lô trong kho từ Backend
  const loadWarehouseBatches = useCallback(async () => {
    try {
      setLoadingBatches(true);
      const data = await ApiService.getInventoryCheckBatches();
      if (Array.isArray(data)) {
        setWarehouseMedicines(data);
      }
    } catch (e: any) {
      console.warn('Lỗi tải danh mục lô kiểm kê:', e);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadWarehouseBatches();
      if (initialItems && initialItems.length > 0) {
        setItems(JSON.parse(JSON.stringify(initialItems)));
      } else {
        setItems([]);
      }
      setNotes(
        shelfLocation
          ? `Kiểm kê định kỳ tại ${formatWarehouseLocationLabel(shelfLocation)}`
          : 'Đợt kiểm kê kho định kỳ'
      );
    }
  }, [visible, initialItems, shelfLocation, loadWarehouseBatches]);

  // Tổng số lô thuốc có trong kho
  const totalWarehouseBatchesCount = useMemo(() => {
    return warehouseMedicines.reduce(
      (sum, med) => sum + (Array.isArray(med.batches) ? med.batches.length : 0),
      0
    );
  }, [warehouseMedicines]);

  // Lọc danh sách lô thuốc theo ô tìm kiếm trong modal chọn
  const filteredWarehouseMedicines = useMemo(() => {
    if (!selectorSearch.trim()) return warehouseMedicines;
    const q = selectorSearch.toLowerCase().trim();
    return warehouseMedicines
      .map((med) => {
        const medMatches =
          (med.name && med.name.toLowerCase().includes(q)) ||
          (med.barcode && med.barcode.toLowerCase().includes(q)) ||
          (med.registrationNumber && med.registrationNumber.toLowerCase().includes(q));
        const matchedBatches = (med.batches || []).filter(
          (b: any) =>
            medMatches || (b.batchNo && b.batchNo.toLowerCase().includes(q))
        );
        if (matchedBatches.length > 0) {
          return { ...med, batches: matchedBatches };
        }
        return null;
      })
      .filter(Boolean);
  }, [warehouseMedicines, selectorSearch]);

  // Cập nhật số lượng đếm thực tế của 1 dòng
  const handleUpdateActualStock = (idx: number, newStockStr: string) => {
    const val = parseInt(newStockStr, 10);
    const validVal = isNaN(val) ? 0 : Math.max(0, val);
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const { difference } = calculateDiscrepancy(it.systemStock, validVal);
        return {
          ...it,
          actualStock: validVal,
          difference,
        };
      })
    );
  };

  // Tăng giảm nhanh bằng nút +/-
  const handleDeltaStock = (idx: number, delta: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const newStock = Math.max(0, it.actualStock + delta);
        const { difference } = calculateDiscrepancy(it.systemStock, newStock);
        return {
          ...it,
          actualStock: newStock,
          difference,
        };
      })
    );
  };

  // Cập nhật lý do chênh lệch
  const handleUpdateReason = (idx: number, reason: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, discrepancyReason: reason } : it))
    );
  };

  // Thêm 1 lô thuốc cụ thể từ kho vào danh sách kiểm kê
  const handleAddBatchToCheck = (med: any, batch: any) => {
    const existingIndex = items.findIndex(
      (it) => it.medicineId === (med.id || med._id) && it.batchNo === batch.batchNo
    );
    if (existingIndex >= 0) {
      showToast.info('Đã có trong danh sách', `Lô ${batch.batchNo} đã nằm trong đợt kiểm kê.`);
      return;
    }
    const newItem: InventoryCheckItem = {
      medicineId: med.id || med._id,
      medicineName: med.name,
      sku: med.sku || '',
      barcode: med.barcode || '',
      batchId: batch.id || batch._id,
      batchNo: batch.batchNo,
      expDate: batch.expDate,
      systemStock: batch.stock,
      actualStock: batch.stock,
      difference: 0,
      discrepancyReason: '',
      unit: med.unit || 'Hộp',
      location: shelfLocation || { zone: 'A', rack: 'A1', shelf: 1 },
    };
    setItems((prev) => [newItem, ...prev]);
    showToast.success('Đã thêm thuốc', `Đã thêm lô ${batch.batchNo} (${med.name}) vào đợt kiểm kê.`);
  };

  // Nạp toàn bộ danh mục lô đang có tồn kho
  const handleLoadAllWarehouseBatches = () => {
    if (warehouseMedicines.length === 0) {
      showToast.error('Kho trống', 'Không tìm thấy lô thuốc nào trong kho kiểm kê.');
      return;
    }
    const allItems: InventoryCheckItem[] = [];
    for (const med of warehouseMedicines) {
      if (Array.isArray(med.batches)) {
        for (const b of med.batches) {
          allItems.push({
            medicineId: med.id || med._id,
            medicineName: med.name,
            sku: med.sku || '',
            barcode: med.barcode || '',
            batchId: b.id || b._id,
            batchNo: b.batchNo,
            expDate: b.expDate,
            systemStock: b.stock,
            actualStock: b.stock,
            difference: 0,
            discrepancyReason: '',
            unit: med.unit || 'Hộp',
            location: shelfLocation || { zone: 'A', rack: 'A1', shelf: 1 },
          });
        }
      }
    }
    setItems(allItems);
    showToast.success('Nạp thành công', `Đã nạp ${allItems.length} lô thuốc vào phiên kiểm kê.`);
  };

  // Quét Barcode trực tiếp từ camera để đếm thuốc hoặc tự động thêm lô mới
  const handleBarcodeScanned = (scannedCode: string) => {
    const cleanCode = (scannedCode || '').trim().toLowerCase();
    const { updatedItems, found, matchedItem } = incrementStockByBarcode(items, cleanCode);
    if (found && matchedItem) {
      setItems(updatedItems);
      showToast.success(
        'Đã đếm +1',
        `${matchedItem.medicineName}\nSố lượng thực tế: ${matchedItem.actualStock}`
      );
      return;
    }

    // Nếu chưa có trong danh sách kiểm, tự động tra cứu trong danh mục lô của kho
    let foundInWarehouse = false;
    for (const med of warehouseMedicines) {
      const isMedMatch =
        (med.barcode && med.barcode.toLowerCase() === cleanCode) ||
        (med.registrationNumber && med.registrationNumber.toLowerCase() === cleanCode);
      if (Array.isArray(med.batches) && med.batches.length > 0) {
        for (const b of med.batches) {
          if (isMedMatch || (b.batchNo && b.batchNo.toLowerCase() === cleanCode)) {
            const newItem: InventoryCheckItem = {
              medicineId: med.id || med._id,
              medicineName: med.name,
              sku: med.sku || '',
              barcode: med.barcode || '',
              batchId: b.id || b._id,
              batchNo: b.batchNo,
              expDate: b.expDate,
              systemStock: b.stock,
              actualStock: 1,
              difference: 1 - b.stock,
              discrepancyReason: '',
              unit: med.unit || 'Hộp',
              location: shelfLocation || { zone: 'A', rack: 'A1', shelf: 1 },
            };
            setItems((prev) => [newItem, ...prev]);
            showToast.success(
              'Đã thêm lô mới',
              `Lô ${b.batchNo} - ${med.name}\nSố lượng đếm: 1`
            );
            foundInWarehouse = true;
            return;
          }
        }
      }
    }

    if (!foundInWarehouse) {
      showToast.error(
        'Không tìm thấy',
        `Mã "${scannedCode}" không có trong kho kiểm kê hiện tại.`
      );
    }
  };

  // Xóa 1 dòng khỏi danh sách kiểm
  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Lọc thuốc theo tìm kiếm
  const displayedItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.medicineName.toLowerCase().includes(q) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.barcode && it.barcode.toLowerCase().includes(q)) ||
        (it.batchNo && it.batchNo.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Thống kê đợt kiểm
  const summary = useMemo(() => {
    const total = items.length;
    const matched = items.filter((it) => it.difference === 0).length;
    const surplus = items.filter((it) => it.difference > 0).length;
    const deficit = items.filter((it) => it.difference < 0).length;
    return { total, matched, surplus, deficit };
  }, [items]);

  // Lưu Nháp (DRAFT) - Hỗ trợ cập nhật bản nháp cũ mà không sinh bản ghi mồ côi
  const handleSaveDraft = async () => {
    if (items.length === 0) {
      Alert.alert('Thông báo', 'Danh sách kiểm kê trống.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        items: items.map((it) => ({
          medicineId: it.medicineId,
          medicineName: it.medicineName,
          sku: it.sku,
          barcode: it.barcode,
          batchId: it.batchId,
          batchNo: it.batchNo,
          systemStock: it.systemStock,
          actualStock: it.actualStock,
          difference: it.difference,
          reason: (it.discrepancyReason || (it as any).reason || '').trim(),
          discrepancyReason: (it.discrepancyReason || (it as any).reason || '').trim(),
          location: it.location,
        })),
        notes,
        status: 'DRAFT',
      };

      let res;
      if (existingCheckId) {
        res = await ApiService.updateInventoryCheck(existingCheckId, payload);
      } else {
        res = await ApiService.createInventoryCheck(payload);
      }

      if (res.success) {
        showToast.success('Thành công', 'Đã lưu nháp biên bản kiểm kê kho.');
        if (onCheckCompleted) onCheckCompleted();
        onClose();
      } else {
        showToast.error('Thất bại', res.message || 'Không thể lưu nháp');
      }
    } catch (e: any) {
      showToast.error('Lỗi', e.message || 'Lỗi khi lưu nháp');
    } finally {
      setSubmitting(false);
    }
  };

  // Hoàn tất kiểm kê & Chốt cân bằng tồn kho (COMPLETE) - Triệt tiêu lỗi tạo rác bản nháp
  const handleCompleteCheck = async () => {
    const validation = validateInventoryCheckSubmission(items);
    if (!validation.isValid) {
      Alert.alert('Chưa đủ điều kiện hoàn tất', validation.error);
      return;
    }

    Alert.alert(
      'Xác nhận Hoàn tất Kiểm kê',
      `Bạn có chắc chắn muốn chốt biên bản kiểm kê gồm ${items.length} mặt hàng?\nTồn kho hệ thống sẽ được tự động điều chỉnh cân bằng theo số lượng đếm thực tế.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chốt & Cân Bằng Kho',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const formattedItems = items.map((it) => ({
                medicineId: it.medicineId,
                medicineName: it.medicineName,
                sku: it.sku,
                barcode: it.barcode,
                batchId: it.batchId,
                batchNo: it.batchNo,
                systemStock: it.systemStock,
                actualStock: it.actualStock,
                difference: it.difference,
                reason: (it.discrepancyReason || (it as any).reason || '').trim(),
                discrepancyReason: (it.discrepancyReason || (it as any).reason || '').trim(),
                location: it.location,
              }));

              let checkId = existingCheckId;
              if (existingCheckId) {
                // Đã có biên bản cũ: Cập nhật lại số liệu thực tế trước khi chốt, KHÔNG tạo record mới
                await ApiService.updateInventoryCheck(existingCheckId, {
                  items: formattedItems,
                  notes,
                });
              } else {
                // Chưa có: Tạo biên bản nháp mới
                const createRes = await ApiService.createInventoryCheck({
                  items: formattedItems,
                  notes,
                  status: 'DRAFT',
                });
                checkId = createRes.data?._id || createRes.data?.id;
              }

              if (checkId) {
                // Gọi API hoàn tất để kích hoạt cân bằng tồn kho DB
                const compRes = await ApiService.completeInventoryCheck(checkId);
                if (compRes.success) {
                  showToast.success(
                    'Kiểm kê hoàn tất!',
                    'Đã cân bằng số lượng tồn kho và lưu vết Audit Log thành công.'
                  );
                  if (onCheckCompleted) onCheckCompleted();
                  onClose();
                  return;
                } else {
                  showToast.error('Lỗi chốt tồn kho', compRes.message || 'Không thể hoàn tất biên bản');
                  return;
                }
              }

              showToast.success('Đã ghi nhận', 'Biên bản kiểm kê đã được lưu an toàn.');
              if (onCheckCompleted) onCheckCompleted();
              onClose();
            } catch (e: any) {
              showToast.error('Lỗi hoàn tất', e.message || 'Lỗi khi chốt biên bản');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Biên Bản Kiểm Kê Kho</Text>
            <Text style={styles.headerSub}>
              {shelfLocation ? formatWarehouseLocationLabel(shelfLocation) : 'Chuẩn BW07 · Cân Bằng Tồn GSP'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => setBatchSelectorVisible(true)}
              style={styles.addBatchBtn}
            >
              <Ionicons name="add" size={16} color="#0284C7" />
              <Text style={styles.addBatchBtnText}>+ Thêm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScannerVisible(true)}
              style={styles.scanBarcodeBtn}
            >
              <Ionicons name="barcode-outline" size={18} color="#FFFFFF" />
              <Text style={styles.scanBarcodeBtnText}>Quét Đếm</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Thống kê nhanh */}
        <View style={styles.summaryBar}>
          <View style={styles.sumCol}>
            <Text style={styles.sumVal}>{summary.total}</Text>
            <Text style={styles.sumLabel}>Tổng thuốc</Text>
          </View>
          <View style={styles.sumCol}>
            <Text style={[styles.sumVal, { color: '#10B981' }]}>{summary.matched}</Text>
            <Text style={styles.sumLabel}>Khớp tồn</Text>
          </View>
          <View style={styles.sumCol}>
            <Text style={[styles.sumVal, { color: '#F59E0B' }]}>{summary.surplus}</Text>
            <Text style={styles.sumLabel}>Thừa hàng</Text>
          </View>
          <View style={styles.sumCol}>
            <Text style={[styles.sumVal, { color: '#EF4444' }]}>{summary.deficit}</Text>
            <Text style={styles.sumLabel}>Thiếu hụt</Text>
          </View>
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên thuốc, SKU, số lô, mã vạch..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Danh sách các mặt hàng kiểm */}
        {displayedItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="clipboard-outline" size={36} color="#0284C7" />
            </View>
            <Text style={styles.emptyText}>Chưa có thuốc nào trong đợt kiểm kê này</Text>
            <Text style={styles.emptySubText}>
              Bổ sung thuốc vào đợt kiểm kê bằng cách chọn từng lô, nạp toàn bộ kho hoặc quét mã vạch trên vỏ hộp.
            </Text>
            <View style={styles.emptyActionCol}>
              <TouchableOpacity
                onPress={() => setBatchSelectorVisible(true)}
                style={styles.emptyAddBtn}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Chọn Thuốc / Lô từ Kho</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLoadAllWarehouseBatches}
                style={styles.emptyLoadAllBtn}
              >
                <Ionicons name="cloud-download-outline" size={18} color="#0284C7" />
                <Text style={styles.emptyLoadAllBtnText}>
                  Nạp Toàn Bộ Lô ({totalWarehouseBatchesCount} Lô)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {displayedItems.map((it, idx) => {
              const diff = it.difference;
              const hasDiff = diff !== 0;

              return (
                <View key={`check_it_${idx}`} style={[styles.itemCard, hasDiff && styles.itemCardDiff]}>
                  {/* Tên & Vị trí */}
                  <View style={styles.itemTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{it.medicineName}</Text>
                      <View style={styles.metaRow}>
                        {it.batchNo ? (
                          <View style={styles.batchPill}>
                            <Text style={styles.batchPillText}>Lô: {it.batchNo}</Text>
                          </View>
                        ) : null}
                        {it.location ? (
                          <View style={styles.locPill}>
                            <Ionicons name="location-outline" size={11} color="#0284C7" />
                            <Text style={styles.locPillText}>
                              Khu {it.location.zone} · Kệ {it.location.rack} · Tầng {it.location.shelf}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={styles.delBtn}>
                      <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Đối chiếu Tồn hệ thống vs Thực tế */}
                  <View style={styles.countGrid}>
                    <View style={styles.systemStockBox}>
                      <Text style={styles.boxLabel}>TỒN HỆ THỐNG</Text>
                      <Text style={styles.systemStockVal}>
                        {it.systemStock} {it.unit || 'Hộp'}
                      </Text>
                    </View>

                    <View style={styles.actualStockBox}>
                      <Text style={styles.boxLabel}>THỰC TẾ KIỂM ĐẾM</Text>
                      <View style={styles.counterRow}>
                        <TouchableOpacity
                          onPress={() => handleDeltaStock(idx, -1)}
                          style={styles.stepBtn}
                        >
                          <Ionicons name="remove" size={16} color="#0284C7" />
                        </TouchableOpacity>

                        <TextInput
                          style={styles.actualInput}
                          keyboardType="numeric"
                          value={String(it.actualStock)}
                          onChangeText={(v) => handleUpdateActualStock(idx, v)}
                        />

                        <TouchableOpacity
                          onPress={() => handleDeltaStock(idx, 1)}
                          style={styles.stepBtn}
                        >
                          <Ionicons name="add" size={16} color="#0284C7" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Badge Chênh lệch */}
                  <View style={styles.diffRow}>
                    <View
                      style={[
                        styles.diffBadge,
                        diff === 0 && { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
                        diff > 0 && { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
                        diff < 0 && { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
                      ]}
                    >
                      <Ionicons
                        name={diff === 0 ? 'checkmark-circle' : diff > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                        size={14}
                        color={diff === 0 ? '#10B981' : diff > 0 ? '#D97706' : '#DC2626'}
                      />
                      <Text
                        style={[
                          styles.diffBadgeText,
                          diff === 0 && { color: '#059669' },
                          diff > 0 && { color: '#D97706' },
                          diff < 0 && { color: '#DC2626' },
                        ]}
                      >
                        {diff === 0
                          ? 'Khớp tồn (0)'
                          : diff > 0
                          ? `Thừa +${diff} ${it.unit || 'Hộp'}`
                          : `Thiếu ${diff} ${it.unit || 'Hộp'}`}
                      </Text>
                    </View>
                  </View>

                  {/* Ô nhập Lý do bắt buộc khi có chênh lệch */}
                  {hasDiff && (
                    <View style={styles.reasonSection}>
                      <Text style={styles.reasonLabel}>
                        Lý do sai lệch <Text style={{ color: '#EF4444' }}>* (Bắt buộc):</Text>
                      </Text>
                      <TextInput
                        style={styles.reasonInput}
                        placeholder="Nhập lý do hao hụt, thừa thiếu..."
                        placeholderTextColor="#94A3B8"
                        value={it.discrepancyReason || ''}
                        onChangeText={(t) => handleUpdateReason(idx, t)}
                      />

                      {/* Gợi ý lý do nhanh */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReasonsScroll}>
                        {QUICK_REASONS.map((r, rIdx) => (
                          <TouchableOpacity
                            key={`qr_${rIdx}`}
                            onPress={() => handleUpdateReason(idx, r)}
                            style={styles.quickReasonPill}
                          >
                            <Text style={styles.quickReasonPillText}>{r}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Footer Ghi chú & Nút bấm Hoàn tất */}
        <View style={styles.footer}>
          <TextInput
            style={styles.notesInput}
            placeholder="Ghi chú đợt kiểm kê kho..."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
          />

          <View style={styles.footerBtnRow}>
            <TouchableOpacity
              disabled={submitting}
              onPress={handleSaveDraft}
              style={styles.saveDraftBtn}
            >
              <Text style={styles.saveDraftBtnText}>Lưu Nháp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={submitting || items.length === 0}
              onPress={handleCompleteCheck}
              style={[
                styles.completeBtn,
                (submitting || items.length === 0) && { opacity: 0.6 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={styles.completeBtnText}>Hoàn Tất Kiểm Kê</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal Chọn Thuốc & Lô Từ Kho */}
        <Modal
          visible={batchSelectorVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBatchSelectorVisible(false)}
        >
          <View style={styles.selectorOverlay}>
            <View style={styles.selectorSheet}>
              <View style={styles.selectorHeader}>
                <View>
                  <Text style={styles.selectorTitle}>Chọn Thuốc / Lô Kiểm Kê</Text>
                  <Text style={styles.selectorSub}>
                    {totalWarehouseBatchesCount} lô thuốc sẵn có trong kho
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setBatchSelectorVisible(false)}
                  style={styles.selectorCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Tìm kiếm trong danh sách lô */}
              <View style={styles.selectorSearchBox}>
                <Ionicons name="search" size={16} color="#94A3B8" />
                <TextInput
                  style={styles.selectorSearchInput}
                  placeholder="Tìm theo tên thuốc, số lô, mã vạch..."
                  placeholderTextColor="#94A3B8"
                  value={selectorSearch}
                  onChangeText={setSelectorSearch}
                />
                {selectorSearch ? (
                  <TouchableOpacity onPress={() => setSelectorSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Danh sách các lô thuốc */}
              <ScrollView style={styles.selectorList} showsVerticalScrollIndicator={false}>
                {filteredWarehouseMedicines.map((med: any) => {
                  const batches = med.batches || [];
                  return (
                    <View key={`sel_med_${med.id || med._id}`} style={styles.selectorMedGroup}>
                      <Text style={styles.selectorMedName}>{med.name}</Text>
                      {batches.map((b: any) => {
                        const isAdded = items.some(
                          (it) => it.medicineId === (med.id || med._id) && it.batchNo === b.batchNo
                        );
                        return (
                          <TouchableOpacity
                            key={`sel_batch_${b.id || b.batchNo}`}
                            onPress={() => handleAddBatchToCheck(med, b)}
                            style={[
                              styles.selectorBatchRow,
                              isAdded && styles.selectorBatchRowAdded,
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.selectorBatchNo}>Lô: {b.batchNo}</Text>
                                {isAdded && (
                                  <View style={styles.selectorAddedPill}>
                                    <Text style={styles.selectorAddedPillText}>Đã thêm</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.selectorBatchMeta}>
                                Tồn: {b.stock} {med.unit || 'Hộp'} · HSD: {b.expDate ? new Date(b.expDate).toLocaleDateString('vi-VN') : 'N/A'}
                              </Text>
                            </View>
                            <View style={[styles.selectorAddBadge, isAdded && styles.selectorAddBadgeDone]}>
                              <Ionicons
                                name={isAdded ? 'checkmark' : 'add'}
                                size={16}
                                color={isAdded ? '#10B981' : '#0284C7'}
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                {filteredWarehouseMedicines.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Ionicons name="search-outline" size={36} color="#CBD5E1" />
                    <Text style={{ color: '#94A3B8', marginTop: 8, fontSize: 13 }}>
                      {loadingBatches ? 'Đang tải danh mục kho...' : 'Không tìm thấy thuốc hoặc lô phù hợp'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal Quét Barcode Đếm Hàng */}
        <BarcodeScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={handleBarcodeScanned}
          mode="BARCODE"
          title="Quét Barcode Đếm Hàng Kiểm Kê"
          subtitle="Hướng camera vào mã vạch trên vỏ hộp thuốc để tự động cộng dồn số đếm"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  addBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  addBatchBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scanBarcodeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sumCol: {
    flex: 1,
    alignItems: 'center',
  },
  sumVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sumLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCardDiff: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  medName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  batchPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  batchPillText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locPillText: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '600',
  },
  delBtn: {
    padding: 4,
  },
  countGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  systemStockBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actualStockBox: {
    flex: 1.2,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  systemStockVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actualInput: {
    width: 50,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C7',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0284C7',
    padding: 0,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  reasonSection: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  reasonLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 6,
  },
  quickReasonsScroll: {
    marginBottom: 4,
  },
  quickReasonPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  quickReasonPillText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveDraftBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 'bold',
  },
  completeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyActionCol: {
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyLoadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  emptyLoadAllBtnText: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: '600',
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  selectorSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  selectorSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  selectorCloseBtn: {
    padding: 6,
  },
  selectorSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  selectorList: {
    paddingHorizontal: 16,
  },
  selectorMedGroup: {
    marginBottom: 14,
  },
  selectorMedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  selectorBatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorBatchRowAdded: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  selectorBatchNo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectorBatchMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectorAddedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  selectorAddedPillText: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '700',
  },
  selectorAddBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorAddBadgeDone: {
    backgroundColor: '#DCFCE7',
  },
});

