import api from '../core/api';

export const inventoryMapService = {
  getWarehouseMap: async () => {
    const response = await api.get('/api/medicines/warehouse-map');
    return response.data;
  },
  
  getShelfDetail: async (zone: string, rack: string, shelf: number) => {
    const response = await api.get(`/api/medicines/shelf-detail?zone=${zone}&rack=${rack}&shelf=${shelf}`);
    return response.data;
  },

  syncLocations: async () => {
    const response = await api.post('/api/medicines/sync-locations');
    return response.data;
  }
};
