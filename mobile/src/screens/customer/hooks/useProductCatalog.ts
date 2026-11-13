/**
 * useProductCatalog.ts - Custom Hook Quản Lý State & Dữ Liệu Cho Danh Mục Dược Phẩm Mobile
 * Tuân thủ Kiến trúc 3-Tier chuẩn Playbook v2.0:
 * 1. Quản lý phân trang Infinite Scroll 50 sản phẩm / trang từ API Gateway.
 * 2. L1 In-Memory Cache (RAM) chuyển tab danh mục tức thì 0ms.
 * 3. Single-Pass O(N) Filter & Sort qua CatalogFilterService.
 * 4. Quản lý Giỏ hàng cục bộ và Danh sách yêu thích.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine } from '../../../types/pharmacy.types';
import { ApiService } from '../../../services/api.service';
import { CatalogFilterService } from '../../../services/catalogFilter.service';
import { showToast } from '../../../components/ui/toastHelper';
import { CATALOG_CATEGORIES, PAGE_LIMIT, GUEST_CART_KEY } from '../constants/catalog.constants';

export interface UseProductCatalogOptions {
  initialCategory?: string;
  initialSearch?: string;
}

export function useProductCatalog(options?: UseProductCatalogOptions) {
  const initialCategory = options?.initialCategory || 'ALL';
  const initialSearch = options?.initialSearch || '';

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

  // Bộ nhớ đệm L1 cache theo danh mục & từ khóa trong RAM
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
        search: searchParam,
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

  // Xử lý chuyển tab danh mục với độ trễ mắt thường = 0ms (L1 Cache)
  const handleSelectCategory = useCallback(
    (catId: string) => {
      if (catId === selectedCategory) return;
      const cacheKey = `${catId}:${searchQuery.trim()}`;
      const cached = categoryCacheRef.current.get(cacheKey);
      if (cached && cached.items.length > 0) {
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

  // Đặt lại toàn bộ bộ lọc về mặc định
  const handleResetFilters = useCallback(() => {
    setSelectedPriceFilter('ALL');
    setSelectedProductType('ALL');
    setSelectedInStockOnly(false);
    setSortBy('DEFAULT');
  }, []);

  // Lọc và Sắp xếp danh sách hiển thị với Single-Pass Pipeline O(N)
  const filteredMedicines = useMemo(() => {
    return CatalogFilterService.filterAndSortMedicines(medicines, {
      priceFilter: selectedPriceFilter,
      productType: selectedProductType,
      inStockOnly: selectedInStockOnly,
      sortBy,
    });
  }, [medicines, selectedPriceFilter, selectedProductType, selectedInStockOnly, sortBy]);

  return {
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
  };
}

