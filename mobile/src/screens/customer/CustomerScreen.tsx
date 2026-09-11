// CustomerScreen.tsx - Customer Drug Storefront, Shopping Cart, AI Pharmacist Consultant & Order History
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
import { useAuth } from '../../context/AuthContext';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { Medicine, CartItem, Order, Voucher } from '../../types/pharmacy.types';

export const CustomerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'STORE' | 'CART' | 'AI_CHAT' | 'ORDERS'>('STORE');

  // Products & Categories
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMedDetail, setSelectedMedDetail] = useState<Medicine | null>(null);

  // Cart & Vouchers
  const [cart, setCart] = useState<CartItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');

  // AI Chat Consultant
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    {
      role: 'ai',
      text: 'Xin chào! Tôi là Trợ Lý Dược Sĩ AI. Bạn đang gặp các triệu chứng gì (ho, sốt, đau đầu, dị ứng...) để tôi tư vấn thuốc an toàn nhé?',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [aiThinking, setAiThinking] = useState<boolean>(false);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const CATEGORIES = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'Kháng sinh', label: 'Kháng sinh' },
    { id: 'Giảm đau', label: 'Giảm đau hạ sốt' },
    { id: 'Hô hấp', label: 'Cảm cúm & Hô hấp' },
    { id: 'Tiêu hóa', label: 'Tiêu hóa & Dạ dày' },
  ];

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [medList, voucherList, orderList] = await Promise.all([
        ApiService.getMedicines({ search: searchQuery }),
        ApiService.getVouchers(),
        ApiService.getMyOrders(user?.phone),
      ]);

      if (medList && medList.length > 0) setMedicines(medList);
      if (voucherList && voucherList.length > 0) {
        setVouchers(voucherList);
      } else {
        setVouchers([
          { id: 'v1', code: 'PHARMA10', discountType: 'PERCENT', discountValue: 10, description: 'Giảm 10% cho đơn từ 200k' },
          { id: 'v2', code: 'FREESHIP', discountType: 'FIXED', discountValue: 25000, description: 'Miễn phí giao hàng' },
        ]);
      }
      if (orderList && orderList.length > 0) {
        setOrders(orderList);
      } else {
        setOrders([
          {
            id: 'ord_1',
            orderCode: 'ORD-2026-901',
            items: [{ medicineId: 'm1', name: 'Panadol Extra', quantity: 2, price: 45000, unit: 'Hộp' }],
            totalAmount: 90000,
            finalAmount: 90000,
            paymentMethod: 'COD',
            paymentStatus: 'PAID',
            status: 'COMPLETED',
            createdAt: '2026-08-30T10:00:00Z',
          },
        ]);
      }
    } catch (e) {
      console.warn('Error loading customer data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, user?.phone]);

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

  const subtotal = cart.reduce((sum, i) => sum + i.medicine.price * i.quantity, 0);
  const discount = appliedVoucher
    ? appliedVoucher.discountType === 'PERCENT'
      ? (subtotal * appliedVoucher.discountValue) / 100
      : appliedVoucher.discountValue
    : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  const applyVoucher = async () => {
    const code = voucherCodeInput.trim().toUpperCase();
    const found = vouchers.find((v) => v.code.toUpperCase() === code);
    if (found) {
      setAppliedVoucher(found);
      Alert.alert('Thành công', `Đã áp dụng mã giảm giá ${code}!`);
    } else {
      Alert.alert('Lỗi', 'Mã voucher không hợp lệ.');
    }
  };

  // AI Chat
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);

    setAiThinking(true);
    try {
      const res = await ApiService.getTextPrescription(userMsg);
      setAiThinking(false);

      if (res?.advice || res?.diagnosis) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `${res.diagnosis ? `Chẩn đoán sơ bộ: ${res.diagnosis}\n` : ''}${res.advice || 'Bạn nên dùng các thuốc hỗ trợ giảm triệu chứng, uống nhiều nước ấm và nghỉ ngơi.'}`,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `Dựa trên triệu chứng "${userMsg}":\n• Nếu sốt, đau họng: Có thể dùng Panadol Extra (1 viên khi sốt) kết hợp viên ngậm Strepsils Cool.\n• Uống nhiều nước, nếu triệu chứng kéo dài trên 3 ngày bạn nên tới cơ sở y tế gần nhất khám trực tiếp!`,
          },
        ]);
      }
    } catch {
      setAiThinking(false);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Xin lỗi, hệ thống AI tư vấn đang bận. Bạn có thể hỏi trực tiếp dược sĩ tại nhà thuốc nhé!',
        },
      ]);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    if (selectedCategory !== 'ALL' && !m.category.includes(selectedCategory)) {
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

      {/* Tabs */}
      <View style={styles.tabBar}>
        <AnimatedTouchable
          onPress={() => setActiveTab('STORE')}
          style={[styles.tabItem, activeTab === 'STORE' && styles.activeTabItem]}
        >
          <Ionicons name="storefront" size={17} color={activeTab === 'STORE' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'STORE' && styles.activeTabText]}>Cửa Hàng</Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('CART')}
          style={[styles.tabItem, activeTab === 'CART' && styles.activeTabItem]}
        >
          <Ionicons name="cart" size={17} color={activeTab === 'CART' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'CART' && styles.activeTabText]}>
            Giỏ ({cart.reduce((a, b) => a + b.quantity, 0)})
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('AI_CHAT')}
          style={[styles.tabItem, activeTab === 'AI_CHAT' && styles.activeTabItem]}
        >
          <Ionicons name="chatbubble-ellipses" size={17} color={activeTab === 'AI_CHAT' ? '#065F46' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'AI_CHAT' && styles.activeTabText]}>Tư Vấn AI</Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('ORDERS')}
          style={[styles.tabItem, activeTab === 'ORDERS' && styles.activeTabItem]}
        >
          <Ionicons name="receipt" size={17} color={activeTab === 'ORDERS' ? '#065F46' : '#94A3B8'} />
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
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm thuốc, hoạt chất, triệu chứng..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Category horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {CATEGORIES.map((c) => (
                <AnimatedTouchable
                  key={c.id}
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
            {filteredMedicines.map((med) => (
              <View key={med.id} style={styles.productCard}>
                <AnimatedTouchable
                  onPress={() => setSelectedMedDetail(med)}
                  style={{ flex: 1 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.productName}>{med.name}</Text>
                    {med.isRx ? (
                      <View style={styles.rxBadge}>
                        <Text style={styles.rxBadgeText}>Rx</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.productActive}>Hoạt chất: {med.active}</Text>
                  <Text style={styles.productCat}>{med.category}</Text>
                  <Text style={styles.productPrice}>
                    {med.price.toLocaleString('vi-VN')} ₫ / {med.unit}
                  </Text>
                </AnimatedTouchable>

                <AnimatedTouchable
                  onPress={() => {
                    addToCart(med);
                    Alert.alert('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                  }}
                  style={styles.buyBtn}
                >
                  <Ionicons name="cart" size={18} color="#FFFFFF" />
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
                <Text style={styles.sectionTitle}>Danh Sách Sản Phẩm Đã Chọn</Text>
                {cart.map((item) => (
                  <View key={item.medicine.id} style={styles.cartCard}>
                    <View style={{ flex: 1 }}>
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
                    placeholder="MÃ GIẢM GIÁ (PHARMA10, FREESHIP)"
                    placeholderTextColor="#94A3B8"
                    value={voucherCodeInput}
                    onChangeText={setVoucherCodeInput}
                    autoCapitalize="characters"
                  />
                  <AnimatedTouchable onPress={applyVoucher} style={styles.applyVoucherBtn}>
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

        {/* TAB 3: AI CHAT */}
        {activeTab === 'AI_CHAT' && (
          <View>
            <Text style={styles.sectionTitle}>Trợ Lý Dược Sĩ AI Tư Vấn Triệu Chứng</Text>
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
                </View>
              ))}
              {aiThinking && (
                <View style={[styles.chatBubble, styles.aiBubble]}>
                  <Text style={styles.aiChatText}>Dược sĩ AI đang phân tích triệu chứng...</Text>
                </View>
              )}
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                placeholder="Mô tả triệu chứng (vd: đau họng, sốt nhẹ...)"
                placeholderTextColor="#94A3B8"
                value={chatInput}
                onChangeText={setChatInput}
              />
              <AnimatedTouchable onPress={handleSendChat} style={styles.sendChatBtn}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </AnimatedTouchable>
            </View>
          </View>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === 'ORDERS' && (
          <View>
            <Text style={styles.sectionTitle}>Lịch Sử Đơn Thuốc Của Bạn</Text>
            {orders.map((ord) => (
              <View key={ord.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderCode}>{ord.orderCode || ord.id}</Text>
                  <View style={styles.orderStatusTag}>
                    <Text style={styles.orderStatusText}>{ord.status}</Text>
                  </View>
                </View>
                <Text style={styles.orderDate}>Ngày đặt: {new Date(ord.createdAt || '').toLocaleDateString('vi-VN')}</Text>

                <View style={styles.orderItemsBox}>
                  {ord.items.map((it, idx) => (
                    <Text key={idx} style={styles.orderItemRow}>
                      • {it.name} x {it.quantity} {it.unit} ({it.price.toLocaleString('vi-VN')} ₫)
                    </Text>
                  ))}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.payMethodText}>Thanh toán: {ord.paymentMethod}</Text>
                  <Text style={styles.orderTotalAmount}>
                    {ord.finalAmount.toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
              </View>
            ))}
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
              {selectedMedDetail?.price.toLocaleString('vi-VN')} ₫ / {selectedMedDetail?.unit}
            </Text>

            <View style={styles.modalSection}>
              <Text style={styles.secTitle}>Chỉ định & Công dụng:</Text>
              <Text style={styles.secText}>{selectedMedDetail?.cong_dung || 'N/A'}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.secTitle}>Liều dùng & Cách dùng:</Text>
              <Text style={styles.secText}>{selectedMedDetail?.cach_dung || 'N/A'}</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setSelectedMedDetail(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </AnimatedTouchable>
              <GradientButton
                title="THÊM VÀO GIỎ"
                onPress={() => {
                  if (selectedMedDetail) {
                    addToCart(selectedMedDetail);
                    Alert.alert('Thành công', `Đã thêm ${selectedMedDetail.name} vào giỏ hàng!`);
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: '#ECFDF5',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 3,
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
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
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
    paddingVertical: 80,
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
  chatContainer: {
    minHeight: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
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
    lineHeight: 18,
  },
  aiChatText: {
    color: '#065F46',
  },
  userChatText: {
    color: '#FFFFFF',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 14,
    color: '#0F172A',
  },
  sendChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
    backgroundColor: '#ECFDF5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 8,
  },
  orderItemsBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  orderItemRow: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payMethodText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
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
