import { useState, useCallback, useEffect } from 'react';
import { rfmService, CustomerRFMSegment, RFMOverview } from '../services/sales/rfm.service';

export function useCustomerRFM(activeBranchId?: string) {
  const [overview, setOverview] = useState<RFMOverview | null>(null);
  const [atRiskList, setAtRiskList] = useState<CustomerRFMSegment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State tra cứu khách hàng tại POS
  const [currentCustomerSegment, setCurrentCustomerSegment] = useState<CustomerRFMSegment | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  // Tải dữ liệu tổng quan
  const loadOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, atRiskData] = await Promise.all([
        rfmService.getOverview(activeBranchId),
        rfmService.getAtRiskCustomers({ branchId: activeBranchId, limit: 20 }),
      ]);
      setOverview(overviewData);
      setAtRiskList(Array.isArray(atRiskData) ? atRiskData : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi tải dữ liệu phân khúc RFM');
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  // Tra cứu phân khúc của 1 khách hàng cụ thể theo SĐT (dùng cho POS)
  const lookupCustomerSegment = async (phone: string): Promise<CustomerRFMSegment | null> => {
    if (!phone || phone.trim().length < 8) {
      setCurrentCustomerSegment(null);
      return null;
    }
    try {
      setLookupLoading(true);
      const data = await rfmService.getCustomerSegment(phone.trim());
      setCurrentCustomerSegment(data);
      return data;
    } catch (err) {
      // Khách mới hoặc chưa có lịch sử mua đủ để phân cụm
      setCurrentCustomerSegment(null);
      return null;
    } finally {
      setLookupLoading(false);
    }
  };

  // Kích hoạt tính toán lại toàn bộ phân cụm
  const recalculateRFM = async () => {
    try {
      setCalculating(true);
      const res = await rfmService.triggerRecalculate();
      setTimeout(() => {
        loadOverviewData();
      }, 1500);
      return { success: true, message: res.message };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || err.message || 'Không thể kích hoạt tính toán RFM',
      };
    } finally {
      setCalculating(false);
    }
  };

  const clearCustomerSegment = () => {
    setCurrentCustomerSegment(null);
  };

  return {
    overview,
    atRiskList,
    loading,
    calculating,
    error,
    currentCustomerSegment,
    lookupLoading,
    lookupCustomerSegment,
    clearCustomerSegment,
    recalculateRFM,
    refreshOverview: loadOverviewData,
  };
}
