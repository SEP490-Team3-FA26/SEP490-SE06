/**
 * ProductCatalogScreen.tsx - Màn Hình Toàn Bộ Danh Mục Sản Phẩm (Product Catalog Screen)
 * Thiết kế chuẩn E-Commerce y tế FPT Long Châu / Pharmacity:
 * 1. Hiển thị toàn bộ sản phẩm đang bán (2.000+ SKU) qua Infinite Scroll mượt mà 60 FPS.
 * 2. Lưới 2 cột cân đối, tái sử dụng MedicineGridCard & MedicineSmartImage.
 * 3. Bộ lọc chuyên nghiệp: Danh mục ngang, Lọc theo giá, Lọc Rx/OTC, Sắp xếp giá tăng/giảm.
 * 4. Kế thừa hoàn toàn màn hình chi tiết sản phẩm MedicineDetailScreen khi bấm xem chi tiết.
 * Kiến trúc 3-Tier: Tách biệt Stylesheet (styles.ts), State/Logic (useProductCatalog.ts), và Modal (CatalogFilterModal.tsx).
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Medicine } from '../../types/pharmacy.types';
import { MedicineGridCard } from '../../components/medicine/MedicineGridCard';
import { CATALOG_CATEGORIES } from './constants/catalog.constants';
import { CatalogFilterModal } from './components/CatalogFilterModal';
import { useProductCatalog } from './hooks/useProductCatalog';
import { styles } from './ProductCatalogScreen.styles';

export const ProductCatalogScreen: React.FC<{
  navigation: any;
  route?: any;
}> = ({ navigation, route }) => {
  const initialCategory = route?.params?.initialCategory || 'ALL';
  const initialSearch = route?.params?.initialSearch || '';

  const {
    medicines,
    filteredMedicines,
    totalCount,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    handleSelectCategory,
    showFilterModal,
    setShowFilterModal,
    selectedPriceFilter,
    setSelectedPriceFilter,
    selectedProductType,
    setSelectedProductType,
    selectedInStockOnly,
    setSelectedInStockOnly,
    sortBy,
    setSortBy,
    activeFilterCount,
    cartCount,
    wishlistIds,
    handleRefresh,
    handleLoadMore,
    handleAddToCart,
    handleToggleWishlist,
    handleResetFilters,
  } = useProductCatalog({ initialCategory, initialSearch });

  // Kế thừa chính xác màn hình Chi Tiết Sản Phẩm (MedicineDetailScreen)
  const handleOpenDetail = useCallback((med: Medicine) => {
    if (!med) return;
    navigation.navigate('MedicineDetailScreen', {
      medicine: med,
      medicineId: med.id || (med as any)._id,
    });
  }, [navigation]);

  // Memoized Render Item cho FlatList
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>

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
                  handleSelectCategory('ALL');
                  handleResetFilters();
                }}
                style={styles.emptyResetBtn}
              >
                <Text style={styles.emptyResetBtnText}>Xem Tất Cả Thuốc</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ─── 5. Modal Bộ Lọc Dược Phẩm Toàn Diện ─── */}
      <CatalogFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedProductType={selectedProductType}
        setSelectedProductType={setSelectedProductType}
        selectedPriceFilter={selectedPriceFilter}
        setSelectedPriceFilter={setSelectedPriceFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedInStockOnly={selectedInStockOnly}
        setSelectedInStockOnly={setSelectedInStockOnly}
        filteredCount={filteredMedicines.length}
        onResetFilters={handleResetFilters}
      />
    </SafeAreaView>
  );
};
