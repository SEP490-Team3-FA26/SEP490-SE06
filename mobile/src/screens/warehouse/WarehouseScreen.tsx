// WarehouseScreen.tsx - Warehouse & Logistics Management: Map 2D, Barcode Scanner, Stock, GRN Receipts, QR Transfers, AI Inspection, Lot Tracing & AI Demand Forecasting
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ActivityIndicator,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ApiService, DEFAULT_GSP_ZONES } from '../../services/api.service';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { Medicine, StockTransfer, WarehouseZone } from '../../types/pharmacy.types';
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';
import { BarcodeLabelModal } from '../../components/barcode/BarcodeLabelModal';
import { WarehouseShelfModal } from '../../components/warehouse/WarehouseShelfModal';
import { WarehouseMap3D } from '../../components/warehouse/WarehouseMap3D';
import { MedicineLocationModal } from '../../components/warehouse/MedicineLocationModal';
import { InventoryCheckModal } from '../../components/warehouse/InventoryCheckModal';
import { buildCheckItemsFromShelf, InventoryCheckItem } from '../../services/inventoryCheckHelper';
import { TransferQRModal } from '../../components/warehouse/TransferQRModal';
import { AttendanceCheckInModal } from '../../components/attendance/AttendanceCheckInModal';
import { StaffPayslipModal } from '../../components/payroll/StaffPayslipModal';
import { DigitalHealthPassportModal } from '../../components/clinical/DigitalHealthPassportModal';
import { NearExpiryMedicineModal } from '../../components/warehouse/NearExpiryMedicineModal';
import { formatDaysLeftLabel, filterNearExpiryList } from '../../services/nearExpiryHelper';

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
  A: { bg: 'rgba(2, 132, 199, 0.1)', border: '#0284C7', text: '#0284C7', label: 'Kháng sinh', icon: '💊' },
  B: { bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B', text: '#D97706', label: 'Hạ sốt & Giảm đau', icon: '🌡️' },
  C: { bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444', text: '#DC2626', label: 'Tim mạch', icon: '❤️' },
  D: { bg: 'rgba(2, 132, 199, 0.1)', border: '#0284C7', text: '#0369A1', label: 'Tiêu hóa', icon: '🫀' },
  E: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8B5CF6', text: '#7C3AED', label: 'Thực phẩm chức năng', icon: '🌿' },
  F: { bg: 'rgba(100, 116, 139, 0.1)', border: '#64748B', text: '#475569', label: 'Vật tư y tế', icon: '🩺' },
};

export const WarehouseScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'MAP' | 'INVENTORY' | 'CHECKS' | 'RECEIPTS' | 'TRANSFERS' | 'EXPIRATION' | 'TRACE' | 'FORECAST'>('MAP');
  const [mapViewMode, setMapViewMode] = useState<'3D' | '2D'>('3D');

  // --- Biên Bản Kiểm Kê Kho (BW07) State ---
  const [inventoryChecksList, setInventoryChecksList] = useState<any[]>([]);
  const [checksLoading, setChecksLoading] = useState<boolean>(false);
  const [inventoryCheckModalVisible, setInventoryCheckModalVisible] = useState<boolean>(false);
  const [activeCheckItems, setActiveCheckItems] = useState<InventoryCheckItem[]>([]);
  const [activeCheckLocation, setActiveCheckLocation] = useState<{ zone: string; rack: string; shelf: number } | undefined>(undefined);
  const [existingCheckId, setExistingCheckId] = useState<string | undefined>(undefined);

  // --- Modal Vị Trí Thuốc 3D Sau Khi Quét Barcode ---
  const [medicineLocationModalVisible, setMedicineLocationModalVisible] = useState<boolean>(false);
  const [scannedMedicineForLocation, setScannedMedicineForLocation] = useState<any | null>(null);

  // Attendance & Shift Modal
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);
  const [showStaffIdModal, setShowStaffIdModal] = useState<boolean>(false);

  // --- Sơ Đồ Kho Tổng (Warehouse Map) State ---
  const [warehouseZones, setWarehouseZones] = useState<WarehouseZone[]>(DEFAULT_GSP_ZONES);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [selectedShelfForDetail, setSelectedShelfForDetail] = useState<{ zone: string; rack: string; shelf: number } | null>(null);
  const [highlightedTarget, setHighlightedTarget] = useState<string>('');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');

  // --- Inventory State ---
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [inventoryStats, setInventoryStats] = useState<{ totalMedicines: number; totalStock: number }>({ totalMedicines: 0, totalStock: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // --- Barcode & Label Modal State ---
  const [scannerVisible, setScannerVisible] = useState<boolean>(false);
  const [scannerPurpose, setScannerPurpose] = useState<'LOCATE_MAP' | 'SEARCH_INVENTORY' | 'TRACE_LOT' | 'RECEIVE_TRANSFER' | 'SCAN_PO'>('LOCATE_MAP');
  const [labelModalVisible, setLabelModalVisible] = useState<boolean>(false);
  const [selectedMedForLabel, setSelectedMedForLabel] = useState<Medicine | null>(null);

  // --- Stock Transfers & QR State ---
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [selectedTransferForQR, setSelectedTransferForQR] = useState<StockTransfer | null>(null);
  const [transferFilter, setTransferFilter] = useState<string>('ALL');

  // --- Goods Receipts state (GRN) & Incoming POs ---
  const [receipts, setReceipts] = useState<any[]>([]);
  const [incomingPOs, setIncomingPOs] = useState<any[]>([]);
  const [receiptSubTab, setReceiptSubTab] = useState<'PENDING_PO' | 'GRN'>('PENDING_PO');

  // AI Goods Inspection Scanner state
  const [inspectModalVisible, setInspectModalVisible] = useState<boolean>(false);
  const [selectedReceiptForInspection, setSelectedReceiptForInspection] = useState<any | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [selectedInspectionImage, setSelectedInspectionImage] = useState<string>('');
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [aiScanResult, setAiScanResult] = useState<{
    medName: string;
    aiCount: number;
    batchNo: string;
    expDate: string;
    integrity: string;
    confidence: number;
    matchPo: boolean;
    inspectionRecordId?: string;
  } | null>(null);
  const [actualCountInput, setActualCountInput] = useState<string>('');

  // Lot tracing state
  const [batchNoQuery, setBatchNoQuery] = useState<string>('');
  const [tracing, setTracing] = useState<boolean>(false);
  const [traceResult, setTraceResult] = useState<any | null>(null);

  // Expiration report state
  const [expiredList, setExpiredList] = useState<any[]>([]);
  const [expiredFilter, setExpiredFilter] = useState<'ALL' | 'EXPIRED' | 'UNDER_30' | 'UNDER_90'>('ALL');
  const [selectedExpMedDetail, setSelectedExpMedDetail] = useState<any | null>(null);

  // AI Demand Forecast state
  const [forecastPeriod, setForecastPeriod] = useState<number>(30);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastData, setForecastData] = useState<any | null>(null);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  // [REVIEWER_HOOK_WAREHOUSE]
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const modal = params.get('modal');
      if (tab && ['MAP', 'INVENTORY', 'RECEIPTS', 'TRANSFERS', 'EXPIRATION', 'TRACE', 'FORECAST'].includes(tab)) {
        setActiveTab(tab as any);
      }
      if (modal === 'checkin') setShowCheckInModal(true);
      if (modal === 'payslip') setShowPayslipModal(true);
      if (modal === 'shelf') {
        setSelectedShelfForDetail({ zone: 'A', rack: 'A1', shelf: 2 });
      }
      if (modal === 'transfer_qr') {
        setSelectedTransferForQR({
          id: 'TR-ABC-001',
          sourceBranchId: 'warehouse_hub',
          targetBranchId: 'branch_q1',
          status: 'APPROVED',
          items: [{ medicineName: 'Paracetamol 500mg', qty: 200, unit: 'Hộp' }],
        } as any);
      }
      if (modal === 'inspect') {
        setSelectedReceiptForInspection({
          id: 'PO-REC-01',
          supplierName: 'Dược Hậu Giang (DHG Pharma)',
          poCode: 'PO-2026-001',
          status: 'INSPECTING',
          items: [{ name: 'Hapacol 650mg', expectedQty: 500, unit: 'Hộp' }],
        });
        setInspectModalVisible(true);
      }
      if (modal === 'exp_detail') {
        setActiveTab('EXPIRATION');
        setSelectedExpMedDetail({
          id: 'MED-EXP-01',
          name: 'Cao dán giảm đau Salonpas Pain Relief Patch dùng trong các cơn đau vai, đau cổ (7cm x 10cm - 3 miếng)',
          activeIngredient: 'Methyl salicylate 10%, Menthol 3%',
          category: 'Thuốc dùng ngoài da / Giảm đau',
          manufacturer: 'Hisamitsu Pharmaceutical Co., Inc. (Nhật Bản)',
          origin: 'Nhật Bản',
          dosageForm: 'Cao dán giảm đau (7cm x 10cm)',
          registrationNumber: 'VN-19842-16',
          batchNo: 'INIT-BATCH-2026',
          expDate: '06/10/2026',
          mfgDate: '06/10/2024',
          daysLeft: 27,
          stock: 450,
          unit: 'Hộp',
          location: { zone: 'A', rack: 'A2', shelf: 3 },
          storageCondition: 'Nhiệt độ phòng dưới 30°C, tránh ánh nắng trực tiếp',
          status: 'NEAR_EXPIRY',
        });
      }
    }
  }, []);

  const loadChecks = useCallback(async () => {
    try {
      setChecksLoading(true);
      const list = await ApiService.getInventoryChecks();
      setInventoryChecksList(list);
    } catch (e) {
      console.warn('Error loading inventory checks:', e);
    } finally {
      setChecksLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [medList, mapRes, lowStock, transferList, grnList, checksList, statsRes, poList] = await Promise.all([
        ApiService.getMedicines({ search: searchQuery }),
        ApiService.getWarehouseMap(),
        ApiService.getLowStockReport(),
        ApiService.getStockTransfers(),
        ApiService.getGoodsReceipts(),
        ApiService.getInventoryChecks(),
        ApiService.getInventoryStats('CENTRAL_WH'),
        ApiService.getPurchaseOrders().catch(() => []),
      ]);

      if (statsRes && statsRes.totalMedicines > 0) {
        setInventoryStats({
          totalMedicines: statsRes.totalMedicines,
          totalStock: statsRes.totalStock,
        });
      }

      if (medList) {
        setMedicines(medList);
        const nearExpiry = medList
          .map((m: any) => {
            const exp = ApiService.getExpiryStatus(m);
            return {
              ...m,
              ...exp,
              expDate: exp.expDateFormatted,
              stock: m.stock ?? m.totalStock ?? 0,
              unit: m.unit || m.baseUnit || 'Đơn vị',
            };
          })
          .filter((item: any) => item.status === 'NEAR_EXPIRY' || item.status === 'EXPIRED');
        setExpiredList(nearExpiry);
      }
      if (mapRes && mapRes.zones) setWarehouseZones(mapRes.zones);
      setTransfers(transferList || []);
      setReceipts(grnList || []);

      // Lọc các đơn PO cần kiểm đếm / đang vận chuyển nhập kho
      if (Array.isArray(poList)) {
        const pending = poList.filter((p: any) =>
          ['SHIPPING', 'RECEIVING', 'PARTIAL_RECEIVED', 'APPROVED', 'ORDERED', 'SENT', 'DELIVERING', 'PENDING_INSPECTION', 'PENDING_APPROVAL'].includes(p.status)
        );
        setIncomingPOs(pending);
      }

      if (checksList) setInventoryChecksList(checksList);
    } catch (e) {
      console.warn('Error loading warehouse data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tự động mở phiên kiểm đếm đơn PO khi nhận được poId từ Deep Link hoặc Navigation params
  useEffect(() => {
    const deepPoId = route?.params?.poId;
    if (deepPoId && typeof deepPoId === 'string') {
      const handleDeepPo = async () => {
        try {
          const po = await ApiService.getPurchaseOrderById(deepPoId);
          if (po) {
            const poReceipt = {
              id: `GRN-${po.poCode || (po._id ? po._id.slice(-6).toUpperCase() : 'PO')}`,
              poCode: po.poCode || po._id,
              poId: po._id,
              supplier: po.supplierName || 'Nhà cung cấp',
              status: 'INSPECTING',
              items: (po.items || []).map((it: any, idx: number) => ({
                medicineId: it.medicineId || it.id || `item_${idx}`,
                name: it.medicineName || it.name || `Thuốc #${idx + 1}`,
                expected: Number(it.quantity) || 100,
                actual: 0,
                unit: it.unit || 'Hộp',
                status: 'PENDING',
                batchNo: it.batchNo || '',
                expDate: it.expDate || '',
              })),
            };
            setReceipts((prev) => {
              const exists = prev.some((r) => r.id === poReceipt.id || r.poCode === poReceipt.poCode);
              return exists ? prev : [poReceipt, ...prev];
            });
            setActiveTab('RECEIPTS');
            handleStartInspection(poReceipt);
            showToast.success('Đồng bộ đơn PO', `Mở phiên kiểm đếm kiện hàng: ${poReceipt.poCode}`);
          }
        } catch (err) {
          console.warn('Lỗi mở đơn PO từ deep link:', err);
        }
      };
      handleDeepPo();
    }
  }, [route?.params?.poId]);

  // --- Scanner Handler ---
  const handleBarcodeScanned = async (scannedCode: string, type?: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    if (scannerPurpose === 'LOCATE_MAP') {
      // Find location of this barcode in warehouse
      const results = await ApiService.warehouseSearch(code);
      if (results && results.length > 0) {
        const first = results[0];
        setHighlightedTarget(first.targetId);
        setScannedMedicineForLocation({
          id: first.medicineId,
          name: first.name,
          category: (first as any).category,
          sku: (first as any).sku,
          barcode: code,
          image: (first as any).image,
          stock: (first as any).stock || 100,
          unit: (first as any).unit || 'Hộp',
          location: first.location,
        });
        setMedicineLocationModalVisible(true);
      } else {
        // Fallback barcode lookup
        const lookup = await ApiService.getByBarcode(code);
        if (lookup && lookup.found && lookup.medicine) {
          const loc = lookup.fefoBatch?.location || { zone: 'B', rack: 'B1', shelf: 1 };
          const targetId = `${loc.zone}-${loc.rack}-${loc.shelf}`;
          setHighlightedTarget(targetId);
          setScannedMedicineForLocation({
            ...lookup.medicine,
            fefoBatch: lookup.fefoBatch,
            location: loc,
            stock: lookup.totalBranchStock || lookup.medicine.stock || 0,
            barcode: code,
          });
          setMedicineLocationModalVisible(true);
        } else {
          showToast.error('Không tìm thấy', `Mã ${code} chưa được gán vị trí trên sơ đồ kho.`);
        }
      }
    } else if (scannerPurpose === 'SEARCH_INVENTORY') {
      setSearchQuery(code);
      showToast.info('Đang lọc kho', `Mã: ${code}`);
    } else if (scannerPurpose === 'TRACE_LOT') {
      setBatchNoQuery(code);
      handleTraceLotWithCode(code);
    } else if (scannerPurpose === 'RECEIVE_TRANSFER' || scannerPurpose === 'SCAN_PO') {
      try {
        let cleanCode = code.trim();

        // 0. Bóc tách và đồng bộ trực tiếp nếu mã quét là gói dữ liệu JSON từ Web (Cross-Platform Instant Sync)
        if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
          try {
            const parsed = JSON.parse(cleanCode);
            if (parsed.type === 'PO_SYNC' || (parsed.poId && parsed.items)) {
              const poReceipt = {
                id: `GRN-${parsed.poCode || (parsed.poId ? String(parsed.poId).slice(-6).toUpperCase() : 'PO')}`,
                poCode: parsed.poCode || parsed.poId || 'PO-SYNC',
                poId: parsed.poId,
                supplier: parsed.supplier || parsed.supplierName || 'Nhà cung cấp',
                status: 'INSPECTING',
                items: (parsed.items || []).map((it: any, idx: number) => ({
                  medicineId: it.medicineId || it.id || `item_${idx}`,
                  name: it.name || it.medicineName || `Thuốc #${idx + 1}`,
                  expected: Number(it.expected || it.quantity) || 100,
                  actual: 0,
                  unit: it.unit || 'Hộp',
                  status: 'PENDING',
                  batchNo: it.batchNo || '',
                  expDate: it.expDate || '',
                  barcode: it.barcode || '',
                  sku: it.sku || '',
                })),
              };
              setReceipts((prev) => {
                const exists = prev.some((r) => r.id === poReceipt.id || r.poCode === poReceipt.poCode);
                return exists ? prev : [poReceipt, ...prev];
              });
              setActiveTab('RECEIPTS');
              handleStartInspection(poReceipt);
              showToast.success('Đồng bộ đơn PO thành công', `Mở phiên kiểm đếm kiện hàng: ${poReceipt.poCode}`);
              return;
            }
            if (parsed.poId) {
              cleanCode = String(parsed.poId).trim();
            }
          } catch (_) {}
        }

        // Bóc tách ID nếu mã quét là đường link (URL) Web
        if (cleanCode.includes('poId=')) {
          const match = cleanCode.match(/poId=([a-zA-Z0-9_-]+)/);
          if (match) cleanCode = match[1];
        } else if (cleanCode.includes('grnId=')) {
          const match = cleanCode.match(/grnId=([a-zA-Z0-9_-]+)/);
          if (match) cleanCode = match[1];
        }

        // 1. Kiểm tra nếu mã quét từ Web là mã đơn PO hoặc GRN (Tra cứu trực tiếp qua API Gateway)
        let matchedPo = null;
        if (cleanCode.length >= 3) {
          matchedPo = await ApiService.getPurchaseOrderById(cleanCode).catch(() => null);
        }

        // Nếu chưa thấy, mới fallback tìm trong danh sách PO (tìm không phân biệt hoa thường và hỗ trợ hậu tố)
        if (!matchedPo) {
          const pos = incomingPOs.length > 0 ? incomingPOs : await ApiService.getPurchaseOrders().catch(() => []);
          const targetClean = cleanCode.toLowerCase().replace(/^po[-_:\s]*/i, '');
          matchedPo = Array.isArray(pos)
            ? pos.find((p: any) => {
                const pId = String(p._id || p.id || '').toLowerCase();
                const pCode = String(p.poCode || '').toLowerCase();
                const codeLower = cleanCode.toLowerCase();
                return (
                  pId === codeLower ||
                  pCode === codeLower ||
                  pId === targetClean ||
                  pCode === targetClean ||
                  (targetClean.length >= 4 && pId.endsWith(targetClean)) ||
                  (targetClean.length >= 4 && pCode.includes(targetClean))
                );
              })
            : null;
        }

        if (matchedPo) {
          const poReceipt = {
            id: `GRN-${matchedPo.poCode || (matchedPo._id ? matchedPo._id.slice(-6).toUpperCase() : 'PO')}`,
            poCode: matchedPo.poCode || matchedPo._id,
            poId: matchedPo._id,
            supplier: matchedPo.supplierName || 'Nhà cung cấp',
            status: 'INSPECTING',
            items: (matchedPo.items || []).map((it: any, idx: number) => ({
              medicineId: it.medicineId || it.id || `item_${idx}`,
              name: it.medicineName || it.name || `Thuốc #${idx + 1}`,
              expected: Number(it.quantity) || 100,
              actual: 0,
              unit: it.unit || 'Hộp',
              status: 'PENDING',
              batchNo: it.batchNo || '',
              expDate: it.expDate || '',
            })),
          };
          // Đảm bảo đưa phiếu PO vào danh sách receipts để không bị mất khi thoát hoặc hoàn tất
          setReceipts((prev) => {
            const exists = prev.some((r) => r.id === poReceipt.id || r.poCode === poReceipt.poCode);
            return exists ? prev : [poReceipt, ...prev];
          });
          setActiveTab('RECEIPTS');
          handleStartInspection(poReceipt);
          showToast.success('Đồng bộ đơn PO', `Mở phiên kiểm đếm kiện hàng cho đơn: ${poReceipt.poCode}`);
          return;
        }

        // 2. Kiểm tra phiếu nhập kho trong state
        const matchedReceipt = receipts.find((r) => r.id === cleanCode || r.poCode === cleanCode || (r as any)._id === cleanCode);
        if (matchedReceipt) {
          setActiveTab('RECEIPTS');
          handleStartInspection(matchedReceipt);
          showToast.success('Nhận diện phiếu nhập', `Đang mở phiếu: ${matchedReceipt.id}`);
          return;
        }

        // 3. Kiểm tra trong danh sách phiếu chuyển kho
        const transfer = transfers.find((t) => t.transferCode === cleanCode || t.id === cleanCode || (t as any)._id === cleanCode);
        if (transfer) {
          Alert.alert(
            'Xác Nhận Nhập Hàng Bằng QR',
            `Phiếu: ${transfer.transferCode}\nTừ: ${transfer.fromBranchName || transfer.fromBranchId}\nSố lượng: ${transfer.items?.length || 0} loại thuốc.\nBạn muốn xác nhận nhập kho?`,
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xác Nhận Nhập Kho',
                onPress: async () => {
                  try {
                    const res = await ApiService.receiveStockTransfer(transfer.id || (transfer as any)._id || '', {
                      receivedBy: 'Thủ kho di động',
                      inspectionNote: 'Quét mã QR kiện hàng thành công',
                    });
                    if (res && res.success !== false) {
                      showToast.success('Thành công', `Đã nhập kho phiếu ${transfer.transferCode}!`);
                      loadData();
                    } else {
                      showToast.error('Không thành công', res?.message || 'Lỗi nhập kho');
                    }
                  } catch (e: any) {
                    showToast.error('Lỗi', e?.message || 'Không thể xác nhận nhập kho');
                  }
                },
              },
            ]
          );
          return;
        }

        showToast.error(
          'Mã phiếu không tồn tại',
          `Không tìm thấy đơn PO #${cleanCode.length > 6 ? cleanCode.slice(-6).toUpperCase() : cleanCode} (${cleanCode}) trên máy chủ.`
        );
      } catch (err: any) {
        showToast.error('Lỗi xử lý mã quét', err?.message || 'Không thể xử lý mã');
      }
    }
  };

  // --- Map Search ---
  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    const results = await ApiService.warehouseSearch(mapSearchQuery.trim());
    if (results && results.length > 0) {
      setHighlightedTarget(results[0].targetId);
      showToast.success('Tìm thấy vị trí', `Khu ${results[0].location.zone} - Kệ ${results[0].location.rack} - Tầng ${results[0].location.shelf}`);
    } else {
      showToast.info('Thông báo', `Không tìm thấy kết quả cho: "${mapSearchQuery}"`);
    }
  };

  // --- Lot Tracing ---
  const handleTraceLotWithCode = async (batchNo: string) => {
    if (!batchNo.trim()) return;
    try {
      setTracing(true);
      const res = await ApiService.traceLot(batchNo);
      if (res && res.batchNo) {
        setTraceResult(res);
      } else {
        setTraceResult(null);
        showToast.info('Thông báo', `Không tìm thấy dữ liệu truy vết cho lô ${batchNo}`);
      }
    } catch {
      showToast.error('Lỗi', 'Không thể truy vết lô thuốc.');
    } finally {
      setTracing(false);
    }
  };

  const handleTraceLot = () => {
    handleTraceLotWithCode(batchNoQuery);
  };

  // --- AI Inspection Handlers ---
  const getMedicineForItem = useCallback(
    (item: any) => {
      if (!item) return null;
      return (
        medicines.find(
          (m) =>
            m.id === item.medicineId ||
            m._id === item.medicineId ||
            (item.name && m.name && m.name.toLowerCase().includes(item.name.toLowerCase())) ||
            (item.name && m.name && item.name.toLowerCase().includes(m.name.toLowerCase()))
        ) || null
      );
    },
    [medicines]
  );

  const getItemImage = (item: any) => {
    if (item?.image && item.image.startsWith('http')) return item.image;
    const med = getMedicineForItem(item);
    return med?.image || med?.image_url || 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg';
  };

  const handleStartInspectionFromPo = (po: any) => {
    const poCodeStr = po.poCode || (po._id ? String(po._id).slice(-6).toUpperCase() : 'PO');
    const poReceipt = {
      id: `GRN-${poCodeStr}`,
      poCode: po.poCode || po._id,
      poId: po._id || po.id,
      supplier: po.supplierName || (po.supplier?.name || po.supplier) || 'Nhà cung cấp',
      status: 'INSPECTING',
      items: (po.items || []).map((it: any, idx: number) => ({
        medicineId: it.medicineId || it.id || `item_${idx}`,
        name: it.medicineName || it.name || `Thuốc #${idx + 1}`,
        expected: Number(it.quantity || it.expected) || 100,
        actual: 0,
        unit: it.unit || 'Hộp',
        status: 'PENDING',
        batchNo: it.batchNo || '',
        expDate: it.expDate || '',
        barcode: it.barcode || '',
        sku: it.sku || '',
      })),
    };
    setReceipts((prev) => {
      const exists = prev.some((r) => r.id === poReceipt.id || r.poCode === poReceipt.poCode);
      return exists ? prev : [poReceipt, ...prev];
    });
    setActiveTab('RECEIPTS');
    handleStartInspection(poReceipt);
    showToast.success('Bắt đầu kiểm đếm', `Mở phiên kiểm đếm kiện hàng: ${poReceipt.poCode}`);
  };

  const handleStartInspection = (receipt: any) => {
    setSelectedReceiptForInspection(receipt);
    setSelectedItemIndex(0);
    setAiScanResult(null);
    const firstItem = receipt.items?.[0];
    setActualCountInput(String(firstItem?.actual ?? firstItem?.expected ?? '10'));
    setSelectedInspectionImage(getItemImage(firstItem));
    setInspectModalVisible(true);
  };

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showToast.error('Cần quyền camera', 'Vui lòng cấp quyền trong Cài đặt.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setSelectedInspectionImage(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Lỗi chụp ảnh kiểm hàng:', e);
    }
  };

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setSelectedInspectionImage(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Lỗi chọn ảnh thư viện:', e);
    }
  };

  // --- AI Demand Forecast ---
  const handleLoadForecast = async (period: number = 30) => {
    try {
      setForecastLoading(true);
      const res = await ApiService.getAIForecast(period);
      if (res && (res.predictedDemand || res.topDemanded)) {
        setForecastData(res);
      } else {
        setForecastData(null);
        showToast.info('Thông báo', 'Hệ thống chưa đủ dữ liệu bán hàng để tính toán dự báo AI.');
      }
    } catch (e) {
      console.warn('Lỗi dự báo:', e);
      setForecastData(null);
    } finally {
      setForecastLoading(false);
    }
  };

  const handleRunAiInspection = async () => {
    if (!selectedReceiptForInspection) return;
    setIsAiScanning(true);
    setAiScanResult(null);

    try {
      const currentItem = selectedReceiptForInspection.items[selectedItemIndex];
      const res = await ApiService.inspectReceiptItemAI(
        selectedReceiptForInspection.id || selectedReceiptForInspection._id,
        currentItem.id || String(selectedItemIndex),
        selectedInspectionImage
      );

      if (res && res.success !== false && typeof res.aiCount === 'number') {
        const medicineName = currentItem?.medName || currentItem?.medicineName || currentItem?.name || 'Dược phẩm';
        const scanOutput = {
          medName: medicineName,
          aiCount: Number(res.aiCount),
          batchNo: String(res.batchNo || currentItem?.batchNo || `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${100 + selectedItemIndex * 12}`),
          expDate: String(res.expDate || (currentItem?.expDate ? new Date(currentItem.expDate).toLocaleDateString('vi-VN') : '31/12/2028')),
          integrity: res.difference === 0 ? 'Nguyên vẹn 100%' : `Chênh lệch: ${res.difference > 0 ? '+' : ''}${res.difference}`,
          confidence: Number(res.confidence ?? 95),
          matchPo: res.difference === 0,
          inspectionRecordId: res.inspectionRecordId ? String(res.inspectionRecordId) : undefined,
        };

        setAiScanResult(scanOutput);
        setActualCountInput(String(scanOutput.aiCount));
        showToast.success('AI Vision', `Nhận diện thành công ${scanOutput.aiCount} hộp (Khớp: ${scanOutput.confidence}%)`);
      } else {
        const errMsg = res?.message || 'Không thể nhận diện hình ảnh từ máy chủ AI. Vui lòng nhập số lượng kiểm đếm thủ công.';
        showToast.error('Kiểm định thất bại', errMsg);
      }
    } catch (err: any) {
      showToast.error('Lỗi kiểm định', err?.message || 'Không thể kết nối đến máy chủ AI Vision.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleConfirmItemInspection = () => {
    if (!selectedReceiptForInspection) return;
    const currentItem = selectedReceiptForInspection.items[selectedItemIndex];
    const parsed = parseInt(actualCountInput, 10);
    const confirmedQty = !isNaN(parsed) && parsed >= 0 ? parsed : Number(currentItem?.expected ?? 10);

    const nextItems = [...selectedReceiptForInspection.items];
    nextItems[selectedItemIndex] = {
      ...nextItems[selectedItemIndex],
      actual: confirmedQty,
      status: 'VERIFIED',
    };

    const nextReceipts = receipts.some((r) => r.id === selectedReceiptForInspection.id)
      ? receipts.map((r) => (r.id === selectedReceiptForInspection.id ? { ...r, items: nextItems } : r))
      : [{ ...selectedReceiptForInspection, items: nextItems }, ...receipts];

    setReceipts(nextReceipts);
    setSelectedReceiptForInspection((prev: any) => ({
      ...prev,
      items: nextItems,
    }));

    showToast.success('Đã xác nhận', `Mặt hàng "${currentItem?.name}" đã xác nhận đủ ${confirmedQty} hộp!`);

    // Tự động tìm và chuyển sang mặt hàng chưa kiểm tiếp theo
    const nextUnverifiedIdx = nextItems.findIndex((it, idx) => idx > selectedItemIndex && it.status !== 'VERIFIED');
    const fallbackIdx = nextItems.findIndex((it) => it.status !== 'VERIFIED');
    const targetIdx = nextUnverifiedIdx !== -1 ? nextUnverifiedIdx : fallbackIdx;

    if (targetIdx !== -1) {
      setSelectedItemIndex(targetIdx);
      setAiScanResult(null);
      const targetItem = nextItems[targetIdx];
      setActualCountInput(String(targetItem.actual ?? targetItem.expected ?? '10'));
      setSelectedInspectionImage(getItemImage(targetItem));
    }
  };

  const handleFinishAndStockReceipt = async () => {
    if (!selectedReceiptForInspection) return;
    const receiptId = selectedReceiptForInspection.id || selectedReceiptForInspection._id;

    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId || r.poCode === selectedReceiptForInspection.poCode
          ? { ...r, status: 'COMPLETED' }
          : r
      )
    );
    setInspectModalVisible(false);

    try {
      if (receiptId && !receiptId.startsWith('GRN-PO')) {
        await ApiService.approveGoodsReceipt(receiptId);
      } else if (selectedReceiptForInspection.poId) {
        // Đồng bộ dữ liệu kiểm đếm lên Redis/WebSocket để Web PC tiếp nhận tức thì
        const inspectionPayload = {
          poId: selectedReceiptForInspection.poId,
          inspectorName: 'Thủ kho Mobile',
          status: 'COMPLETED',
          items: (selectedReceiptForInspection.items || []).map((it: any) => ({
            _id: it.medicineId || it.id,
            medicineId: it.medicineId || it.id,
            name: it.name,
            expectedQty: it.expected,
            actualQty: it.actual,
            batchNo: it.batchNo || 'LOT-2026',
            expDate: it.expDate || '2028-12-31',
            status: it.status,
          })),
        };
        await ApiService.savePoInspection(selectedReceiptForInspection.poId, inspectionPayload);
        await ApiService.submitInspection(selectedReceiptForInspection.poId).catch(() => null);
      }
    } catch (e) {
      console.warn('Lỗi lưu kết quả kiểm đếm lên backend:', e);
    }

    showToast.success('Hoàn tất', `Đã nhập kho GSP thành công toàn bộ lô hàng ${receiptId}!`);
  };

  const handleApproveReceipt = (id: string) => {
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'COMPLETED' } : r)));
    showToast.success('Thành công', `Đã duyệt nhập kho phiếu ${id}`);
  };

  // --- Filtered Zones ---
  const displayedZones = useMemo(() => {
    if (selectedZoneFilter === 'ALL') return warehouseZones;
    return warehouseZones.filter((z) => z.zoneId === selectedZoneFilter);
  }, [warehouseZones, selectedZoneFilter]);

  // --- Filtered Transfers ---
  const displayedTransfers = useMemo(() => {
    if (transferFilter === 'ALL') return transfers;
    return transfers.filter((t) => t.status === transferFilter);
  }, [transfers, transferFilter]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <HeaderBar
        title="Quản Lý Kho Dược GSP"
        subtitle="Sơ đồ 2D, Quét Barcode/QR, Tồn kho & Kiểm nhận"
        gradientVariant="sky"
        rightAction={{
          icon: 'person-circle-outline',
          onPress: () => navigation.navigate('ProfileScreen'),
        }}
        secondaryRightAction={{
          icon: 'notifications-outline',
          onPress: () => navigation.navigate('NotificationListScreen'),
        }}
      />

      {/* Quick Shift & Payslip Bar */}
      <View style={styles.shiftActionBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shiftActionBarContent}
        >
          <AnimatedTouchable
            onPress={() => setShowCheckInModal(true)}
            style={[styles.shiftActionBtn, styles.checkInBtn]}
          >
            <Ionicons name="location" size={16} color="#0284C7" />
            <Text style={[styles.shiftActionText, { color: '#0284C7' }]}>
              Điểm Danh GPS Kho Tổng
            </Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setShowPayslipModal(true)}
            style={[styles.shiftActionBtn, styles.payslipBtn]}
          >
            <Ionicons name="receipt-outline" size={16} color="#0284C7" />
            <Text style={[styles.shiftActionText, { color: '#0284C7' }]}>Phiếu Lương</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setShowStaffIdModal(true)}
            style={[styles.shiftActionBtn, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}
          >
            <Ionicons name="card-outline" size={16} color="#0284C7" />
            <Text style={[styles.shiftActionText, { color: '#0284C7', fontWeight: '700' }]}>Thẻ Nhân Sự GPP</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => {
              setScannerPurpose('SCAN_PO');
              setScannerVisible(true);
            }}
            style={[styles.shiftActionBtn, { borderColor: '#818CF8', backgroundColor: '#EEF2FF' }]}
          >
            <Ionicons name="scan-circle" size={17} color="#4F46E5" />
            <Text style={[styles.shiftActionText, { color: '#4F46E5', fontWeight: '700' }]}>Quét Đơn PO</Text>
          </AnimatedTouchable>
        </ScrollView>
      </View>

      {/* Horizontal Scrollable Tabs Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          <AnimatedTouchable
            onPress={() => setActiveTab('MAP')}
            style={[styles.tabItem, activeTab === 'MAP' && styles.activeTabItem]}
          >
            <Ionicons name="map" size={15} color={activeTab === 'MAP' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'MAP' && styles.activeTabText]}>Sơ Đồ Kho</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('INVENTORY')}
            style={[styles.tabItem, activeTab === 'INVENTORY' && styles.activeTabItem]}
          >
            <Ionicons name="cube" size={15} color={activeTab === 'INVENTORY' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'INVENTORY' && styles.activeTabText]}>Tồn Kho</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => {
              setActiveTab('CHECKS');
              loadChecks();
            }}
            style={[styles.tabItem, activeTab === 'CHECKS' && styles.activeTabItem]}
          >
            <Ionicons name="clipboard" size={15} color={activeTab === 'CHECKS' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'CHECKS' && styles.activeTabText]}>Kiểm Kê Kho</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('TRANSFERS')}
            style={[styles.tabItem, activeTab === 'TRANSFERS' && styles.activeTabItem]}
          >
            <Ionicons name="swap-horizontal" size={15} color={activeTab === 'TRANSFERS' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'TRANSFERS' && styles.activeTabText]}>Xuất Chuyển (QR)</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('RECEIPTS')}
            style={[styles.tabItem, activeTab === 'RECEIPTS' && styles.activeTabItem]}
          >
            <Ionicons name="document-text" size={15} color={activeTab === 'RECEIPTS' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'RECEIPTS' && styles.activeTabText]}>Kiểm Nhận</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('EXPIRATION')}
            style={[styles.tabItem, activeTab === 'EXPIRATION' && styles.activeTabItem]}
          >
            <Ionicons name="alarm" size={15} color={activeTab === 'EXPIRATION' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'EXPIRATION' && styles.activeTabText]}>Hết Hạn</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('TRACE')}
            style={[styles.tabItem, activeTab === 'TRACE' && styles.activeTabItem]}
          >
            <Ionicons name="git-branch" size={15} color={activeTab === 'TRACE' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'TRACE' && styles.activeTabText]}>Truy Lô</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('FORECAST')}
            style={[styles.tabItem, activeTab === 'FORECAST' && styles.activeTabItem]}
          >
            <Ionicons name="analytics" size={15} color={activeTab === 'FORECAST' ? '#0284C7' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'FORECAST' && styles.activeTabText]}>Dự Báo AI</Text>
          </AnimatedTouchable>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#0284C7']} />}
      >
        {/* ========================================================= */}
        {/* TAB 1: SƠ ĐỒ KHO TỔNG (WAREHOUSE MAP) */}
        {/* ========================================================= */}
        {activeTab === 'MAP' && (
          <View>
            {/* 3D vs 2D Switch Bar */}
            <View style={styles.mapModeToggleRow}>
              <TouchableOpacity
                onPress={() => setMapViewMode('3D')}
                style={[styles.mapModeToggleBtn, mapViewMode === '3D' && styles.mapModeToggleBtnActive]}
              >
                <Ionicons name="cube" size={15} color={mapViewMode === '3D' ? '#0284C7' : '#64748B'} />
                <Text style={[styles.mapModeToggleText, mapViewMode === '3D' && styles.mapModeToggleTextActive]}>
                  Sơ Đồ 3D Không Gian
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMapViewMode('2D')}
                style={[styles.mapModeToggleBtn, mapViewMode === '2D' && styles.mapModeToggleBtnActive]}
              >
                <Ionicons name="grid" size={15} color={mapViewMode === '2D' ? '#0284C7' : '#64748B'} />
                <Text style={[styles.mapModeToggleText, mapViewMode === '2D' && styles.mapModeToggleTextActive]}>
                  Mặt Bằng 2D Phẳng
                </Text>
              </TouchableOpacity>
            </View>

            {mapViewMode === '3D' ? (
              <WarehouseMap3D
                zones={warehouseZones}
                selectedZoneFilter={selectedZoneFilter}
                onSelectZoneFilter={setSelectedZoneFilter}
                highlightedTarget={highlightedTarget}
                onSelectShelf={(loc) => setSelectedShelfForDetail(loc)}
                onClearHighlight={() => setHighlightedTarget('')}
              />
            ) : (
              <>
            {/* KPI Summary */}
            <View style={styles.kpiRow}>
              <GradientCard gradientVariant="ocean" style={styles.kpiCard}>
                <Ionicons name="layers" size={20} color="#FFFFFF" />
                <Text style={styles.kpiValue}>{warehouseZones.length} Phân Khu</Text>
                <Text style={styles.kpiLabel}>Chuẩn GSP (Zone A-F)</Text>
              </GradientCard>
              <GradientCard gradientVariant="sky" style={styles.kpiCard}>
                <Ionicons name="cube" size={20} color="#FFFFFF" />
                <Text style={styles.kpiValue}>
                  {medicines.reduce((sum, m) => sum + m.stock, 0).toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.kpiLabel}>Tổng tồn kho thực tế</Text>
              </GradientCard>
            </View>

            {/* Scan-to-Locate Barcode Search Box */}
            <View style={styles.mapSearchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.mapSearchInput}
                placeholder="Tìm thuốc hoặc quét Barcode định vị kệ..."
                placeholderTextColor="#94A3B8"
                value={mapSearchQuery}
                onChangeText={setMapSearchQuery}
                onSubmitEditing={handleMapSearch}
              />
              <TouchableOpacity
                onPress={() => {
                  setScannerPurpose('LOCATE_MAP');
                  setScannerVisible(true);
                }}
                style={styles.scanMapBtn}
              >
                <Ionicons name="barcode-outline" size={18} color="#FFFFFF" />
                <Text style={styles.scanMapBtnText}>Quét Mã</Text>
              </TouchableOpacity>
            </View>

            {/* Highlight Alert Banner if targeted */}
            {highlightedTarget ? (
              <View style={styles.targetBanner}>
                <Ionicons name="location" size={18} color="#0284C7" />
                <Text style={styles.targetBannerText}>
                  Đang định vị kệ: <Text style={{ fontWeight: 'bold' }}>{highlightedTarget}</Text>
                </Text>
                <TouchableOpacity onPress={() => setHighlightedTarget('')}>
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Zone Filter Horizontal Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setSelectedZoneFilter('ALL')}
                style={[styles.zonePill, selectedZoneFilter === 'ALL' && styles.activeZonePill]}
              >
                <Text style={[styles.zonePillText, selectedZoneFilter === 'ALL' && styles.activeZonePillText]}>
                  Tất cả khu
                </Text>
              </TouchableOpacity>
              {['A', 'B', 'C', 'D', 'E', 'F'].map((zKey) => {
                const zMeta = ZONE_COLORS[zKey];
                const isActive = selectedZoneFilter === zKey;
                return (
                  <TouchableOpacity
                    key={zKey}
                    onPress={() => setSelectedZoneFilter(zKey)}
                    style={[
                      styles.zonePill,
                      isActive && { backgroundColor: zMeta.border, borderColor: zMeta.border },
                    ]}
                  >
                    <Text style={[styles.zonePillText, isActive && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                      {zMeta.icon} Khu {zKey} ({zMeta.label})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2D Interactive Grid of Racks & Shelves */}
            <Text style={styles.sectionTitle}>Mặt Bằng Tầng Kệ Kho Tổng</Text>
            {displayedZones.map((zone, zIdx) => {
              const zoneKey = zone.zoneId || `zone-${zIdx}`;
              const meta = ZONE_COLORS[zone.zoneId] || ZONE_COLORS['A'];
              return (
                <View key={`zone_block_${zoneKey}_${zIdx}`} style={[styles.zoneBlock, { borderColor: meta.border }]}>
                  {/* Zone Header */}
                  <View style={[styles.zoneHeader, { backgroundColor: meta.bg }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                      <Text style={[styles.zoneTitle, { color: meta.text }]}>
                        {zone.name || `Khu ${zone.zoneId || zoneKey} - ${meta.label}`}
                      </Text>
                    </View>
                    <View style={[styles.zoneTag, { borderColor: meta.border }]}>
                      <Text style={[styles.zoneTagText, { color: meta.text }]}>{zone.category}</Text>
                    </View>
                  </View>

                  {/* Racks list */}
                  <View style={styles.racksContainer}>
                    {zone.racks?.map((rack, rIdx) => (
                      <View key={`rack_${zoneKey}_${rack.rackId || rIdx}`} style={styles.rackCard}>
                        <View style={styles.rackHeader}>
                          <Ionicons name="server-outline" size={14} color="#64748B" />
                          <Text style={styles.rackTitle}>Kệ {rack.rackId}</Text>
                        </View>

                        {/* Shelves rows inside rack */}
                        <View style={styles.shelvesGrid}>
                          {rack.shelves?.map((shelf, sIdx) => {
                            const targetId = `${zone.zoneId || zoneKey}-${rack.rackId}-${shelf.shelf}`;
                            const isHighlighted = highlightedTarget === targetId;
                            const isWarning = shelf.status === 'NEAR_EXPIRY';

                            return (
                              <TouchableOpacity
                                key={`shelf_${zoneKey}_${rack.rackId}_${shelf.shelf || sIdx}`}
                                onPress={() =>
                                  setSelectedShelfForDetail({
                                    zone: zone.zoneId,
                                    rack: rack.rackId,
                                    shelf: shelf.shelf,
                                  })
                                }
                                style={[
                                  styles.shelfBtn,
                                  isHighlighted && styles.shelfHighlighted,
                                  isWarning && styles.shelfWarning,
                                ]}
                              >
                                <View style={styles.shelfTopRow}>
                                  <Text style={[styles.shelfNum, isHighlighted && { color: '#0284C7', fontWeight: 'bold' }]}>
                                    Tầng {shelf.shelf}
                                  </Text>
                                  {isWarning ? (
                                    <Ionicons name="warning" size={12} color="#D97706" />
                                  ) : (
                                    <View style={styles.dotOnline} />
                                  )}
                                </View>
                                <Text style={styles.shelfStockText}>
                                  {shelf.totalStock} tồn ({shelf.batchCount} lô)
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB KIỂM KÊ KHO (INVENTORY CHECKS - BW07) */}
        {/* ========================================================= */}
        {activeTab === 'CHECKS' && (
          <View>
            {/* Header Thống kê & Nút tạo mới */}
            <View style={styles.checksHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Biên Bản Kiểm Kê Kho</Text>
                <Text style={styles.sectionSubtitle}>
                  Kiểm đếm thực tế · Đối soát sai lệch · Tự động cân bằng tồn kho GSP
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setActiveCheckLocation(undefined);
                  setActiveCheckItems([]);
                  setExistingCheckId(undefined);
                  setInventoryCheckModalVisible(true);
                }}
                style={styles.createCheckBtn}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.createCheckBtnText}>Tạo Đợt Mới</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions Card */}
            <View style={styles.checksNoticeCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="bulb-outline" size={18} color="#0284C7" />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0369A1' }}>
                  Kiểm Kê Nhanh Từ Sơ Đồ Kho
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>
                Bạn có thể vào tab "Sơ Đồ Kho", chạm vào bất kỳ tầng/kệ nào và bấm "Kiểm Kê Tầng/Kệ Này" để nạp sẵn toàn bộ danh sách thuốc mà không cần tìm kiếm thủ công!
              </Text>
            </View>

            {/* Refreshing indicator or Empty State or List of Checks */}
            {checksLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0284C7" />
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>
                  Đang tải danh sách biên bản kiểm kê...
                </Text>
              </View>
            ) : inventoryChecksList.length === 0 ? (
              <View style={styles.checksEmptyBox}>
                <Ionicons name="clipboard-outline" size={54} color="#CBD5E1" />
                <Text style={styles.checksEmptyTitle}>Chưa có biên bản kiểm kê nào</Text>
                <Text style={styles.checksEmptySub}>
                  Bấm "Tạo Đợt Mới" hoặc chọn tầng kệ trên sơ đồ kho để lập biên bản kiểm kê đầu tiên.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveCheckLocation(undefined);
                    setActiveCheckItems([]);
                    setExistingCheckId(undefined);
                    setInventoryCheckModalVisible(true);
                  }}
                  style={styles.emptyActionBtn}
                >
                  <Text style={styles.emptyActionBtnText}>Bắt Đầu Kiểm Kê Ngay</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.checksListContainer}>
                {inventoryChecksList.map((check: any, cIdx: number) => {
                  const isCompleted = check.status === 'COMPLETED';
                  const itemsCount = Array.isArray(check.items) ? check.items.length : 0;
                  const dateStr = check.createdAt
                    ? new Date(check.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Chưa cập nhật';

                  return (
                    <TouchableOpacity
                      key={`chk_${check._id || check.id || cIdx}`}
                      activeOpacity={0.85}
                      onPress={() => {
                        const formattedItems = (check.items || []).map((it: any) => ({
                          medicineId: it.medicineId || it.id || '',
                          medicineName: it.medicineName || 'Dược phẩm',
                          sku: it.sku || '',
                          barcode: it.barcode || '',
                          batchId: it.batchId || '',
                          batchNo: it.batchNo || '',
                          expDate: it.expDate || '',
                          systemStock: Number(it.systemStock || 0),
                          actualStock: Number(it.actualStock || 0),
                          difference: Number(it.difference || 0),
                          discrepancyReason: it.discrepancyReason || '',
                          unit: it.unit || 'Hộp',
                          location: it.location,
                        }));
                        setActiveCheckItems(formattedItems);
                        setActiveCheckLocation(undefined);
                        setExistingCheckId(check._id || check.id);
                        setInventoryCheckModalVisible(true);
                      }}
                      style={[styles.checkCard, isCompleted && styles.checkCardCompleted]}
                    >
                      <View style={styles.checkCardTop}>
                        <View>
                          <Text style={styles.checkCode}>{check.checkCode || `IC-${cIdx + 1}`}</Text>
                          <Text style={styles.checkDate}>{dateStr}</Text>
                        </View>
                        <View
                          style={[
                            styles.checkStatusBadge,
                            isCompleted ? styles.badgeSuccess : styles.badgeDraft,
                          ]}
                        >
                          <Ionicons
                            name={isCompleted ? 'checkmark-circle' : 'time-outline'}
                            size={12}
                            color={isCompleted ? '#10B981' : '#F59E0B'}
                          />
                          <Text
                            style={[
                              styles.checkStatusText,
                              isCompleted ? { color: '#059669' } : { color: '#D97706' },
                            ]}
                          >
                            {isCompleted ? 'Đã Cân Bằng Kho' : 'Bản Nháp (Chờ Duyệt)'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.checkCardBody}>
                        <View style={styles.checkInfoRow}>
                          <Text style={styles.checkInfoLabel}>Người lập:</Text>
                          <Text style={styles.checkInfoVal}>{check.performedBy || 'Thủ kho'}</Text>
                        </View>
                        <View style={styles.checkInfoRow}>
                          <Text style={styles.checkInfoLabel}>Số mặt hàng kiểm:</Text>
                          <Text style={[styles.checkInfoVal, { color: '#0284C7', fontWeight: 'bold' }]}>
                            {itemsCount} thuốc / lô
                          </Text>
                        </View>
                        {check.notes ? (
                          <View style={styles.checkInfoRow}>
                            <Text style={styles.checkInfoLabel}>Ghi chú:</Text>
                            <Text style={[styles.checkInfoVal, { flex: 1 }]} numberOfLines={1}>
                              {check.notes}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.checkCardFooter}>
                        <Text style={styles.openDetailText}>Xem chi tiết & Cập nhật số đếm</Text>
                        <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INVENTORY (TỒN KHO & IN TEM NHÃN BARCODE) */}
        {/* ========================================================= */}
        {activeTab === 'INVENTORY' && (
          <View>
            <View style={styles.kpiRow}>
              <GradientCard gradientVariant="ocean" style={styles.kpiCard}>
                <Ionicons name="medical" size={20} color="#FFFFFF" />
                <Text style={styles.kpiValue}>
                  {inventoryStats.totalMedicines > 0 ? inventoryStats.totalMedicines : medicines.length}
                </Text>
                <Text style={styles.kpiLabel}>Tổng loại thuốc</Text>
              </GradientCard>
              <GradientCard gradientVariant="sky" style={styles.kpiCard}>
                <Ionicons name="layers" size={20} color="#FFFFFF" />
                <Text style={styles.kpiValue}>
                  {(inventoryStats.totalStock > 0 ? inventoryStats.totalStock : medicines.reduce((sum, m) => sum + m.stock, 0)).toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.kpiLabel}>Tổng đơn vị tồn kho</Text>
              </GradientCard>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm mã SKU, Barcode, hoạt chất..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                onPress={() => {
                  setScannerPurpose('SEARCH_INVENTORY');
                  setScannerVisible(true);
                }}
                style={styles.scanActionPill}
              >
                <Ionicons name="barcode" size={16} color="#0284C7" />
                <Text style={styles.scanActionPillText}>Quét</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Danh Mục Thuốc Lưu Kho</Text>
            {medicines.map((med, idx) => {
              const isExpanded = expandedMedId === med.id;
              const isLowStock = med.stock <= 20;

              return (
                <View key={med.id || (med as any)._id || `med-${idx}`} style={styles.medicineCard}>
                  <AnimatedTouchable
                    onPress={() => setExpandedMedId(isExpanded ? null : med.id)}
                    style={styles.medHeaderRow}
                  >
                    <Image
                      source={{
                        uri:
                          med.image ||
                          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                      }}
                      style={styles.inventoryThumb}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.medName} numberOfLines={1}>{med.name}</Text>
                        {med.isRx ? (
                          <View style={styles.rxBadge}>
                            <Text style={styles.rxBadgeText}>Rx</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.medActive} numberOfLines={1}>Hoạt chất: {med.active}</Text>
                      <Text style={styles.medCategory}>
                        SKU: {med.sku || 'N/A'} · Barcode: {med.barcode || 'N/A'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.medStock,
                          { color: isLowStock ? '#DC2626' : '#0284C7' },
                        ]}
                      >
                        {med.stock} {med.unit}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#64748B"
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </AnimatedTouchable>

                  {/* Actions & Batches Accordion */}
                  {isExpanded && (
                    <View style={styles.batchesSection}>
                      <View style={styles.medActionsRow}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedMedForLabel(med);
                            setLabelModalVisible(true);
                          }}
                          style={styles.printLabelBtn}
                        >
                          <Ionicons name="barcode" size={15} color="#0284C7" />
                          <Text style={styles.printLabelBtnText}>In Tem Nhãn 50x30mm</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setHighlightedTarget(
                              med.batches?.[0]?.location
                                ? `${med.batches[0].location.zone}-${med.batches[0].location.rack}-${med.batches[0].location.shelf}`
                                : 'A-A1-1'
                            );
                            setActiveTab('MAP');
                            showToast.info('Định vị', `Đã chuyển đến vị trí kệ của ${med.name}`);
                          }}
                          style={styles.locateBtn}
                        >
                          <Ionicons name="location-outline" size={15} color="#0284C7" />
                          <Text style={styles.locateBtnText}>Xem Vị Trí Sơ Đồ</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.batchesHeader}>Danh sách lô thuốc tại kho:</Text>
                      {med.batches && med.batches.length > 0 ? (
                        med.batches.map((b, bIdx) => (
                          <View key={bIdx} style={styles.batchRow}>
                            <View>
                              <Text style={styles.batchNo}>Lô: {b.batchNo}</Text>
                              <Text style={styles.batchExp}>HSD: {b.expDate}</Text>
                              {b.location ? (
                                <Text style={styles.batchLoc}>
                                  Vị trí: Khu {b.location.zone} · Kệ {b.location.rack} · Tầng {b.location.shelf}
                                </Text>
                              ) : null}
                            </View>
                            <Text style={styles.batchStock}>
                              {b.stock} {med.unit}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noBatchText}>Chưa có thông tin phân lô</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: XUẤT CHUYỂN KHO & MÃ QR (TRANSFERS) */}
        {/* ========================================================= */}
        {activeTab === 'TRANSFERS' && (
          <View>
            <View style={styles.transferHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Phiếu Xuất & Chuyển Kho</Text>
                <Text style={styles.sectionSubtitle}>Quản lý điều phối chi nhánh & Xác nhận bằng mã QR</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setScannerPurpose('RECEIVE_TRANSFER');
                  setScannerVisible(true);
                }}
                style={styles.qrReceiveBtn}
              >
                <Ionicons name="qr-code" size={16} color="#FFFFFF" />
                <Text style={styles.qrReceiveBtnText}>Quét QR Nhận Hàng</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {['ALL', 'SHIPPING', 'COMPLETED'].map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setTransferFilter(st)}
                  style={[styles.filterPill, transferFilter === st && styles.activeFilterPill]}
                >
                  <Text style={[styles.filterPillText, transferFilter === st && styles.activeFilterPillText]}>
                    {st === 'ALL' ? 'Tất cả' : st === 'SHIPPING' ? 'Đang giao' : 'Đã hoàn tất'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transfers List */}
            {displayedTransfers.map((tf, idx) => (
              <View key={tf.id || tf._id || `tf-${idx}`} style={styles.transferCard}>
                <View style={styles.transferCardHeader}>
                  <View>
                    <Text style={styles.transferCodeText}>{tf.transferCode || tf.id}</Text>
                    <Text style={styles.transferDateText}>Ngày tạo: {tf.createdAt || '2026-09-20'}</Text>
                  </View>
                  <View
                    style={[
                      styles.transferStatusBadge,
                      { backgroundColor: tf.status === 'COMPLETED' ? '#F0F9FF' : '#EFF6FF' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.transferStatusBadgeText,
                        { color: tf.status === 'COMPLETED' ? '#0284C7' : '#2563EB' },
                      ]}
                    >
                      {tf.status === 'COMPLETED' ? 'ĐÃ NHẬP KHO' : 'ĐANG GIAO HÀNG'}
                    </Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>Nơi xuất:</Text>
                    <Text style={styles.routeVal}>{tf.fromBranchName || 'Kho Tổng Trung Tâm'}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.routeLabel}>Nơi nhận:</Text>
                    <Text style={[styles.routeVal, { color: '#0284C7' }]}>{tf.toBranchName || tf.toBranchId}</Text>
                  </View>
                </View>

                {/* Items */}
                <View style={styles.transferItemsList}>
                  {tf.items?.map((it, itIdx) => (
                    <Text key={itIdx} style={styles.transferItemText}>
                      • {it.name} ({it.quantity} {it.unit}) - Lô: {it.batchNo}
                    </Text>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.transferActionsRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedTransferForQR(tf)}
                    style={styles.showQRBtn}
                  >
                    <Ionicons name="qr-code-outline" size={16} color="#0284C7" />
                    <Text style={styles.showQRBtnText}>Mã QR Kiện Hàng</Text>
                  </TouchableOpacity>

                  {tf.status !== 'COMPLETED' && (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Xác Nhận Nhập Kho', `Nhập kho phiếu ${tf.transferCode}?`, [
                          { text: 'Hủy', style: 'cancel' },
                          {
                            text: 'Nhập Kho',
                            onPress: async () => {
                              await ApiService.receiveStockTransfer(tf.id || tf._id || '', {
                                receivedBy: 'Thủ kho chi nhánh',
                              });
                              showToast.success('Thành công', `Đã nhận hàng phiếu ${tf.transferCode}!`);
                              loadData();
                            },
                          },
                        ]);
                      }}
                      style={styles.directReceiveBtn}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.directReceiveBtnText}>Xác Nhận Nhận</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {displayedTransfers.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="swap-horizontal-outline" size={42} color="#94A3B8" />
                <Text style={styles.emptyCardTitle}>Chưa có phiếu chuyển kho</Text>
                <Text style={styles.emptyCardSub}>Hiện tại không có phiếu điều phối xuất/nhập kho nào cần xử lý.</Text>
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 4: GOODS RECEIPTS (KIỂM NHẬN NHẬP KHO) */}
        {/* ========================================================= */}
        {activeTab === 'RECEIPTS' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Kiểm Nhận Nhập Kho</Text>
              <TouchableOpacity
                onPress={() => {
                  setScannerPurpose('SCAN_PO');
                  setScannerVisible(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#4F46E5',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 12,
                  gap: 4,
                }}
              >
                <Ionicons name="scan" size={15} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Quét Mã Đơn PO</Text>
              </TouchableOpacity>
            </View>

            {/* Banner hướng dẫn quét mã QR đơn PO trực tiếp từ Web */}
            <TouchableOpacity
              onPress={() => {
                setScannerPurpose('SCAN_PO');
                setScannerVisible(true);
              }}
              style={{
                backgroundColor: '#EEF2FF',
                borderColor: '#C7D2FE',
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                marginBottom: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="qr-code-outline" size={22} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#312E81' }}>Quét QR Đơn Hàng PO Để Kiểm Đếm</Text>
                <Text style={{ fontSize: 11, color: '#6366F1', marginTop: 2 }}>
                  Hướng camera vào mã QR đơn PO trên Web để mở phiên kiểm định AI Vision
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#4F46E5" />
            </TouchableOpacity>

            {/* Thanh chuyển đổi chế độ xem: Đơn PO Chờ Nhập vs Phiếu GRN */}
            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setReceiptSubTab('PENDING_PO')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: receiptSubTab === 'PENDING_PO' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: receiptSubTab === 'PENDING_PO' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: receiptSubTab === 'PENDING_PO' ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: receiptSubTab === 'PENDING_PO' ? '#4F46E5' : '#64748B' }}>
                  📦 Đơn PO Chờ Nhập ({incomingPOs.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setReceiptSubTab('GRN')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: receiptSubTab === 'GRN' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: receiptSubTab === 'GRN' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: receiptSubTab === 'GRN' ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: receiptSubTab === 'GRN' ? '#0284C7' : '#64748B' }}>
                  📋 Phiếu Nhập Kho ({receipts.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chế độ 1: Danh sách Đơn Hàng PO Chờ Nhập Kho */}
            {receiptSubTab === 'PENDING_PO' && (
              <View>
                {incomingPOs.map((po, idx) => {
                  const poCodeDisplay = po.poCode || (po._id ? `PO-${String(po._id).slice(-6).toUpperCase()}` : `PO-${idx + 1}`);
                  const supplierName = po.supplierName || (po.supplier?.name || po.supplier) || 'Nhà cung cấp';
                  const itemsCount = (po.items || []).length;
                  const totalExpectedUnits = (po.items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity || it.expected) || 0), 0);

                  return (
                    <View key={po._id || po.id || `incoming-po-${idx}`} style={styles.receiptCard}>
                      <View style={styles.receiptHeader}>
                        <View>
                          <Text style={styles.receiptCode}>{poCodeDisplay}</Text>
                          <Text style={styles.receiptPo}>Nhà CC: {supplierName}</Text>
                        </View>
                        <View
                          style={[
                            styles.receiptStatusTag,
                            {
                              backgroundColor:
                                po.status === 'SHIPPING' || po.status === 'DELIVERING'
                                  ? '#FEF3C7'
                                  : po.status === 'APPROVED' || po.status === 'ORDERED'
                                  ? '#EEF2FF'
                                  : '#F0FDF4',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.receiptStatusText,
                              {
                                color:
                                  po.status === 'SHIPPING' || po.status === 'DELIVERING'
                                    ? '#D97706'
                                    : po.status === 'APPROVED' || po.status === 'ORDERED'
                                    ? '#4F46E5'
                                    : '#16A34A',
                              },
                            ]}
                          >
                            {po.status === 'SHIPPING'
                              ? 'ĐANG VẬN CHUYỂN'
                              : po.status === 'DELIVERING'
                              ? 'HÀNG ĐANG ĐẾN'
                              : po.status === 'APPROVED'
                              ? 'ĐÃ DUYỆT PO'
                              : po.status === 'ORDERED'
                              ? 'ĐÃ ĐẶT HÀNG'
                              : po.status}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          📦 <Text style={{ fontWeight: '700', color: '#1E293B' }}>{itemsCount}</Text> mặt hàng
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          🔢 Tổng: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{totalExpectedUnits}</Text> đơn vị
                        </Text>
                      </View>

                      {/* Danh sách mặt hàng vắn tắt */}
                      <View style={styles.receiptItemsList}>
                        {(po.items || []).slice(0, 3).map((it: any, itIdx: number) => (
                          <View key={itIdx} style={styles.receiptItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>• {it.medicineName || it.name || `Thuốc #${itIdx + 1}`}</Text>
                              <Text style={styles.itemQty}>
                                SL đặt: {it.quantity || it.expected || 0} {it.unit || 'Hộp'}
                              </Text>
                            </View>
                          </View>
                        ))}
                        {(po.items || []).length > 3 && (
                          <Text style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 4 }}>
                            + {(po.items || []).length - 3} mặt hàng khác...
                          </Text>
                        )}
                      </View>

                      <View style={{ marginTop: 12 }}>
                        <GradientButton
                          title="🔍 AI KIỂM ĐẾM & NHẬN HÀNG"
                          onPress={() => handleStartInspectionFromPo(po)}
                          gradientVariant="cyan"
                          size="sm"
                          icon={<Ionicons name="scan-circle" size={18} color="#FFFFFF" />}
                        />
                      </View>
                    </View>
                  );
                })}

                {incomingPOs.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Ionicons name="cube-outline" size={42} color="#94A3B8" />
                    <Text style={styles.emptyCardTitle}>Không có đơn PO chờ nhập</Text>
                    <Text style={styles.emptyCardSub}>
                      Tất cả đơn đặt hàng PO đã được kiểm nhận hoặc chưa có đơn hàng mới từ phòng mua hàng.
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setScannerPurpose('SCAN_PO');
                        setScannerVisible(true);
                      }}
                      style={{
                        marginTop: 14,
                        backgroundColor: '#4F46E5',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Quét Mã QR Đơn Hàng PO</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Chế độ 2: Danh sách Phiếu Nhập Kho (GRN) */}
            {receiptSubTab === 'GRN' && (
              <View>
                {receipts.map((gr, idx) => (
                  <View key={gr.id || (gr as any)._id || `receipt-${idx}`} style={styles.receiptCard}>
                    <View style={styles.receiptHeader}>
                      <View>
                        <Text style={styles.receiptCode}>{gr.id}</Text>
                        <Text style={styles.receiptPo}>Từ đơn PO: {gr.poCode}</Text>
                      </View>
                      <View
                        style={[
                          styles.receiptStatusTag,
                          {
                            backgroundColor:
                              gr.status === 'COMPLETED'
                                ? '#F0F9FF'
                                : gr.status === 'INSPECTING'
                                ? '#FEF3C7'
                                : '#EFF6FF',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.receiptStatusText,
                            {
                              color:
                                gr.status === 'COMPLETED'
                                  ? '#0284C7'
                                  : gr.status === 'INSPECTING'
                                  ? '#D97706'
                                  : '#2563EB',
                            },
                          ]}
                        >
                          {gr.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.supplierText}>Nhà cung cấp: {gr.supplier}</Text>

                    <View style={styles.receiptItemsList}>
                      {gr.items.map((it: any, itIdx: number) => (
                        <View key={itIdx} style={styles.receiptItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>• {it.name}</Text>
                            <Text style={styles.itemQty}>
                              Dự kiến: {it.expected} | Thực nhận: {it.actual} {it.unit}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.itemStatusPill,
                              { backgroundColor: it.status === 'VERIFIED' ? '#F0F9FF' : '#FEF3C7' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.itemStatusPillText,
                                { color: it.status === 'VERIFIED' ? '#0284C7' : '#D97706' },
                              ]}
                            >
                              {it.status === 'VERIFIED' ? 'Đã kiểm AI' : 'Chờ kiểm'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {gr.status !== 'COMPLETED' ? (
                      <View style={{ marginTop: 12 }}>
                        <GradientButton
                          title="🔍 QUÉT AI KIỂM ĐẾM & NHẬN HÀNG"
                          onPress={() => handleStartInspection(gr)}
                          gradientVariant="cyan"
                          size="sm"
                          icon={<Ionicons name="scan-circle" size={18} color="#FFFFFF" />}
                        />
                        <View style={{ marginTop: 8 }}>
                          <GradientButton
                            title="Duyệt Nhập Kho Thủ Công"
                            onPress={() => handleApproveReceipt(gr.id)}
                            gradientVariant="purple"
                            size="sm"
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.completedReceiptBadge}>
                        <Ionicons name="checkmark-done-circle" size={18} color="#0284C7" />
                        <Text style={styles.completedReceiptText}>
                          Đã hoàn tất kiểm nhận AI & nhập kho lưu trữ GSP
                        </Text>
                      </View>
                    )}
                  </View>
                ))}

                {receipts.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Ionicons name="document-text-outline" size={42} color="#94A3B8" />
                    <Text style={styles.emptyCardTitle}>Chưa có phiếu nhập kho</Text>
                    <Text style={styles.emptyCardSub}>Quét mã QR từ Web hoặc tạo đơn nhập hàng PO để bắt đầu kiểm đếm.</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setScannerPurpose('SCAN_PO');
                        setScannerVisible(true);
                      }}
                      style={{
                        marginTop: 14,
                        backgroundColor: '#4F46E5',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Mở Camera Quét Mã PO Ngay</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 5: EXPIRATION REPORT - 2-COLUMN COMPACT GRID & DETAIL */}
        {/* ========================================================= */}
        {activeTab === 'EXPIRATION' && (() => {
          const filteredItems = filterNearExpiryList(expiredList, expiredFilter);
          const expiredCount = expiredList.filter((i) => (i.daysLeft ?? 999) <= 0).length;
          const under30Count = expiredList.filter((i) => (i.daysLeft ?? 999) > 0 && (i.daysLeft ?? 999) <= 30).length;
          const under90Count = expiredList.filter((i) => (i.daysLeft ?? 999) > 30 && (i.daysLeft ?? 999) <= 90).length;

          return (
            <View>
              {/* Tiêu đề & Tóm tắt FEFO */}
              <View style={styles.expHeaderSection}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Báo Cáo Cận Hạn Dùng (&lt; 90 Ngày)</Text>
                  <Text style={styles.expSectionSub}>
                    Ưu tiên điều phối xuất kho FEFO (First Expired First Out)
                  </Text>
                </View>
                <View style={styles.expTotalBadge}>
                  <Text style={styles.expTotalBadgeText}>{expiredList.length} Dược Phẩm</Text>
                </View>
              </View>

              {/* Bộ lọc phân loại nhanh */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.expFilterRow}
              >
                <TouchableOpacity
                  onPress={() => setExpiredFilter('ALL')}
                  style={[styles.expFilterChip, expiredFilter === 'ALL' && styles.expFilterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.expFilterChipText, expiredFilter === 'ALL' && styles.expFilterChipTextActive]}>
                    Tất Cả ({expiredList.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setExpiredFilter('EXPIRED')}
                  style={[
                    styles.expFilterChip,
                    expiredFilter === 'EXPIRED' && styles.expFilterChipExpiredActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="alert-circle"
                    size={12}
                    color={expiredFilter === 'EXPIRED' ? '#FFFFFF' : '#DC2626'}
                  />
                  <Text
                    style={[
                      styles.expFilterChipText,
                      { color: expiredFilter === 'EXPIRED' ? '#FFFFFF' : '#DC2626' },
                    ]}
                  >
                    Đã Quá Hạn ({expiredCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setExpiredFilter('UNDER_30')}
                  style={[
                    styles.expFilterChip,
                    expiredFilter === 'UNDER_30' && styles.expFilterChipUnder30Active,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time"
                    size={12}
                    color={expiredFilter === 'UNDER_30' ? '#FFFFFF' : '#D97706'}
                  />
                  <Text
                    style={[
                      styles.expFilterChipText,
                      { color: expiredFilter === 'UNDER_30' ? '#FFFFFF' : '#D97706' },
                    ]}
                  >
                    ≤ 30 Ngày ({under30Count})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setExpiredFilter('UNDER_90')}
                  style={[
                    styles.expFilterChip,
                    expiredFilter === 'UNDER_90' && styles.expFilterChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={12}
                    color={expiredFilter === 'UNDER_90' ? '#FFFFFF' : '#0284C7'}
                  />
                  <Text
                    style={[
                      styles.expFilterChipText,
                      { color: expiredFilter === 'UNDER_90' ? '#FFFFFF' : '#0284C7' },
                    ]}
                  >
                    ≤ 90 Ngày ({under90Count})
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* LƯỚI GRID 2 ELEMENT MỖI ROW (2-COLUMN GRID LAYOUT) */}
              <View style={styles.expGridContainer}>
                {filteredItems.map((item, idx) => {
                  const badge = formatDaysLeftLabel(item.daysLeft);
                  return (
                    <AnimatedTouchable
                      key={idx}
                      style={[
                        styles.expGridCard,
                        badge.isExpired && { borderColor: '#FECACA' },
                      ]}
                      onPress={() => setSelectedExpMedDetail(item)}
                    >
                      {/* Badge Hạn Dùng góc trên */}
                      <View
                        style={[
                          styles.expGridBadge,
                          { backgroundColor: badge.bg, borderColor: badge.border },
                        ]}
                      >
                        <Ionicons name={badge.icon} size={11} color={badge.text} />
                        <Text
                          style={[styles.expGridBadgeText, { color: badge.text }]}
                          numberOfLines={1}
                        >
                          {badge.label}
                        </Text>
                      </View>

                      {/* Header Card: Icon + Category */}
                      <View style={styles.expGridTopRow}>
                        <View
                          style={[
                            styles.expGridIconWrap,
                            { backgroundColor: badge.isExpired ? '#FEF2F2' : '#F0F9FF' },
                          ]}
                        >
                          <Ionicons
                            name="medical"
                            size={16}
                            color={badge.isExpired ? '#DC2626' : '#0284C7'}
                          />
                        </View>
                        <View style={styles.expGridZoneTag}>
                          <Text style={styles.expGridZoneText}>
                            Khu {item.location?.zone || 'A'}
                          </Text>
                        </View>
                      </View>

                      {/* Tên Thuốc (gọn 2 dòng) */}
                      <Text style={styles.expGridTitle} numberOfLines={2}>
                        {item.name}
                      </Text>

                      {/* Hoạt Chất / Quy Cách (1 dòng mờ) */}
                      <Text style={styles.expGridSub} numberOfLines={1}>
                        {item.activeIngredient || item.activeSubstance || item.category || 'Dược phẩm GSP'}
                      </Text>

                      {/* Dải phân cách viền mỏng */}
                      <View style={styles.expGridDivider} />

                      {/* Thông tin Lô & HSD */}
                      <View style={styles.expGridMetaRow}>
                        <Text style={styles.expGridMetaLabel}>Lô:</Text>
                        <Text style={styles.expGridMetaValue} numberOfLines={1}>
                          {item.batchNo}
                        </Text>
                      </View>
                      <View style={styles.expGridMetaRow}>
                        <Text style={styles.expGridMetaLabel}>HSD:</Text>
                        <Text
                          style={[
                            styles.expGridMetaValue,
                            { color: badge.text, fontWeight: '700' },
                          ]}
                        >
                          {item.expDate}
                        </Text>
                      </View>

                      {/* Footer Card: Tồn Kho + Nút Chi Tiết */}
                      <View style={styles.expGridFooter}>
                        <View
                          style={[
                            styles.expGridStockPill,
                            badge.isExpired && { backgroundColor: '#FEE2E2' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.expGridStockText,
                              badge.isExpired && { color: '#DC2626' },
                            ]}
                            numberOfLines={1}
                          >
                            Tồn: <Text style={{ fontWeight: '800' }}>{item.stock} {item.unit}</Text>
                          </Text>
                        </View>

                        <View style={styles.expGridDetailLink}>
                          <Text style={styles.expGridDetailText}>Chi tiết</Text>
                          <Ionicons name="chevron-forward" size={11} color="#0284C7" />
                        </View>
                      </View>
                    </AnimatedTouchable>
                  );
                })}
              </View>

              {/* Trạng thái trống khi lọc */}
              {filteredItems.length === 0 && (
                <View style={styles.emptyCard}>
                  <Ionicons name="shield-checkmark-outline" size={42} color="#0284C7" />
                  <Text style={[styles.emptyCardTitle, { color: '#0284C7' }]}>
                    Không Có Dược Phẩm Trong Nhóm Này
                  </Text>
                  <Text style={styles.emptyCardSub}>
                    Tất cả các lô thuốc trong kho đang được bảo quản an toàn theo chuẩn GSP.
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB 6: LOT TRACING (TRUY XUẤT LÔ) */}
        {/* ========================================================= */}
        {activeTab === 'TRACE' && (
          <View>
            <Text style={styles.sectionTitle}>Truy Xuất Nguồn Gốc & Vòng Đời Lô Thuốc</Text>
            <View style={styles.searchBox}>
              <Ionicons name="barcode" size={20} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Nhập số lô (VD: BATCH-2026-001, AMX...)"
                placeholderTextColor="#94A3B8"
                value={batchNoQuery}
                onChangeText={setBatchNoQuery}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={() => {
                  setScannerPurpose('TRACE_LOT');
                  setScannerVisible(true);
                }}
                style={[styles.scanActionPill, { marginRight: 6 }]}
              >
                <Ionicons name="camera-outline" size={16} color="#0284C7" />
              </TouchableOpacity>
              <AnimatedTouchable onPress={handleTraceLot} style={styles.traceBtn}>
                <Text style={styles.traceBtnText}>{tracing ? 'Đang dò...' : 'Truy Lô'}</Text>
              </AnimatedTouchable>
            </View>

            {traceResult && (
              <View style={styles.traceCard}>
                <View style={styles.traceHeader}>
                  <Ionicons name="shield-checkmark" size={24} color="#0284C7" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.traceBatchNo}>Số Lô: {traceResult.batchNo}</Text>
                    <Text style={styles.traceMedName}>{traceResult.medicineName}</Text>
                  </View>
                </View>

                <View style={styles.traceMetaGrid}>
                  <View style={styles.traceMetaCol}>
                    <Text style={styles.metaLabel}>Nhà cung cấp:</Text>
                    <Text style={styles.metaVal}>{traceResult.supplier}</Text>
                  </View>
                  <View style={styles.traceMetaCol}>
                    <Text style={styles.metaLabel}>Hạn sử dụng:</Text>
                    <Text style={styles.metaVal}>{traceResult.expDate}</Text>
                  </View>
                  <View style={styles.traceMetaCol}>
                    <Text style={styles.metaLabel}>Tồn kho hiện tại:</Text>
                    <Text style={[styles.metaVal, { color: '#0284C7', fontWeight: '800' }]}>
                      {traceResult.currentStock}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 14 }]}>
                  Dòng Đời Di Chuyển & Luân Chuyển:
                </Text>
                {traceResult.transactions?.map((tx: any, idx: number) => (
                  <View key={idx} style={styles.txRow}>
                    <View style={styles.txDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txType}>{tx.type} ({tx.date})</Text>
                      <Text style={styles.txNote}>{tx.note}</Text>
                    </View>
                    <Text style={styles.txQty}>{tx.qty}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 7: AI DEMAND FORECASTING */}
        {/* ========================================================= */}
        {activeTab === 'FORECAST' && (
          <View>
            <View style={styles.forecastHeaderCard}>
              <View style={styles.forecastIconBox}>
                <Ionicons name="sparkles" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.forecastTitle}>AI Dự Báo Nhu Cầu Tồn Kho Chuỗi</Text>
                <Text style={styles.forecastSub}>Machine Learning dự báo theo chu kỳ và khuyến nghị nhập hàng</Text>
              </View>
            </View>

            {/* Period Selector */}
            <View style={styles.periodRow}>
              <Text style={styles.periodLabel}>Chu kỳ phân tích:</Text>
              <View style={styles.periodButtons}>
                {[7, 14, 30].map((p) => (
                  <AnimatedTouchable
                    key={p}
                    onPress={() => {
                      setForecastPeriod(p);
                      handleLoadForecast(p);
                    }}
                    style={[styles.periodPill, forecastPeriod === p && styles.activePeriodPill]}
                  >
                    <Text style={[styles.periodPillText, forecastPeriod === p && styles.activePeriodPillText]}>
                      {p} ngày
                    </Text>
                  </AnimatedTouchable>
                ))}
              </View>
            </View>

            {forecastLoading ? (
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>AI đang phân tích dữ liệu lịch sử xuất bán...</Text>
              </View>
            ) : forecastData ? (
              <>
                <View style={styles.kpiRow}>
                  <GradientCard gradientVariant="ocean" style={styles.kpiCard}>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    <Text style={styles.kpiValue}>{forecastData.confidence || '94.6%'}</Text>
                    <Text style={styles.kpiLabel}>Độ tin cậy mô hình</Text>
                  </GradientCard>
                  <GradientCard gradientVariant="sunset" style={styles.kpiCard}>
                    <Ionicons name="warning" size={20} color="#FFFFFF" />
                    <Text style={styles.kpiValue}>{forecastData.highRiskCount || 2} Mặt hàng</Text>
                    <Text style={styles.kpiLabel}>Cảnh báo nguy cơ thiếu</Text>
                  </GradientCard>
                </View>

                <Text style={styles.sectionTitle}>Khuyến Nghị Bổ Sung Tồn Kho AI</Text>
                {forecastData.items?.map((item: any, idx: number) => (
                  <View key={idx} style={styles.forecastItemCard}>
                    <View style={styles.forecastItemHeader}>
                      <Text style={styles.forecastItemName}>{item.name}</Text>
                      <View
                        style={[
                          styles.riskBadge,
                          item.risk === 'HIGH'
                            ? styles.riskHigh
                            : item.risk === 'MEDIUM'
                            ? styles.riskMedium
                            : styles.riskLow,
                        ]}
                      >
                        <Text
                          style={[
                            styles.riskBadgeText,
                            item.risk === 'HIGH'
                              ? styles.riskHighText
                              : item.risk === 'MEDIUM'
                              ? styles.riskMediumText
                              : styles.riskLowText,
                          ]}
                        >
                          {item.risk === 'HIGH' ? 'RỦI RO CAO' : item.risk === 'MEDIUM' ? 'TRUNG BÌNH' : 'AN TOÀN'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.forecastGrid}>
                      <View style={styles.forecastCol}>
                        <Text style={styles.forecastColLabel}>Tồn kho hiện tại:</Text>
                        <Text style={styles.forecastColVal}>{item.currentStock}</Text>
                      </View>
                      <View style={styles.forecastCol}>
                        <Text style={styles.forecastColLabel}>Nhu cầu dự báo:</Text>
                        <Text style={[styles.forecastColVal, { color: '#0284C7' }]}>{item.predictedDemand}</Text>
                      </View>
                      <View style={styles.forecastCol}>
                        <Text style={styles.forecastColLabel}>Khuyến nghị đặt:</Text>
                        <Text style={[styles.forecastColVal, { color: '#DC2626' }]}>+{item.reorderQty}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* REUSABLE MODALS: BARCODE SCANNER, LABEL, SHELF, TRANSFER QR */}
      {/* ========================================================= */}

      {/* 1. Barcode & QR Camera Scanner */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleBarcodeScanned}
        mode={scannerPurpose === 'SCAN_PO' || scannerPurpose === 'RECEIVE_TRANSFER' ? 'QR' : scannerPurpose === 'LOCATE_MAP' ? 'BARCODE' : 'ALL'}
        title={
          scannerPurpose === 'SCAN_PO'
            ? 'Quét QR Đơn Hàng PO / Kiện Hàng'
            : scannerPurpose === 'LOCATE_MAP'
            ? 'Quét Barcode Định Vị Kệ'
            : scannerPurpose === 'RECEIVE_TRANSFER'
            ? 'Quét QR Nhận Hàng Chuyển Kho'
            : scannerPurpose === 'TRACE_LOT'
            ? 'Quét Barcode / QR Truy Lô'
            : 'Quét Mã Vạch Dược Phẩm'
        }
        subtitle={
          scannerPurpose === 'SCAN_PO'
            ? 'Hướng camera vào mã QR đơn PO trên Web hoặc vỏ thùng kiện hàng'
            : scannerPurpose === 'LOCATE_MAP'
            ? 'Đưa mã vạch hộp thuốc vào khung để tìm vị trí Tầng Kệ'
            : scannerPurpose === 'RECEIVE_TRANSFER'
            ? 'Quét mã QR trên kiện hàng để xác nhận nhập kho'
            : 'Hỗ trợ chuẩn GS1 EAN-13, Code-128 và QR Code'
        }
      />

      {/* 2. 50x30mm Thermal Label Viewer */}
      <BarcodeLabelModal
        visible={labelModalVisible}
        onClose={() => {
          setLabelModalVisible(false);
          setSelectedMedForLabel(null);
        }}
        medicine={selectedMedForLabel}
        onBarcodeUpdated={(updatedMed, newBarcode) => {
          setMedicines((prev) => prev.map((m) => (m.id === updatedMed.id ? { ...m, barcode: newBarcode } : m)));
        }}
      />

      {/* 3. Shelf Detail Modal */}
      {selectedShelfForDetail && (
        <WarehouseShelfModal
          visible={!!selectedShelfForDetail}
          onClose={() => setSelectedShelfForDetail(null)}
          zone={selectedShelfForDetail.zone}
          rack={selectedShelfForDetail.rack}
          shelf={selectedShelfForDetail.shelf}
          onStartInventoryCheck={(selectedMeds, loc) => {
            const checkItems = buildCheckItemsFromShelf({
              zone: loc.zone,
              rack: loc.rack,
              shelf: loc.shelf,
              batches: selectedMeds,
            });
            setActiveCheckLocation(loc);
            setActiveCheckItems(checkItems);
            setExistingCheckId(undefined);
            setInventoryCheckModalVisible(true);
          }}
        />
      )}

      {/* Medicine Location 3D Modal (Quét Barcode Định Vị Thuốc GSP) */}
      <MedicineLocationModal
        visible={medicineLocationModalVisible}
        onClose={() => setMedicineLocationModalVisible(false)}
        medicine={scannedMedicineForLocation}
        onLocateOn3DMap={(loc) => {
          setActiveTab('MAP');
          setMapViewMode('3D');
          setHighlightedTarget(`${loc.zone}-${loc.rack}-${loc.shelf}`);
          showToast.info('Đã định vị trên sơ đồ 3D', `Khu ${loc.zone} · Kệ ${loc.rack} · Tầng ${loc.shelf}`);
        }}
        onStartCheckMedicine={(med, loc) => {
          const item = {
            medicineId: String(med.id || med._id || med.sku),
            medicineName: med.name,
            sku: med.sku,
            barcode: med.barcode,
            batchId: med.fefoBatch?._id || '',
            batchNo: med.fefoBatch?.batchNo || '',
            expDate: med.fefoBatch?.expDate || '',
            systemStock: med.stock || 0,
            actualStock: med.stock || 0,
            difference: 0,
            discrepancyReason: '',
            unit: med.unit || 'Hộp',
            location: loc,
          };
          setActiveCheckLocation(loc);
          setActiveCheckItems([item]);
          setExistingCheckId(undefined);
          setInventoryCheckModalVisible(true);
        }}
      />

      {/* Inventory Check Modal (Phiên Kiểm Kê Kho BW07) */}
      <InventoryCheckModal
        visible={inventoryCheckModalVisible}
        onClose={() => setInventoryCheckModalVisible(false)}
        initialItems={activeCheckItems}
        shelfLocation={activeCheckLocation}
        existingCheckId={existingCheckId}
        onCheckCompleted={() => {
          loadChecks();
          loadData();
        }}
      />

      {/* 4. Transfer Dispatch QR Modal */}
      <TransferQRModal
        visible={!!selectedTransferForQR}
        onClose={() => setSelectedTransferForQR(null)}
        transfer={selectedTransferForQR}
      />

      {/* 5. AI Goods Inspection Modal */}
      <Modal
        visible={inspectModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setInspectModalVisible(false)}
      >
        <View
          style={[
            styles.inspectModalRoot,
            {
              paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 48),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <StatusBar barStyle="dark-content" />
          <View style={styles.inspectModalHeader}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="scan-circle" size={24} color="#0284C7" style={{ marginRight: 6, flexShrink: 0 }} />
                <Text style={styles.inspectModalTitle} numberOfLines={1}>Kiểm Định AI Vision</Text>
              </View>
              <Text style={styles.inspectModalSub} numberOfLines={1}>
                Phiếu #{selectedReceiptForInspection?.id} • {selectedReceiptForInspection?.supplier}
              </Text>
            </View>
            <AnimatedTouchable onPress={() => setInspectModalVisible(false)} style={styles.inspectCloseBtn}>
              <Ionicons name="close-circle" size={28} color="#64748B" />
            </AnimatedTouchable>
          </View>

          <ScrollView contentContainerStyle={styles.inspectScroll} showsVerticalScrollIndicator={false}>
            {/* Thanh chuyển đổi nhanh giữa các mặt hàng trong đơn PO */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>
                Chọn mặt hàng kiểm đếm ({selectedReceiptForInspection?.items?.filter((it: any) => it.status === 'VERIFIED').length || 0}/{selectedReceiptForInspection?.items?.length || 0} đã đạt):
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {selectedReceiptForInspection?.items?.map((it: any, idx: number) => {
                  const isCur = idx === selectedItemIndex;
                  const isDone = it.status === 'VERIFIED';
                  const medDisplayName = it.name || it.medicineName || `Thuốc #${idx + 1}`;
                  const shortName = medDisplayName.length > 18 ? `${medDisplayName.slice(0, 16)}...` : medDisplayName;
                  return (
                    <TouchableOpacity
                      key={it.medicineId || it.id || `item-${idx}`}
                      onPress={() => {
                        setSelectedItemIndex(idx);
                        setAiScanResult(null);
                        setActualCountInput(String(it.actual ?? it.expected ?? '10'));
                        setSelectedInspectionImage(getItemImage(it));
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 12,
                        backgroundColor: isCur ? '#4F46E5' : isDone ? '#F0F9FF' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: isCur ? '#4338CA' : isDone ? '#BAE6FD' : '#E2E8F0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons
                        name={isDone ? 'checkmark-circle' : isCur ? 'radio-button-on' : 'radio-button-off'}
                        size={13}
                        color={isCur ? '#FFFFFF' : isDone ? '#0284C7' : '#94A3B8'}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: isCur ? '#FFFFFF' : isDone ? '#0369A1' : '#475569',
                        }}
                      >
                        {shortName} ({it.expected} {it.unit || 'hộp'})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.inspectProgressCard}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>
                  Mặt hàng kiểm định ({selectedItemIndex + 1}/{selectedReceiptForInspection?.items?.length || 1}):
                </Text>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>
                    {selectedReceiptForInspection?.items[selectedItemIndex]?.status === 'VERIFIED'
                      ? 'ĐÃ XÁC NHẬN'
                      : 'ĐANG KIỂM TRA'}
                  </Text>
                </View>
              </View>

              <Text style={styles.inspectCurrentMedName} numberOfLines={2}>
                {selectedReceiptForInspection?.items[selectedItemIndex]?.name}
              </Text>
              <Text style={styles.inspectCurrentPoQty}>
                Số lượng theo PO: {selectedReceiptForInspection?.items[selectedItemIndex]?.expected}{' '}
                {selectedReceiptForInspection?.items[selectedItemIndex]?.unit || 'Hộp'}
              </Text>
            </View>

            <View style={styles.scannerFrame}>
              <Image source={{ uri: selectedInspectionImage }} style={styles.packageImage} resizeMode="contain" />
              {isAiScanning && (
                <View style={styles.scanOverlay}>
                  <View style={styles.laserLine} />
                  <View style={styles.scanningIndicatorBox}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.scanningText}>AI đang quét bao bì, OCR số lô & hạn dùng...</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.cameraBtnRow}>
              <AnimatedTouchable onPress={handleTakePhoto} style={styles.cameraActionBtn}>
                <Ionicons name="camera" size={16} color="#0284C7" />
                <Text style={styles.cameraActionBtnText}>Chụp Ảnh</Text>
              </AnimatedTouchable>
              <AnimatedTouchable onPress={handlePickImage} style={styles.galleryActionBtn}>
                <Ionicons name="images-outline" size={16} color="#0284C7" />
                <Text style={styles.galleryActionBtnText}>Chọn Thư Viện</Text>
              </AnimatedTouchable>
            </View>

            <GradientButton
              title={isAiScanning ? 'ĐANG QUÉT AI...' : '⚡ BẮT ĐẦU QUÉT AI VISION (ĐẾM & ĐỐI CHIẾU)'}
              onPress={handleRunAiInspection}
              gradientVariant="cyan"
              size="md"
              disabled={isAiScanning}
              style={{ marginVertical: 10 }}
              icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />}
            />

            {/* Khung Kết Quả AI hoặc Đếm Thực Tế Bằng Tay */}
            <View style={styles.aiResultCard}>
              {aiScanResult && (
                <>
                  <View style={styles.aiResultHeader}>
                    <Text style={styles.aiResultTitle}>Kết Quả AI Vision</Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>Khớp: {aiScanResult.confidence}%</Text>
                    </View>
                  </View>

                  <View style={styles.aiRow}>
                    <Text style={styles.aiRowLabel}>📦 Số lượng AI đếm:</Text>
                    <Text style={styles.aiRowValueBold}>{aiScanResult.aiCount} Hộp</Text>
                  </View>
                  <View style={styles.aiRow}>
                    <Text style={styles.aiRowLabel}>🏷️ Số Lô (Batch OCR):</Text>
                    <Text style={styles.aiRowValue}>{aiScanResult.batchNo}</Text>
                  </View>
                  <View style={styles.aiRow}>
                    <Text style={styles.aiRowLabel}>📅 Hạn sử dụng:</Text>
                    <Text style={styles.aiRowValue}>{aiScanResult.expDate}</Text>
                  </View>
                </>
              )}

              <View style={styles.actualCountWrapper}>
                <Text style={styles.actualCountLabel}>
                  {aiScanResult ? 'Xác nhận số lượng thực nhận:' : 'Số lượng thực tế kiểm nhận (đếm tay):'}
                </Text>
                <View style={styles.actualCountInputRow}>
                  <TouchableOpacity
                    onPress={() => {
                      const cur = parseInt(actualCountInput, 10) || 0;
                      if (cur > 0) setActualCountInput(String(cur - 1));
                    }}
                    style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="remove" size={18} color="#475569" />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.actualCountInput, { minWidth: 80, textAlign: 'center' }]}
                    keyboardType="numeric"
                    value={actualCountInput}
                    onChangeText={(val) => {
                      setActualCountInput(val.replace(/[^0-9]/g, ''));
                    }}
                    placeholder="0"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const cur = parseInt(actualCountInput, 10) || 0;
                      setActualCountInput(String(cur + 1));
                    }}
                    style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.unitSuffix}>{selectedReceiptForInspection?.items[selectedItemIndex]?.unit || 'Hộp'}</Text>
                </View>
              </View>

              <GradientButton
                title={
                  selectedReceiptForInspection?.items[selectedItemIndex]?.status === 'VERIFIED'
                    ? '✓ CẬP NHẬT SỐ LƯỢNG MẶT HÀNG NÀY'
                    : 'XÁC NHẬN MẶT HÀNG NÀY (TIẾP TỤC)'
                }
                onPress={handleConfirmItemInspection}
                gradientVariant="success"
                size="sm"
                style={{ marginTop: 10 }}
              />
            </View>

            {selectedReceiptForInspection?.items?.every((it: any) => it.status === 'VERIFIED') && (
              <View style={styles.finishInspectionBox}>
                <Ionicons name="ribbon-outline" size={24} color="#0284C7" />
                <Text style={styles.finishInspectionTitle}>Tất cả mặt hàng đã đạt chuẩn!</Text>
                <GradientButton
                  title="HOÀN TẤT KIỂM NHẬN & NHẬP TỒN KHO GSP"
                  onPress={handleFinishAndStockReceipt}
                  gradientVariant="primary"
                  size="md"
                  style={{ marginTop: 10, width: '100%' }}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Attendance GPS Modal */}
      <AttendanceCheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onAttendanceSuccess={loadData}
      />

      {/* Staff Payslip Modal */}
      <StaffPayslipModal
        visible={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
      />

      {/* Thẻ Định Danh Nhân Sự GPP Có Mã QR Cho Giám Đốc/Quản Lý Quét */}
      <DigitalHealthPassportModal
        visible={showStaffIdModal}
        onClose={() => setShowStaffIdModal(false)}
      />

      {/* Modal Chi Tiết Dược Phẩm Cận Hạn GSP & Điều Phối FEFO */}
      <NearExpiryMedicineModal
        visible={!!selectedExpMedDetail}
        medicine={selectedExpMedDetail}
        onClose={() => setSelectedExpMedDetail(null)}
        onLocateOnMap={(loc) => {
          setSelectedExpMedDetail(null);
          setActiveTab('MAP');
          setHighlightedTarget(`${loc.zone}-${loc.rack}-${loc.shelf}`);
          showToast.info(
            'Định Vị Sơ Đồ Kho GSP',
            `Đang xem vị trí: Phân Khu ${loc.zone} · Kệ ${loc.rack} · Tầng ${loc.shelf}`
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  shiftActionBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  shiftActionBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  shiftActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkInBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  payslipBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  shiftActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBarScroll: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 5,
  },
  activeTabItem: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0369A1',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  mapSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  mapSearchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 12.5,
    marginLeft: 6,
    color: '#0F172A',
  },
  scanMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  scanMapBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0284C7',
    justifyContent: 'space-between',
  },
  targetBannerText: {
    color: '#0369A1',
    fontSize: 12,
  },
  zonePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeZonePill: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  zonePillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  activeZonePillText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 10,
  },
  zoneBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zoneTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  zoneTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoneTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  racksContainer: {
    padding: 10,
    gap: 10,
  },
  rackCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rackTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  shelvesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shelfBtn: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  shelfHighlighted: {
    borderColor: '#0284C7',
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  shelfWarning: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  shelfTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  shelfNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  dotOnline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284C7',
  },
  shelfStockText: {
    fontSize: 9.5,
    color: '#64748B',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    marginLeft: 8,
    color: '#0F172A',
  },
  scanActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  scanActionPillText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: 'bold',
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inventoryThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  medName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  rxBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  rxBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  medActive: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  medCategory: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  medStock: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  batchesSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  medActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  printLabelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  printLabelBtnText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: 'bold',
  },
  locateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  locateBtnText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: 'bold',
  },
  batchesHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  batchNo: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  batchExp: {
    fontSize: 10,
    color: '#64748B',
  },
  batchLoc: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '500',
  },
  batchStock: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  noBatchText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  transferHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  qrReceiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  qrReceiveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterPill: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  transferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transferCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  transferCodeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  transferDateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  transferStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transferStatusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  routeLabel: {
    fontSize: 9.5,
    color: '#64748B',
  },
  routeVal: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 2,
  },
  transferItemsList: {
    marginBottom: 10,
    paddingLeft: 4,
  },
  transferItemText: {
    fontSize: 11.5,
    color: '#475569',
    marginBottom: 2,
  },
  transferActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  showQRBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  showQRBtnText: {
    fontSize: 11.5,
    color: '#0284C7',
    fontWeight: 'bold',
  },
  directReceiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  directReceiveBtnText: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  receiptCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  receiptPo: {
    fontSize: 11,
    color: '#64748B',
  },
  receiptStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  supplierText: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 10,
  },
  receiptItemsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemQty: {
    fontSize: 10.5,
    color: '#64748B',
  },
  itemStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemStatusPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  completedReceiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  completedReceiptText: {
    fontSize: 11.5,
    color: '#0284C7',
    fontWeight: '600',
  },
  /* --- BÁO CÁO CẬN HẠN DÙNG (EXPIRATION) - 2-COLUMN GRID & FILTER --- */
  expHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expSectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  expTotalBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  expTotalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  expFilterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 10,
  },
  expFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expFilterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  expFilterChipExpiredActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  expFilterChipUnder30Active: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  expFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  expFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  expGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  expGridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  expGridBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  expGridBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  expGridTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expGridIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expGridZoneTag: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expGridZoneText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  expGridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 16,
    minHeight: 32,
    marginBottom: 2,
  },
  expGridSub: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  expGridDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  expGridMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  expGridMetaLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  expGridMetaValue: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
    maxWidth: '75%',
  },
  expGridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  expGridStockPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '65%',
  },
  expGridStockText: {
    fontSize: 9.5,
    color: '#15803D',
    fontWeight: '600',
  },
  expGridDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  expGridDetailText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  traceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  traceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  traceBatchNo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  traceMedName: {
    fontSize: 12,
    color: '#64748B',
  },
  traceMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  traceMetaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  metaVal: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
    marginRight: 10,
  },
  txType: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  txNote: {
    fontSize: 10.5,
    color: '#64748B',
  },
  txQty: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  traceBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  traceBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  forecastHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  forecastIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  forecastSub: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 2,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  periodPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  activePeriodPill: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  periodPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  activePeriodPillText: {
    color: '#FFFFFF',
  },
  forecastItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  forecastItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forecastItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskHigh: { backgroundColor: '#FEE2E2' },
  riskMedium: { backgroundColor: '#FEF3C7' },
  riskLow: { backgroundColor: '#F0F9FF' },
  riskBadgeText: { fontSize: 9.5, fontWeight: 'bold' },
  riskHighText: { color: '#DC2626' },
  riskMediumText: { color: '#D97706' },
  riskLowText: { color: '#0284C7' },
  forecastGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  forecastCol: { flex: 1 },
  forecastColLabel: { fontSize: 9.5, color: '#64748B' },
  forecastColVal: { fontSize: 12, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  loadingBox: { padding: 30, alignItems: 'center' },
  loadingText: { fontSize: 12, color: '#64748B' },
  inspectModalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  inspectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inspectModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  inspectModalSub: { fontSize: 11, color: '#64748B' },
  inspectCloseBtn: { padding: 4 },
  inspectScroll: { padding: 16 },
  inspectProgressCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  stepBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  stepBadgeText: { fontSize: 9.5, fontWeight: 'bold', color: '#0284C7' },
  inspectCurrentMedName: { fontSize: 13, fontWeight: 'bold', color: '#0F172A' },
  inspectCurrentPoQty: { fontSize: 11, color: '#0284C7', marginTop: 2 },
  scannerFrame: {
    height: 180,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  packageImage: { width: '100%', height: '100%' },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#38BDF8',
    position: 'absolute',
    top: '50%',
  },
  scanningIndicatorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 },
  scanningText: { color: '#FFFFFF', fontSize: 11 },
  cameraBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  cameraActionBtnText: { color: '#0284C7', fontSize: 12, fontWeight: 'bold' },
  galleryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  galleryActionBtnText: { color: '#0284C7', fontSize: 12, fontWeight: 'bold' },
  aiResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    marginBottom: 12,
  },
  aiResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiResultTitle: { fontSize: 13, fontWeight: 'bold', color: '#0284C7' },
  confidenceBadge: { backgroundColor: '#F0F9FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  confidenceText: { fontSize: 10, fontWeight: 'bold', color: '#0284C7' },
  aiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  aiRowLabel: { fontSize: 11, color: '#64748B' },
  aiRowValue: { fontSize: 11, fontWeight: '600', color: '#0F172A' },
  aiRowValueBold: { fontSize: 11.5, fontWeight: 'bold', color: '#0284C7' },
  actualCountWrapper: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actualCountLabel: { fontSize: 11, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  actualCountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actualCountInput: {
    width: 90,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  unitSuffix: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  finishInspectionBox: { backgroundColor: '#F0F9FF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 10 },
  finishInspectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#0284C7', marginTop: 4 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCardSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  mapModeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mapModeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapModeToggleBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  mapModeToggleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  mapModeToggleTextActive: {
    color: '#0284C7',
    fontWeight: 'bold',
  },
  checksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createCheckBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checksNoticeCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  checksEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 24,
  },
  checksEmptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 12,
  },
  checksEmptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  checksListContainer: {
    gap: 10,
    marginBottom: 20,
  },
  checkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkCardCompleted: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  checkCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  checkDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  checkStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#ECFDF5',
  },
  badgeDraft: {
    backgroundColor: '#FFFBEB',
  },
  checkStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkCardBody: {
    gap: 4,
    marginBottom: 10,
  },
  checkInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkInfoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  checkInfoVal: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
  },
  checkCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  openDetailText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
});
