import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export const userService = {
  getLoyalty: async () => {
    const response = await api.get(API_ENDPOINTS.USERS.LOYALTY);
    return response.data;
  },

  getLoyaltyInfo: async () => {
    const response = await api.get(API_ENDPOINTS.USERS.LOYALTY);
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put(API_ENDPOINTS.USERS.PROFILE, data);
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, { oldPassword, newPassword });
    return response.data;
  },
};
