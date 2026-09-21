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
  Clipboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { Medicine, CartItem, Order, Voucher } from '../../types/pharmacy.types';
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';

export const CustomerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'STORE' | 'CART' | 'AI_CHAT' | 'VOUCHERS' | 'ORDERS'>('STORE');

  // Products & Categories
  const [medicines, setMedicines] = useState<Medicine[]>(ApiService.MEDICINE_OFFLINE_FALLBACK);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMedDetail, setSelectedMedDetail] = useState<Medicine | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Cart & Vouchers
  const [cart, setCart] = useState<CartItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');

  // AI Chat & Voice Consultant
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'ai' | 'user'; text: string; recommendedMeds?: Medicine[] }>>([
    {
      role: 'ai',
      text: 'Xin chào! Tôi là Dược Sĩ AI ABC Pharmacy. Bạn có thể mô tả triệu chứng (ho, sốt, sổ mũi, đau dạ dày...) hoặc bấm nút Ghi Âm để tôi tư vấn thuốc an toàn nhé!',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [selectedOrderQR, setSelectedOrderQR] = useState<Order | null>(null);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  const categoriesList = useMemo(() => {
    const unique = new Set<string>();
    medicines.forEach((m) => {
      if (m.category && m.category.trim().length > 0) {
        unique.add(m.category.trim());
      }
    });
    return [
      { id: 'ALL', label: 'Tất cả' },
      ...Array.from(unique).map((cat) => ({ id: cat, label: cat })),
    ];
  }, [medicines]);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [medList, voucherList, orderList] = await Promise.all([
        ApiService.getMedicines({ search: searchQuery }),
        ApiService.getVouchers(),
        ApiService.getMyOrders(searchPhone || user?.phone),
      ]);

      if (medList && medList.length > 0) {
        setMedicines(medList);
        // Detect nếu đang dùng fallback offline (id có prefix fallback_)
        const usingFallback = medList.some((m: any) => String(m.id || '').startsWith('fallback_'));
        setIsOfflineMode(usingFallback);
      }
      setVouchers(voucherList || []);
      setOrders(orderList || []);
    } catch (e) {
      console.warn('Error loading customer data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, searchPhone, user?.phone]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Voice recording simulation timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

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

  const subtotal = cart.reduce((sum, i) => sum + i.medicine.price * i.quantity, 0);
  const discount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if ((appliedVoucher as any).discount != null) {
      return Number((appliedVoucher as any).discount);
    }
    const val = Number(appliedVoucher.discountValue ?? 0);
    const type = appliedVoucher.discountType ?? 'FIXED_AMOUNT';
    if (type === 'PERCENT' || type === 'PERCENTAGE') {
      let d = (subtotal * val) / 100;
      const maxDisc = Number(
        (appliedVoucher as any).maxDiscountValue ??
        (appliedVoucher as any).maxDiscount ??
        0
      );
      if (maxDisc > 0 && d > maxDisc) d = maxDisc;
      return d;
    }
    return Math.min(val, subtotal);
  }, [appliedVoucher, subtotal]);
  const finalTotal = Math.max(0, subtotal - discount);

  const applyVoucher = async (codeToApply?: string) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!code) {
      showToast.info('Thông báo', 'Vui lòng nhập mã voucher.');
      return;
    }
    try {
      const res = await ApiService.validateVoucher(code, subtotal);
      if (res?.success === true) {
        setAppliedVoucher({
          id: res.code || code,
          code: res.code || code,
          title: `Giảm ${res.discountType === 'PERCENTAGE' ? `${res.discountValue}%` : `${res.discountValue?.toLocaleString('vi-VN')} ₫`}`,
          description: `Được giảm ${res.discount?.toLocaleString('vi-VN') || 0} ₫`,
          discountType: res.discountType,
          discountValue: res.discountValue,
          maxDiscountValue: res.maxDiscountValue,
          discount: res.discount,
        } as any);
        setVoucherCodeInput(code);
        showToast.success('Thành công', `Đã áp dụng mã giảm giá ${res.code || code}!`);
      } else {
        // Fallback to local search if offline or network error
        const found = vouchers.find((v) => v.code.toUpperCase() === code);
        if (found) {
          if (found.minOrderValue && subtotal < found.minOrderValue) {
            showToast.info(
              'Chưa đủ điều kiện',
              `Voucher ${code} chỉ áp dụng cho đơn từ ${found.minOrderValue.toLocaleString('vi-VN')} ₫. Giỏ hàng hiện tại: ${subtotal.toLocaleString('vi-VN')} ₫.`
            );
            return;
          }
          setAppliedVoucher(found);
          setVoucherCodeInput(code);
          showToast.success('Thành công', `Đã áp dụng mã giảm giá ${code}!`);
        } else {
          showToast.error('Voucher không hợp lệ', res?.message || 'Mã voucher không tồn tại hoặc đã hết hạn.');
        }
      }
    } catch {
      const found = vouchers.find((v) => v.code.toUpperCase() === code);
      if (found) {
        setAppliedVoucher(found);
        setVoucherCodeInput(code);
        showToast.success('Thành công', `Đã áp dụng mã giảm giá ${code}!`);
      } else {
        showToast.error('Lỗi', 'Không thể xác thực mã giảm giá.');
      }
    }
  };

  // Barcode Scan for Customer (quét vỏ hộp thuốc tại nhà)
  const handleScanBarcode = async (code: string) => {
    setShowScanner(false);
    try {
      const res = await ApiService.getByBarcode(code);
      if (res && res.medicine) {
        setSelectedMedDetail(res.medicine);
        showToast.success('Tìm Thấy Thuốc', `Đã nhận diện: ${res.medicine.name}`);
      } else {
        const local = medicines.find(
          (m) =>
            m.barcode === code ||
            m.sku === code ||
            m.name.toLowerCase().includes(code.toLowerCase()) ||
            m.units?.some((u) => u.barcode === code)
        );
        if (local) {
          setSelectedMedDetail(local);
          showToast.success('Tìm Thấy Thuốc', `Đã nhận diện: ${local.name}`);
        } else {
          setSearchQuery(code);
          showToast.info('Thông báo', `Không tìm thấy chính xác thuốc với mã: ${code}. Đã điền vào ô tìm kiếm.`);
        }
      }
    } catch (e) {
      console.warn('Lỗi quét barcode:', e);
      showToast.error('Lỗi', 'Không thể kết nối máy chủ tra cứu mã vạch.');
    }
  };

  // AI Chat Logic
  const handleSendChat = async (overrideText?: string) => {
    const userMsg = overrideText || chatInput.trim();
    if (!userMsg) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);

    setAiThinking(true);
    try {
      const res = await ApiService.getTextPrescription(userMsg);
      setAiThinking(false);

      // Find matching medicines in local catalog
      const matchedMeds = medicines.filter(
        (m) =>
          userMsg.toLowerCase().includes(m.name.toLowerCase()) ||
          userMsg.toLowerCase().includes(m.active.toLowerCase()) ||
          (userMsg.includes('đau') && m.category.includes('Giảm đau')) ||
          (userMsg.includes('ho') && m.category.includes('Hô hấp')) ||
          (userMsg.includes('kháng sinh') && m.category.includes('Kháng sinh'))
      ).slice(0, 2);

      if (res?.advice || res?.diagnosis) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `${res.diagnosis ? `📋 Chẩn đoán sơ bộ: ${res.diagnosis}\n\n` : ''}${res.advice || 'Bạn nên dùng các thuốc hỗ trợ giảm triệu chứng, uống nhiều nước ấm và nghỉ ngơi hợp lý.'}`,
            recommendedMeds: matchedMeds.length > 0 ? matchedMeds : undefined,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `Dựa trên triệu chứng "${userMsg}":\n• Nếu đau đầu, hạ sốt: Có thể dùng Panadol Extra (1 viên khi sốt > 38.5°C).\n• Nếu đau họng, ho nhẹ: Ngậm Strepsils Cool giảm đau rát họng.\n• Uống nhiều nước, giữ ấm cơ thể. Nếu triệu chứng kéo dài trên 3 ngày bạn hãy đi khám bác sĩ nhé!`,
            recommendedMeds: matchedMeds.length > 0 ? matchedMeds : undefined,
          },
        ]);
      }
    } catch {
      setAiThinking(false);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Xin lỗi, hệ thống AI tư vấn đang bận. Bạn có thể liên hệ trực tiếp Dược sĩ qua hotline nhé!',
        },
      ]);
    }
  };

  const toggleVoiceRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
    } else {
      setIsRecording(false);
      // Simulate speech to text transcription
      const voicePrompts = [
        'Tôi bị đau họng, ho khan và sốt nhẹ từ hôm qua',
        'Tôi bị cảm cúm nhức đầu và nghẹt mũi',
        'Tôi cần mua thuốc đau dạ dày trào ngược',
      ];
      const randomPrompt = voicePrompts[Math.floor(Math.random() * voicePrompts.length)];
      handleSendChat(`🎙️ [Giọng nói]: ${randomPrompt}`);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    if (selectedCategory !== 'ALL' && m.category !== selectedCategory && !m.category.includes(selectedCategory)) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Nhà Thuốc Trực Tuyến"
        subtitle="Dược phẩm chính hãng & Tư vấn tận tâm"
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

      {/* 5 Tabs Bottom / Top Navigation */}
      <View style={styles.tabBar}>
        <AnimatedTouchable
          onPress={() => setActiveTab('STORE')}
          style={[styles.tabItem, activeTab === 'STORE' && styles.activeTabItem]}
        >
          <Ionicons name="storefront" size={16} color={activeTab === 'STORE' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'STORE' && styles.activeTabText]}>Cửa Hàng</Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('CART')}
          style={[styles.tabItem, activeTab === 'CART' && styles.activeTabItem]}
        >
          <Ionicons name="cart" size={16} color={activeTab === 'CART' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'CART' && styles.activeTabText]}>
            Giỏ ({cart.reduce((a, b) => a + b.quantity, 0)})
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('AI_CHAT')}
          style={[styles.tabItem, activeTab === 'AI_CHAT' && styles.activeTabItem]}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color={activeTab === 'AI_CHAT' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'AI_CHAT' && styles.activeTabText]}>Dược Sĩ AI</Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('VOUCHERS')}
          style={[styles.tabItem, activeTab === 'VOUCHERS' && styles.activeTabItem]}
        >
          <Ionicons name="pricetags" size={16} color={activeTab === 'VOUCHERS' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'VOUCHERS' && styles.activeTabText]}>Kho Voucher</Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('ORDERS')}
          style={[styles.tabItem, activeTab === 'ORDERS' && styles.activeTabItem]}
        >
          <Ionicons name="receipt" size={16} color={activeTab === 'ORDERS' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'ORDERS' && styles.activeTabText]}>Đơn Mua</Text>
        </AnimatedTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#059669']} />}
      >
        {/* TAB 1: STORE */}
        {activeTab === 'STORE' && (
          <View>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm tên thuốc, hoạt chất, chỉ định..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <AnimatedTouchable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </AnimatedTouchable>
                ) : null}
              </View>
              <AnimatedTouchable
                onPress={() => setShowScanner(true)}
                style={styles.scanBarcodeBtn}
              >
                <Ionicons name="barcode-outline" size={18} color="#FFFFFF" />
                <Text style={styles.scanBarcodeBtnText}>Quét Hộp</Text>
              </AnimatedTouchable>
            </View>

            {/* Banner Lịch Nhắc Uống Thuốc Ngoại Tuyến */}
            <AnimatedTouchable
              onPress={() => navigation.navigate('MedicineReminderScreen')}
              style={styles.reminderBanner}
            >
              <View style={styles.reminderBannerLeft}>
                <View style={styles.reminderBannerIcon}>
                  <Ionicons name="alarm" size={24} color="#0891B2" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.reminderBannerTitle}>Lịch Nhắc Uống Thuốc 🔔</Text>
                  <Text style={styles.reminderBannerSub}>Báo thức đúng giờ kể cả khi mất mạng (Offline 100%)</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0891B2" />
            </AnimatedTouchable>

            {/* Banner cảnh báo dữ liệu ngoại tuyến */}
            {isOfflineMode && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7',
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
                borderLeftWidth: 3, borderLeftColor: '#F59E0B',
              }}>
                <Ionicons name="cloud-offline-outline" size={16} color="#B45309" style={{ marginRight: 8 }} />
                <Text style={{ color: '#B45309', fontSize: 12, flex: 1 }}>
                  Đang hiển thị dữ liệu mẫu (server đang khởi động). Kéo để làm mới khi sẵn sàng.
                </Text>
              </View>
            )}


            {/* Category horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {categoriesList.map((c, idx) => (
                <AnimatedTouchable
                  key={c.id || `cat-${idx}`}
                  onPress={() => setSelectedCategory(c.id)}
                  style={[styles.categoryPill, selectedCategory === c.id && styles.activeCatPill]}
                >
                  <Text style={[styles.categoryPillText, selectedCategory === c.id && styles.activeCatPillText]}>
                    {c.label}
                  </Text>
                </AnimatedTouchable>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Danh Mục Sản Phẩm ({filteredMedicines.length})</Text>
            {filteredMedicines.map((med, idx) => (
              <View key={med.id || (med as any)._id || (med as any).sku || `med-${idx}`} style={styles.productCard}>
                <AnimatedTouchable
                  onPress={() => setSelectedMedDetail(med)}
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                >
                  <Image
                    source={{ uri: med.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' }}
                    style={styles.productThumb}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.productName} numberOfLines={1}>{med.name}</Text>
                      {med.isRx ? (
                        <View style={styles.rxBadge}>
                          <Text style={styles.rxBadgeText}>Rx</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.productActive} numberOfLines={1}>Hoạt chất: {med.active}</Text>
                    <Text style={styles.productCat}>{med.category}</Text>
                    <Text style={styles.productPrice}>
                      {med.price.toLocaleString('vi-VN')} ₫ / {med.unit}
                    </Text>
                  </View>
                </AnimatedTouchable>

                <AnimatedTouchable
                  onPress={() => {
                    addToCart(med);
                    showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                  }}
                  style={styles.buyBtn}
                >
                  <Ionicons name="cart" size={16} color="#FFFFFF" />
                  <Text style={styles.buyBtnText}>Chọn Mua</Text>
                </AnimatedTouchable>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: CART */}
        {activeTab === 'CART' && (
          <View>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyCartTitle}>Giỏ hàng của bạn đang trống</Text>
                <Text style={styles.emptyCartSub}>Hãy chọn các loại thuốc cần thiết từ Cửa hàng.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Danh Sách Sản Phẩm Đã Chọn ({cart.length})</Text>
                {cart.map((item, idx) => (
                  <View key={item.medicine.id || (item.medicine as any)._id || `cart-${idx}`} style={styles.cartCard}>
                    <Image
                      source={{ uri: item.medicine.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' }}
                      style={styles.cartThumb}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cartItemName}>{item.medicine.name}</Text>
                      <Text style={styles.cartItemPrice}>
                        {item.medicine.price.toLocaleString('vi-VN')} ₫ / {item.medicine.unit}
                      </Text>
                    </View>

                    <View style={styles.qtyControlRow}>
                      <AnimatedTouchable
                        onPress={() => updateQuantity(item.medicine.id, -1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </AnimatedTouchable>
                      <Text style={styles.qtyValText}>{item.quantity}</Text>
                      <AnimatedTouchable
                        onPress={() => updateQuantity(item.medicine.id, 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </AnimatedTouchable>
                    </View>
                  </View>
                ))}

                {/* Voucher input */}
                <View style={styles.voucherBox}>
                  <TextInput
                    style={styles.voucherInput}
                    placeholder="Nhập mã voucher (PHARMA10, FREESHIP...)"
                    placeholderTextColor="#94A3B8"
                    value={voucherCodeInput}
                    onChangeText={setVoucherCodeInput}
                    autoCapitalize="characters"
                  />
                  <AnimatedTouchable onPress={() => applyVoucher()} style={styles.applyVoucherBtn}>
                    <Text style={styles.applyVoucherText}>ÁP DỤNG</Text>
                  </AnimatedTouchable>
                </View>

                {/* Summary Card */}
                <View style={styles.priceSummaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tạm tính:</Text>
                    <Text style={styles.summaryVal}>{subtotal.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                  {appliedVoucher ? (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: '#059669' }]}>
                        Giảm giá ({appliedVoucher.code}):
                      </Text>
                      <Text style={[styles.summaryVal, { color: '#059669' }]}>
                        -{discount.toLocaleString('vi-VN')} ₫
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={styles.totalLabel}>Tổng Thanh Toán:</Text>
                    <Text style={styles.totalVal}>{finalTotal.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                </View>

                <GradientButton
                  title="TIẾN HÀNH ĐẶT HÀNG"
                  onPress={() =>
                    navigation.navigate('CustomerCheckoutScreen', {
                      cart,
                      appliedVoucher,
                      subtotal,
                      finalTotal,
                    })
                  }
                  gradientVariant="primary"
                  size="lg"
                  style={{ marginTop: 14 }}
                />
              </>
            )}
          </View>
        )}

        {/* TAB 3: AI CHAT & VOICE CONSULTANT */}
        {activeTab === 'AI_CHAT' && (
          <View>
            <View style={styles.aiHeaderCard}>
              <View style={styles.aiAvatar}>
                <Ionicons name="medical" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aiHeaderTitle}>Dược Sĩ AI Lâm Sàng 24/7</Text>
                <Text style={styles.aiHeaderSub}>Tư vấn bằng giọng nói & Phân tích tương tác an toàn</Text>
              </View>
            </View>

            {/* Voice recording floating indicator */}
            {isRecording && (
              <View style={styles.voiceRecordingBox}>
                <View style={styles.pulsingDot} />
                <Text style={styles.voiceRecordingText}>
                  Đang ghi âm triệu chứng: {recordDuration}s (Bấm mic lần nữa để gửi)
                </Text>
              </View>
            )}

            <View style={styles.chatContainer}>
              {chatMessages.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.chatBubble,
                    msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      msg.role === 'user' ? styles.userChatText : styles.aiChatText,
                    ]}
                  >
                    {msg.text}
                  </Text>

                  {/* Recommended Meds Chips */}
                  {msg.recommendedMeds && msg.recommendedMeds.length > 0 && (
                    <View style={styles.medsSuggestBox}>
                      <Text style={styles.medsSuggestTitle}>Thuốc gợi ý an toàn:</Text>
                      {msg.recommendedMeds.map((med, mIdx) => (
                        <View key={med.id || (med as any)._id || `rec-${mIdx}`} style={styles.suggestItem}>
                          <Image
                            source={{
                              uri:
                                med.image ||
                                med.image_url ||
                                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                            }}
                            style={styles.suggestMedThumb}
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggestMedName}>{med.name}</Text>
                            <Text style={styles.suggestMedPrice}>
                              {med.price.toLocaleString('vi-VN')} ₫ / {med.unit}
                            </Text>
                          </View>
                          <AnimatedTouchable
                            onPress={() => {
                              addToCart(med);
                              showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                            }}
                            style={styles.addSuggestBtn}
                          >
                            <Ionicons name="cart" size={14} color="#FFFFFF" />
                            <Text style={styles.addSuggestText}>Thêm</Text>
                          </AnimatedTouchable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              {aiThinking && (
                <View style={[styles.chatBubble, styles.aiBubble]}>
                  <Text style={styles.aiChatText}>Dược sĩ AI đang phân tích dữ liệu lâm sàng...</Text>
                </View>
              )}
            </View>

            <View style={styles.chatInputRow}>
              <AnimatedTouchable
                onPress={toggleVoiceRecording}
                style={[styles.micBtn, isRecording && styles.micBtnActive]}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={20}
                  color={isRecording ? "#DC2626" : "#059669"}
                />
              </AnimatedTouchable>

              <TextInput
                style={styles.chatTextInput}
                placeholder="Mô tả triệu chứng (vd: sốt cao, ho có đờm...)"
                placeholderTextColor="#94A3B8"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => handleSendChat()}
              />

              <AnimatedTouchable onPress={() => handleSendChat()} style={styles.sendChatBtn}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </AnimatedTouchable>
            </View>
          </View>
        )}

        {/* TAB 4: KHO VOUCHER */}
        {activeTab === 'VOUCHERS' && (
          <View>
            <View style={styles.voucherBanner}>
              <Ionicons name="gift" size={32} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.voucherBannerTitle}>Kho Voucher & Ưu Đãi Dược Phẩm</Text>
                <Text style={styles.voucherBannerSub}>Thu thập mã giảm giá và áp dụng trực tiếp khi thanh toán đơn</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Mã Khuyến Mãi Khả Dụng ({vouchers.length})</Text>
            {vouchers.map((v, idx) => (
              <View key={v.id || (v as any)._id || v.code || `voucher-${idx}`} style={styles.voucherCard}>
                <View style={styles.voucherLeft}>
                  <Text style={styles.voucherDiscountTag}>
                    {v.discountType === 'PERCENT' ? `-${v.discountValue}%` : `-${(v.discountValue / 1000)}k`}
                  </Text>
                  <Text style={styles.voucherDiscountLabel}>GIẢM GIÁ</Text>
                </View>

                <View style={styles.voucherCenter}>
                  <View style={styles.voucherCodePill}>
                    <Text style={styles.voucherCodeText}>{v.code}</Text>
                  </View>
                  <Text style={styles.voucherDesc}>{v.description || 'Ưu đãi dành cho khách hàng VinaPharmacy'}</Text>
                  <Text style={styles.voucherCondition}>
                    {v.minOrderValue ? `Đơn tối thiểu ${v.minOrderValue.toLocaleString('vi-VN')} ₫` : 'Áp dụng cho mọi đơn hàng'}
                  </Text>
                </View>

                <View style={styles.voucherRight}>
                  <AnimatedTouchable
                    onPress={() => {
                      Clipboard.setString(v.code);
                      applyVoucher(v.code);
                      setActiveTab('CART');
                    }}
                    style={styles.useVoucherBtn}
                  >
                    <Text style={styles.useVoucherBtnText}>Dùng Ngay</Text>
                  </AnimatedTouchable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: ORDERS */}
        {activeTab === 'ORDERS' && (
          <View>
            {/* Phone search bar */}
            <View style={styles.searchBox}>
              <Ionicons name="call-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Nhập SĐT để tra cứu lịch sử đơn..."
                placeholderTextColor="#94A3B8"
                value={searchPhone}
                onChangeText={setSearchPhone}
                keyboardType="phone-pad"
              />
              <AnimatedTouchable onPress={loadData} style={styles.searchPhoneBtn}>
                <Ionicons name="search" size={16} color="#FFFFFF" />
              </AnimatedTouchable>
            </View>

            <Text style={styles.sectionTitle}>Lịch Sử Đơn Thuốc ({orders.length})</Text>
            {orders.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="receipt-outline" size={54} color="#CBD5E1" />
                <Text style={styles.emptyCartTitle}>Không có đơn hàng nào</Text>
                <Text style={styles.emptyCartSub}>Hãy đặt các đơn thuốc đầu tiên để theo dõi tại đây.</Text>
              </View>
            ) : (
              orders.map((ord, idx) => (
                <View key={ord.id || (ord as any)._id || ord.orderCode || `order-${idx}`} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderCode}>{ord.orderCode || ord.id}</Text>
                    <View
                      style={[
                        styles.orderStatusTag,
                        ord.paymentStatus === 'PAID' ? styles.statusPaid : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.orderStatusText,
                          ord.paymentStatus === 'PAID' ? styles.statusPaidText : styles.statusPendingText,
                        ]}
                      >
                        {ord.paymentStatus === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderDate}>
                    Ngày đặt: {new Date(ord.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                  </Text>

                  <View style={styles.orderItemsBox}>
                    {ord.items.map((it, idx) => (
                      <Text key={idx} style={styles.orderItemRow}>
                        • {it.name} x {it.quantity} {it.unit} ({it.price.toLocaleString('vi-VN')} ₫)
                      </Text>
                    ))}
                  </View>

                  <View style={styles.orderFooter}>
                    <View>
                      <Text style={styles.payMethodText}>Hình thức: {ord.paymentMethod}</Text>
                      <Text style={styles.orderTotalAmount}>
                        {ord.finalAmount.toLocaleString('vi-VN')} ₫
                      </Text>
                    </View>

                    <AnimatedTouchable
                      onPress={() => setSelectedOrderQR(ord)}
                      style={styles.qrOrderBtn}
                    >
                      <Ionicons name="qr-code-outline" size={16} color="#0284C7" />
                      <Text style={styles.qrOrderBtnText}>Mã QR</Text>
                    </AnimatedTouchable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Medication Detail Modal with Indications & Dosage */}
      <Modal visible={selectedMedDetail !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedMedDetail?.image ? (
              <Image
                source={{ uri: selectedMedDetail.image }}
                style={styles.detailMedImage}
                resizeMode="cover"
              />
            ) : null}
            <Text style={styles.modalTitle}>{selectedMedDetail?.name}</Text>
            <Text style={styles.modalSub}>Hoạt chất: {selectedMedDetail?.active}</Text>
            <Text style={styles.modalPrice}>
              {selectedMedDetail?.price.toLocaleString('vi-VN')} ₫ / {selectedMedDetail?.unit}
            </Text>

            <ScrollView style={{ maxHeight: 280, marginVertical: 8 }}>
              <View style={styles.modalSection}>
                <Text style={styles.secTitle}>Chỉ định & Công dụng:</Text>
                <Text style={styles.secText}>{selectedMedDetail?.cong_dung || 'Điều trị các triệu chứng theo chỉ định của bác sĩ/dược sĩ.'}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.secTitle}>Liều lượng & Cách dùng:</Text>
                <Text style={styles.secText}>{selectedMedDetail?.cach_dung || 'Uống theo đơn hoặc hướng dẫn trên bao bì thuốc.'}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.secTitle}>Chống chỉ định & Thận trọng:</Text>
                <Text style={styles.secText}>{selectedMedDetail?.luu_y || 'Mẫn cảm với bất kỳ thành phần nào của thuốc.'}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.secTitle}>Tác dụng phụ:</Text>
                <Text style={styles.secText}>{selectedMedDetail?.tac_dung_phu || 'Buồn nôn, dị ứng nhẹ (ngưng dùng nếu gặp triệu chứng lạ).'}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setSelectedMedDetail(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </AnimatedTouchable>
              <GradientButton
                title="THÊM VÀO GIỎ"
                onPress={() => {
                  if (selectedMedDetail) {
                    addToCart(selectedMedDetail);
                    showToast.success('Thành công', `Đã thêm ${selectedMedDetail.name} vào giỏ hàng!`);
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

      {/* Order QR Code Modal */}
      <Modal visible={selectedOrderQR !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <Text style={styles.qrModalTitle}>Mã QR Đơn Hàng</Text>
            <Text style={styles.qrModalSub}>Mã đơn: {selectedOrderQR?.orderCode || selectedOrderQR?.id}</Text>

            <View style={styles.qrHolder}>
              <QRCode
                value={selectedOrderQR?.orderCode || selectedOrderQR?.id || 'ORD-ABC'}
                size={180}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrHint}>Xuất trình mã này tại quầy để nhận đơn hoặc tra cứu</Text>

            <AnimatedTouchable
              onPress={() => setSelectedOrderQR(null)}
              style={styles.closeQrBtn}
            >
              <Text style={styles.closeQrBtnText}>Đóng</Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal for Customer */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanBarcode}
        title="Quét Mã Vạch Hộp Thuốc"
        subtitle="Hướng camera vào mã vạch trên vỏ hộp thuốc tại nhà để tìm sản phẩm chính hãng"
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
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  activeTabItem: {
    backgroundColor: '#ECFDF5',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
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
    marginBottom: 10,
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
    paddingVertical: 10,
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
    fontSize: 12,
    fontWeight: '800',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
  },
  searchPhoneBtn: {
    backgroundColor: '#0284C7',
    padding: 8,
    borderRadius: 10,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  activeCatPill: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  activeCatPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  productCard: {
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
  productThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cartThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  detailMedImage: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
  },
  productName: {
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
  productActive: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  productCat: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginTop: 4,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 10,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptyCartSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  cartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  cartItemPrice: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  qtyValText: {
    marginHorizontal: 10,
    fontWeight: '700',
    fontSize: 14,
  },
  voucherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  applyVoucherBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  applyVoucherText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  priceSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  aiHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  aiHeaderSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  voiceRecordingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    gap: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  voiceRecordingText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  chatContainer: {
    minHeight: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  chatBubble: {
    maxWidth: '88%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  aiBubble: {
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 2,
  },
  userBubble: {
    backgroundColor: '#059669',
    alignSelf: 'flex-end',
    borderTopRightRadius: 2,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 19,
  },
  aiChatText: {
    color: '#065F46',
  },
  userChatText: {
    color: '#FFFFFF',
  },
  medsSuggestBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  medsSuggestTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 6,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  suggestMedThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  suggestMedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  suggestMedPrice: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  addSuggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  addSuggestText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  micBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A',
    fontSize: 13,
  },
  sendChatBtn: {
    backgroundColor: '#059669',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  voucherBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  voucherBannerSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  voucherLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  voucherDiscountTag: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D97706',
  },
  voucherDiscountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 2,
  },
  voucherCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  voucherCodePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  voucherCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  voucherDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  voucherCondition: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  voucherRight: {
    paddingLeft: 8,
  },
  useVoucherBtn: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  useVoucherBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPaid: {
    backgroundColor: '#ECFDF5',
  },
  statusPaidText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    marginBottom: 8,
  },
  orderItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  orderItemRow: {
    fontSize: 12,
    color: '#475569',
    marginVertical: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  payMethodText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  qrOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  qrOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
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
    marginTop: 4,
    marginBottom: 10,
  },
  modalSection: {
    marginTop: 8,
  },
  secTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  secText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  qrModalCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  qrModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  qrHolder: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrHint: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  closeQrBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeQrBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFEFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A5F3FC',
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CFFAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0E7490',
  },
  reminderBannerSub: {
    fontSize: 11,
    color: '#0891B2',
    marginTop: 2,
  },
});
