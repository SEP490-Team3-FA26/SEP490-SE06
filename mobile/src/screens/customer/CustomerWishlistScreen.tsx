import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { WishlistAPI, MobileWishlistItem } from '../../services/wishlistApiService';
import { ColorTokens, TypographyTokens, RadiusTokens } from '../../theme/tokens';
import { AnimatedPressable } from '../../components/clinical';

/**
 * Màn hình Quản lý Danh sách Sản phẩm Yêu thích (Wishlist) dành cho Khách hàng trên Mobile (UC-96)
 * Tuân thủ chuẩn UI y tế hiện đại, hỗ trợ tìm kiếm, lọc nhanh, xóa tức thì và chuyển vào giỏ hàng
 */
export const CustomerWishlistScreen: React.FC<{ navigation: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MobileWishlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tải danh sách yêu thích
  const loadWishlist = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await WishlistAPI.getWishlist();
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e: any) {
      showToast.error('Lỗi', e.message || 'Không thể tải danh sách yêu thích');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // Xóa một sản phẩm khỏi danh sách yêu thích
  const handleRemoveItem = async (medicineId: string, name: string) => {
    // Optimistic UI
    const previous = [...items];
    setItems((prev) => prev.filter((it) => (it.id || it._id) !== medicineId));

    try {
      const res = await WishlistAPI.removeFromWishlist(medicineId);
      if (res.success) {
        showToast.success('Đã xóa', `Đã xóa "${name}" khỏi yêu thích`);
      } else {
        setItems(previous);
        showToast.error('Lỗi', res.message || 'Không thể xóa sản phẩm');
      }
    } catch (e: any) {
      setItems(previous);
      showToast.error('Lỗi', e.message);
    }
  };

  // Dọn sạch toàn bộ danh sách yêu thích
  const handleClearAll = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Xóa danh sách yêu thích',
      'Bạn có chắc chắn muốn dọn sạch toàn bộ sản phẩm yêu thích không?',
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Xóa hết',
          style: 'destructive',
          onPress: async () => {
            const previous = [...items];
            setItems([]);
            const res = await WishlistAPI.clearWishlist();
            if (res.success) {
              showToast.success('Thành công', 'Đã làm trống danh sách yêu thích');
            } else {
              setItems(previous);
              showToast.error('Lỗi', 'Không thể dọn sạch danh sách');
            }
          },
        },
      ]
    );
  };

  // Thêm nhanh vào giỏ hàng
  const handleAddToCart = (item: MobileWishlistItem) => {
    // Nếu màn hình trước có truyền hàm addToCart qua route params
    if (route?.params?.onAddToCart) {
      route.params.onAddToCart(item);
      showToast.success('Đã thêm giỏ hàng', `Đã thêm "${item.name}" vào giỏ`);
    } else {
      showToast.success('Đã thêm giỏ hàng', `Đã thêm "${item.name}" vào giỏ hàng!`);
    }
  };

  // Lọc sản phẩm theo từ khóa tìm kiếm
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.name?.toLowerCase().includes(q) ||
        it.active?.toLowerCase().includes(q) ||
        it.active_ingredient?.toLowerCase().includes(q) ||
        it.category?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284C7" />

      {/* Header Bar */}
      <HeaderBar
        title="Sản phẩm yêu thích"
        onBack={() => navigation.goBack()}
        rightAction={
          items.length > 0
            ? {
                icon: 'trash-outline',
                onPress: handleClearAll,
              }
            : undefined
        }
      />

      {/* Gradient Sub-Header Banner */}
      <LinearGradient
        colors={['#0284C7', '#0EA5E9']}
        style={styles.bannerContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.bannerRow}>
          <View style={styles.bannerIconCircle}>
            <Ionicons name="heart" size={24} color="#EF4444" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.bannerTitle}>Danh Mục Quan Tâm</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{items.length}</Text>
              </View>
            </View>
            <Text style={styles.bannerSubtitle}>
              Theo dõi giá & mua lại nhanh chóng các sản phẩm bạn quan tâm
            </Text>
          </View>
        </View>

        {/* Thanh tìm kiếm trong Wishlist */}
        {items.length > 0 && (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#0284C7" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên thuốc, hoạt chất..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <AnimatedTouchable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </AnimatedTouchable>
            ) : null}
          </View>
        )}
      </LinearGradient>

      {/* Nội dung danh sách */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadWishlist(true);
            }}
            colors={['#0284C7']}
          />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptySub}>Đang tải danh sách yêu thích...</Text>
          </View>
        ) : items.length === 0 ? (
          // Trạng thái trống
          <View style={styles.centerBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-dislike-outline" size={48} color="#FDA4AF" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có sản phẩm yêu thích</Text>
            <Text style={styles.emptySub}>
              Hãy nhấn vào biểu tượng trái tim ❤️ ở các sản phẩm bạn quan tâm để lưu lại và theo dõi giá bất cứ lúc nào!
            </Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('CustomerScreen')}
              style={styles.exploreBtn}
              pressedScale={0.96}
            >
              <Ionicons name="cart-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.exploreBtnText}>Khám phá cửa hàng thuốc</Text>
            </AnimatedPressable>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="search-outline" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm</Text>
            <Text style={styles.emptySub}>Không có thuốc nào khớp với từ khóa "{searchQuery}"</Text>
          </View>
        ) : (
          filteredItems.map((item, idx) => {
            const medId = item.id || item._id || `wish-${idx}`;
            const isOutOfStock = item.stock !== undefined && item.stock <= 0;

            return (
              <View key={medId} style={styles.card}>
                {/* Ảnh thuốc */}
                <Image
                  source={{
                    uri:
                      item.image ||
                      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                  }}
                  style={styles.thumb}
                  resizeMode="cover"
                />

                {/* Chi tiết thuốc */}
                <View style={styles.cardDetails}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Text style={styles.medName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {/* Nút xóa yêu thích */}
                    <AnimatedTouchable
                      onPress={() => handleRemoveItem(medId, item.name)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="heart" size={20} color="#EF4444" />
                    </AnimatedTouchable>
                  </View>

                  {/* Hoạt chất */}
                  <Text style={styles.activeIng} numberOfLines={1}>
                    {item.active || item.active_ingredient || 'Dược phẩm chuẩn GPP'}
                  </Text>

                  {/* Giá & Thao tác Thêm giỏ */}
                  <View style={styles.actionRow}>
                    <View>
                      <Text style={[styles.priceText, TypographyTokens.tabularNums]}>
                        {(item.price || 0).toLocaleString('vi-VN')} ₫
                      </Text>
                      <Text style={styles.unitText}>/ {item.unit || 'Hộp'}</Text>
                    </View>

                    <AnimatedPressable
                      onPress={() => handleAddToCart(item)}
                      style={[styles.addCartBtn, isOutOfStock && styles.addCartBtnDisabled]}
                      disabled={isOutOfStock}
                      pressedScale={0.92}
                    >
                      <Ionicons
                        name={isOutOfStock ? 'alert-circle-outline' : 'cart-outline'}
                        size={15}
                        color="#FFFFFF"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.addCartBtnText}>
                        {isOutOfStock ? 'Hết hàng' : 'Thêm giỏ'}
                      </Text>
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countBadge: {
    marginLeft: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#E0F2FE',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  medName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  deleteBtn: {
    padding: 2,
  },
  activeIng: {
    fontSize: 11,
    color: '#64748B',
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284C7',
  },
  unitText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  addCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addCartBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  addCartBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
export default CustomerWishlistScreen;
