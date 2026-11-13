// PharmacistScreen.tsx - Pharmacist POS, AI Prescription OCR & Drug Interaction Checking
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api.service';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { Medicine, CartItem, SamplePrescription } from '../../types/pharmacy.types';
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';
import { BarcodeLabelModal } from '../../components/barcode/BarcodeLabelModal';
import { AttendanceCheckInModal } from '../../components/attendance/AttendanceCheckInModal';
import { StaffPayslipModal } from '../../components/payroll/StaffPayslipModal';
import { StaffLeaveModal } from '../../components/attendance/StaffLeaveModal';
import { StaffScheduleModal } from '../../components/schedule/StaffScheduleModal';
import { ShiftSwapModal } from '../../components/schedule/ShiftSwapModal';
import { catalogStorageService } from '../../services/catalogStorage.service';
import { ClinicalSidebarDrawer, DrawerMenuItem } from '../../components/clinical/ClinicalSidebarDrawer';
import { DigitalHealthPassportModal } from '../../components/clinical/DigitalHealthPassportModal';

export const PharmacistScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'POS' | 'OCR'>('POS');
  const [showDrawer, setShowDrawer] = useState<boolean>(false);

  // Attendance & Shift State
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);
  const [showStaffIdModal, setShowStaffIdModal] = useState<boolean>(false);
  const [swapPrefillShift, setSwapPrefillShift] = useState<any | null>(null);
  const [leavePrefillShift, setLeavePrefillShift] = useState<any | null>(null);
  const [activeShift, setActiveShift] = useState<any | null>(null);

  // POS State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchMed, setSearchMed] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Alternatives State (Thuốc tương đương / thay thế)
  const [showAlternativesModal, setShowAlternativesModal] = useState<boolean>(false);
  const [selectedTargetMed, setSelectedTargetMed] = useState<Medicine | null>(null);
  const [alternativesList, setAlternativesList] = useState<Medicine[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState<boolean>(false);

  // Barcode & Label State
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [selectedLabelMed, setSelectedLabelMed] = useState<Medicine | null>(null);

  // OCR Prescription State
  const [samples, setSamples] = useState<SamplePrescription[]>([]);
  const [capturedPrescriptionUri, setCapturedPrescriptionUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);


  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Hỗ trợ mở trực tiếp Modal / Sub-view khi xem qua Web Reviewer
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const modal = params.get('modal');
      const tab = params.get('tab');
      if (tab === 'OCR') setActiveTab('OCR');
      if (modal === 'checkin') setShowCheckInModal(true);
      if (modal === 'schedule') setShowScheduleModal(true);
      if (modal === 'payslip') setShowPayslipModal(true);
      if (modal === 'leave') setShowLeaveModal(true);
      if (modal === 'swap') setShowSwapModal(true);
      if (modal === 'drawer') setShowDrawer(true);
      if (modal === 'scanner') setShowScanner(true);
      if (modal === 'med_detail') {
        const demoMed = medicines[0] || {
          id: 'med_demo_01',
          name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu giảm đau cơ (15 gói x 2 miếng)',
          active: 'Diclofenac sodium 1.5% w/w',
          category: 'Giảm đau',
          price: 65000,
          unit: 'Hộp',
          stock: 120,
          sku: 'MED-SALONPAS-DICLO',
          barcode: '8935001701125',
          expDate: '2027-02-03',
        };
        navigation.navigate('MedicineDetailScreen', {
          medicine: demoMed,
          medicineId: demoMed.id || (demoMed as any)._id,
        });
      }
      if (modal === 'alternatives') {
        const demoMed = medicines[0] || {
          id: 'med_demo_01',
          name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu giảm đau cơ (15 gói x 2 miếng)',
          active: 'Diclofenac sodium 1.5% w/w',
          category: 'Giảm đau',
          price: 65000,
          unit: 'Hộp',
          stock: 120,
        };
        handleOpenAlternatives(demoMed as any);
      }
      if (modal === 'label') {
        const demoMed = medicines[0] || {
          id: 'med_demo_01',
          name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu',
          price: 65000,
          unit: 'Hộp',
          barcode: '8935001701125',
        };
        handleOpenLabelModal(demoMed as any);
      }
      if (modal === 'cart_drawer') {
        const demoMed = medicines[0] || {
          id: 'med_demo_01',
          name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu',
          price: 65000,
          unit: 'Hộp',
        };
        addToCart(demoMed as any, 'Hộp', 65000);
      }
    }
  }, [medicines]);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      // Nạp danh mục thuốc đầy đủ 2000+ sản phẩm vào bộ nhớ máy để tra cứu tức thì
      catalogStorageService.init(user?.branchId).catch(() => {});

      const [medList, sampleList, currentShift] = await Promise.all([
        ApiService.getMedicines({ search: searchMed }),
        ApiService.getSamplePrescriptions(),
        ApiService.getMyCurrentShift(),
      ]);

      if (medList) setMedicines(medList);
      setSamples(sampleList || []);
      setActiveShift(currentShift);
    } catch (e) {
      console.warn('Error loading pharmacist data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchMed, user?.branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Điều hướng sang Màn hình Chi Tiết Thuốc riêng biệt (MedicineDetailScreen) kế thừa 100% chuẩn Client
  const handleOpenMedDetail = (med: Medicine) => {
    navigation.navigate('MedicineDetailScreen', {
      medicine: med,
      medicineId: med.id || (med as any)._id,
    });
  };

  // Open Alternatives Modal
  const handleOpenAlternatives = async (med: Medicine) => {
    setSelectedTargetMed(med);
    setShowAlternativesModal(true);
    setLoadingAlternatives(true);
    try {
      const list = await ApiService.getAlternatives(med.id);
      setAlternativesList(list || []);
    } catch (e) {
      console.warn('Lỗi lấy thuốc thay thế:', e);
      setAlternativesList([]);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  // Cart operations
  const addToCart = (
    med: Medicine,
    customUnit?: string,
    customPrice?: number,
    initialQty: number = 1
  ) => {
    const unitOptions = ApiService.buildUnitOptions(med);
    const selectedUnit = customUnit || unitOptions[0]?.unitName || med.unit || 'Hộp';
    const selectedPrice =
      customPrice !== undefined
        ? customPrice
        : unitOptions.find((u) => u.unitName === selectedUnit)?.price ?? med.price;

    const expInfo = ApiService.getExpiryStatus(med);
    if (expInfo.status === 'EXPIRED') {
      Alert.alert(
        '⛔ CẢNH BÁO: LÔ THUỐC ĐÃ HẾT HẠN',
        `Thuốc "${med.name}" (${expInfo.batchNo}) đã hết hạn sử dụng (${expInfo.expDateFormatted}).\n\nTheo quy chuẩn GPP, tuyệt đối không được bán thuốc đã hết hạn! Bạn có muốn tìm thuốc tương đương thay thế không?`,
        [
          { text: 'Hủy bỏ', style: 'cancel' },
          {
            text: 'Tìm Thuốc Thay Thế',
            onPress: () => handleOpenAlternatives(med),
          },
        ]
      );
      return;
    }

    if ((med.stock ?? 0) <= 0) {
      showToast.error('Hết hàng', `Thuốc "${med.name}" hiện đã hết tồn kho quầy.`);
      return;
    }

    setCart((prev) => {
      const itemKey = `${med.id}_${selectedUnit}`;
      const idx = prev.findIndex(
        (i) => `${i.medicine.id}_${i.selectedUnit || i.medicine.unit}` === itemKey
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + initialQty };
        return next;
      }
      return [
        ...prev,
        {
          medicine: med,
          quantity: initialQty,
          selectedUnit,
          unitPrice: selectedPrice,
          unitOptions,
          batchNo: expInfo.batchNo,
          expDate: expInfo.expDateFormatted,
        },
      ];
    });

    showToast.success(
      'Đã thêm vào giỏ',
      `${med.name} (${initialQty} ${selectedUnit} - ${(selectedPrice * initialQty).toLocaleString('vi-VN')} ₫)`
    );
  };

  const updateQuantity = (medId: string, delta: number, unit?: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          const match = item.medicine.id === medId && (!unit || item.selectedUnit === unit);
          if (match) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleChangeCartUnit = (itemKey: string, newUnitName: string) => {
    setCart((prev) =>
      prev.map((item) => {
        const key = `${item.medicine.id}_${item.selectedUnit || item.medicine.unit}`;
        if (key !== itemKey) return item;

        const options =
          item.unitOptions && item.unitOptions.length > 0
            ? item.unitOptions
            : ApiService.buildUnitOptions(item.medicine);
        const opt = options.find((u) => u.unitName === newUnitName) || {
          unitName: newUnitName,
          price: item.medicine.price,
          exchangeValue: 1,
        };

        return {
          ...item,
          selectedUnit: opt.unitName,
          unitPrice: opt.price,
        };
      })
    );
  };

  const totalCartPrice = cart.reduce(
    (sum, item) => sum + (item.unitPrice !== undefined ? item.unitPrice : item.medicine.price) * item.quantity,
    0
  );

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast.info('Thông báo', 'Giỏ hàng đang trống.');
      return;
    }

    if (!activeShift?.isCheckedIn) {
      Alert.alert(
        'CHƯA VÀO CA TRỰC (GPP)',
        'Theo quy chuẩn GPP, Dược sĩ phải điểm danh GPS vào ca trực chi nhánh trước khi được phép xuất bán thuốc và tạo hóa đơn POS.\n\nVui lòng nhấn "Điểm danh vào ca" để tiếp tục.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Điểm danh ngay', onPress: () => setShowCheckInModal(true) },
        ]
      );
      return;
    }

    Alert.alert(
      'Thanh Toán Đơn Thuốc',
      `Tổng tiền: ${totalCartPrice.toLocaleString('vi-VN')} ₫\nBạn muốn xuất hóa đơn và hoàn tất đơn hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu Tiền Mặt / Hoàn Tất',
          onPress: () => {
            setCart([]);
            showToast.success('Thành công', 'Đã in hóa đơn và hoàn tất bán lẻ tại quầy!');
          },
        },
      ]
    );
  };

  // Barcode Scan Handler for POS
  const handleBarcodeScan = async (code: string) => {
    setShowScanner(false);
    try {
      const result = await ApiService.getByBarcode(code);
      if (result && result.medicine) {
        const med = result.medicine;
        addToCart(med);

        let batchInfo = '';
        if (result.matchedLot) {
          const lotCode = result.matchedLot.lotNumber || result.matchedLot.lot || 'Chỉ định tự động';
          const exp = result.matchedLot.expiryDate || result.matchedLot.expDate || '';
          batchInfo = ` (Lô FEFO: ${lotCode}${exp ? ` - HSD: ${exp}` : ''})`;
        }
        showToast.success('Quét Barcode Thành Công', `Đã thêm ${med.name}${batchInfo} vào giỏ POS!`);
      } else {
        // Tra cứu trong toàn bộ 2000+ sản phẩm cục bộ (O(1) Map Lookup)
        const localMatched =
          catalogStorageService.findMedicineByBarcode(code) ||
          catalogStorageService.findMedicineBySku(code) ||
          medicines.find(
            (m) =>
              m.barcode === code ||
              m.sku === code ||
              m.name.toLowerCase().includes(code.toLowerCase()) ||
              m.units?.some((u) => u.barcode === code)
          );
        if (localMatched) {
          addToCart(localMatched);
          showToast.success('Quét Barcode Thành Công', `Đã tìm thấy và thêm ${localMatched.name} vào giỏ hàng!`);
        } else {
          showToast.error('Không tìm thấy thuốc', `Không có sản phẩm nào khớp với mã vạch: ${code}`);
        }
      }
    } catch (e) {
      console.warn('Lỗi tra cứu barcode:', e);
      showToast.error('Lỗi tra cứu', 'Không thể kết nối máy chủ tra cứu mã vạch.');
    }
  };

  // Label Modal Handler: ensure full barcode and units details
  const handleOpenLabelModal = async (med: Medicine) => {
    setSelectedLabelMed(med);
    const medId = med.id || (med as any)._id;
    if (medId && (!med.barcode || !med.units || med.units.length <= 1)) {
      try {
        const full = await ApiService.getMedicineById(medId);
        if (full) {
          const mapped = ApiService.mapMedicine(full);
          setSelectedLabelMed(mapped);
        }
      } catch (err) {
        console.log('Fetch full medicine for label modal failed, using current med:', err);
      }
    }
  };


  // OCR Scan handlers
  const handleTakePhotoPrescription = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showToast.error('Cần quyền máy ảnh', 'Vui lòng cấp quyền máy ảnh trong Cài đặt để chụp ảnh đơn thuốc.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        const uri = res.assets[0].uri;
        setCapturedPrescriptionUri(uri);
        await handleScanPrescriptionImage(uri);
      }
    } catch (e) {
      console.warn('Lỗi chụp ảnh đơn thuốc:', e);
    }
  };

  const handlePickPrescriptionFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast.error('Cần quyền thư viện', 'Vui lòng cấp quyền thư viện để chọn ảnh đơn thuốc.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        const uri = res.assets[0].uri;
        setCapturedPrescriptionUri(uri);
        await handleScanPrescriptionImage(uri);
      }
    } catch (e) {
      console.warn('Lỗi chọn ảnh đơn thuốc:', e);
    }
  };

  const handleScanPrescriptionImage = async (uri: string) => {
    setScanning(true);
    try {
      const res = await ApiService.scanPrescriptionAI(uri);
      if (!res) {
        showToast.info('Thông báo', 'Không thể nhận diện nội dung đơn thuốc từ ảnh. Bạn có thể chọn đơn mẫu để thử nghiệm.');
        return;
      }

      if (res.error_code === 'HANDWRITTEN_PRESCRIPTION_REJECTED' || res.is_handwritten) {
        showToast.error('Từ chối', 'Đơn thuốc viết tay không được hỗ trợ! Vui lòng chụp hoặc tải lên đơn bản in điện tử rõ nét.');
        return;
      }

      if (res.success === false && res.message) {
        showToast.error('Lỗi quét', res.message);
        return;
      }

      let meds: any[] = [];
      if (Array.isArray(res.items)) {
        meds = res.items.map((item: any) => {
          const sku = item.selected_sku || {};
          const ext = item.extracted || {};
          return {
            name: sku.product_name || ext.brand_name || ext.generic_name || item.raw_text || 'Thuốc chỉ định',
            dosage: ext.usage_instruction || 'Theo chỉ định bác sĩ',
            qty: ext.quantity || 1,
            unit: sku.unit || ext.unit || 'Viên',
            price: sku.retail_price || 0,
            medicineId: sku.product_id,
            stock: sku.stock || 0,
            batchNo: item.fefo_batch?.batch_no || 'DEFAULT',
          };
        });
      } else {
        const ocr = res.ocr_result || res;
        const rawMeds = ocr.medications || res.medications || res.matched_drugs || [];
        meds = rawMeds.map((m: any) => ({
          name: m.name || m.product_name || m.brand_name || 'Thuốc chỉ định',
          dosage: m.dosage || m.instruction || m.usage || 'Theo chỉ định bác sĩ',
          qty: m.qty || m.quantity || 10,
          unit: m.unit || 'Hộp',
        }));
      }

      const parsedResult = {
        diagnosis: res.patient?.diagnosis || res.ocr_result?.diagnosis || res.diagnosis || 'Kê đơn theo phác đồ điều trị',
        doctor: res.doctor?.name ? `${res.doctor.name}${res.doctor.hospital ? ` (${res.doctor.hospital})` : ''}` : (res.ocr_result?.doctor || res.doctor || 'Bác sĩ điều trị'),
        patient: res.patient?.name ? `${res.patient.name}${res.patient.age ? ` (${res.patient.age}T)` : ''}` : (res.ocr_result?.patient_name || res.patient_name || 'Bệnh nhân khám'),
        medicines: meds,
      };

      setOcrResult(parsedResult);
      showToast.success('Thành công', `AI đã hoàn tất quét và bóc tách ${meds.length} thuốc từ bản in!`);
    } catch (e: any) {
      console.warn('Lỗi quét đơn thuốc:', e);
      showToast.error('Lỗi', e?.message || 'Không thể kết nối dịch vụ AI OCR.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddAllOcrToCart = () => {
    if (!ocrResult?.medicines?.length) return;
    let addedCount = 0;
    ocrResult.medicines.forEach((m: any) => {
      // 1. Tìm trong toàn bộ 2000+ sản phẩm cục bộ bằng ID hoặc tên
      let matched = m.medicineId ? catalogStorageService.findMedicineById(m.medicineId) : undefined;
      if (!matched && m.name) {
        const hits = catalogStorageService.searchMedicines(m.name, 1);
        if (hits.length > 0) matched = hits[0];
      }
      // 2. Dự phòng tìm trong danh sách medicines hiện tại
      if (!matched) {
        matched = medicines.find((med) => m.medicineId && med.id === m.medicineId);
      }
      if (!matched && m.name) {
        matched = medicines.find(
          (med) =>
            med.name.toLowerCase().includes(m.name.toLowerCase().slice(0, 5)) ||
            med.name.toLowerCase().includes(m.name.toLowerCase())
        );
      }
      if (matched) {
        addToCart(matched);
        addedCount++;
      }
    });
    if (addedCount > 0) {
      showToast.success('Thành công', `Đã thêm ${addedCount} loại thuốc vào giỏ hàng POS!`);
      setActiveTab('POS');
    } else {
      showToast.info('Thông báo', 'Chưa tìm thấy thuốc tương ứng trong kho chi nhánh để thêm tự động.');
    }
  };

  const handleScanSample = async (filename: string) => {
    setScanning(true);
    const res = await ApiService.scanSamplePrescription(filename);
    setScanning(false);

    if (res) {
      setOcrResult(res);
    } else {
      showToast.error('Lỗi nhận diện', 'Không thể kết nối máy chủ OCR hoặc ảnh không rõ nét. Vui lòng thử lại.');
    }
  };


  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <HeaderBar
        title="ABC Pharmacy"
        subtitle={user?.branchName ? `Quầy POS • ${user.branchName}` : 'Quầy Bán Hàng Dược Sĩ POS'}
        gradientVariant="sky"
        leftAction={{
          icon: 'menu',
          onPress: () => setShowDrawer(true),
        }}
        rightAction={{
          icon: 'person-circle-outline',
          onPress: () => navigation.navigate('ProfileScreen'),
        }}
        secondaryRightAction={{
          icon: 'notifications-outline',
          onPress: () => navigation.navigate('NotificationListScreen'),
        }}
      />

      {/* Cảnh báo GPP khi chưa vào ca */}
      {!activeShift?.isCheckedIn && (
        <AnimatedTouchable
          onPress={() => setShowCheckInModal(true)}
          style={styles.gppWarningBanner}
        >
          <Ionicons name="warning" size={18} color="#B45309" />
          <Text style={styles.gppWarningText}>
            Cảnh báo GPP: Bạn chưa điểm danh vào ca trực. Nhấn vào đây để check-in GPS trước khi bán hàng!
          </Text>
        </AnimatedTouchable>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <AnimatedTouchable
          onPress={() => setActiveTab('POS')}
          style={[styles.tabItem, activeTab === 'POS' && styles.activeTabItem]}
        >
          <Ionicons
            name="cart"
            size={18}
            color={activeTab === 'POS' ? '#0369A1' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'POS' && styles.activeTabText]}>
            POS Bán Hàng ({cart.reduce((a, b) => a + b.quantity, 0)})
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('OCR')}
          style={[styles.tabItem, activeTab === 'OCR' && styles.activeTabItem]}
        >
          <Ionicons
            name="scan"
            size={18}
            color={activeTab === 'OCR' ? '#0369A1' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'OCR' && styles.activeTabText]}>
            Quét Đơn OCR
          </Text>
        </AnimatedTouchable>

      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#0284C7']} />}
      >
        {/* TAB 1: POS */}
        {activeTab === 'POS' && (
          <View>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tra cứu thuốc bán lẻ, SKU, Barcode..."
                  placeholderTextColor="#94A3B8"
                  value={searchMed}
                  onChangeText={setSearchMed}
                />
                {searchMed ? (
                  <AnimatedTouchable onPress={() => setSearchMed('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </AnimatedTouchable>
                ) : null}
              </View>
              <AnimatedTouchable
                onPress={() => setShowScanner(true)}
                style={styles.scanBarcodeBtn}
              >
                <Ionicons name="barcode-outline" size={20} color="#FFFFFF" />
                <Text style={styles.scanBarcodeBtnText}>Quét</Text>
              </AnimatedTouchable>
            </View>

            {/* Cart Preview Banner */}
            {cart.length > 0 && (
              <GradientCard gradientVariant="sky" style={styles.cartBanner}>
                <View style={styles.cartBannerRow}>
                  <View>
                    <Text style={styles.cartCount}>Đã chọn {cart.length} mặt hàng</Text>
                    <Text style={styles.cartTotal}>{totalCartPrice.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                  <AnimatedTouchable onPress={handleCheckout} style={styles.checkoutBtn}>
                    <Text style={styles.checkoutBtnText}>THANH TOÁN</Text>
                    <Ionicons name="arrow-forward" size={16} color="#0284C7" />
                  </AnimatedTouchable>
                </View>

                {/* Cart Items Summary */}
                <View style={styles.cartItemList}>
                  {cart.map((item, idx) => {
                    const itemKey = `${item.medicine.id}_${item.selectedUnit || item.medicine.unit}`;
                    const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.medicine.price;
                    const itemTotal = unitPrice * item.quantity;
                    const unitOpts = item.unitOptions && item.unitOptions.length > 0
                      ? item.unitOptions
                      : ApiService.buildUnitOptions(item.medicine);
                    const isOutOfStock = (item.medicine.stock || 0) <= 0;

                    return (
                      <View key={itemKey || `cart-${idx}`} style={styles.cartRow}>
                        <Image
                          source={{
                            uri:
                              item.medicine.image ||
                              item.medicine.image_url ||
                              'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                          }}
                          style={styles.cartThumb}
                          resizeMode="cover"
                        />
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.cartMedName} numberOfLines={1}>
                            {item.medicine.name}
                          </Text>

                          <View style={styles.cartSubRow}>
                            {/* Bộ chọn hoặc hiển thị đơn vị */}
                            {unitOpts.length > 1 ? (
                              <View style={styles.cartUnitSelector}>
                                {unitOpts.map((opt) => {
                                  const isSel = (item.selectedUnit || item.medicine.unit) === opt.unitName;
                                  return (
                                    <AnimatedTouchable
                                      key={opt.unitName}
                                      onPress={() => handleChangeCartUnit(itemKey, opt.unitName)}
                                      style={[styles.cartUnitChip, isSel && styles.cartUnitChipActive]}
                                    >
                                      <Text style={[styles.cartUnitChipText, isSel && styles.cartUnitChipTextActive]}>
                                        {opt.unitName}
                                      </Text>
                                    </AnimatedTouchable>
                                  );
                                })}
                              </View>
                            ) : (
                              <Text style={styles.cartUnitStaticText}>
                                {item.selectedUnit || item.medicine.unit}
                              </Text>
                            )}

                            <Text style={styles.cartPriceText}>
                              {itemTotal.toLocaleString('vi-VN')} ₫
                            </Text>
                          </View>

                          {/* Cảnh báo hết hàng nếu stock <= 0 */}
                          {isOutOfStock && (
                            <View style={styles.cartStockWarningRow}>
                              <Text style={styles.cartStockWarningText}>⚠️ Hết hàng (Tồn: 0)</Text>
                              <AnimatedTouchable
                                onPress={() => handleOpenAlternatives(item.medicine)}
                                style={styles.cartAltBtn}
                              >
                                <Ionicons name="swap-horizontal" size={12} color="#7C3AED" />
                                <Text style={styles.cartAltBtnText}>Tìm thay thế</Text>
                              </AnimatedTouchable>
                            </View>
                          )}
                        </View>

                        <View style={styles.qtyControl}>
                          <AnimatedTouchable
                            onPress={() => updateQuantity(item.medicine.id, -1, item.selectedUnit)}
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </AnimatedTouchable>
                          <Text style={styles.qtyVal}>{item.quantity}</Text>
                          <AnimatedTouchable
                            onPress={() => updateQuantity(item.medicine.id, 1, item.selectedUnit)}
                            style={styles.qtyBtn}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </AnimatedTouchable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </GradientCard>
            )}

            <Text style={styles.sectionTitle}>Danh Mục Thuốc Tại Quầy (Có Ảnh & Mã Vạch)</Text>
            <View style={styles.medGrid2Col}>
              {medicines.map((med, idx) => {
                const opts = ApiService.buildUnitOptions(med);
                const expStatus = ApiService.getExpiryStatus(med);
                const isOutStock = (med.stock || 0) <= 0;

                return (
                  <View key={med.id || (med as any)._id || `med-${idx}`} style={styles.medGridCard}>
                    {/* Ảnh sản phẩm hình vuông 1:1 tỉ lệ chuẩn Shopee (Chạm vào chuyển trang chi tiết) */}
                    <AnimatedTouchable
                      onPress={() => handleOpenMedDetail(med)}
                      style={styles.medGridImgContainer}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{
                          uri:
                            med.image ||
                            med.image_url ||
                            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                        }}
                        style={styles.medGridThumbSquare}
                        resizeMode="cover"
                      />
                      {med.isRx ? (
                        <View style={styles.medGridRxBadge}>
                          <Text style={styles.rxBadgeText}>Rx</Text>
                        </View>
                      ) : null}
                    </AnimatedTouchable>
                    {/* Nội dung card thuốc (Chạm vào chuyển trang chi tiết) */}
                    <AnimatedTouchable
                      onPress={() => handleOpenMedDetail(med)}
                      style={styles.medGridBody}
                    >
                      <Text style={styles.medGridName} numberOfLines={2}>
                        {med.name}
                      </Text>
                      <Text style={styles.medGridActive} numberOfLines={1}>
                        {med.active ? `Hoạt chất: ${med.active}` : ''}
                      </Text>

                      {/* Mã SKU & HSD */}
                      <View style={styles.medGridMetaRow}>
                        {med.sku ? (
                          <View style={styles.codeBadge}>
                            <Text style={styles.codeBadgeText}>SKU: {med.sku}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.expiryBadge, { backgroundColor: expStatus.badgeBg, borderColor: expStatus.badgeColor }]}>
                          <Text style={[styles.expiryBadgeText, { color: expStatus.badgeColor }]}>
                            {expStatus.status === 'EXPIRED'
                              ? 'HẾT HẠN'
                              : expStatus.status === 'NEAR_EXPIRY'
                              ? `CẬN HẠN`
                              : `HSD: ${expStatus.expDateFormatted}`}
                          </Text>
                        </View>
                      </View>

                      {/* Giá niêm yết */}
                      <Text style={styles.medGridPrice} numberOfLines={1}>
                        {opts.length > 0 ? opts[0].price.toLocaleString('vi-VN') : (med.price || 0).toLocaleString('vi-VN')} ₫
                        <Text style={styles.medGridUnit}> / {opts.length > 0 ? opts[0].unitName : med.unit}</Text>
                      </Text>
                    </AnimatedTouchable>

                    {/* Nút hành động In Tem & Thêm vào đơn */}
                    <View style={styles.medGridActionRow}>
                      <AnimatedTouchable
                        onPress={() => handleOpenLabelModal(med)}
                        style={styles.labelGridIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="print-outline" size={15} color="#0284C7" />
                      </AnimatedTouchable>

                      {isOutStock ? (
                        <AnimatedTouchable
                          onPress={() => handleOpenAlternatives(med)}
                          style={styles.altQuickGridBtn}
                        >
                          <Ionicons name="swap-horizontal" size={13} color="#7C3AED" />
                          <Text style={styles.altQuickGridBtnText}>Đổi</Text>
                        </AnimatedTouchable>
                      ) : (
                        <AnimatedTouchable
                          onPress={() => {
                            addToCart(med);
                            showToast.success('Đã thêm', `Đã thêm ${med.name} vào giỏ POS!`);
                          }}
                          style={styles.addCartGridBtn}
                        >
                          <Ionicons name="add" size={15} color="#FFFFFF" />
                          <Text style={styles.addCartGridBtnText}>Thêm</Text>
                        </AnimatedTouchable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 2: OCR */}
        {activeTab === 'OCR' && (
          <View>
            <Text style={styles.sectionTitle}>Quét Đơn Thuốc Bằng Camera & AI OCR</Text>

            {/* Notice Banner: Printed-only */}
            <View style={{ backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#92400E', fontWeight: 'bold' }}>
                ⚠️ CHỈ HỖ TRỢ ĐƠN THUỐC BẢN IN ĐIỆN TỬ
              </Text>
              <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2, lineHeight: 15 }}>
                Hệ thống chỉ xử lý đơn in rõ nét từ bệnh viện/phòng khám. Tuyệt đối không tiếp nhận đơn chữ viết tay để tránh sai sót y khoa.
              </Text>
            </View>

            {/* Camera & Gallery Action Buttons */}
            <View style={styles.ocrActionRow}>
              <AnimatedTouchable onPress={handleTakePhotoPrescription} style={styles.ocrCameraBtn}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.ocrCameraBtnText}>Chụp Ảnh Đơn</Text>
              </AnimatedTouchable>
              <AnimatedTouchable onPress={handlePickPrescriptionFromGallery} style={styles.ocrGalleryBtn}>
                <Ionicons name="images-outline" size={18} color="#0284C7" />
                <Text style={styles.ocrGalleryBtnText}>Chọn Từ Thư Viện</Text>
              </AnimatedTouchable>
            </View>

            {/* Captured Prescription Preview */}
            {capturedPrescriptionUri && (
              <View style={styles.capturedPrescriptionCard}>
                <Image
                  source={{ uri: capturedPrescriptionUri }}
                  style={styles.capturedPrescriptionThumb}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.capturedPrescriptionTitle} numberOfLines={1}>
                    Đơn thuốc vừa chụp
                  </Text>
                  <Text style={styles.capturedPrescriptionSub}>
                    {scanning ? 'AI đang bóc tách chữ...' : 'Sẵn sàng quét OCR'}
                  </Text>
                  <AnimatedTouchable
                    onPress={() => handleScanPrescriptionImage(capturedPrescriptionUri)}
                    style={styles.reScanBtn}
                    disabled={scanning}
                  >
                    <Ionicons name="refresh" size={14} color="#0284C7" />
                    <Text style={styles.reScanBtnText}>Quét lại AI</Text>
                  </AnimatedTouchable>
                </View>
              </View>
            )}

            {/* Scanning indicator */}
            {scanning && (
              <View style={styles.ocrLoadingBox}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.ocrLoadingText}>
                  AI Vision LLM & OCR đang trích xuất tên bác sĩ, chẩn đoán và danh mục thuốc...
                </Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 14, fontSize: 13, color: '#64748B' }]}>
              Hoặc Chọn Đơn Thuốc Mẫu Thử Nghiệm:
            </Text>
            {samples.map((s, idx) => (
              <AnimatedTouchable
                key={idx}
                onPress={() => handleScanSample(s.filename)}
                style={styles.sampleCard}
              >
                <View style={styles.sampleIconBox}>
                  <Ionicons name="document-text" size={22} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sampleTitle}>{s.title}</Text>
                  <Text style={styles.sampleDoctor}>{s.doctor || 'Bác sĩ chuyên khoa'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </AnimatedTouchable>
            ))}

            {ocrResult && (
              <View style={styles.ocrCard}>
                <View style={styles.ocrHeader}>
                  <Ionicons name="scan-circle" size={26} color="#0284C7" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.ocrHeading}>Kết Quả Trích Xuất AI Vision</Text>
                    <Text style={styles.ocrSubHeading}>Đã đối chiếu danh mục kho chi nhánh</Text>
                  </View>
                </View>

                <Text style={styles.ocrDiag}>Chẩn đoán: <Text style={{ fontWeight: '700' }}>{ocrResult.diagnosis}</Text></Text>
                <Text style={styles.ocrDoc}>Bác sĩ kê đơn: {ocrResult.doctor}</Text>
                {ocrResult.patient && <Text style={styles.ocrDoc}>Bệnh nhân: {ocrResult.patient}</Text>}

                <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 14 }]}>
                  Danh Sách Thuốc Kê Đơn:
                </Text>
                {ocrResult.medicines?.map((m: any, idx: number) => {
                  const matchedMed =
                    (m.medicineId ? catalogStorageService.findMedicineById(m.medicineId) : undefined) ||
                    (m.name ? catalogStorageService.searchMedicines(m.name, 1)[0] : undefined) ||
                    medicines.find(
                      (medItem) =>
                        (m.medicineId && medItem.id === m.medicineId) ||
                        medItem.name.toLowerCase().includes(m.name.toLowerCase().slice(0, 5)) ||
                        (m.name && medItem.name.toLowerCase().includes(m.name.toLowerCase()))
                    );
                  return (
                    <View key={idx} style={styles.ocrMedItem}>
                      <Image
                        source={{
                          uri:
                            matchedMed?.image ||
                            matchedMed?.image_url ||
                            'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg',
                        }}
                        style={styles.ocrMedThumb}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.ocrMedName}>
                          {idx + 1}. {m.name} - SL: {m.qty} {m.unit}
                        </Text>
                        <Text style={styles.ocrDosage}>Cách dùng: {m.dosage}</Text>
                      </View>
                      {matchedMed && (
                        <AnimatedTouchable
                          onPress={() => {
                            addToCart(matchedMed);
                            showToast.success('Đã thêm', `Đã thêm ${matchedMed.name} vào giỏ POS!`);
                          }}
                          style={styles.ocrAddBtn}
                        >
                          <Ionicons name="cart-outline" size={16} color="#0284C7" />
                        </AnimatedTouchable>
                      )}
                    </View>
                  );
                })}

                {/* Add all to cart button */}
                <GradientButton
                  title="THÊM TOÀN BỘ THUỐC VÀO GIỎ POS"
                  onPress={handleAddAllOcrToCart}
                  gradientVariant="success"
                  size="md"
                  style={{ marginTop: 14 }}
                  icon={<Ionicons name="cart" size={18} color="#FFFFFF" />}
                />
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Alternatives Modal (Đề xuất thuốc tương đương cùng hoạt chất) */}
      <Modal visible={showAlternativesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.altModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="git-branch" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.altModalTitle}>Đề Xuất Thuốc Tương Đương</Text>
                  <Text style={styles.altModalSub} numberOfLines={1}>
                    Gốc: {selectedTargetMed?.name}
                  </Text>
                </View>
              </View>
              <AnimatedTouchable onPress={() => setShowAlternativesModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </AnimatedTouchable>
            </View>

            <View style={styles.altActiveIngBox}>
              <Text style={styles.altActiveIngLabel}>Hoạt chất tương đương:</Text>
              <Text style={styles.altActiveIngVal}>
                {selectedTargetMed?.active || selectedTargetMed?.active_ingredient || 'N/A'}
              </Text>
            </View>

            <ScrollView style={{ marginTop: 10, flexGrow: 0 }} showsVerticalScrollIndicator={false}>
              {loadingAlternatives ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={{ marginTop: 10, fontSize: 13, color: '#64748B' }}>
                    Đang tìm thuốc cùng hoạt chất tại chi nhánh...
                  </Text>
                </View>
              ) : alternativesList.length > 0 ? (
                alternativesList.map((alt, idx) => {
                  const altOpts = ApiService.buildUnitOptions(alt);
                  const isAvailable = (alt.stock || 0) > 0;
                  return (
                    <View key={alt.id || (alt as any)._id || idx} style={styles.altItemCard}>
                      <Image
                        source={{
                          uri:
                            alt.image ||
                            alt.image_url ||
                            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                        }}
                        style={styles.altItemThumb}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.altItemName} numberOfLines={2}>
                          {alt.name}
                        </Text>
                        <Text style={styles.altItemActive} numberOfLines={1}>
                          Hoạt chất: {alt.active || alt.active_ingredient || 'N/A'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                          <View style={[styles.stockBadge, { backgroundColor: isAvailable ? '#F0F9FF' : '#FEE2E2' }]}>
                            <Text style={[styles.stockBadgeText, { color: isAvailable ? '#0284C7' : '#DC2626' }]}>
                              {isAvailable ? `Tồn: ${alt.stock} ${alt.unit}` : 'Tạm hết kho'}
                            </Text>
                          </View>
                          <View style={styles.altMatchBadge}>
                            <Text style={styles.altMatchBadgeText}>Khớp hoạt chất</Text>
                          </View>
                        </View>
                        <Text style={styles.altItemPrice}>
                          {alt.price.toLocaleString('vi-VN')} ₫ / {alt.unit}
                        </Text>
                      </View>
                      <AnimatedTouchable
                        onPress={() => {
                          addToCart(alt);
                          setShowAlternativesModal(false);
                          showToast.success('Đã chọn thuốc thay thế', `Đã thêm ${alt.name} vào giỏ hàng`);
                        }}
                        style={styles.altSelectBtn}
                      >
                        <Ionicons name="swap-horizontal" size={15} color="#FFFFFF" />
                        <Text style={styles.altSelectBtnText}>Chọn</Text>
                      </AnimatedTouchable>
                    </View>
                  );
                })
              ) : (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                  <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '700', color: '#475569' }}>
                    Không có thuốc thay thế phù hợp
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                    Hiện không tìm thấy thuốc khác cùng hoạt chất hoặc cùng danh mục còn tồn kho tại chi nhánh này.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={{ marginTop: 14 }}>
              <AnimatedTouchable
                onPress={() => setShowAlternativesModal(false)}
                style={styles.altCloseModalBtn}
              >
                <Text style={styles.altCloseModalBtnText}>Đóng</Text>
              </AnimatedTouchable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleBarcodeScan}
        title="Quét Barcode / QR Thuốc POS"
        subtitle="Hướng camera vào mã EAN-13, SKU hoặc QR trên hộp thuốc"
      />

      {/* Barcode Label Modal */}
      <BarcodeLabelModal
        visible={selectedLabelMed !== null}
        medicine={selectedLabelMed}
        onClose={() => setSelectedLabelMed(null)}
      />

      {/* GPS Attendance Modal */}
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

      {/* Staff Leave Management Modal */}
      <StaffLeaveModal
        visible={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          setLeavePrefillShift(null);
        }}
        prefillShift={leavePrefillShift}
        onSuccess={loadData}
      />

      {/* Staff Work Schedule Modal */}
      <StaffScheduleModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onOpenSwap={(prefill) => {
          setSwapPrefillShift(prefill);
          setShowSwapModal(true);
        }}
        onOpenLeave={(prefill) => {
          setLeavePrefillShift(prefill);
          setShowLeaveModal(true);
        }}
      />

      {/* Shift Swap Modal */}
      <ShiftSwapModal
        visible={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSwapPrefillShift(null);
        }}
        prefillShift={swapPrefillShift}
        onSuccess={loadData}
      />

      {/* Clinical Sidebar Drawer */}
      <ClinicalSidebarDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        user={user}
        roleTitle="Dược Sĩ Bán Hàng (GPP)"
        menuItems={[
          {
            id: 'attendance',
            label: activeShift?.isCheckedIn ? 'Đã Vào Ca Trực (GPS)' : 'Điểm Danh Vào Ca (GPS)',
            iconName: activeShift?.isCheckedIn ? 'checkmark-circle' : 'location',
            color: activeShift?.isCheckedIn ? '#0284C7' : '#D97706',
            badge: activeShift?.isCheckedIn ? 'HỢP LỆ' : 'CẦN VÀO CA',
            badgeVariant: activeShift?.isCheckedIn ? 'success' : 'warning',
            onPress: () => setShowCheckInModal(true),
          },
          {
            id: 'schedule',
            label: 'Lịch Làm Việc Cơ Sở',
            iconName: 'calendar',
            color: '#0284C7',
            onPress: () => setShowScheduleModal(true),
          },
          {
            id: 'swap',
            label: 'Đổi Ca Chéo',
            iconName: 'swap-horizontal',
            color: '#0284C7',
            onPress: () => setShowSwapModal(true),
          },
          {
            id: 'staffId',
            label: 'Thẻ Định Danh Nhân Sự GPP',
            iconName: 'card-outline',
            color: '#0284C7',
            badge: 'MÃ QR',
            badgeVariant: 'info',
            onPress: () => setShowStaffIdModal(true),
          },
          {
            id: 'leave',
            label: 'Đơn Xin Nghỉ Phép',
            iconName: 'airplane-outline',
            color: '#D97706',
            onPress: () => setShowLeaveModal(true),
          },
          {
            id: 'payslip',
            label: 'Phiếu Lương Cá Nhân',
            iconName: 'receipt-outline',
            color: '#0284C7',
            onPress: () => setShowPayslipModal(true),
          },
          {
            id: 'ocr',
            label: 'Quét Đơn Thuốc OCR AI',
            iconName: 'scan-outline',
            color: '#0284C7',
            onPress: () => setActiveTab('OCR'),
          },
        ]}
        onLogout={logout}
      />

      {/* Modal Thẻ Định Danh Nhân Sự GPP Có Mã QR Cho Giám Đốc/Quản Lý Quét */}
      <DigitalHealthPassportModal
        visible={showStaffIdModal}
        onClose={() => setShowStaffIdModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  shiftBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  shiftActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
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
  shiftActiveBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  shiftInactiveBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  payslipBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  shiftActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gppWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  gppWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    lineHeight: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
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
    backgroundColor: '#F0F9FF',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#0369A1',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  scanBarcodeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    backgroundColor: '#F8FAFC',
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
  actionCol: {
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  labelIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  labelModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  labelModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
  },
  cartBanner: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cartBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartCount: {
    fontSize: 12,
    color: '#E0F2FE',
  },
  cartTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  checkoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
    marginRight: 4,
  },
  cartItemList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 8,
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cartMedName: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  qtyVal: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  // ─── Lưới Sản Phẩm 2 Cột Chuẩn Shopee (Width === Height) ───
  medGrid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  medGridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  medGridImgContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    position: 'relative',
    marginBottom: 8,
  },
  medGridThumbSquare: {
    width: '100%',
    height: '100%',
    aspectRatio: 1,
  },
  medGridRxBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  medGridBody: {
    flex: 1,
  },
  medGridName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
    height: 36,
    marginBottom: 2,
  },
  medGridActive: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  medGridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  medGridPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  medGridUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  medGridActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  labelGridIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  addCartGridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addCartGridBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  altQuickGridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F5F3FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  altQuickGridBtnText: {
    color: '#7C3AED',
    fontSize: 11.5,
    fontWeight: '700',
  },
  medCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  rxBadge: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginLeft: 6,
  },
  rxBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  medActive: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  medPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 4,
  },
  addCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 10,
  },
  addCartBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  sampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sampleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  sampleDoctor: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ocrActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  ocrCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  ocrCameraBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ocrGalleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  ocrGalleryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  capturedPrescriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  capturedPrescriptionThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  capturedPrescriptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  capturedPrescriptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  reScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  reScanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  ocrLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
    gap: 10,
  },
  ocrLoadingText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    lineHeight: 18,
  },
  ocrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  ocrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ocrHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284C7',
  },
  ocrSubHeading: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  ocrDiag: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  ocrDoc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  ocrMedItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  ocrMedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  ocrDosage: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
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
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284C7',
    marginVertical: 10,
  },
  modalSection: {
    marginBottom: 10,
  },
  secTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  secText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  medThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cartThumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalMedImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#F1F5F9',
  },
  ocrMedThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  ocrAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginLeft: 8,
  },
  // Cart SubRow & Unit Selector
  cartSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cartUnitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartUnitChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cartUnitChipActive: {
    backgroundColor: '#FFFFFF',
  },
  cartUnitChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E0F2FE',
  },
  cartUnitChipTextActive: {
    color: '#0369A1',
  },
  cartUnitStaticText: {
    fontSize: 11,
    color: '#E0F2FE',
    fontWeight: '600',
  },
  cartPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FEF08A',
  },
  cartStockWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(254, 226, 226, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  cartStockWarningText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  cartAltBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  cartAltBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Expiry & Pricing for medCard
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  expiryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  medSubPrice: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 1,
  },
  altQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 3,
  },
  altQuickBtnText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal Unit Selector
  unitSelectorBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  unitSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  unitOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  activeUnitOptionChip: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  unitOptionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeUnitOptionChipText: {
    color: '#0284C7',
    fontWeight: '800',
  },

  // FEFO Alert Box in Detail Modal
  fefoBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  fefoTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  fefoMessage: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 15,
  },

  // Alt Search button in Detail Modal
  altSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
  },
  altSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Alternatives Modal Styles
  altModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  altModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  altModalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  altActiveIngBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginTop: 8,
    gap: 6,
  },
  altActiveIngLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B21A8',
  },
  altActiveIngVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    flex: 1,
  },
  altItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  altItemThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  altItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  altItemActive: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  altItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 3,
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  altMatchBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  altMatchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  altSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  altSelectBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  altCloseModalBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  altCloseModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
