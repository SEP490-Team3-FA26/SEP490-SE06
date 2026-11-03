import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

/**
 * Kiểu dữ liệu một mục sản phẩm trong danh sách yêu thích
 */
export interface WishlistItem {
  id: string;
  _id?: string;
  name: string;
  active_ingredient?: string;
  category?: string;
  unit?: string;
  image?: string;
  price: number;
  stock?: number;
  dosage_form?: string;
  registration_number?: string;
  description?: string;
  prescription_required?: boolean;
  addedAt?: string | Date;
}

/**
 * Cấu trúc phản hồi từ máy chủ khi truy vấn danh sách yêu thích
 */
export interface WishlistResponse {
  items: WishlistItem[];
  totalCount: number;
}

/**
 * Service quản lý danh sách sản phẩm yêu thích (Wishlist)
 * Hỗ trợ đồng bộ cả người dùng đã đăng nhập (API Gateway -> Kafka -> DB)
 * và khách vãng lai chưa đăng nhập (localStorage "guest_wishlist")
 */
export const wishlistService = {
  /**
   * Lấy danh sách sản phẩm yêu thích hiện tại
   */
  async getWishlist(): Promise<WishlistResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
      try {
        const guestStr = localStorage.getItem('guest_wishlist');
        const items: WishlistItem[] = guestStr ? JSON.parse(guestStr) : [];
        return { items, totalCount: items.length };
      } catch (e) {
        console.error('Lỗi khi đọc guest_wishlist từ localStorage:', e);
        return { items: [], totalCount: 0 };
      }
    }

    try {
      const response = await api.get(API_ENDPOINTS.USERS.WISHLIST);
      return response.data;
    } catch (err) {
      console.error('Lỗi khi gọi API lấy wishlist:', err);
      throw err;
    }
  },

  /**
   * Thêm sản phẩm vào danh sách yêu thích
   * @param med Đối tượng sản phẩm thuốc hoặc ID thuốc
   */
  async addToWishlist(med: any) {
    const medId = typeof med === 'string' ? med : (med.id || med._id || med.medicineId);
    const token = localStorage.getItem('token');

    if (!token) {
      // Lưu vào localStorage cho khách chưa đăng nhập
      try {
        const guestStr = localStorage.getItem('guest_wishlist');
        const items: WishlistItem[] = guestStr ? JSON.parse(guestStr) : [];
        const exists = items.some((item) => (item.id || item._id) === medId);

        if (!exists) {
          items.push({
            id: medId,
            _id: medId,
            name: med.name || 'Sản phẩm thuốc',
            active_ingredient: med.active_ingredient || '',
            category: med.category || 'Dược phẩm',
            unit: med.unit || 'Hộp',
            image: med.image || '',
            price: med.price || 0,
            stock: med.stock !== undefined ? med.stock : 999,
            dosage_form: med.dosage_form || '',
            addedAt: new Date(),
          });
          localStorage.setItem('guest_wishlist', JSON.stringify(items));
        }
        window.dispatchEvent(new Event('wishlistUpdated'));
        return { success: true, message: 'Đã thêm vào danh sách yêu thích', totalCount: items.length };
      } catch (e) {
        console.error('Lỗi khi thêm vào guest_wishlist:', e);
        return { success: false, message: 'Lỗi bộ nhớ cục bộ' };
      }
    }

    // Đã đăng nhập: Gửi request đến API Gateway
    const response = await api.post(API_ENDPOINTS.USERS.WISHLIST, { medicineId: medId });
    window.dispatchEvent(new Event('wishlistUpdated'));
    return response.data;
  },

  /**
   * Xóa sản phẩm khỏi danh sách yêu thích
   * @param medicineId Mã định danh thuốc
   */
  async removeFromWishlist(medicineId: string) {
    const token = localStorage.getItem('token');

    if (!token) {
      try {
        const guestStr = localStorage.getItem('guest_wishlist');
        let items: WishlistItem[] = guestStr ? JSON.parse(guestStr) : [];
        items = items.filter((item) => (item.id || item._id) !== medicineId);
        localStorage.setItem('guest_wishlist', JSON.stringify(items));
        window.dispatchEvent(new Event('wishlistUpdated'));
        return { success: true, message: 'Đã xóa khỏi danh sách yêu thích', totalCount: items.length };
      } catch (e) {
        console.error('Lỗi khi xóa khỏi guest_wishlist:', e);
        return { success: false, message: 'Lỗi bộ nhớ cục bộ' };
      }
    }

    const response = await api.delete(API_ENDPOINTS.USERS.WISHLIST_ITEM(medicineId));
    window.dispatchEvent(new Event('wishlistUpdated'));
    return response.data;
  },

  /**
   * Dọn sạch toàn bộ danh sách yêu thích
   */
  async clearWishlist() {
    const token = localStorage.getItem('token');
    localStorage.removeItem('guest_wishlist');

    if (token) {
      try {
        const response = await api.post(API_ENDPOINTS.USERS.WISHLIST_CLEAR);
        window.dispatchEvent(new Event('wishlistUpdated'));
        return response.data;
      } catch (e) {
        console.error('Lỗi khi dọn sạch wishlist qua API:', e);
      }
    }

    window.dispatchEvent(new Event('wishlistUpdated'));
    return { success: true, message: 'Đã dọn sạch danh sách yêu thích' };
  },

  /**
   * Đồng bộ danh sách yêu thích tạm thời của khách khi đăng nhập vào hệ thống
   */
  async syncGuestWishlist() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const guestStr = localStorage.getItem('guest_wishlist');
      if (!guestStr) return;
      const items: WishlistItem[] = JSON.parse(guestStr);
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const medId = item.id || item._id;
          if (medId) {
            await api.post(API_ENDPOINTS.USERS.WISHLIST, { medicineId: medId }).catch(() => {});
          }
        }
        localStorage.removeItem('guest_wishlist');
        window.dispatchEvent(new Event('wishlistUpdated'));
      }
    } catch (e) {
      console.error('Lỗi khi đồng bộ guest_wishlist:', e);
    }
  },
};
