/**
 * Màn hình Chi Tiết Thuốc Riêng Biệt (MedicineDetailScreen)
 * Thiết kế chuẩn E-Commerce y tế FPT Long Châu / Pharmacity
 * Thay thế hoàn toàn popup modal trước đây
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine, CartItem, PackagingUnit } from '../../types/pharmacy.types';
import { ApiService } from '../../services/api.service';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { AnimatedPressable } from '../../components/clinical';
import { showToast } from '../../components/ui/toastHelper';
import { TypographyTokens } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GUEST_CART_KEY = '@abc_guest_cart';

export const MedicineDetailScreen: React.FC<{
  route: any;
  navigation: any;
}> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { medicine: initialMed, medicineId } = route.params || {};

  const [medicine, setMedicine] = useState<Medicine | null>(initialMed || null);
  const [loading, setLoading] = useState<boolean>(!initialMed);
  const [selectedUnit, setSelectedUnit] = useState<string>(initialMed?.unit || 'Hộp');
  const [quantity, setQuantity] = useState<number>(1);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'INDICATION' | 'DOSAGE' | 'CONTRA' | 'SIDE_EFFECT' | 'STORAGE'>('INDICATION');
  const [cartCount, setCartCount] = useState<number>(0);
  const [relatedMedicines, setRelatedMedicines] = useState<Medicine[]>([]);

  // Tải chi tiết thuốc nếu chỉ nhận được medicineId hoặc làm tươi thông tin
  const fetchMedicineDetail = useCallback(async () => {
    const id = medicineId || initialMed?.id;
    if (!id) return;
    try {
      setLoading(true);
      const res = await ApiService.getMedicines({ search: initialMed?.name });
      if (res && Array.isArray(res) && res.length > 0) {
        const found = res.find((m: any) => m.id === id || m._id === id) || res[0];
        setMedicine(found);
        setSelectedUnit(found.unit || 'Hộp');
        // Tìm các thuốc cùng chuyên mục để gợi ý
        const related = res.filter((m: any) => m.id !== id && m.category === found.category).slice(0, 6);
        setRelatedMedicines(related.length > 0 ? related : res.slice(1, 7));
      }
    } catch (err) {
      console.warn('Lỗi tải chi tiết thuốc:', err);
    } finally {
      setLoading(false);
    }
  }, [medicineId, initialMed]);

  // Kiểm tra trạng thái yêu thích từ wishlist
  const checkWishlistStatus = useCallback(async () => {
    if (!medicine?.id) return;
    try {
      const res = await ApiService.getWishlist();
      if (res && Array.isArray(res.items)) {
        const exists = res.items.some((it: any) => (it.id || it._id) === medicine.id);
        setIsFavorite(exists);
      }
    } catch {}
  }, [medicine?.id]);

  // Cập nhật số lượng sản phẩm trong giỏ hàng
  const loadCartCount = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(GUEST_CART_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const total = parsed.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
          setCartCount(total);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!initialMed && medicineId) {
      fetchMedicineDetail();
    } else if (initialMed) {
      fetchMedicineDetail();
    }
    checkWishlistStatus();
    loadCartCount();
  }, [initialMed, medicineId]);

  // Xử lý nút yêu thích
  const handleToggleFavorite = async () => {
    if (!medicine) return;
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    try {
      if (nextState) {
        await ApiService.addToWishlist(medicine);
        showToast.success('Yêu thích', `Đã thêm "${medicine.name}" vào danh sách yêu thích`);
      } else {
        await ApiService.removeFromWishlist(medicine.id);
        showToast.info('Bỏ yêu thích', `Đã xóa "${medicine.name}" khỏi danh sách`);
      }
    } catch (err) {
      setIsFavorite(!nextState); // Rollback
    }
  };

  // Chia sẻ thông tin thuốc
  const handleShare = async () => {
    if (!medicine) return;
    try {
      await Share.share({
        message: `Xem thông tin dược phẩm: ${medicine.name} tại Nhà Thuốc ABC PHARMACY. Giá: ${medicine.price.toLocaleString('vi-VN')} ₫. Hoạt chất: ${medicine.active || 'Đang cập nhật'}`,
        title: medicine.name,
      });
    } catch {}
  };

  // Tăng giảm số lượng mua
  const handleIncreaseQty = () => {
    const maxStock = medicine?.stock || (medicine as any)?.totalBranchStock || 999;
    if (quantity + 1 > maxStock) {
      showToast.info('Tồn kho có hạn', `Cơ sở chỉ còn ${maxStock} sản phẩm khả dụng.`);
      return;
    }
    setQuantity((q) => q + 1);
  };

  const handleDecreaseQty = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  // Thêm thuốc vào giỏ hàng cục bộ và lưu trữ AsyncStorage
  const handleAddToCart = async (goToCart = false) => {
    if (!medicine) return;
    try {
      const cached = await AsyncStorage.getItem(GUEST_CART_KEY);
      let cart: CartItem[] = cached ? JSON.parse(cached) : [];
      if (!Array.isArray(cart)) cart = [];

      const idx = cart.findIndex((i) => i.medicine.id === medicine.id);
      if (idx >= 0) {
        cart[idx].quantity += quantity;
      } else {
        cart.push({
          medicine,
          quantity,
          selectedUnit,
        });
      }

      await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
      const total = cart.reduce((sum, it) => sum + (it.quantity || 1), 0);
      setCartCount(total);

      if (goToCart) {
        navigation.navigate('CustomerScreen', { initialTab: 'CART' });
      } else {
        showToast.success('Thành công', `Đã thêm ${quantity} ${selectedUnit} "${medicine.name}" vào giỏ hàng!`);
      }
    } catch (err) {
      showToast.error('Lỗi', 'Không thể cập nhật giỏ hàng lúc này.');
    }
  };

  if (!medicine && loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="medical" size={40} color="#0284C7" />
        <Text style={styles.loadingText}>Đang tải chi tiết dược phẩm...</Text>
      </SafeAreaView>
    );
  }

  if (!medicine) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.notFoundTitle}>Không tìm thấy dược phẩm</Text>
        <Text style={styles.notFoundSub}>Sản phẩm này có thể đã ngừng kinh doanh hoặc tạm hết hàng.</Text>
        <AnimatedTouchable onPress={() => navigation.goBack()} style={styles.backHomeBtn}>
          <Text style={styles.backHomeText}>Quay lại</Text>
        </AnimatedTouchable>
      </SafeAreaView>
    );
  }

  const originalPrice = Math.round(medicine.price * 1.25);
  const discountPercent = 20;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ─── Top Header Bar Chuẩn Y Tế ─────────────────────────────────────── */}
      <View style={[styles.headerBar, { paddingTop: insets.top || 12 }]}>
        <AnimatedTouchable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerIconBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </AnimatedTouchable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {medicine.name}
        </Text>

        <View style={styles.headerRightActions}>
          <AnimatedTouchable
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerActionBtn}
          >
            <Ionicons name="share-social-outline" size={21} color="#0F172A" />
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={handleToggleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerActionBtn}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#EF4444' : '#0F172A'}
            />
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={() => navigation.navigate('CustomerScreen', { initialTab: 'CART' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerActionBtn}
          >
            <Ionicons name="cart-outline" size={23} color="#0F172A" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </AnimatedTouchable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
      >
        {/* ─── Ảnh Sản Phẩm To Đột Phá (Hero Image Section) ────────────────── */}
        <View style={styles.heroImageSection}>
          <Image
            source={{
              uri: medicine.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
            }}
            style={styles.heroImage}
            resizeMode="contain"
          />

          {/* Badges y khoa trên ảnh */}
          <View style={styles.imageBadgesContainer}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
            </View>
            <View style={styles.gspBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.gspBadgeText}>CHÍNH HÃNG 100%</Text>
            </View>
            {medicine.isRx && (
              <View style={styles.rxBadge}>
                <Text style={styles.rxBadgeText}>THUỐC KÊ ĐƠN (Rx)</Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Khối Thông Tin Giá & Tên Dược Phẩm (Flat, Không Border) ──────── */}
        <View style={styles.mainInfoCard}>
          <Text style={styles.categoryBreadcrumb}>
            {medicine.category || 'Dược phẩm chuẩn GPP'}
          </Text>

          <Text style={styles.medicineMainName}>
            {medicine.name}
          </Text>

          {medicine.active ? (
            <View style={styles.activeRow}>
              <Ionicons name="medical" size={13} color="#0284C7" style={{ marginRight: 5 }} />
              <Text style={styles.activeLabel}>Hoạt chất:</Text>
              <Text style={styles.activeValue}>{medicine.active}</Text>
            </View>
          ) : null}

          <View style={styles.ratingAndSoldCountRow}>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 3 }} />
              <Text style={styles.ratingScore}>5.0</Text>
              <Text style={styles.ratingCount}>(520+ đánh giá)</Text>
            </View>
            <Text style={styles.dotDivider}>•</Text>
            <Text style={styles.soldCountText}>🔥 Đã bán 3.8k+ hộp</Text>
          </View>

          {/* Khối giá bán lớn */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={[styles.mainPrice, TypographyTokens.tabularNums]}>
                {medicine.price.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.unitSlash}>/ {selectedUnit}</Text>
              <Text style={[styles.originalPrice, TypographyTokens.tabularNums]}>
                {originalPrice.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
            <Text style={styles.taxNote}>* Giá đã bao gồm thuế VAT và hóa đơn điện tử y tế</Text>
          </View>
        </View>

        {/* ─── Chọn Đơn Vị Tính & Số Lượng Mua ─────────────────────────────── */}
        <View style={styles.selectionCard}>
          <Text style={styles.sectionHeaderTitle}>Quy Cách Đóng Gói</Text>
          <View style={styles.unitOptionsRow}>
            {([medicine.unit || 'Hộp', 'Vỉ', 'Viên']).slice(0, 3).map((u, i) => (
              <AnimatedTouchable
                key={`unit-${i}`}
                onPress={() => setSelectedUnit(u)}
                style={[
                  styles.unitPill,
                  selectedUnit === u && styles.unitPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.unitPillText,
                    selectedUnit === u && styles.unitPillTextActive,
                  ]}
                >
                  {u}
                </Text>
              </AnimatedTouchable>
            ))}
          </View>

          {/* Bộ chọn số lượng */}
          <View style={styles.quantitySectionRow}>
            <Text style={styles.sectionHeaderTitle}>Số Lượng Mua</Text>
            <View style={styles.quantityPicker}>
              <AnimatedTouchable onPress={handleDecreaseQty} style={styles.qtyBtn}>
                <Ionicons name="remove" size={16} color="#0F172A" />
              </AnimatedTouchable>
              <Text style={[styles.qtyValueText, TypographyTokens.tabularNums]}>{quantity}</Text>
              <AnimatedTouchable onPress={handleIncreaseQty} style={styles.qtyBtn}>
                <Ionicons name="add" size={16} color="#0F172A" />
              </AnimatedTouchable>
            </View>
          </View>
        </View>

        {/* ─── Cam Kết Vàng Nhà Thuốc ABC (Long Châu Delivery Standard) ──────── */}
        <View style={styles.commitmentsCard}>
          <View style={styles.commitRow}>
            <View style={styles.commitIconBox}>
              <Ionicons name="car-outline" size={18} color="#0284C7" />
            </View>
            <View style={styles.commitTextCol}>
              <Text style={styles.commitTitle}>Giao Hàng Siêu Tốc 2 Giờ</Text>
              <Text style={styles.commitSub}>Freeship toàn chuỗi cho đơn hàng từ 150.000 ₫</Text>
            </View>
          </View>

          <View style={styles.commitRow}>
            <View style={styles.commitIconBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
            </View>
            <View style={styles.commitTextCol}>
              <Text style={styles.commitTitle}>Cam Kết Thuốc Chính Hãng 100%</Text>
              <Text style={styles.commitSub}>Đổi trả miễn phí trong vòng 30 ngày nếu phát hiện lỗi</Text>
            </View>
          </View>

          <View style={styles.commitRow}>
            <View style={styles.commitIconBox}>
              <Ionicons name="chatbubbles-outline" size={18} color="#EA580C" />
            </View>
            <View style={styles.commitTextCol}>
              <Text style={styles.commitTitle}>Dược Sĩ Đại Học Tư Vấn 24/7</Text>
              <Text style={styles.commitSub}>Hướng dẫn cách dùng và tương tác thuốc chuẩn chuyên môn</Text>
            </View>
          </View>
        </View>

        {/* ─── Thông Tin Dược Lý Y Khoa (Medical Pharmacopeia Tabs) ──────────── */}
        <View style={styles.pharmacopeiaCard}>
          <View style={styles.pharmacopeiaHeader}>
            <View style={styles.pharmacopeiaIconBadge}>
              <Ionicons name="document-text" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.pharmacopeiaTitle}>Thông Tin Dược Lý Chi Tiết</Text>
          </View>

          {/* Dải Tabs Dược Lý */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pharmaTabsScroll}>
            {[
              { id: 'INDICATION', label: 'Chỉ định' },
              { id: 'DOSAGE', label: 'Cách dùng & Liều' },
              { id: 'CONTRA', label: 'Chống chỉ định' },
              { id: 'SIDE_EFFECT', label: 'Tác dụng phụ' },
              { id: 'STORAGE', label: 'Bảo quản' },
            ].map((tab) => (
              <AnimatedTouchable
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={[
                  styles.pharmaTabBtn,
                  activeTab === tab.id && styles.pharmaTabBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.pharmaTabBtnText,
                    activeTab === tab.id && styles.pharmaTabBtnTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </AnimatedTouchable>
            ))}
          </ScrollView>

          {/* Nội dung tương ứng tab đang chọn */}
          <View style={styles.pharmaTabContent}>
            {activeTab === 'INDICATION' && (
              <View>
                <Text style={styles.pharmaContentTitle}>Chỉ định & Công dụng điều trị:</Text>
                <Text style={styles.pharmaContentBody}>
                  {medicine.cong_dung || medicine.indications || 'Điều trị các triệu chứng và hỗ trợ phục hồi sức khỏe theo chỉ dẫn chuyên môn của Dược sĩ/Bác sĩ.'}
                </Text>
              </View>
            )}

            {activeTab === 'DOSAGE' && (
              <View>
                <Text style={styles.pharmaContentTitle}>Liều lượng & Hướng dẫn sử dụng:</Text>
                <Text style={styles.pharmaContentBody}>
                  {medicine.cach_dung || medicine.default_dosage || 'Uống nguyên viên với một ly nước lọc đầy sau bữa ăn. Đọc kỹ hướng dẫn sử dụng in trên vỏ hộp.'}
                </Text>
              </View>
            )}

            {activeTab === 'CONTRA' && (
              <View>
                <Text style={styles.pharmaContentTitle}>Chống chỉ định & Thận trọng:</Text>
                <Text style={styles.pharmaContentBody}>
                  {medicine.luu_y || medicine.contraindications || 'Mẫn cảm với bất kỳ thành phần hoạt chất nào của thuốc. Phụ nữ có thai và cho con bú cần tham vấn ý kiến bác sĩ.'}
                </Text>
              </View>
            )}

            {activeTab === 'SIDE_EFFECT' && (
              <View>
                <Text style={styles.pharmaContentTitle}>Tác dụng phụ có thể gặp:</Text>
                <Text style={styles.pharmaContentBody}>
                  {medicine.tac_dung_phu || medicine.side_effects || 'Rối loạn tiêu hóa nhẹ, buồn ngủ hoặc dị ứng ngoài da. Ngưng sử dụng và thông báo ngay cho cơ sở y tế nếu có triệu chứng lạ.'}
                </Text>
              </View>
            )}

            {activeTab === 'STORAGE' && (
              <View>
                <Text style={styles.pharmaContentTitle}>Điều kiện bảo quản:</Text>
                <Text style={styles.pharmaContentBody}>
                  {medicine.bao_quan || 'Bảo quản nơi khô ráo, nhiệt độ phòng dưới 30°C, tránh ánh sáng mặt trời trực tiếp và xa tầm tay trẻ em.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Sản Phẩm Cùng Chuyên Khoa Gợi Ý ─────────────────────────────── */}
        {relatedMedicines.length > 0 && (
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <Text style={styles.relatedTitle}>Sản Phẩm Cùng Chuyên Khoa</Text>
              <Text style={styles.relatedSub}>Được khách hàng thường xuyên mua kèm</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
              {relatedMedicines.map((rel, rIdx) => (
                <AnimatedPressable
                  key={`rel-${rel.id || rIdx}`}
                  onPress={() => {
                    navigation.push('MedicineDetailScreen', { medicine: rel, medicineId: rel.id });
                  }}
                  style={styles.relatedCard}
                  pressedScale={0.96}
                >
                  <View style={styles.relatedThumbBox}>
                    <Image
                      source={{ uri: rel.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80' }}
                      style={styles.relatedThumb}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.relatedMedName} numberOfLines={2}>{rel.name}</Text>
                  <Text style={[styles.relatedMedPrice, TypographyTokens.tabularNums]}>
                    {rel.price.toLocaleString('vi-VN')} ₫
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ─── Bottom Action Bar Cố Định (Fixed Footer CTA) ──────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 12 }]}>
        <AnimatedTouchable
          onPress={() => navigation.navigate('CustomerScreen', { initialTab: 'AI_CHAT' })}
          style={styles.bottomAiBtn}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#0284C7" />
          <Text style={styles.bottomAiBtnText}>Tư vấn AI</Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => handleAddToCart(false)}
          style={styles.bottomAddToCartBtn}
        >
          <Ionicons name="cart" size={17} color="#0284C7" style={{ marginRight: 4 }} />
          <Text style={styles.bottomAddToCartText}>Thêm giỏ</Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => handleAddToCart(true)}
          style={styles.bottomBuyNowBtn}
        >
          <Text style={styles.bottomBuyNowText}>Mua ngay</Text>
        </AnimatedTouchable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  notFoundSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  backHomeBtn: {
    marginTop: 16,
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backHomeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  scrollContent: {
    padding: 14,
    gap: 12,
  },

  // Hero Image
  heroImageSection: {
    width: '100%',
    height: SCREEN_WIDTH * 0.72,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  heroImage: {
    width: '85%',
    height: '85%',
  },
  imageBadgesContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'column',
    gap: 6,
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  gspBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  gspBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rxBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  rxBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Main Info Card
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryBreadcrumb: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  medicineMainName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 8,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  activeValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingAndSoldCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingScore: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 2,
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  dotDivider: {
    marginHorizontal: 8,
    color: '#CBD5E1',
    fontSize: 12,
  },
  soldCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  priceContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  mainPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#DC2626',
  },
  unitSlash: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  originalPrice: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  taxNote: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Selection Card
  selectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 14,
  },
  sectionHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  unitPillActive: {
    backgroundColor: '#0284C7',
  },
  unitPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
  },
  quantitySectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  quantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValueText: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Commitments Card
  commitmentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  commitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commitTextCol: {
    flex: 1,
  },
  commitTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  commitSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Pharmacopeia
  pharmacopeiaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  pharmacopeiaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pharmacopeiaIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacopeiaTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  pharmaTabsScroll: {
    marginBottom: 12,
  },
  pharmaTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  pharmaTabBtnActive: {
    backgroundColor: '#0284C7',
  },
  pharmaTabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  pharmaTabBtnTextActive: {
    color: '#FFFFFF',
  },
  pharmaTabContent: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  pharmaContentTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
  },
  pharmaContentBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },

  // Related Section
  relatedSection: {
    marginTop: 4,
  },
  relatedHeader: {
    marginBottom: 10,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  relatedSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  relatedScroll: {
    gap: 10,
  },
  relatedCard: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  relatedThumbBox: {
    width: '100%',
    height: 75,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  relatedThumb: {
    width: '90%',
    height: '90%',
  },
  relatedMedName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
    height: 30,
  },
  relatedMedPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },

  // Fixed Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomAiBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bottomAiBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  bottomAddToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 12,
    borderRadius: 10,
  },
  bottomAddToCartText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  bottomBuyNowBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
  },
  bottomBuyNowText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
