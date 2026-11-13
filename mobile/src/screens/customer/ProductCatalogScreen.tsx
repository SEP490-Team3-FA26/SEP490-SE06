/**
 * ProductCatalogScreen.tsx - Màn Hình Toàn Bộ Danh Mục Sản Phẩm (Product Catalog Screen)
 * Thiết kế chuẩn E-Commerce y tế FPT Long Châu / Pharmacity:
 * 1. Hiển thị toàn bộ sản phẩm đang bán (2.000+ SKU) qua Infinite Scroll mượt mà 60 FPS.
 * 2. Lưới 2 cột cân đối, tái sử dụng MedicineGridCard & MedicineSmartImage.
 * 3. Bộ lọc chuyên nghiệp: Danh mục ngang, Lọc theo giá, Lọc Rx/OTC, Sắp xếp giá tăng/giảm.
 * 4. Kế thừa hoàn toàn màn hình chi tiết sản phẩm MedicineDetailScreen khi bấm xem chi tiết.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine } from '../../types/pharmacy.types';
import { ApiService } from '../../services/api.service';
import { MedicineGridCard } from '../../components/medicine/MedicineGridCard';
import { ClinicalModalSheet } from '../../components/clinical/ClinicalModalSheet';
import { showToast } from '../../components/ui/toastHelper';
import { TypographyTokens } from '../../theme/tokens';
import { CatalogFilterService } from '../../services/catalogFilter.service';

const GUEST_CART_KEY = '@abc_guest_cart';
const PAGE_LIMIT = 50; // Phân trang 50 sản phẩm / lần tải chuẩn Database MongoDB theo yêu cầu

// Danh sách danh mục thuốc phổ biến của chuỗi nhà thuốc ABC Pharmacy (100% chuẩn OTC không kê đơn theo GPP)
const CATALOG_CATEGORIES = [
  { id: 'ALL', name: 'Tất cả', keyword: '' },
  { id: 'PATCH', name: 'Cao dán - Miếng dán', keyword: 'dán', categoryValue: 'Miếng dán giảm đau' },
  { id: 'PAIN_RELIEF', name: 'Giảm đau - Hạ sốt', keyword: 'giảm đau', categoryValue: 'Giảm đau, hạ sốt' },
  { id: 'DIGESTIVE', name: 'Tiêu hóa', keyword: 'tiêu hóa', categoryValue: 'Thuốc tiêu hóa' },
  { id: 'RESPIRATORY', name: 'Hô hấp', keyword: 'hô hấp', categoryValue: 'Thuốc hô hấp' },
  { id: 'DERMA', name: 'Da liễu - Bôi ngoài', keyword: 'da', categoryValue: 'Thuốc da liễu' },
  { id: 'VITAMIN', name: 'Vitamin & Khoáng chất', keyword: 'vitamin', categoryValue: 'Vitamin & Khoáng chất' },
  { id: 'SUPPLEMENT', name: 'Thực phẩm chức năng', keyword: 'thực phẩm', categoryValue: 'Thực phẩm chức năng' },
  { id: 'MEDICAL_DEVICE', name: 'Thiết bị y tế', keyword: 'thiết bị', categoryValue: 'Vật tư y tế' },
];

export const ProductCatalogScreen: React.FC<{
  navigation: any;
  route?: any;
}> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const initialCategory = route?.params?.initialCategory || 'ALL';
  const initialSearch = route?.params?.initialSearch || '';

  // State Dữ liệu sản phẩm & Phân trang
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // State Bộ lọc & Tìm kiếm & Modal
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<'ALL' | 'UNDER_100' | '100_300' | '300_500' | 'OVER_500'>('ALL');
  const [selectedProductType, setSelectedProductType] = useState<'ALL' | 'OTC' | 'SUPPLEMENT' | 'DEVICE'>('ALL');
  const [selectedInStockOnly, setSelectedInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC'>('DEFAULT');

  // Đếm số lượng tiêu chí lọc đang được kích hoạt
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedPriceFilter !== 'ALL') count++;
    if (selectedProductType !== 'ALL') count++;
    if (selectedInStockOnly) count++;
    if (sortBy !== 'DEFAULT') count++;
    return count;
  }, [selectedPriceFilter, selectedProductType, selectedInStockOnly, sortBy]);

  // State Giỏ hàng & Yêu thích
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Bộ nhớ đệm danh mục cấp 1 (L1 In-Memory Cache) lưu kết quả theo categoryId & search
  // Giúp khi người dùng click qua lại giữa các tab danh mục, Latency = 0ms (Tức thì, không giật màn hình)
  const categoryCacheRef = useRef<Map<string, { items: Medicine[]; total: number; hasMore: boolean }>>(new Map());

  // Tải số lượng giỏ hàng cục bộ
  const refreshCartCount = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(GUEST_CART_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const total = parsed.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
          setCartCount(total);
          return;
        }
      }
      setCartCount(0);
    } catch {
      setCartCount(0);
    }
  }, []);

  // Tải danh sách yêu thích
  const refreshWishlist = useCallback(async () => {
    try {
      const res = await ApiService.getWishlist();
      if (Array.isArray(res)) {
        const ids = new Set<string>(res.map((item: any) => String(item.id || item._id)));
        setWishlistIds(ids);
      }
    } catch {}
  }, []);

  // Tải danh sách sản phẩm theo trang (50 sản phẩm / trang) từ Database MongoDB
  const fetchProducts = useCallback(async (resetPage = true) => {
    try {
      if (resetPage) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const targetPage = resetPage ? 1 : page + 1;
      const catObj = CATALOG_CATEGORIES.find((c) => c.id === selectedCategory);
      const isAll = !catObj || catObj.id === 'ALL';
      const searchParam = searchQuery.trim() || (isAll ? '' : (catObj?.keyword || ''));
      const categoryParam = isAll ? '' : (catObj?.categoryValue || '');

      let res = await ApiService.getMedicinesInfiniteScroll({
        page: targetPage,
        limit: PAGE_LIMIT,
        search: searchQuery.trim() ? searchQuery.trim() : (isAll ? '' : (catObj?.keyword || '')),
        category: searchQuery.trim() ? '' : categoryParam,
        otcOnly: true, // GPP: Khách hàng chỉ tải các sản phẩm OTC không kê đơn
      });

      // Cơ chế tự động fallback nếu tìm theo categoryValue rỗng -> tìm lại theo từ khóa keyword
      if (res.data.length === 0 && !isAll && !searchQuery.trim() && catObj?.keyword) {
        res = await ApiService.getMedicinesInfiniteScroll({
          page: targetPage,
          limit: PAGE_LIMIT,
          search: catObj.keyword,
          otcOnly: true,
        });
      }

      const newItems = res.data || res.items || [];

      if (resetPage) {
        setMedicines(newItems);
        // Lưu vào bộ nhớ đệm L1 cache theo danh mục & từ khóa
        const cacheKey = `${selectedCategory}:${searchQuery.trim()}`;
        categoryCacheRef.current.set(cacheKey, {
          items: newItems,
          total: res.total || 0,
          hasMore: res.hasMore,
        });
      } else {
        setMedicines((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueNew = newItems.filter((m) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      }

      setHasMore(res.hasMore);
      setTotalCount(res.total || 0);
      if (!resetPage) {
        setPage(targetPage);
      }
    } catch (e) {
      // Khi gặp sự cố mạng, lấy fallback từ API thông thường
      try {
        const fallbackList = await ApiService.getMedicines({ page: 1, limit: PAGE_LIMIT, search: searchQuery.trim() });
        if (Array.isArray(fallbackList)) {
          setMedicines(fallbackList);
          setTotalCount(fallbackList.length);
          setHasMore(false);
        }
      } catch {}
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [page, searchQuery, selectedCategory]);

  // Khởi tạo ban đầu và khi thay đổi bộ lọc
  useEffect(() => {
    fetchProducts(true);
    refreshCartCount();
    refreshWishlist();
  }, [selectedCategory, searchQuery]);

  // Xử lý chuyển tab danh mục với độ trễ mắt thường = 0ms (L1 In-Memory Cache Instant Switch)
  const handleSelectCategory = useCallback(
    (catId: string) => {
      if (catId === selectedCategory) return;
      const cacheKey = `${catId}:${searchQuery.trim()}`;
      const cached = categoryCacheRef.current.get(cacheKey);
      if (cached && cached.items.length > 0) {
        // [Zero-Latency] Đổi tab và nạp dữ liệu tức thì từ RAM trong 0ms!
        setSelectedCategory(catId);
        setMedicines(cached.items);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setLoading(false);
        return;
      }
      setSelectedCategory(catId);
    },
    [selectedCategory, searchQuery]
  );

  // Xử lý kéo xuống làm mới (Pull-to-refresh)
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Xóa cache của danh mục hiện tại để tải mới từ máy chủ
    const cacheKey = `${selectedCategory}:${searchQuery.trim()}`;
    categoryCacheRef.current.delete(cacheKey);
    refreshCartCount();
    refreshWishlist();
    fetchProducts(true);
  }, [fetchProducts, refreshCartCount, refreshWishlist, selectedCategory, searchQuery]);

  // Xử lý cuộn tới đáy danh sách để tải thêm (Infinite Scroll)
  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchProducts(false);
    }
  }, [fetchProducts, hasMore, loading, loadingMore]);

  // Kế thừa chính xác màn hình Chi Tiết Sản Phẩm (MedicineDetailScreen)
  const handleOpenDetail = useCallback((med: Medicine) => {
    if (!med) return;
    navigation.navigate('MedicineDetailScreen', {
      medicine: med,
      medicineId: med.id || (med as any)._id,
    });
  }, [navigation]);

  // Thêm thuốc vào giỏ hàng
  const handleAddToCart = useCallback(async (med: Medicine) => {
    if (!med) return;
    if (med.isRx) {
      showToast.info(
        'Thuốc kê đơn (Rx)',
        'Theo Thông tư 07/2017/TT-BYT, thuốc kê đơn cần có đơn thuốc của bác sĩ và phải được Dược sĩ tư vấn xác nhận trước khi mua.'
      );
      return;
    }
    try {
      const cached = await AsyncStorage.getItem(GUEST_CART_KEY);
      let cart: any[] = cached ? JSON.parse(cached) : [];
      if (!Array.isArray(cart)) cart = [];

      const existingIndex = cart.findIndex((item) => (item.medicine?.id || item.medicine?._id) === (med.id || (med as any)._id));
      if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
      } else {
        cart.push({ medicine: med, quantity: 1 });
      }

      await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
      const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(total);
      showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
    } catch {
      showToast.error('Lỗi', 'Không thể cập nhật giỏ hàng.');
    }
  }, []);

  // Bật/tắt yêu thích
  const handleToggleWishlist = useCallback(async (med: Medicine) => {
    const medId = String(med.id || (med as any)._id);
    const isFav = wishlistIds.has(medId);

    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(medId);
      } else {
        next.add(medId);
      }
      return next;
    });

    try {
      await ApiService.toggleWishlist(medId);
    } catch {}
  }, [wishlistIds]);

  // Lọc và Sắp xếp danh sách hiển thị với Single-Pass Pipeline O(N) qua CatalogFilterService
  const filteredMedicines = useMemo(() => {
    return CatalogFilterService.filterAndSortMedicines(medicines, {
      priceFilter: selectedPriceFilter,
      productType: selectedProductType,
      inStockOnly: selectedInStockOnly,
      sortBy,
    });
  }, [medicines, selectedPriceFilter, selectedProductType, selectedInStockOnly, sortBy]);

  // Memoized Render Item & Key Extractor để FlatList chỉ việc render, không tạo lại JSX mỗi render cycle
  const renderMedicineCard = useCallback(
    ({ item }: { item: Medicine }) => (
      <MedicineGridCard
        medicine={item}
        isWishlisted={wishlistIds.has(String(item.id || (item as any)._id))}
        onPressDetail={handleOpenDetail}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
      />
    ),
    [wishlistIds, handleOpenDetail, handleToggleWishlist, handleAddToCart]
  );

  const medicineKeyExtractor = useCallback(
    (item: Medicine, index: number) => item.id || (item as any)._id || item.sku || `med-${index}`,
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. Header Thanh Điều Hướng & Tìm Kiếm ─── */}
      <View style={styles.headerRow}>
        {/* Nút Quay Lại */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        {/* Ô Tìm Kiếm Nhanh */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trong 2.000+ sản phẩm..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút Giỏ Hàng Có Badge Số Lượng */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CustomerScreen', { initialTab: 'CART' })}
          style={styles.cartBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="cart-outline" size={24} color="#0284C7" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── 2. Thanh Danh Mục Trượt Ngang ─── */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          data={CATALOG_CATEGORIES}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                onPress={() => handleSelectCategory(item.id)}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ─── 3. Thanh Lọc Nhanh & Mở Modal Bộ Lọc ─── */}
      <View style={styles.filterBarRow}>
        <Text style={styles.totalCountText}>
          {totalCount > 0
            ? `Đang xem ${filteredMedicines.length} / ${totalCount.toLocaleString('vi-VN')} sản phẩm`
            : `${filteredMedicines.length} sản phẩm`}
        </Text>

        <View style={styles.filterButtonGroup}>
          {/* Nút Mở Modal Bộ Lọc Toàn Diện */}
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={[styles.filterPill, activeFilterCount > 0 && styles.filterPillActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="funnel"
              size={13}
              color={activeFilterCount > 0 ? '#0284C7' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterPillText, activeFilterCount > 0 && styles.filterPillTextActive]}>
              Bộ lọc {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Sắp xếp giá nhanh */}
          <TouchableOpacity
            onPress={() => {
              if (sortBy === 'DEFAULT') setSortBy('PRICE_ASC');
              else if (sortBy === 'PRICE_ASC') setSortBy('PRICE_DESC');
              else setSortBy('DEFAULT');
            }}
            style={[styles.filterPill, sortBy !== 'DEFAULT' && styles.filterPillActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, sortBy !== 'DEFAULT' && styles.filterPillTextActive]}>
              {sortBy === 'DEFAULT' ? 'Giá' : sortBy === 'PRICE_ASC' ? 'Giá tăng' : 'Giá giảm'}
            </Text>
            <Ionicons
              name={sortBy === 'PRICE_ASC' ? 'arrow-up' : sortBy === 'PRICE_DESC' ? 'arrow-down' : 'swap-vertical-outline'}
              size={12}
              color={sortBy !== 'DEFAULT' ? '#0284C7' : '#64748B'}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 4. Lưới Sản Phẩm 2 Cột Infinite Scroll ─── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Đang tải danh mục dược phẩm...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMedicines}
          keyExtractor={medicineKeyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.gridColumnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={true}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0284C7']} />}
          renderItem={renderMedicineCard}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoadingBox}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.footerLoadingText}>Đang tải thêm 50 sản phẩm tiếp theo...</Text>
              </View>
            ) : hasMore ? (
              <TouchableOpacity
                onPress={handleLoadMore}
                style={styles.loadMoreManualBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.loadMoreManualText}>Cuộn hoặc bấm để tải thêm 50 sản phẩm</Text>
                <Ionicons name="chevron-down" size={14} color="#0284C7" />
              </TouchableOpacity>
            ) : medicines.length > 0 ? (
              <View style={styles.footerEndOfListBox}>
                <Text style={styles.footerEndOfListText}>✓ Đã hiển thị toàn bộ {totalCount || medicines.length} sản phẩm chính hãng</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm phù hợp</Text>
              <Text style={styles.emptySub}>Vui lòng thử tìm từ khóa khác hoặc chọn danh mục khác.</Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedProductType('ALL');
                  setSelectedPriceFilter('ALL');
                  setSelectedInStockOnly(false);
                  setSortBy('DEFAULT');
                }}
                style={styles.emptyResetBtn}
              >
                <Text style={styles.emptyResetBtnText}>Xem Tất Cả Thuốc</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      {/* ─── 5. Modal Bộ Lọc Dược Phẩm Toàn Diện (ClinicalModalSheet) ─── */}
      <ClinicalModalSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Bộ Lọc Dược Phẩm"
        subtitle="Lọc theo mức giá, loại sản phẩm và tình trạng tồn kho"
        maxHeight={Dimensions.get('window').height * 0.85}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterModalScroll}>
          {/* Nhóm 1: Loại sản phẩm không kê đơn */}
          <Text style={styles.filterSectionTitle}>Nhóm sản phẩm</Text>
          <View style={styles.filterOptionsGrid}>
            {[
              { id: 'ALL', label: 'Tất cả sản phẩm', icon: 'apps-outline' },
              { id: 'OTC', label: 'Thuốc không kê đơn (OTC)', icon: 'bandage-outline' },
              { id: 'SUPPLEMENT', label: 'Thực phẩm chức năng & Vitamin', icon: 'nutrition-outline' },
              { id: 'DEVICE', label: 'Thiết bị & Vật tư y tế', icon: 'medkit-outline' },
            ].map((item) => {
              const active = selectedProductType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedProductType(item.id as any)}
                  style={[styles.filterOptionChip, active && styles.filterOptionChipActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={15} color={active ? '#0284C7' : '#64748B'} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterOptionChipText, active && styles.filterOptionChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ghi chú tuân thủ y tế GPP */}
          <View style={styles.complianceNoteBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
            <Text style={styles.complianceNoteText}>
              Theo quy định Bộ Y Tế: Toàn bộ thuốc kê đơn (Rx) đã được tự động loại bỏ khỏi danh mục mua sắm trực tuyến.
            </Text>
          </View>

          {/* Nhóm 2: Khoảng giá */}
          <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>Khoảng giá</Text>
          <View style={styles.filterOptionsGrid}>
            {[
              { id: 'ALL', label: 'Tất cả mức giá' },
              { id: 'UNDER_100', label: 'Dưới 100.000 ₫' },
              { id: '100_300', label: '100.000 ₫ – 300.000 ₫' },
              { id: '300_500', label: '300.000 ₫ – 500.000 ₫' },
              { id: 'OVER_500', label: 'Trên 500.000 ₫' },
            ].map((item) => {
              const active = selectedPriceFilter === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedPriceFilter(item.id as any)}
                  style={[styles.filterOptionChip, active && styles.filterOptionChipActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={14}
                    color={active ? '#0284C7' : '#94A3B8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterOptionChipText, active && styles.filterOptionChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Nhóm 3: Sắp xếp kết quả */}
          <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>Sắp xếp theo</Text>
          <View style={styles.filterOptionsGrid}>
            {[
              { id: 'DEFAULT', label: 'Phổ biến nhất' },
              { id: 'PRICE_ASC', label: 'Giá tăng dần (Thấp → Cao)' },
              { id: 'PRICE_DESC', label: 'Giá giảm dần (Cao → Thấp)' },
              { id: 'NAME_ASC', label: 'Tên sản phẩm (A → Z)' },
            ].map((item) => {
              const active = sortBy === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSortBy(item.id as any)}
                  style={[styles.filterOptionChip, active && styles.filterOptionChipActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={active ? '#0284C7' : '#94A3B8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterOptionChipText, active && styles.filterOptionChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Nhóm 4: Tình trạng tồn kho */}
          <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>Tình trạng hàng</Text>
          <TouchableOpacity
            onPress={() => setSelectedInStockOnly((prev) => !prev)}
            style={[styles.inStockToggleRow, selectedInStockOnly && styles.inStockToggleRowActive]}
            activeOpacity={0.7}
          >
            <View style={styles.inStockToggleLeft}>
              <Ionicons
                name={selectedInStockOnly ? 'checkbox' : 'square-outline'}
                size={20}
                color={selectedInStockOnly ? '#0284C7' : '#94A3B8'}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.inStockToggleText}>Chỉ hiển thị sản phẩm còn hàng trong kho</Text>
            </View>
            <View style={[styles.stockStatusBadge, { backgroundColor: selectedInStockOnly ? '#DCFCE7' : '#F1F5F9' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: selectedInStockOnly ? '#16A34A' : '#64748B' }}>
                {selectedInStockOnly ? 'Đang bật' : 'Tất cả'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Thanh Nút Hành Động Ở Chân Modal */}
          <View style={styles.filterModalFooterRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectedPriceFilter('ALL');
                setSelectedProductType('ALL');
                setSelectedInStockOnly(false);
                setSortBy('DEFAULT');
              }}
              style={styles.filterResetBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.filterResetBtnText}>Thiết lập lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={styles.filterApplyBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.filterApplyBtnText}>
                Xem {filteredMedicines.length} sản phẩm
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ClinicalModalSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  cartBtn: {
    position: 'relative',
    padding: 6,
    marginLeft: 6,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  categoriesWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 6,
  },
  categoriesContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  totalCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 30,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },
  footerLoadingBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  footerEndOfListBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerEndOfListText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  emptyResetBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadMoreManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
  },
  loadMoreManualText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0284C7',
  },
  // Styles Modal Bộ Lọc Dược Phẩm Toàn Diện
  filterModalScroll: {
    paddingBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionChipActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  filterOptionChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  filterOptionChipTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  complianceNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 10,
  },
  complianceNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: '#0369A1',
    lineHeight: 16,
  },
  inStockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inStockToggleRowActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  inStockToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inStockToggleText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  filterModalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterResetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterApplyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0284C7',
  },
  filterApplyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

