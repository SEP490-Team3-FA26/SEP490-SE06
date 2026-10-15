import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export const cartService = {
  async getCart() {
    const response = await api.get(API_ENDPOINTS.USERS.CART);
    return response.data;
  },

  async addToCart(medicineId: string, quantity: number) {
    const response = await api.post(API_ENDPOINTS.USERS.CART, { medicineId, quantity });
    return response.data;
  },

  async updateCartItem(id: string, quantity: number) {
    const response = await api.put(API_ENDPOINTS.USERS.CART_ITEM(id), { quantity });
    return response.data;
  },

  async deleteCartItem(id: string) {
    const response = await api.delete(API_ENDPOINTS.USERS.CART_ITEM(id));
    return response.data;
  },

  async clearCart() {
    const response = await api.post(API_ENDPOINTS.USERS.CART_CLEAR);
    return response.data;
  },

  // Thêm sản phẩm vào giỏ hàng của khách (guest_cart trong localStorage) khi chưa đăng nhập
  addGuestItem(med: any, quantity: number = 1) {
    try {
      const medId = med.id || med._id || med.medicineId;
      const guestCartStr = localStorage.getItem("guest_cart");
      const guestCart = guestCartStr ? JSON.parse(guestCartStr) : [];
      const existingIndex = guestCart.findIndex((item: any) => (item.id || item._id || item.medicineId) === medId);
      if (existingIndex > -1) {
        guestCart[existingIndex].quantity = (Number(guestCart[existingIndex].quantity) || 1) + quantity;
      } else {
        guestCart.push({
          id: medId,
          _id: medId,
          medicineId: medId,
          name: med.name,
          price: med.price || 0,
          unit: med.unit || "Hộp",
          category: med.category || "Dược phẩm",
          image: med.image || "",
          stock: med.stock ?? 999,
          active_ingredient: med.active_ingredient || "",
          quantity,
        });
      }
      localStorage.setItem("guest_cart", JSON.stringify(guestCart));
      window.dispatchEvent(new Event("cartUpdated"));
      return true;
    } catch (err) {
      console.error("Lỗi khi thêm vào giỏ hàng khách:", err);
      return false;
    }
  },

  // Phương thức hợp nhất: Tự động lưu giỏ hàng khách nếu chưa đăng nhập, hoặc gọi API nếu đã đăng nhập
  async addProduct(med: any, quantity: number = 1) {
    const token = localStorage.getItem("token");
    if (!token) {
      return this.addGuestItem(med, quantity);
    }
    const medId = med.id || med._id || med.medicineId;
    const res = await this.addToCart(medId, quantity);
    window.dispatchEvent(new Event("cartUpdated"));
    return res;
  }
};
