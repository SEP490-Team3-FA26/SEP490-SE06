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
  }
};
