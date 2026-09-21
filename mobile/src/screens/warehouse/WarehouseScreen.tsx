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
import { TransferQRModal } from '../../components/warehouse/TransferQRModal';

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
  A: { bg: 'rgba(2, 132, 199, 0.1)', border: '#0284C7', text: '#0284C7', label: 'Kháng sinh', icon: '💊' },
  B: { bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B', text: '#D97706', label: 'Hạ sốt & Giảm đau', icon: '🌡️' },
  C: { bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444', text: '#DC2626', label: 'Tim mạch', icon: '❤️' },
  D: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10B981', text: '#059669', label: 'Tiêu hóa', icon: '🫀' },
  E: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8B5CF6', text: '#7C3AED', label: 'Thực phẩm chức năng', icon: '🌿' },
  F: { bg: 'rgba(100, 116, 139, 0.1)', border: '#64748B', text: '#475569', label: 'Vật tư y tế', icon: '🩺' },
};

export const WarehouseScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'MAP' | 'INVENTORY' | 'RECEIPTS' | 'TRANSFERS' | 'EXPIRATION' | 'TRACE' | 'FORECAST'>('MAP');

  // --- Sơ Đồ Kho Tổng (Warehouse Map) State ---
  const [warehouseZones, setWarehouseZones] = useState<WarehouseZone[]>(DEFAULT_GSP_ZONES);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [selectedShelfForDetail, setSelectedShelfForDetail] = useState<{ zone: string; rack: string; shelf: number } | null>(null);
  const [highlightedTarget, setHighlightedTarget] = useState<string>('');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');

  // --- Inventory State ---
  const [medicines, setMedicines] = useState<Medicine[]>(ApiService.MEDICINE_OFFLINE_FALLBACK);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // --- Barcode & Label Modal State ---
  const [scannerVisible, setScannerVisible] = useState<boolean>(false);
  const [scannerPurpose, setScannerPurpose] = useState<'LOCATE_MAP' | 'SEARCH_INVENTORY' | 'TRACE_LOT' | 'RECEIVE_TRANSFER'>('LOCATE_MAP');
  const [labelModalVisible, setLabelModalVisible] = useState<boolean>(false);
  const [selectedMedForLabel, setSelectedMedForLabel] = useState<Medicine | null>(null);

  // --- Stock Transfers & QR State ---
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [selectedTransferForQR, setSelectedTransferForQR] = useState<StockTransfer | null>(null);
  const [transferFilter, setTransferFilter] = useState<string>('ALL');

  // --- Goods Receipts state (GRN) ---
  const [receipts, setReceipts] = useState<any[]>([
    {
      id: 'GRN-2026-881',
      poCode: 'PO-2026-01',
      supplier: 'Công Ty Cổ Phần Dược Hậu Giang',
      status: 'INSPECTING',
      date: '2026-09-12',
      items: [
        {
          name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu (15 gói x 2 miếng)',
          expected: 150,
          actual: 0,
          unit: 'Hộp',
          status: 'PENDING',
          batchNo: 'B007-HIS',
          expDate: '2027-02-03',
          image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg',
        },
        {
          name: 'Miếng dán Tiger Balm Plaster - RD Haw Par giảm mỏi cơ (7cm x 10cm)',
          expected: 100,
          actual: 0,
          unit: 'Hộp',
          status: 'PENDING',
          batchNo: 'TB-2026-08',
          expDate: '2027-11-20',
          image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/00500745_tiger_balm_plaster_rd_7x10cm_4417_62bd_large_4776af9b3f.jpg',
        },
      ],
    },
    {
      id: 'GRN-2026-882',
      poCode: 'PO-2026-02',
      supplier: 'Hisamitsu Pharmaceutical Việt Nam',
      status: 'PENDING_APPROVAL',
      date: '2026-09-11',
      items: [
        {
          name: 'Cao dán Salonsip Gel - Patch Hisamitsu giảm đau mỏi cơ (8 gói x 3 miếng)',
          expected: 80,
          actual: 80,
          unit: 'Hộp',
          status: 'VERIFIED',
          batchNo: 'SLS-2026-04',
          expDate: '2027-08-15',
          image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_00638_2f20f0ff6a.jpg',
        },
      ],
    },
  ]);

  // AI Goods Inspection Scanner state
  const [inspectModalVisible, setInspectModalVisible] = useState<boolean>(false);
  const [selectedReceiptForInspection, setSelectedReceiptForInspection] = useState<any | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [selectedInspectionImage, setSelectedInspectionImage] = useState<string>(
    'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg'
  );
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
  const [expiredList, setExpiredList] = useState<any[]>([
    { name: 'Cefuroxim 500mg', batchNo: 'Lô D1', expDate: '2026-09-20', stock: 12, unit: 'Hộp', daysLeft: 20 },
    { name: 'Strepsils Cool', batchNo: 'Lô E1', expDate: '2026-10-01', stock: 40, unit: 'Hộp', daysLeft: 31 },
  ]);

  // AI Demand Forecast state
  const [forecastPeriod, setForecastPeriod] = useState<number>(30);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastData, setForecastData] = useState<any | null>(null);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [medList, mapRes, lowStock, transferList] = await Promise.all([
        ApiService.getMedicines({ search: searchQuery }),
        ApiService.getWarehouseMap(),
        ApiService.getLowStockReport(),
        ApiService.getStockTransfers(),
      ]);

      if (medList) setMedicines(medList);
      if (mapRes && mapRes.zones) setWarehouseZones(mapRes.zones);
      if (transferList && transferList.length > 0) {
        setTransfers(transferList);
      } else {
        // Fallback demo stock transfers
        setTransfers([
          {
            id: 'st_demo_1',
            transferCode: 'ST-20260920-0001',
            fromBranchId: 'CENTRAL_WH',
            fromBranchName: 'Kho Tổng GSP Trung Tâm',
            toBranchId: 'BR-001',
            toBranchName: 'Chi Nhánh Q1 - TP.HCM',
            status: 'SHIPPING',
            items: [
              { medicineId: 'fallback_1', name: 'Panadol Extra Đỏ', batchNo: 'BATCH-2026-001', quantity: 50, unit: 'Vỉ' },
              { medicineId: 'fallback_2', name: 'Amoxicillin 500mg', batchNo: 'AMX-2026-11', quantity: 30, unit: 'Hộp' },
            ],
            createdAt: '2026-09-20',
          },
          {
            id: 'st_demo_2',
            transferCode: 'ST-20260919-0002',
            fromBranchId: 'CENTRAL_WH',
            fromBranchName: 'Kho Tổng GSP Trung Tâm',
            toBranchId: 'BR-002',
            toBranchName: 'Chi Nhánh Q3 - TP.HCM',
            status: 'COMPLETED',
            items: [
              { medicineId: 'fallback_3', name: 'Decolgen Forte', batchNo: 'DEC-2026-05', quantity: 40, unit: 'Vỉ' },
            ],
            createdAt: '2026-09-19',
          },
        ]);
      }
    } catch (e) {
      console.warn('Error loading warehouse data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        showToast.success(
          'Đã tìm thấy vị trí',
          `Thuốc: ${first.name}\nVị trí: Khu ${first.location.zone} · Kệ ${first.location.rack} · Tầng ${first.location.shelf}`
        );
      } else {
        // Fallback barcode lookup
        const lookup = await ApiService.getByBarcode(code);
        if (lookup && lookup.found && lookup.medicine) {
          const loc = lookup.fefoBatch?.location || { zone: 'B', rack: 'B1', shelf: 1 };
          const targetId = `${loc.zone}-${loc.rack}-${loc.shelf}`;
          setHighlightedTarget(targetId);
          showToast.success(
            'Đã tìm thấy vị trí',
            `Thuốc: ${lookup.medicine.name}\nVị trí: Khu ${loc.zone} · Kệ ${loc.rack} · Tầng ${loc.shelf}`
          );
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
    } else if (scannerPurpose === 'RECEIVE_TRANSFER') {
      // Find transfer and confirm
      const transfer = transfers.find((t) => t.transferCode === code || t.id === code || t._id === code);
      if (transfer) {
        Alert.alert(
          'Xác Nhận Nhập Hàng Bằng QR',
          `Phiếu: ${transfer.transferCode}\nTừ: ${transfer.fromBranchName || transfer.fromBranchId}\nSố lượng: ${transfer.items?.length || 0} loại thuốc.\nBạn muốn xác nhận nhập kho?`,
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Xác Nhận Nhập Kho',
              onPress: async () => {
                await ApiService.receiveStockTransfer(transfer.id || transfer._id || '', {
                  receivedBy: 'Thủ kho di động',
                  inspectionNote: 'Quét mã QR kiện hàng thành công',
                });
                showToast.success('Thành công', `Đã nhập kho phiếu ${transfer.transferCode}!`);
                loadData();
              },
            },
          ]
        );
      } else {
        showToast.error('Mã phiếu không tồn tại', `Không tìm thấy phiếu chuyển kho: ${code}`);
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
        // Mock fallback trace
        setTraceResult({
          batchNo: batchNo.toUpperCase(),
          medicineName: 'Panadol Extra Đỏ 500mg',
          supplier: 'Công ty Cổ phần Dược Hậu Giang',
          expDate: '2027-08-15',
          currentStock: 320,
          transactions: [
            { type: 'Nhập kho tổng', date: '2026-01-10', qty: '+500', note: 'Theo PO-2026-01 (Khu B · Kệ B1 · Tầng 1)' },
            { type: 'Xuất chuyển kho', date: '2026-02-14', qty: '-100', note: 'Chuyển Chi Nhánh Q1 (ST-20260214-0001)' },
            { type: 'Xuất chuyển kho', date: '2026-03-01', qty: '-80', note: 'Chuyển Chi Nhánh Q3 (ST-20260301-0002)' },
          ],
        });
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

  const handleStartInspection = (receipt: any) => {
    setSelectedReceiptForInspection(receipt);
    setSelectedItemIndex(0);
    setAiScanResult(null);
    setActualCountInput('');
    const firstItem = receipt.items?.[0];
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
      if (res) {
        setForecastData(res);
      } else {
        setForecastData({
          predictedDemand: 1240,
          confidenceScore: 0.94,
          topDemanded: [
            { name: 'Panadol Extra', demand: 420, trend: '+15%' },
            { name: 'Amoxicillin 500mg', demand: 310, trend: '+8%' },
            { name: 'Decolgen Forte', demand: 250, trend: '+22%' },
          ],
        });
      }
    } catch (e) {
      console.warn('Lỗi dự báo:', e);
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

      if (res && res.confidence) {
        setAiScanResult(res);
        setActualCountInput(String(res.aiCount || currentItem.expected || 100));
      } else {
        // Mock fallback AI vision
        setAiScanResult({
          medName: currentItem.name,
          aiCount: currentItem.expected || 150,
          batchNo: currentItem.batchNo || 'B007-HIS',
          expDate: currentItem.expDate || '2027-02-03',
          integrity: 'Nguyên đai nguyên kiện, bao bì chuẩn GSP',
          confidence: 96.8,
          matchPo: true,
        });
        setActualCountInput(String(currentItem.expected || 150));
      }
    } catch {
      showToast.error('Lỗi', 'AI kiểm định gặp sự cố.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleConfirmItemInspection = () => {
    if (!selectedReceiptForInspection) return;
    const nextReceipts = receipts.map((r) => {
      if (r.id === selectedReceiptForInspection.id) {
        const nextItems = [...r.items];
        nextItems[selectedItemIndex] = {
          ...nextItems[selectedItemIndex],
          actual: parseInt(actualCountInput, 10) || nextItems[selectedItemIndex].expected,
          status: 'VERIFIED',
        };
        return { ...r, items: nextItems };
      }
      return r;
    });

    setReceipts(nextReceipts);
    setSelectedReceiptForInspection((prev: any) => {
      if (!prev) return null;
      const nextItems = [...prev.items];
      nextItems[selectedItemIndex] = {
        ...nextItems[selectedItemIndex],
        actual: parseInt(actualCountInput, 10) || nextItems[selectedItemIndex].expected,
        status: 'VERIFIED',
      };
      return { ...prev, items: nextItems };
    });

    showToast.success('Đã xác nhận', `Mặt hàng "${selectedReceiptForInspection.items[selectedItemIndex]?.name}" đã qua kiểm định!`);
  };

  const handleFinishAndStockReceipt = () => {
    if (!selectedReceiptForInspection) return;
    setReceipts((prev) =>
      prev.map((r) => (r.id === selectedReceiptForInspection.id ? { ...r, status: 'COMPLETED' } : r))
    );
    setInspectModalVisible(false);
    showToast.success('Hoàn tất', `Đã nhập kho GSP thành công toàn bộ lô hàng ${selectedReceiptForInspection.id}!`);
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
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Quản Lý Kho Dược GSP"
        subtitle="Sơ đồ 2D, Quét Barcode/QR, Tồn kho & Kiểm nhận"
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

      {/* Horizontal Scrollable Tabs Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          <AnimatedTouchable
            onPress={() => setActiveTab('MAP')}
            style={[styles.tabItem, activeTab === 'MAP' && styles.activeTabItem]}
          >
            <Ionicons name="map" size={15} color={activeTab === 'MAP' ? '#065F46' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'MAP' && styles.activeTabText]}>Sơ Đồ Kho</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('INVENTORY')}
            style={[styles.tabItem, activeTab === 'INVENTORY' && styles.activeTabItem]}
          >
            <Ionicons name="cube" size={15} color={activeTab === 'INVENTORY' ? '#065F46' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'INVENTORY' && styles.activeTabText]}>Tồn Kho</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('TRANSFERS')}
            style={[styles.tabItem, activeTab === 'TRANSFERS' && styles.activeTabItem]}
          >
            <Ionicons name="swap-horizontal" size={15} color={activeTab === 'TRANSFERS' ? '#065F46' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'TRANSFERS' && styles.activeTabText]}>Xuất Chuyển (QR)</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('RECEIPTS')}
            style={[styles.tabItem, activeTab === 'RECEIPTS' && styles.activeTabItem]}
          >
            <Ionicons name="document-text" size={15} color={activeTab === 'RECEIPTS' ? '#065F46' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'RECEIPTS' && styles.activeTabText]}>Kiểm Nhận</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('EXPIRATION')}
            style={[styles.tabItem, activeTab === 'EXPIRATION' && styles.activeTabItem]}
          >
            <Ionicons name="alarm" size={15} color={activeTab === 'EXPIRATION' ? '#065F46' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'EXPIRATION' && styles.activeTabText]}>Hết Hạn</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('TRACE')}
            style={[styles.tabItem, activeTab === 'TRACE' && styles.activeTabItem]}
          >
            <Ionicons name="git-branch" size={15} color={activeTab === 'TRACE' ? '#065F46' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'TRACE' && styles.activeTabText]}>Truy Lô</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => setActiveTab('FORECAST')}
            style={[styles.tabItem, activeTab === 'FORECAST' && styles.activeTabItem]}
          >
            <Ionicons name="analytics" size={15} color={activeTab === 'FORECAST' ? '#065F46' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'FORECAST' && styles.activeTabText]}>Dự Báo AI</Text>
          </AnimatedTouchable>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#059669']} />}
      >
        {/* ========================================================= */}
        {/* TAB 1: SƠ ĐỒ KHO TỔNG (WAREHOUSE MAP) */}
        {/* ========================================================= */}
        {activeTab === 'MAP' && (
          <View>
            {/* KPI Summary */}
            <View style={styles.kpiRow}>
              <GradientCard gradientVariant="ocean" style={styles.kpiCard}>
                <Ionicons name="layers" size={20} color="#FFFFFF" />
                <Text style={styles.kpiValue}>{warehouseZones.length} Phân Khu</Text>
                <Text style={styles.kpiLabel}>Chuẩn GSP (Zone A-F)</Text>
              </GradientCard>
              <GradientCard gradientVariant="emerald" style={styles.kpiCard}>
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
                <Text style={styles.kpiValue}>{medicines.length}</Text>
                <Text style={styles.kpiLabel}>Tổng loại thuốc</Text>
              </GradientCard>
              <GradientCard gradientVariant="emerald" style={styles.kpiCard}>
                <Ionicons name="layers" size={20} color="#FFFFFF" />
                <Text style={styles.kpiValue}>
                  {medicines.reduce((sum, m) => sum + m.stock, 0).toLocaleString('vi-VN')}
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
                          { color: isLowStock ? '#DC2626' : '#059669' },
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
                          <Ionicons name="location-outline" size={15} color="#059669" />
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
                      { backgroundColor: tf.status === 'COMPLETED' ? '#ECFDF5' : '#EFF6FF' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.transferStatusBadgeText,
                        { color: tf.status === 'COMPLETED' ? '#059669' : '#2563EB' },
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
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 4: GOODS RECEIPTS (KIỂM NHẬN NHẬP KHO) */}
        {/* ========================================================= */}
        {activeTab === 'RECEIPTS' && (
          <View>
            <Text style={styles.sectionTitle}>Phiếu Nhập Kho (Goods Receipts - GRN)</Text>
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
                            ? '#ECFDF5'
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
                              ? '#059669'
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
                          { backgroundColor: it.status === 'VERIFIED' ? '#ECFDF5' : '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.itemStatusPillText,
                            { color: it.status === 'VERIFIED' ? '#059669' : '#D97706' },
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
                    <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
                    <Text style={styles.completedReceiptText}>
                      Đã hoàn tất kiểm nhận AI & nhập kho lưu trữ GSP
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 5: EXPIRATION REPORT */}
        {/* ========================================================= */}
        {activeTab === 'EXPIRATION' && (
          <View>
            <Text style={styles.sectionTitle}>Báo Cáo Thuốc Cận Hạn Dùng (&lt; 90 Ngày)</Text>
            {expiredList.map((item, idx) => (
              <View key={idx} style={styles.expCard}>
                <View style={styles.expHeader}>
                  <Ionicons name="alarm" size={20} color="#DC2626" />
                  <Text style={styles.expMedName}>{item.name}</Text>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>Còn {item.daysLeft} ngày</Text>
                  </View>
                </View>
                <Text style={styles.expSub}>
                  Số Lô: <Text style={{ fontWeight: '700' }}>{item.batchNo}</Text> • Hạn: {item.expDate}
                </Text>
                <Text style={styles.expStock}>
                  Tồn kho cần ưu tiên xuất / đổi trả:{' '}
                  <Text style={{ fontWeight: '800', color: '#DC2626' }}>
                    {item.stock} {item.unit}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        )}

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
                  <Ionicons name="shield-checkmark" size={24} color="#059669" />
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
                    <Text style={[styles.metaVal, { color: '#059669', fontWeight: '800' }]}>
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
        title={
          scannerPurpose === 'LOCATE_MAP'
            ? 'Quét Barcode Định Vị Kệ'
            : scannerPurpose === 'RECEIVE_TRANSFER'
            ? 'Quét QR Nhận Hàng Chuyển Kho'
            : scannerPurpose === 'TRACE_LOT'
            ? 'Quét Barcode / QR Truy Lô'
            : 'Quét Mã Vạch Dược Phẩm'
        }
        subtitle={
          scannerPurpose === 'LOCATE_MAP'
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
        />
      )}

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
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.inspectModalHeader}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="scan-circle" size={24} color="#059669" style={{ marginRight: 6, flexShrink: 0 }} />
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
                <Ionicons name="camera" size={16} color="#059669" />
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

            {aiScanResult && (
              <View style={styles.aiResultCard}>
                <View style={styles.aiResultHeader}>
                  <Text style={styles.aiResultTitle}>Kết Quả AI Vision</Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>Khớp: {aiScanResult.confidence}%</Text>
                  </View>
                </View>

                <View style={styles.aiRow}>
                  <Text style={styles.aiRowLabel}>📦 Số lượng:</Text>
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

                <View style={styles.actualCountWrapper}>
                  <Text style={styles.actualCountLabel}>Xác nhận số lượng thực nhận:</Text>
                  <View style={styles.actualCountInputRow}>
                    <TextInput
                      style={styles.actualCountInput}
                      keyboardType="numeric"
                      value={actualCountInput}
                      onChangeText={setActualCountInput}
                    />
                    <Text style={styles.unitSuffix}>Hộp</Text>
                  </View>
                </View>

                <GradientButton
                  title="XÁC NHẬN MẶT HÀNG NÀY"
                  onPress={handleConfirmItemInspection}
                  gradientVariant="success"
                  size="sm"
                  style={{ marginTop: 10 }}
                />
              </View>
            )}

            {selectedReceiptForInspection?.items?.every((it: any) => it.status === 'VERIFIED') && (
              <View style={styles.finishInspectionBox}>
                <Ionicons name="ribbon-outline" size={24} color="#059669" />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#065F46',
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
    backgroundColor: '#10B981',
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  locateBtnText: {
    fontSize: 11,
    color: '#059669',
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
    color: '#059669',
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
    backgroundColor: '#059669',
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
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  completedReceiptText: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '600',
  },
  expCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  expHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  expMedName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    marginLeft: 6,
  },
  daysBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  daysBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  expSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  expStock: {
    fontSize: 11.5,
    color: '#334155',
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
    backgroundColor: '#059669',
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
    backgroundColor: '#059669',
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
  riskLow: { backgroundColor: '#ECFDF5' },
  riskBadgeText: { fontSize: 9.5, fontWeight: 'bold' },
  riskHighText: { color: '#DC2626' },
  riskMediumText: { color: '#D97706' },
  riskLowText: { color: '#059669' },
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
  inspectCurrentPoQty: { fontSize: 11, color: '#059669', marginTop: 2 },
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  cameraActionBtnText: { color: '#059669', fontSize: 12, fontWeight: 'bold' },
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
    borderColor: '#059669',
    marginBottom: 12,
  },
  aiResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiResultTitle: { fontSize: 13, fontWeight: 'bold', color: '#059669' },
  confidenceBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  confidenceText: { fontSize: 10, fontWeight: 'bold', color: '#059669' },
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
  finishInspectionBox: { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 10 },
  finishInspectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#059669', marginTop: 4 },
});
