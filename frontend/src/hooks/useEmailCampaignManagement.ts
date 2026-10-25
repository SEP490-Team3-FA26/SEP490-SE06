import { useState, useEffect, useCallback } from 'react';
import {
  emailCampaignService,
  EmailCampaignData,
  CampaignStatsData,
} from '../services/sales/emailCampaign.service';

// ===================================================================
// Custom Hook quản lý toàn bộ state Email Campaign
// Theo pattern 3-tier: Service → Hook → UI Component
// ===================================================================
export function useEmailCampaignManagement() {
  const [campaigns, setCampaigns] = useState<EmailCampaignData[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaignData | null>(null);
  const [stats, setStats] = useState<CampaignStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // Tải danh sách chiến dịch (có thể lọc theo status)
  // -------------------------------------------------------------------
  const loadCampaigns = useCallback(async (status?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await emailCampaignService.getCampaigns(status ? { status } : undefined);
      setCampaigns(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Lỗi khi tải danh sách chiến dịch email',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Tự động tải khi mount
  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // -------------------------------------------------------------------
  // Tạo chiến dịch email mới
  // -------------------------------------------------------------------
  const createCampaign = async (
    data: Omit<EmailCampaignData, '_id' | 'status' | 'stats' | 'createdAt'>,
  ): Promise<{ success: boolean; data?: EmailCampaignData; error?: string }> => {
    try {
      setSubmitting(true);
      let created: any = await emailCampaignService.createCampaign(data);

      // Nếu response trả về chuỗi JSON, parse an toàn
      if (typeof created === 'string') {
        try {
          created = JSON.parse(created);
        } catch {
          // Trích xuất ID bằng regex nếu chuỗi bị dính Object string
          const idMatch = created.match(/'?_id'?:\s*(?:new ObjectId\(')?([a-f0-9]{24})'?/i);
          if (idMatch && idMatch[1]) {
            created = { _id: idMatch[1] };
          }
        }
      }

      const finalData: any = created?.data || created;
      // Đợi 500ms để đảm bảo DB đã lưu xong trước khi re-fetch
      setTimeout(() => loadCampaigns(), 500);
      return { success: true, data: finalData };
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Lỗi khi tạo chiến dịch email';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------
  // Cập nhật thông tin chiến dịch email
  // -------------------------------------------------------------------
  const updateCampaign = async (
    id: string,
    data: Partial<EmailCampaignData>,
  ): Promise<{ success: boolean; data?: EmailCampaignData; error?: string }> => {
    try {
      setSubmitting(true);
      let updated: any = await emailCampaignService.updateCampaign(id, data);
      if (typeof updated === 'string') {
        try {
          updated = JSON.parse(updated);
        } catch {}
      }
      const finalData: any = updated?.data || updated;
      setTimeout(() => loadCampaigns(), 500);
      return { success: true, data: finalData };
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Lỗi khi cập nhật chiến dịch email';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------
  // Kích hoạt gửi ngay hoặc Retry chiến dịch (Kafka Event — 202 Async)
  // Sau khi emit, đợi 1s để Kafka Consumer xử lý rồi re-fetch
  // -------------------------------------------------------------------
  const triggerCampaign = async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setSubmitting(true);
      await emailCampaignService.triggerCampaign(id);
      // Đợi 1 giây để Kafka Event được xử lý (chuyển status PROCESSING)
      setTimeout(() => loadCampaigns(), 1000);
      return { success: true };
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Lỗi khi kích hoạt gửi chiến dịch';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------
  // Gửi email thử nghiệm cho Admin preview giao diện
  // -------------------------------------------------------------------
  const sendTestEmail = async (
    id: string,
    testEmail: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      setSubmitting(true);
      const result = await emailCampaignService.sendTestEmail(id, testEmail);
      return { success: true, messageId: result.messageId };
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Lỗi khi gửi email thử nghiệm';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------
  // Tải thống kê tiến độ gửi real-time của 1 chiến dịch
  // -------------------------------------------------------------------
  const loadCampaignStats = async (id: string) => {
    try {
      setStatsLoading(true);
      const data = await emailCampaignService.getCampaignStats(id);
      setStats(data);
    } catch (err: any) {
      console.error('Lỗi tải thống kê:', err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // Tải chi tiết 1 chiến dịch
  // -------------------------------------------------------------------
  const loadCampaignDetail = async (id: string) => {
    try {
      setLoading(true);
      const data = await emailCampaignService.getCampaignById(id);
      setSelectedCampaign(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // Hủy lịch gửi chiến dịch (SCHEDULED -> CANCELLED)
  // -------------------------------------------------------------------
  const cancelCampaign = async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setSubmitting(true);
      await emailCampaignService.cancelCampaign(id);
      setTimeout(() => loadCampaigns(), 500);
      return { success: true };
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Lỗi khi hủy lịch gửi chiến dịch';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------
  // Xóa chiến dịch vĩnh viễn (Optimistic UI)
  // -------------------------------------------------------------------
  const deleteCampaign = async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const prevList = [...campaigns];
    // Xóa tạm trên UI cho phản hồi tức thì
    setCampaigns((prev) => prev.filter((c) => c._id !== id));
    try {
      setSubmitting(true);
      await emailCampaignService.deleteCampaign(id);
      setTimeout(() => loadCampaigns(), 500);
      return { success: true };
    } catch (err: any) {
      setCampaigns(prevList); // Khôi phục danh sách cũ nếu lỗi
      const msg =
        err.response?.data?.message || err.message || 'Lỗi khi xóa chiến dịch';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // State
    campaigns,
    selectedCampaign,
    stats,
    loading,
    submitting,
    statsLoading,
    error,
    // Actions
    refresh: loadCampaigns,
    createCampaign,
    updateCampaign,
    triggerCampaign,
    cancelCampaign,
    deleteCampaign,
    sendTestEmail,
    loadCampaignStats,
    loadCampaignDetail,
    setSelectedCampaign,
  };
}
