import { useState, useEffect, useCallback } from 'react';
import { wishlistService, WishlistItem } from '../services/sales/wishlist.service';

/**
 * Custom Hook useWishlist
 * Cung cấp toàn bộ trạng thái, các hàm thao tác với Danh sách yêu thích
 * Áp dụng kỹ thuật Optimistic UI và lắng nghe sự kiện đồng bộ toàn ứng dụng
 */
export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Tải danh sách yêu thích từ API hoặc LocalStorage
   */
  const loadWishlist = useCallback(async (isSilent: boolean = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await wishlistService.getWishlist();
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách yêu thích');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Lắng nghe sự kiện đồng bộ toàn hệ thống
  useEffect(() => {
    loadWishlist();

    const handleWishlistUpdated = () => {
      loadWishlist(true);
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdated);
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdated);
    };
  }, [loadWishlist]);

  /**
   * Kiểm tra xem một sản phẩm đã có trong danh sách yêu thích hay chưa
   * @param medicineId Mã định danh thuốc
   */
  const isInWishlist = useCallback(
    (medicineId: string): boolean => {
      if (!medicineId) return false;
      return items.some((it) => (it.id || it._id) === medicineId);
    },
    [items]
  );

  /**
   * Thêm sản phẩm vào danh sách yêu thích (Optimistic UI)
   * @param med Thông tin sản phẩm thuốc
   */
  const addToWishlist = async (med: any) => {
    const medId = med.id || med._id || med.medicineId;
    if (!medId) return { success: false, error: 'Thiếu ID sản phẩm' };

    if (isInWishlist(medId)) {
      return { success: true, message: 'Sản phẩm đã có trong danh sách' };
    }

    // Optimistic UI: Thêm ngay vào state
    const previousItems = [...items];
    const newItem: WishlistItem = {
      id: medId,
      _id: medId,
      name: med.name || 'Sản phẩm',
      active_ingredient: med.active_ingredient || '',
      category: med.category || 'Dược phẩm',
      unit: med.unit || 'Hộp',
      image: med.image || '',
      price: med.price || 0,
      stock: med.stock !== undefined ? med.stock : 999,
      dosage_form: med.dosage_form || '',
      addedAt: new Date(),
    };
    setItems((prev) => [newItem, ...prev]);

    try {
      setSubmitting(true);
      const res = await wishlistService.addToWishlist(med);
      return { success: true, data: res };
    } catch (err: any) {
      // Rollback nếu thất bại
      setItems(previousItems);
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi thêm vào yêu thích';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Xóa sản phẩm khỏi danh sách yêu thích (Optimistic UI)
   * @param medicineId ID sản phẩm cần xóa
   */
  const removeFromWishlist = async (medicineId: string) => {
    const previousItems = [...items];
    setItems((prev) => prev.filter((it) => (it.id || it._id) !== medicineId));

    try {
      setSubmitting(true);
      await wishlistService.removeFromWishlist(medicineId);
      return { success: true };
    } catch (err: any) {
      // Rollback nếu thất bại
      setItems(previousItems);
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi xóa khỏi yêu thích';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Đảo ngược trạng thái yêu thích của sản phẩm (Bật / Tắt ❤️)
   * @param med Đối tượng sản phẩm
   */
  const toggleWishlist = async (med: any) => {
    const medId = med.id || med._id || med.medicineId;
    if (isInWishlist(medId)) {
      return await removeFromWishlist(medId);
    } else {
      return await addToWishlist(med);
    }
  };

  /**
   * Dọn sạch toàn bộ danh sách yêu thích
   */
  const clearWishlist = async () => {
    const previousItems = [...items];
    setItems([]);

    try {
      setSubmitting(true);
      await wishlistService.clearWishlist();
      return { success: true };
    } catch (err: any) {
      setItems(previousItems);
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi làm trống danh sách';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    items,
    totalCount: items.length,
    loading,
    submitting,
    error,
    refresh: loadWishlist,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
  };
}
