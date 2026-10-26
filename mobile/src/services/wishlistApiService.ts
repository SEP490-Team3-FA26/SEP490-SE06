import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnvService } from './env.service';

/**
 * Kiểu dữ liệu một mục thuốc trong danh sách yêu thích trên Mobile
 */
export interface MobileWishlistItem {
  id: string;
  _id?: string;
  name: string;
  price: number;
  unit?: string;
  image?: string;
  active?: string;
  active_ingredient?: string;
  category?: string;
  stock?: number;
  isRx?: boolean;
  dosage_form?: string;
  addedAt?: string | Date;
}

export interface WishlistApiResponse {
  items: MobileWishlistItem[];
  totalCount: number;
}

/**
 * Service API quản lý danh sách sản phẩm yêu thích (Wishlist) cho ứng dụng Mobile
 * Hỗ trợ đồng bộ đa nguồn: Khách vãng lai (AsyncStorage) & Người dùng đã đăng nhập (API Gateway -> Kafka -> MongoDB)
 */
export const WishlistAPI = {
  /**
   * Lấy URL gốc của API Gateway
   */
  getBaseUrl(): string {
    return EnvService.getApiBaseUrl();
  },

  /**
   * Tạo tiêu đề HTTP Headers có chứa Bearer Token
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  /**
   * Lấy danh sách sản phẩm yêu thích hiện tại
   */
  async getWishlist(): Promise<WishlistApiResponse> {
    const token = await AsyncStorage.getItem('auth_token');

    // Nếu là khách vãng lai, đọc từ AsyncStorage
    if (!token) {
      try {
        const guestStr = await AsyncStorage.getItem('@guest_wishlist');
        const items: MobileWishlistItem[] = guestStr ? JSON.parse(guestStr) : [];
        return { items, totalCount: items.length };
      } catch (e) {
        console.warn('Lỗi khi đọc guest_wishlist từ AsyncStorage:', e);
        return { items: [], totalCount: 0 };
      }
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/api/users/wishlist`, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json?.items) ? json.items : [];
        return {
          items,
          totalCount: json?.totalCount || items.length,
        };
      }
    } catch (e) {
      console.warn('Lỗi khi tải wishlist từ API Gateway:', e);
    }
    return { items: [], totalCount: 0 };
  },

  /**
   * Thêm sản phẩm vào danh sách yêu thích
   * @param med Đối tượng thông tin thuốc
   */
  async addToWishlist(med: any): Promise<{ success: boolean; message?: string }> {
    const medId = med.id || med._id || med.medicineId;
    if (!medId) return { success: false, message: 'Thiếu ID sản phẩm' };

    const token = await AsyncStorage.getItem('auth_token');

    // Khách vãng lai: Lưu vào AsyncStorage
    if (!token) {
      try {
        const guestStr = await AsyncStorage.getItem('@guest_wishlist');
        const items: MobileWishlistItem[] = guestStr ? JSON.parse(guestStr) : [];
        const exists = items.some((it) => (it.id || it._id) === medId);
        if (!exists) {
          items.unshift({
            id: medId,
            _id: medId,
            name: med.name || 'Sản phẩm thuốc',
            price: med.price || 0,
            unit: med.unit || 'Hộp',
            image: med.image || '',
            active: med.active || med.active_ingredient || '',
            category: med.category || 'Dược phẩm',
            stock: med.stock !== undefined ? med.stock : 999,
            isRx: med.isRx || false,
            addedAt: new Date().toISOString(),
          });
          await AsyncStorage.setItem('@guest_wishlist', JSON.stringify(items));
        }
        return { success: true, message: 'Đã thêm vào danh sách yêu thích' };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }

    // Người dùng đã đăng nhập: Gọi API Gateway
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/api/users/wishlist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ medicineId: medId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: json.message || 'Đã thêm vào yêu thích thành công' };
      }
      return { success: false, message: json.message || 'Lỗi thêm yêu thích' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  /**
   * Xóa sản phẩm khỏi danh sách yêu thích
   * @param medicineId Mã định danh thuốc
   */
  async removeFromWishlist(medicineId: string): Promise<{ success: boolean; message?: string }> {
    const token = await AsyncStorage.getItem('auth_token');

    if (!token) {
      try {
        const guestStr = await AsyncStorage.getItem('@guest_wishlist');
        let items: MobileWishlistItem[] = guestStr ? JSON.parse(guestStr) : [];
        items = items.filter((it) => (it.id || it._id) !== medicineId);
        await AsyncStorage.setItem('@guest_wishlist', JSON.stringify(items));
        return { success: true, message: 'Đã xóa khỏi danh sách yêu thích' };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/api/users/wishlist/${encodeURIComponent(medicineId)}`, {
        method: 'DELETE',
        headers,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: json.message || 'Đã xóa khỏi yêu thích' };
      }
      return { success: false, message: json.message || 'Lỗi khi xóa khỏi yêu thích' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  /**
   * Dọn sạch toàn bộ danh sách yêu thích
   */
  async clearWishlist(): Promise<{ success: boolean }> {
    try {
      await AsyncStorage.removeItem('@guest_wishlist');
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const headers = await this.getAuthHeaders();
        await fetch(`${this.getBaseUrl()}/api/users/wishlist/clear`, {
          method: 'POST',
          headers,
        });
      }
      return { success: true };
    } catch (e) {
      console.warn('Lỗi khi dọn sạch wishlist:', e);
      return { success: false };
    }
  },

  /**
   * Tự động đồng bộ các sản phẩm đã lưu tạm thời của khách khi đăng nhập
   */
  async syncGuestWishlist(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const guestStr = await AsyncStorage.getItem('@guest_wishlist');
      if (!guestStr) return;

      const items: MobileWishlistItem[] = JSON.parse(guestStr);
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          const medId = it.id || it._id;
          if (medId) {
            await this.addToWishlist({ id: medId });
          }
        }
        await AsyncStorage.removeItem('@guest_wishlist');
      }
    } catch (e) {
      console.warn('Lỗi khi đồng bộ guest wishlist lên máy chủ:', e);
    }
  },
};
