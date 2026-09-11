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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { Medicine, CartItem, SamplePrescription } from '../../types/pharmacy.types';

export const PharmacistScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'OCR' | 'INTERACTIONS'>('POS');

  // POS State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchMed, setSearchMed] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMedDetail, setSelectedMedDetail] = useState<Medicine | null>(null);

  // OCR Prescription State
  const [samples, setSamples] = useState<SamplePrescription[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  // Drug Interaction State
  const [selectedInteractionMeds, setSelectedInteractionMeds] = useState<string[]>([]);
  const [checkingInteractions, setCheckingInteractions] = useState<boolean>(false);
  const [interactionResult, setInteractionResult] = useState<any | null>(null);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [medList, sampleList] = await Promise.all([
        ApiService.getMedicines({ search: searchMed }),
        ApiService.getSamplePrescriptions(),
      ]);

      if (medList && medList.length > 0) setMedicines(medList);
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

  // Cart operations
  const addToCart = (med: Medicine) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.medicine.id === med.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const updateQuantity = (medId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicine.id === medId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalCartPrice = cart.reduce(
    (sum, item) => sum + item.medicine.price * item.quantity,
    0
  );

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Thông báo', 'Giỏ hàng đang trống.');
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
            Alert.alert('Thành công', 'Đã in hóa đơn và hoàn tất bán lẻ tại quầy!');
          },
        },
      ]
    );
  };

  // OCR Scan handler
  const handleScanSample = async (filename: string) => {
    setScanning(true);
    const res = await ApiService.scanSamplePrescription(filename);
    setScanning(false);

    if (res) {
      setOcrResult(res);
    } else {
      // Mock OCR result
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

  // Drug Interaction checker
  const toggleInteractionMed = (medName: string) => {
    setSelectedInteractionMeds((prev) =>
      prev.includes(medName) ? prev.filter((m) => m !== medName) : [...prev, medName]
    );
  };

  const handleCheckInteractions = async () => {
    if (selectedInteractionMeds.length < 2) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 2 loại thuốc để kiểm tra tương tác chéo.');
      return;
    }

    setCheckingInteractions(true);
    const res = await ApiService.checkInteractions(selectedInteractionMeds);
    setCheckingInteractions(false);

    if (res) {
      setInteractionResult(res);
    } else {
      setInteractionResult({
        hasInteraction: true,
        severity: 'MODERATE',
        description: 'Tương tác giữa Paracetamol và Kháng sinh Amoxicillin: Không có chống chỉ định tuyệt đối, nhưng cần theo dõi chức năng gan khi dùng liều cao dài ngày.',
        recommendation: 'Uống cách nhau 2 tiếng để giảm thiểu kích ứng dạ dày.',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Dược Sĩ Bán Hàng"
        subtitle="POS Bán lẻ, Quét Đơn OCR & Kiểm tra tương tác thuốc"
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

        <AnimatedTouchable
          onPress={() => setActiveTab('INTERACTIONS')}
          style={[styles.tabItem, activeTab === 'INTERACTIONS' && styles.activeTabItem]}
        >
          <Ionicons
            name="git-compare"
            size={18}
            color={activeTab === 'INTERACTIONS' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'INTERACTIONS' && styles.activeTabText]}>
            Tương Tác Thuốc
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
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tra cứu thuốc bán lẻ..."
                placeholderTextColor="#94A3B8"
                value={searchMed}
                onChangeText={setSearchMed}
              />
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
                  {cart.map((item) => (
                    <View key={item.medicine.id} style={styles.cartRow}>
                      <Text style={styles.cartMedName} numberOfLines={1}>
                        {item.medicine.name}
                      </Text>
                      <View style={styles.qtyControl}>
                        <AnimatedTouchable
                          onPress={() => updateQuantity(item.medicine.id, -1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>-</Text>
                        </AnimatedTouchable>
                        <Text style={styles.qtyVal}>{item.quantity}</Text>
                        <AnimatedTouchable
                          onPress={() => updateQuantity(item.medicine.id, 1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </AnimatedTouchable>
                      </View>
                    </View>
                  ))}
                </View>
              </GradientCard>
            )}

            <Text style={styles.sectionTitle}>Danh Mục Thuốc Tại Quầy</Text>
            {medicines.map((med) => (
              <View key={med.id} style={styles.medCard}>
                <AnimatedTouchable
                  onPress={() => setSelectedMedDetail(med)}
                  style={{ flex: 1 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.medName}>{med.name}</Text>
                    {med.isRx ? (
                      <View style={styles.rxBadge}>
                        <Text style={styles.rxBadgeText}>Rx</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.medActive}>Hoạt chất: {med.active}</Text>
                  <Text style={styles.medPrice}>
                    {med.price.toLocaleString('vi-VN')} ₫ / {med.unit}
                  </Text>
                </AnimatedTouchable>

                <AnimatedTouchable
                  onPress={() => addToCart(med)}
                  style={styles.addCartBtn}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addCartBtnText}>Thêm</Text>
                </AnimatedTouchable>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: OCR */}
        {activeTab === 'OCR' && (
          <View>
            <Text style={styles.sectionTitle}>Chọn Đơn Thuốc Mẫu Để Quét AI OCR</Text>
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
                  <Text style={styles.ocrHeading}>Kết Quả Trích Xuất AI</Text>
                </View>

                <Text style={styles.ocrDiag}>Chẩn đoán: <Text style={{ fontWeight: '700' }}>{ocrResult.diagnosis}</Text></Text>
                <Text style={styles.ocrDoc}>Bác sĩ kê đơn: {ocrResult.doctor}</Text>

                <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 14 }]}>
                  Danh Sách Thuốc Kê Đơn:
                </Text>
                {ocrResult.medicines?.map((m: any, idx: number) => (
                  <View key={idx} style={styles.ocrMedItem}>
                    <Text style={styles.ocrMedName}>
                      {idx + 1}. {m.name} - SL: {m.qty} {m.unit}
                    </Text>
                    <Text style={styles.ocrDosage}>Cách dùng: {m.dosage}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: INTERACTIONS */}
        {activeTab === 'INTERACTIONS' && (
          <View>
            <Text style={styles.sectionTitle}>Chọn Thuốc Cần Kiểm Tra Tương Tác</Text>
            <View style={styles.interactionChipGrid}>
              {medicines.map((m) => {
                const selected = selectedInteractionMeds.includes(m.name);
                return (
                  <AnimatedTouchable
                    key={m.id}
                    onPress={() => toggleInteractionMed(m.name)}
                    style={[
                      styles.interChip,
                      selected && styles.selectedInterChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.interChipText,
                        selected && styles.selectedInterChipText,
                      ]}
                    >
                      {m.name}
                    </Text>
                  </AnimatedTouchable>
                );
              })}
            </View>

            <GradientButton
              title="KIỂM TRA TƯƠNG TÁC CHÉO"
              onPress={handleCheckInteractions}
              loading={checkingInteractions}
              gradientVariant="indigo"
              size="md"
              style={{ marginVertical: 14 }}
            />

            {interactionResult && (
              <View
                style={[
                  styles.interactionCard,
                  { borderLeftColor: interactionResult.hasInteraction ? '#F59E0B' : '#10B981' },
                ]}
              >
                <View style={styles.interactionHeader}>
                  <Ionicons
                    name={interactionResult.hasInteraction ? 'warning' : 'checkmark-circle'}
                    size={24}
                    color={interactionResult.hasInteraction ? '#D97706' : '#059669'}
                  />
                  <Text style={styles.interactionTitle}>
                    {interactionResult.hasInteraction
                      ? `CẢNH BÁO MỨC ĐỘ: ${interactionResult.severity}`
                      : 'AN TOÀN - KHÔNG PHÁT HIỆN TƯƠNG TÁC NGUY HIỂM'}
                  </Text>
                </View>
                <Text style={styles.interactionDesc}>{interactionResult.description}</Text>
                {interactionResult.recommendation ? (
                  <Text style={styles.interactionRec}>
                    Khuyến nghị: {interactionResult.recommendation}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Medicine Detail Modal */}
      <Modal visible={selectedMedDetail !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedMedDetail?.name}</Text>
            <Text style={styles.modalSub}>Hoạt chất: {selectedMedDetail?.active}</Text>
            <Text style={styles.modalPrice}>
              Giá: {selectedMedDetail?.price.toLocaleString('vi-VN')} ₫ / {selectedMedDetail?.unit}
            </Text>

            <View style={styles.modalSection}>
              <Text style={styles.secTitle}>Công dụng & Chỉ định:</Text>
              <Text style={styles.secText}>{selectedMedDetail?.cong_dung || 'N/A'}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.secTitle}>Cách dùng & Liều lượng:</Text>
              <Text style={styles.secText}>{selectedMedDetail?.cach_dung || 'N/A'}</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setSelectedMedDetail(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </AnimatedTouchable>
              <GradientButton
                title="THÊM VÀO GIỎ"
                onPress={() => {
                  if (selectedMedDetail) addToCart(selectedMedDetail);
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
    marginLeft: 8,
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
  interactionChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedInterChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  interChipText: {
    fontSize: 13,
    color: '#475569',
  },
  selectedInterChipText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  interactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  interactionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
    flex: 1,
  },
  interactionDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  interactionRec: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 8,
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
});
