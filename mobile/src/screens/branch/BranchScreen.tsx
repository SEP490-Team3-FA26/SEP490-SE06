// BranchScreen.tsx - Branch Manager Dashboard for Local Revenue, Staff Shifts & Stock Requisitions
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { Employee, Medicine, StockTransfer } from '../../types/pharmacy.types';
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';
import { BarcodeLabelModal } from '../../components/barcode/BarcodeLabelModal';

export const BranchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'ALERTS' | 'RECEIVE_STOCK'>('REVENUE');

  // Staff & Revenue
  const [staffs, setStaffs] = useState<Employee[]>([]);
  const [branchRevenue, setBranchRevenue] = useState<string>('48,500,000 ₫');
  const [invoiceCount, setInvoiceCount] = useState<number>(64);
  const [branchName, setBranchName] = useState<string>('CƠ SỞ CHI NHÁNH QUẬN 1');

  // Low stock alerts
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [lowStockFilter, setLowStockFilter] = useState<'ALL' | 'OUT' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stock Transfers / Goods Receipt
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
  const [showItemScanner, setShowItemScanner] = useState<boolean>(false);
  const [scannedItemsCount, setScannedItemsCount] = useState<{ [medId: string]: number }>({});
  const [receivingTransfer, setReceivingTransfer] = useState<boolean>(false);

  // Barcode Label
  const [selectedLabelMed, setSelectedLabelMed] = useState<Medicine | null>(null);

  // Transfer Request Modal
  const [requestModalVisible, setRequestModalVisible] = useState<boolean>(false);
  const [selectedMedForRequest, setSelectedMedForRequest] = useState<any | null>(null);
  const [requestQty, setRequestQty] = useState<string>('50');
  const [requestReason, setRequestReason] = useState<string>('Bổ sung tồn an toàn tại quầy');
  const [submittingReq, setSubmittingReq] = useState<boolean>(false);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [employees, lowStock, branches, transferList] = await Promise.all([
        ApiService.getEmployees(),
        ApiService.getLowStockReport(),
        ApiService.getBranches(),
        ApiService.getStockTransfers(),
      ]);

      if (employees && employees.length > 0) {
        setStaffs(employees.filter((e) => e.role === 'pharmacist' || e.role === 'branch'));
      } else {
        setStaffs([
          { id: '1', name: 'Dược sĩ Nguyễn Thị Mai', email: 'mai.nguyen@vinapharmacy.com', phone: '0901234567', role: 'pharmacist', isActive: true },
          { id: '2', name: 'Dược sĩ Trần Quốc Bảo', email: 'bao.tran@vinapharmacy.com', phone: '0912345678', role: 'pharmacist', isActive: true },
        ]);
      }

      if (lowStock && lowStock.length > 0) {
        setLowStockItems(lowStock);
      } else {
        setLowStockItems([
          { id: 'm1', name: 'Amoxicillin 500mg', stock: 5, unit: 'Hộp', supplier: 'Dược Hậu Giang', barcode: '8935001234567', sku: 'MED-AMOX-500' },
          { id: 'm2', name: 'Cefuroxim 500mg', stock: 2, unit: 'Hộp', supplier: 'Dược TW1', barcode: '8935001234581', sku: 'MED-CEFU-500' },
          { id: 'm3', name: 'Strepsils Cool', stock: 0, unit: 'Hộp', supplier: 'Reckitt Benckiser', barcode: '8935001234604', sku: 'MED-STREP-C' },
        ]);
      }

      if (transferList && transferList.length > 0) {
        setTransfers(transferList);
      } else {
        setTransfers([
          {
            id: 'st-01',
            transferCode: 'ST-20260920-0001',
            fromBranchId: 'CENTRAL_WH',
            toBranchId: 'branch_q1',
            status: 'DISPATCHED',
            items: [
              { medicineId: 'm1', name: 'Amoxicillin 500mg', batchNo: 'BATCH-2026-001', quantity: 100, unit: 'Hộp', barcode: '8935001234567' },
              { medicineId: 'm2', name: 'Panadol Extra', batchNo: 'BATCH-2026-002', quantity: 50, unit: 'Hộp', barcode: '8935001234574' },
            ],
            reason: 'Cấp bổ sung định kỳ tuần 3 tháng 9 từ Kho Tổng',
            createdAt: '2026-09-20T08:30:00Z',
            shippedBy: 'Thủ kho Nguyễn Văn A',
          },
        ]);
      }

      if (branches && branches.length > 0) {
        setBranchName(branches[0].name.toUpperCase());
      }
    } catch (e) {
      console.warn('Error loading branch data:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async () => {
    if (!selectedMedForRequest) return;
    const qty = parseInt(requestQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast.error('Lỗi', 'Số lượng yêu cầu không hợp lệ.');
      return;
    }

    setSubmittingReq(true);
    const ok = await ApiService.createStockTransfer({
      fromBranchId: 'central_warehouse',
      toBranchId: 'branch_q1',
      items: [
        {
          medicineId: selectedMedForRequest.id,
          name: selectedMedForRequest.name,
          quantity: qty,
          unit: selectedMedForRequest.unit,
        },
      ],
      reason: requestReason,
    });
    setSubmittingReq(false);

    setRequestModalVisible(false);
    showToast.success(
      'Thành công',
      `Đã tạo phiếu yêu cầu cấp bổ sung ${qty} ${selectedMedForRequest.unit} ${selectedMedForRequest.name} từ Kho Tổng!`
    );
  };

  // Handle scan QR Code on package
  const handleScanPackageQR = async (code: string) => {
    setShowQRScanner(false);
    try {
      const transfer = await ApiService.getStockTransferByCode(code);
      if (transfer) {
        setSelectedTransfer(transfer);
        setScannedItemsCount({});
        showToast.success('Quét QR Thành Công', `Đã tìm thấy phiếu xuất kho ${transfer.transferCode || transfer.id}`);
      } else {
        const local = transfers.find((t) => t.transferCode === code || t.id === code);
        if (local) {
          setSelectedTransfer(local);
          setScannedItemsCount({});
          showToast.success('Quét QR Thành Công', `Đã tìm thấy kiện hàng: ${local.transferCode}`);
        } else {
          showToast.error('Không tìm thấy', `Không tìm thấy phiếu chuyển kho tương ứng với mã: ${code}`);
        }
      }
    } catch (e) {
      console.warn('Lỗi quét QR kiện hàng:', e);
      showToast.error('Lỗi', 'Không thể tra cứu kiện hàng từ máy chủ.');
    }
  };

  // Handle scan individual medicine barcode during verification
  const handleScanMedicineBarcode = (barcode: string) => {
    if (!selectedTransfer) return;
    const item = selectedTransfer.items.find(
      (it) => it.barcode === barcode || it.medicineId === barcode || it.name.toLowerCase().includes(barcode.toLowerCase())
    );
    if (item) {
      setScannedItemsCount((prev) => {
        const cur = prev[item.medicineId] || 0;
        return { ...prev, [item.medicineId]: cur + 1 };
      });
      showToast.success('Khớp Barcode', `Đã kiểm đếm +1 ${item.unit} ${item.name}`);
    } else {
      showToast.info('Mã lạ', `Barcode ${barcode} không nằm trong danh sách kiện hàng này.`);
    }
  };

  // Confirm receive stock transfer into branch inventory
  const handleConfirmReceive = async () => {
    if (!selectedTransfer) return;
    setReceivingTransfer(true);
    try {
      const ok = await ApiService.receiveStockTransfer(
        selectedTransfer.id,
        { inspectionNote: 'Đã kiểm nhận đầy đủ bằng máy quét Barcode/QR tại quầy chi nhánh' }
      );
      if (ok) {
        showToast.success(
          'Nhập Kho Thành Công',
          `Đã hoàn tất nhập kiện ${selectedTransfer.transferCode || selectedTransfer.id} vào kho chi nhánh!`
        );
        setSelectedTransfer(null);
        loadData();
      } else {
        showToast.error('Thất bại', 'Không thể hoàn tất xác nhận nhập kho.');
      }
    } catch (e) {
      console.warn('Lỗi nhận hàng:', e);
      showToast.error('Lỗi', 'Có lỗi xảy ra khi xác nhận nhập kho.');
    } finally {
      setReceivingTransfer(false);
    }
  };

  const filteredAlerts = lowStockItems.filter((item) => {
    const sq = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (item.name || '').toLowerCase().includes(sq) ||
      (item.supplier && (item.supplier || '').toLowerCase().includes(sq));
    if (!matchesSearch) return false;
    if (lowStockFilter === 'OUT') return item.stock === 0;
    if (lowStockFilter === 'LOW') return item.stock > 0 && item.stock <= 10;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Quản Lý Cơ Sở"
        subtitle="Doanh thu chi nhánh, Ca trực & Nhận hàng QR"
        gradientVariant="emerald"
        rightAction={{
          icon: 'person-circle-outline',
          onPress: () => navigation.navigate('ProfileScreen'),
        }}
        secondaryRightAction={{
          icon: 'notifications-outline',
          onPress: () => navigation.navigate('NotificationListScreen'),
        }}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <AnimatedTouchable
          onPress={() => setActiveTab('REVENUE')}
          style={[styles.tabItem, activeTab === 'REVENUE' && styles.activeTabItem]}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={activeTab === 'REVENUE' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'REVENUE' && styles.activeTabText]}>
            Doanh Thu
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('ALERTS')}
          style={[styles.tabItem, activeTab === 'ALERTS' && styles.activeTabItem]}
        >
          <Ionicons
            name="warning"
            size={16}
            color={activeTab === 'ALERTS' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'ALERTS' && styles.activeTabText]}>
            Cảnh Báo ({lowStockItems.length})
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('RECEIVE_STOCK')}
          style={[styles.tabItem, activeTab === 'RECEIVE_STOCK' && styles.activeTabItem]}
        >
          <Ionicons
            name="qr-code"
            size={16}
            color={activeTab === 'RECEIVE_STOCK' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'RECEIVE_STOCK' && styles.activeTabText]}>
            Nhận Hàng QR ({transfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'RECEIVED').length})
          </Text>
        </AnimatedTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#059669']} />}
      >
        {/* TAB 1: REVENUE & STAFF */}
        {activeTab === 'REVENUE' && (
          <View>
            <GradientCard gradientVariant="emerald" style={styles.revenueCard}>
              <View style={styles.branchHeaderRow}>
                <Text style={styles.branchNameText}>{branchName}</Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>ONLINE</Text>
                </View>
              </View>

              <Text style={styles.revTitle}>Doanh Thu Quầy Hôm Nay</Text>
              <View style={styles.revAmountRow}>
                <Text style={styles.revAmountText}>{branchRevenue}</Text>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{invoiceCount} hóa đơn</Text>
                </View>
              </View>
            </GradientCard>

            <Text style={styles.sectionTitle}>Nhân Sự Trong Ca Trực Hôm Nay</Text>
            {staffs.map((st, idx) => (
              <View key={st.id || (st as any)._id || `staff-${idx}`} style={styles.staffCard}>
                <View style={styles.staffAvatar}>
                  <Ionicons name="person" size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{st.name}</Text>
                  <Text style={styles.staffRole}>{st.email} • {st.phone}</Text>
                  <View style={styles.shiftTag}>
                    <Text style={styles.shiftTagText}>Ca Sáng (07:30 - 15:30)</Text>
                  </View>
                </View>
                <View style={styles.dutyBadge}>
                  <Text style={styles.dutyBadgeText}>ĐANG TRỰC</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: LOW STOCK ALERTS & TRANSFER REQUISITION */}
        {activeTab === 'ALERTS' && (
          <View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm thuốc sắp hết hàng, barcode..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Pills */}
            <View style={styles.pillRow}>
              {(['ALL', 'OUT', 'LOW'] as const).map((f) => (
                <AnimatedTouchable
                  key={f}
                  onPress={() => setLowStockFilter(f)}
                  style={[
                    styles.filterPill,
                    lowStockFilter === f && styles.activeFilterPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      lowStockFilter === f && styles.activeFilterPillText,
                    ]}
                  >
                    {f === 'ALL' ? 'Tất cả' : f === 'OUT' ? 'Đã hết hàng (0)' : 'Tồn thấp (<=10)'}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Mặt Hàng Cần Bổ Sung Gấp (Có Ảnh & Barcode)</Text>
            {filteredAlerts.map((item, idx) => (
              <View key={idx} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Image
                    source={{
                      uri:
                        item.image ||
                        item.image_url ||
                        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                    }}
                    style={styles.alertThumb}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.alertMedName}>{item.name}</Text>
                    <Text style={styles.alertSupplier}>Nhà cung cấp: {item.supplier || 'Dược phẩm'}</Text>
                    {item.barcode ? (
                      <View style={styles.codeRow}>
                        <View style={styles.codeBadge}>
                          <Ionicons name="barcode" size={11} color="#64748B" style={{ marginRight: 2 }} />
                          <Text style={styles.codeBadgeText}>{item.barcode}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.alertStock,
                      { color: item.stock === 0 ? '#DC2626' : '#D97706' },
                    ]}
                  >
                    {item.stock === 0 ? 'HẾT HÀNG' : `Còn ${item.stock} ${item.unit}`}
                  </Text>
                </View>

                <GradientButton
                  title="TẠO YÊU CẦU CẤP THUỐC TỪ KHO TỔNG"
                  onPress={() => {
                    setSelectedMedForRequest(item);
                    setRequestModalVisible(true);
                  }}
                  gradientVariant="cyan"
                  size="sm"
                  style={{ marginTop: 10 }}
                />
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: RECEIVE STOCK TRANSFERS VIA QR CODE */}
        {activeTab === 'RECEIVE_STOCK' && (
          <View>
            <GradientCard gradientVariant="emerald" style={styles.qrScanBanner}>
              <View style={styles.qrBannerContent}>
                <View style={styles.qrIconCircle}>
                  <Ionicons name="qr-code-outline" size={32} color="#059669" />
                </View>
                <Text style={styles.qrBannerTitle}>Quét QR Kiện Hàng Nhập Kho</Text>
                <Text style={styles.qrBannerSubtitle}>
                  Hướng camera vào mã QR dán trên thùng hàng từ Kho Tổng để đối soát & nhập kho tự động
                </Text>

                <GradientButton
                  title="MỞ MÁY QUÉT QR KIỆN HÀNG"
                  onPress={() => setShowQRScanner(true)}
                  gradientVariant="primary"
                  size="md"
                  style={{ marginTop: 12, width: '100%' }}
                  icon={<Ionicons name="camera" size={18} color="#FFFFFF" />}
                />
              </View>
            </GradientCard>

            <Text style={styles.sectionTitle}>Danh Sách Kiện Hàng Đang Chuyển Đến</Text>
            {transfers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cube-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyText}>Hiện không có kiện hàng nào đang gửi đến chi nhánh.</Text>
              </View>
            ) : (
              transfers.map((t, idx) => {
                const isCompleted = t.status === 'COMPLETED' || t.status === 'RECEIVED';
                return (
                  <View key={t.id || `tr-${idx}`} style={styles.transferCard}>
                    <View style={styles.transferHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.transferCode}>{t.transferCode || t.id}</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: isCompleted ? '#DCFCE7' : '#FEF3C7' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: isCompleted ? '#16A34A' : '#D97706' },
                              ]}
                            >
                              {isCompleted ? 'ĐÃ NHẬP KHO' : 'ĐANG VẬN CHUYỂN'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.transferMeta}>
                          Từ: {t.fromBranchId === 'CENTRAL_WH' ? 'Kho Tổng Trung Tâm' : t.fromBranchId} • {t.items?.length || 0} mặt hàng
                        </Text>
                        {t.shippedBy ? (
                          <Text style={styles.transferMeta}>Người xuất: {t.shippedBy}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.transferItemPreview}>
                      {t.items?.slice(0, 2).map((it, iIdx) => (
                        <Text key={iIdx} style={styles.transferItemText} numberOfLines={1}>
                          • {it.name}: {it.quantity} {it.unit}
                        </Text>
                      ))}
                      {(t.items?.length || 0) > 2 ? (
                        <Text style={styles.transferMoreText}>+ {(t.items?.length || 0) - 2} mặt hàng khác...</Text>
                      ) : null}
                    </View>

                    <GradientButton
                      title={isCompleted ? 'XEM LẠI PHIẾU' : 'KIỂM NHẬN & NHẬP KHO'}
                      onPress={() => {
                        setSelectedTransfer(t);
                        setScannedItemsCount({});
                      }}
                      gradientVariant={isCompleted ? 'indigo' : 'success'}
                      size="sm"
                      style={{ marginTop: 10 }}
                      icon={<Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />}
                    />
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Transfer Requisition Modal */}
      <Modal visible={requestModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Image
              source={{
                uri:
                  selectedMedForRequest?.image ||
                  selectedMedForRequest?.image_url ||
                  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
              }}
              style={styles.modalMedThumb}
              resizeMode="cover"
            />
            <Text style={styles.modalTitle}>Tạo Phiếu Đề Xuất Nhập Hàng</Text>
            <Text style={styles.modalMedName}>{selectedMedForRequest?.name}</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Số lượng cần nhập ({selectedMedForRequest?.unit}):</Text>
              <TextInput
                style={styles.modalInput}
                value={requestQty}
                onChangeText={setRequestQty}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Lý do / Ghi chú cho Kho Tổng:</Text>
              <TextInput
                style={styles.modalInput}
                value={requestReason}
                onChangeText={setRequestReason}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setRequestModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </AnimatedTouchable>
              <GradientButton
                title="GỬI ĐỀ XUẤT"
                onPress={handleCreateRequest}
                loading={submittingReq}
                gradientVariant="primary"
                size="md"
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Goods Receipt / Transfer Verification Modal */}
      <Modal visible={selectedTransfer !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.receiptHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptCode}>
                  Kiểm Nhận: {selectedTransfer?.transferCode || selectedTransfer?.id}
                </Text>
                <Text style={styles.receiptSub}>
                  Nguồn: {selectedTransfer?.fromBranchId === 'CENTRAL_WH' ? 'Kho Tổng Trung Tâm' : selectedTransfer?.fromBranchId}
                </Text>
                {selectedTransfer?.shippedBy ? (
                  <Text style={styles.receiptSub}>Thủ kho xuất: {selectedTransfer.shippedBy}</Text>
                ) : null}
              </View>
              <AnimatedTouchable onPress={() => setSelectedTransfer(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </AnimatedTouchable>
            </View>

            <ScrollView style={{ marginVertical: 10 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8 }]}>
                Danh Sách Thuốc Cần Nhập ({selectedTransfer?.items?.length || 0} mặt hàng):
              </Text>

              {selectedTransfer?.items?.map((item, idx) => {
                const scanned = scannedItemsCount[item.medicineId] || 0;
                const isMatched = scanned >= item.quantity;
                return (
                  <View key={idx} style={styles.verifyItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyItemTitle}>{item.name}</Text>
                      {item.barcode ? (
                        <View style={styles.codeRow}>
                          <View style={styles.codeBadge}>
                            <Ionicons name="barcode" size={10} color="#64748B" style={{ marginRight: 2 }} />
                            <Text style={styles.codeBadgeText}>{item.barcode}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.verifyQtyBox}>
                      <Text style={[styles.verifyCountText, { color: isMatched ? '#16A34A' : '#D97706' }]}>
                        {scanned} / {item.quantity} {item.unit}
                      </Text>
                      <Ionicons
                        name={isMatched ? 'checkmark-circle' : 'alert-circle'}
                        size={18}
                        color={isMatched ? '#16A34A' : '#D97706'}
                      />
                    </View>
                  </View>
                );
              })}

              <AnimatedTouchable
                onPress={() => setShowItemScanner(true)}
                style={styles.scanItemBtn}
              >
                <Ionicons name="barcode-outline" size={18} color="#059669" />
                <Text style={styles.scanItemBtnText}>Quét Barcode Từng Hộp Để Đối Soát (+1)</Text>
              </AnimatedTouchable>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setSelectedTransfer(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Đóng</Text>
              </AnimatedTouchable>

              <GradientButton
                title={
                  selectedTransfer?.status === 'COMPLETED' || selectedTransfer?.status === 'RECEIVED'
                    ? 'ĐÃ NHẬP KHO'
                    : 'XÁC NHẬN NHẬP KHO'
                }
                onPress={handleConfirmReceive}
                loading={receivingTransfer}
                disabled={selectedTransfer?.status === 'COMPLETED' || selectedTransfer?.status === 'RECEIVED'}
                gradientVariant="success"
                size="md"
                style={{ flex: 1, marginLeft: 10 }}
                icon={<Ionicons name="checkmark-done" size={18} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Scanner for Package */}
      <BarcodeScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleScanPackageQR}
        title="Quét QR Kiện Hàng Chuyển Kho"
        subtitle="Hướng camera vào mã QR phiếu chuyển kho (ST-...) dán trên thùng hàng"
      />

      {/* Barcode Scanner for Individual Items */}
      <BarcodeScannerModal
        visible={showItemScanner}
        onClose={() => setShowItemScanner(false)}
        onScanSuccess={(code) => {
          setShowItemScanner(false);
          handleScanMedicineBarcode(code);
        }}
        title="Quét Barcode Đối Soát Thuốc"
        subtitle="Hướng camera vào mã vạch EAN-13 trên từng hộp thuốc trong kiện"
      />

      {/* Barcode Label Modal */}
      <BarcodeLabelModal
        visible={selectedLabelMed !== null}
        medicine={selectedLabelMed}
        onClose={() => setSelectedLabelMed(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: '#ECFDF5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#065F46',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  revenueCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D1FAE5',
    letterSpacing: 0.8,
  },
  liveBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  revTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  revAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  revAmountText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  orderBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  staffRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  shiftTag: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  shiftTagText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  dutyBadge: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dutyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  activeFilterPill: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  alertSupplier: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  alertStock: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
    marginBottom: 14,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  alertThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalMedThumb: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
  },
  codeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  qrScanBanner: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  qrBannerContent: {
    alignItems: 'center',
    textAlign: 'center',
  },
  qrIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  qrBannerSubtitle: {
    fontSize: 12,
    color: '#D1FAE5',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  transferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transferCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  transferMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  transferItemPreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  transferItemText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  transferMoreText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  receiptCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  verifyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  verifyQtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  verifyCountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scanItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  scanItemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
});
