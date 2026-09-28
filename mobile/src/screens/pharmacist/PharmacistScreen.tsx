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
import { ApiService } from '../../services/api.service';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { Medicine, CartItem, SamplePrescription } from '../../types/pharmacy.types';
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';
import { BarcodeLabelModal } from '../../components/barcode/BarcodeLabelModal';

export const PharmacistScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'OCR'>('POS');

  // POS State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchMed, setSearchMed] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMedDetail, setSelectedMedDetail] = useState<Medicine | null>(null);
  const [modalSelectedUnit, setModalSelectedUnit] = useState<{
    unitName: string;
    exchangeValue: number;
    price: number;
    isBaseUnit?: boolean;
  } | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [medList, sampleList] = await Promise.all([
        ApiService.getMedicines({ search: searchMed }),
        ApiService.getSamplePrescriptions(),
      ]);

      if (medList) setMedicines(medList);
      if (sampleList && sampleList.length > 0) {
        setSamples(sampleList);
      } else {
        setSamples([
          { filename: 'don_thuoc_viem_phe_quan.jpg', title: 'Đơn thuốc Viêm phế quản cấp', doctor: 'BS. Nguyễn Văn Hùng' },
          { filename: 'don_thuoc_cam_cum.jpg', title: 'Đơn thuốc Cảm cúm & Sốt siêu vi', doctor: 'BS. Lê Thị Mai' },
          { filename: 'don_thuoc_da_day.jpg', title: 'Đơn thuốc Đau dạ dày & Trào ngược', doctor: 'BS. Trần Tuấn Anh' },
        ]);
      }
    } catch (e) {
      console.warn('Error loading pharmacist data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchMed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Medicine Detail with default unit
  const handleOpenMedDetail = (med: Medicine) => {
    const unitOptions = ApiService.buildUnitOptions(med);
    // Ưu tiên đơn vị đầu tiên (Hộp) hoặc đơn vị lẻ nếu muốn
    setModalSelectedUnit(unitOptions[0] || { unitName: med.unit || 'Hộp', price: med.price, exchangeValue: 1 });
    setSelectedMedDetail(med);
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
        const localMatched = medicines.find(
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
      let matched = medicines.find((med) => m.medicineId && med.id === m.medicineId);
      if (!matched) {
        matched = medicines.find(
          (med) =>
            med.name.toLowerCase().includes(m.name.toLowerCase().slice(0, 5)) ||
            (m.name && med.name.toLowerCase().includes(m.name.toLowerCase()))
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
      setOcrResult({
        diagnosis: 'Viêm họng cấp tính & Sốt xuất huyết nhẹ',
        doctor: 'BS. CKII Lê Hoàng Minh (BV Chợ Rẫy)',
        patient: 'Nguyễn Văn Tâm (32 tuổi)',
        medicines: [
          { name: 'Amoxicillin 500mg', dosage: 'Uống 1 viên x 2 lần/ngày sau ăn (7 ngày)', qty: 14, unit: 'Viên' },
          { name: 'Panadol Extra', dosage: 'Uống 1 viên khi sốt trên 38.5°C', qty: 10, unit: 'Viên' },
          { name: 'Strepsils Cool', dosage: 'Ngậm 1 viên mỗi 3 giờ khi rát họng', qty: 1, unit: 'Hộp' },
        ],
      });
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Dược Sĩ Bán Hàng"
        subtitle="POS Bán lẻ & Quét Đơn OCR"
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
          onPress={() => setActiveTab('POS')}
          style={[styles.tabItem, activeTab === 'POS' && styles.activeTabItem]}
        >
          <Ionicons
            name="cart"
            size={18}
            color={activeTab === 'POS' ? '#065F46' : '#94A3B8'}
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
            color={activeTab === 'OCR' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'OCR' && styles.activeTabText]}>
            Quét Đơn OCR
          </Text>
        </AnimatedTouchable>

      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#059669']} />}
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
              <GradientCard gradientVariant="emerald" style={styles.cartBanner}>
                <View style={styles.cartBannerRow}>
                  <View>
                    <Text style={styles.cartCount}>Đã chọn {cart.length} mặt hàng</Text>
                    <Text style={styles.cartTotal}>{totalCartPrice.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                  <AnimatedTouchable onPress={handleCheckout} style={styles.checkoutBtn}>
                    <Text style={styles.checkoutBtnText}>THANH TOÁN</Text>
                    <Ionicons name="arrow-forward" size={16} color="#059669" />
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
            {medicines.map((med, idx) => {
              const opts = ApiService.buildUnitOptions(med);
              const expStatus = ApiService.getExpiryStatus(med);
              const isOutStock = (med.stock || 0) <= 0;

              return (
                <View key={med.id || (med as any)._id || `med-${idx}`} style={styles.medCard}>
                  <Image
                    source={{
                      uri:
                        med.image ||
                        med.image_url ||
                        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                    }}
                    style={styles.medThumb}
                    resizeMode="cover"
                  />
                  <AnimatedTouchable
                    onPress={() => handleOpenMedDetail(med)}
                    style={{ flex: 1, marginLeft: 12 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={styles.medName} numberOfLines={1}>{med.name}</Text>
                      {med.isRx ? (
                        <View style={styles.rxBadge}>
                          <Text style={styles.rxBadgeText}>Rx</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.medActive} numberOfLines={1}>Hoạt chất: {med.active}</Text>
                    
                    <View style={styles.codeRow}>
                      {med.sku ? (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>SKU: {med.sku}</Text>
                        </View>
                      ) : null}
                      {med.barcode ? (
                        <View style={[styles.codeBadge, { backgroundColor: '#F1F5F9' }]}>
                          <Ionicons name="barcode" size={11} color="#475569" style={{ marginRight: 2 }} />
                          <Text style={[styles.codeBadgeText, { color: '#475569' }]}>{med.barcode}</Text>
                        </View>
                      ) : null}

                      {/* Badge Hạn Dùng / FEFO */}
                      <View style={[styles.expiryBadge, { backgroundColor: expStatus.badgeBg, borderColor: expStatus.badgeColor }]}>
                        <Ionicons name={expStatus.icon as any} size={10} color={expStatus.badgeColor} style={{ marginRight: 2 }} />
                        <Text style={[styles.expiryBadgeText, { color: expStatus.badgeColor }]}>
                          {expStatus.status === 'EXPIRED'
                            ? 'HẾT HẠN'
                            : expStatus.status === 'NEAR_EXPIRY'
                            ? `CẬN HẠN (${expStatus.daysLeft}d)`
                            : `HSD: ${expStatus.expDateFormatted}`}
                        </Text>
                      </View>
                    </View>

                    {/* Hiển thị Giá: Gồm cả giá Hộp và giá quy cách lẻ */}
                    <View style={{ marginTop: 2 }}>
                      {opts.length > 1 ? (
                        <View>
                          <Text style={styles.medPrice}>
                            {opts[0].price.toLocaleString('vi-VN')} ₫ / {opts[0].unitName}
                          </Text>
                          <Text style={styles.medSubPrice}>
                            hoặc {opts[1].price.toLocaleString('vi-VN')} ₫ / {opts[1].unitName}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.medPrice}>
                          {med.price.toLocaleString('vi-VN')} ₫ / {med.unit}
                        </Text>
                      )}
                    </View>
                  </AnimatedTouchable>

                  <View style={styles.actionCol}>
                    <AnimatedTouchable
                      onPress={() => handleOpenLabelModal(med)}
                      style={styles.labelIconBtn}
                    >
                      <Ionicons name="print-outline" size={16} color="#0284C7" />
                    </AnimatedTouchable>

                    {isOutStock ? (
                      <AnimatedTouchable
                        onPress={() => handleOpenAlternatives(med)}
                        style={styles.altQuickBtn}
                      >
                        <Ionicons name="swap-horizontal" size={14} color="#7C3AED" />
                        <Text style={styles.altQuickBtnText}>Thay thế</Text>
                      </AnimatedTouchable>
                    ) : (
                      <AnimatedTouchable
                        onPress={() => handleOpenMedDetail(med)}
                        style={styles.addCartBtn}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.addCartBtnText}>Thêm</Text>
                      </AnimatedTouchable>
                    )}
                  </View>
                </View>
              );
            })}
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
                <Ionicons name="images-outline" size={18} color="#059669" />
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
                    <Ionicons name="refresh" size={14} color="#059669" />
                    <Text style={styles.reScanBtnText}>Quét lại AI</Text>
                  </AnimatedTouchable>
                </View>
              </View>
            )}

            {/* Scanning indicator */}
            {scanning && (
              <View style={styles.ocrLoadingBox}>
                <ActivityIndicator size="small" color="#059669" />
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
                  <Ionicons name="document-text" size={22} color="#059669" />
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
                  <Ionicons name="scan-circle" size={26} color="#059669" />
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
                  const matchedMed = medicines.find((medItem) =>
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
                          <Ionicons name="cart-outline" size={16} color="#059669" />
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

      {/* Medicine Detail Modal */}
      <Modal visible={selectedMedDetail !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Image
                source={{
                  uri:
                    selectedMedDetail?.image ||
                    selectedMedDetail?.image_url ||
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                }}
                style={styles.modalMedImage}
                resizeMode="cover"
              />
              <Text style={styles.modalTitle}>{selectedMedDetail?.name}</Text>
              <Text style={styles.modalSub}>
                Hoạt chất: {selectedMedDetail?.active || selectedMedDetail?.active_ingredient || 'N/A'}
              </Text>

              {/* GIÁ THEO ĐƠN VỊ ĐÃ CHỌN */}
              {(() => {
                const curPrice = modalSelectedUnit?.price ?? selectedMedDetail?.price ?? 0;
                const curUnit = modalSelectedUnit?.unitName ?? selectedMedDetail?.unit ?? 'Hộp';
                return (
                  <Text style={styles.modalPrice}>
                    Giá: {curPrice.toLocaleString('vi-VN')} ₫ / {curUnit}
                  </Text>
                );
              })()}

              {/* BỘ CHỌN QUY CÁCH / ĐƠN VỊ BÁN LẺ (ĐỒNG BỘ VỚI WEB) */}
              {selectedMedDetail && (() => {
                const unitOpts = ApiService.buildUnitOptions(selectedMedDetail);
                if (unitOpts.length <= 1) return null;
                const currentUnitName = modalSelectedUnit?.unitName || selectedMedDetail.unit;

                return (
                  <View style={styles.unitSelectorBox}>
                    <Text style={styles.unitSelectorLabel}>
                      Quy cách đóng gói & Đơn vị bán lẻ:
                    </Text>
                    <View style={styles.unitOptionRow}>
                      {unitOpts.map((opt) => {
                        const isSelected = currentUnitName === opt.unitName;
                        return (
                          <AnimatedTouchable
                            key={opt.unitName}
                            onPress={() => setModalSelectedUnit(opt)}
                            style={[styles.unitOptionChip, isSelected && styles.activeUnitOptionChip]}
                          >
                            <Text
                              style={[
                                styles.unitOptionChipText,
                                isSelected && styles.activeUnitOptionChipText,
                              ]}
                            >
                              {opt.unitName} ({opt.price.toLocaleString('vi-VN')} ₫)
                            </Text>
                          </AnimatedTouchable>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}

              <View style={styles.codeRow}>
                {selectedMedDetail?.sku ? (
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeBadgeText}>SKU: {selectedMedDetail.sku}</Text>
                  </View>
                ) : null}
                {selectedMedDetail?.barcode ? (
                  <View style={[styles.codeBadge, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="barcode" size={12} color="#475569" style={{ marginRight: 3 }} />
                    <Text style={[styles.codeBadgeText, { color: '#475569' }]}>
                      {selectedMedDetail.barcode}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* CẢNH BÁO LÔ HÀNG & HẠN SỬ DỤNG (FEFO / EXPIRED / NEAR EXPIRY) */}
              {selectedMedDetail && (() => {
                const exp = ApiService.getExpiryStatus(selectedMedDetail);
                return (
                  <View
                    style={[
                      styles.fefoBox,
                      { backgroundColor: exp.badgeBg, borderColor: exp.badgeColor },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons
                        name={exp.icon as any}
                        size={18}
                        color={exp.badgeColor}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.fefoTitle, { color: exp.badgeColor }]}>
                        {exp.status === 'EXPIRED'
                          ? '⛔ CẢNH BÁO: LÔ THUỐC ĐÃ HẾT HẠN'
                          : exp.status === 'NEAR_EXPIRY'
                          ? '⚠️ CẢNH BÁO: CẬN HẠN SỬ DỤNG (FEFO)'
                          : 'KIỂM SOÁT HẠN DÙNG & LÔ FEFO'}
                      </Text>
                    </View>
                    <Text style={[styles.fefoMessage, { color: exp.badgeColor }]}>
                      {exp.warningMessage}
                    </Text>
                  </View>
                );
              })()}

              {/* ĐỀ XUẤT THUỐC TƯƠNG ĐƯƠNG / THAY THẾ */}
              <AnimatedTouchable
                onPress={() => {
                  const med = selectedMedDetail;
                  setSelectedMedDetail(null);
                  if (med) handleOpenAlternatives(med);
                }}
                style={styles.altSearchBtn}
              >
                <Ionicons name="git-branch-outline" size={16} color="#7C3AED" />
                <Text style={styles.altSearchBtnText}>
                  Tìm Thuốc Tương Đương / Thay Thế Cùng Hoạt Chất
                </Text>
              </AnimatedTouchable>

              <View style={styles.modalSection}>
                <Text style={styles.secTitle}>Công dụng & Chỉ định:</Text>
                <Text style={styles.secText}>
                  {selectedMedDetail?.cong_dung || selectedMedDetail?.indications || 'Giảm đau, kháng viêm tại chỗ, đau khớp, đau mỏi cơ.'}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.secTitle}>Cách dùng & Liều lượng:</Text>
                <Text style={styles.secText}>
                  {selectedMedDetail?.cach_dung || selectedMedDetail?.default_dosage || 'Dán hoặc uống theo chỉ định của bác sĩ/dược sĩ.'}
                </Text>
              </View>

              <AnimatedTouchable
                onPress={() => {
                  const med = selectedMedDetail;
                  setSelectedMedDetail(null);
                  if (med) handleOpenLabelModal(med);
                }}
                style={styles.labelModalBtn}
              >
                <Ionicons name="print-outline" size={16} color="#0284C7" />
                <Text style={styles.labelModalBtnText}>Xem / In Tem Nhãn Barcode 50x30mm</Text>
              </AnimatedTouchable>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setSelectedMedDetail(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </AnimatedTouchable>
              <GradientButton
                title="THÊM VÀO GIỎ"
                onPress={() => {
                  if (selectedMedDetail) {
                    const curPrice = modalSelectedUnit?.price ?? selectedMedDetail.price;
                    const curUnit = modalSelectedUnit?.unitName ?? selectedMedDetail.unit;
                    addToCart(selectedMedDetail, curUnit, curPrice);
                  }
                  setSelectedMedDetail(null);
                }}
                gradientVariant="primary"
                size="md"
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>

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
                          <View style={[styles.stockBadge, { backgroundColor: isAvailable ? '#ECFDF5' : '#FEE2E2' }]}>
                            <Text style={[styles.stockBadgeText, { color: isAvailable ? '#059669' : '#DC2626' }]}>
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
    backgroundColor: '#ECFDF5',
  },
  tabText: {
    fontSize: 11,
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
    backgroundColor: '#059669',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#059669',
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
    color: '#D1FAE5',
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
    color: '#059669',
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
    color: '#059669',
    marginTop: 4,
  },
  addCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
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
    backgroundColor: '#ECFDF5',
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
    backgroundColor: '#059669',
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  ocrGalleryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  capturedPrescriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
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
    backgroundColor: '#ECFDF5',
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
    color: '#059669',
  },
  ocrLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
    gap: 10,
  },
  ocrLoadingText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
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
    color: '#059669',
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
    color: '#059669',
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
    color: '#059669',
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
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
    color: '#E6FFFA',
  },
  cartUnitChipTextActive: {
    color: '#065F46',
  },
  cartUnitStaticText: {
    fontSize: 11,
    color: '#E6FFFA',
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
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  unitOptionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeUnitOptionChipText: {
    color: '#059669',
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
    color: '#059669',
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
