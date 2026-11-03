import { useState, useEffect, useCallback } from 'react';
import {
  feedbackService,
  FeedbackData,
} from '../services/sales/feedback.service';

export interface BranchFeedbackStats {
  avgRating: number;
  totalFeedbacks: number;
  ratingBreakdown: Record<number, number>;
  unresolvedNegative: number;
}

export function useBranchFeedback(
  branchId: string,
  filterStatus?: string,
  filterRating?: string
) {
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<BranchFeedbackStats>({
    avgRating: 5.0,
    totalFeedbacks: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    unresolvedNegative: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Resolve Modal states
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);
  const [actionTaken, setActionTaken] = useState<string>('CALLED_CUSTOMER');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [customerSatisfied, setCustomerSatisfied] = useState<boolean>(true);
  const [resolving, setResolving] = useState<boolean>(false);

  // 1. Tải dữ liệu phản hồi & thống kê CSAT của chi nhánh
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await feedbackService.getBranchFeedbacks(branchId, {
        status: filterStatus || undefined,
        rating: filterRating ? Number(filterRating) : undefined,
      });

      if (res) {
        setFeedbacks(res.feedbacks || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh sách phản hồi chi nhánh:', err);
    } finally {
      setLoading(false);
    }
  }, [branchId, filterStatus, filterRating]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Mở modal xử lý khiếu nại
  const handleOpenResolveModal = useCallback((fb: FeedbackData) => {
    setSelectedFeedback(fb);
    setActionTaken('CALLED_CUSTOMER');
    setResolutionNotes('');
    setCustomerSatisfied(true);
  }, []);

  const handleCloseResolveModal = useCallback(() => {
    setSelectedFeedback(null);
  }, []);

  // 3. Xác nhận xử lý khiếu nại (1-2 sao)
  const handleConfirmResolve = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!selectedFeedback?._id) return { success: false, error: 'Không tìm thấy ID phản hồi' };
    if (!resolutionNotes.trim()) {
      return { success: false, error: 'Vui lòng nhập ghi chú biên bản giải quyết khiếu nại.' };
    }

    try {
      setResolving(true);
      await feedbackService.resolveFeedback(selectedFeedback._id, {
        actionTaken,
        notes: resolutionNotes.trim(),
        customerSatisfied,
      });

      setSelectedFeedback(null);
      await loadData();
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật giải quyết khiếu nại.';
      return { success: false, error: msg };
    } finally {
      setResolving(false);
    }
  }, [selectedFeedback, resolutionNotes, actionTaken, customerSatisfied, loadData]);

  return {
    feedbacks,
    stats,
    loading,
    refresh: loadData,
    // Modal states & controls
    selectedFeedback,
    actionTaken,
    setActionTaken,
    resolutionNotes,
    setResolutionNotes,
    customerSatisfied,
    setCustomerSatisfied,
    resolving,
    handleOpenResolveModal,
    handleCloseResolveModal,
    handleConfirmResolve,
  };
}
