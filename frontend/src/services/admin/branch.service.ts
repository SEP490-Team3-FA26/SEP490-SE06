import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface BranchData {
  name: string;
  address: string;
  phone: string;
}

export const branchService = {
  async getBranches() {
    const response = await api.get(API_ENDPOINTS.BRANCHES.LIST);
    return response.data;
  },

  async createBranch(data: BranchData) {
    const response = await api.post(API_ENDPOINTS.BRANCHES.CREATE, data);
    return response.data;
  },

  async updateBranch(id: string, data: Partial<BranchData>) {
    const response = await api.put(API_ENDPOINTS.BRANCHES.UPDATE(id), data);
    return response.data;
  },

  async deleteBranch(id: string) {
    const response = await api.delete(API_ENDPOINTS.BRANCHES.DELETE(id));
    return response.data;
  }
};
