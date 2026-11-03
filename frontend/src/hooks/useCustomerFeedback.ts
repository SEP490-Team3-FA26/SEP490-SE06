import { useState, useEffect, useCallback } from 'react';
import {
  feedbackService,
  FeedbackSubmissionResponse,
} from '../services/sales/feedback.service';

export function useCustomerFeedback(orderCode: string) {
  const [loadingOrder, setLoadingOrder] = useState<boolean>(true);
  const [orderData, setOrderData] = useState<any>(null);

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Result states
  const [submittedResult, setSubmittedResult] = useState<FeedbackSubmissionResponse | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 1. Tải thông tin đơn hàng từ mã QR
  useEffect(() => {
    if (!orderCode) {
      setLoadingOrder(false);
      return;
    }

    let isMounted = true;
    const fetchOrder = async () => {
      try {
        setLoadingOrder(true);
        const data = await feedbackService.lookupOrder(orderCode);
        if (!isMounted) return;
        setOrderData(data);
        if (data.customerPhone) setPhone(data.customerPhone);
        if (data.customerName) setCustomerName(data.customerName);
      } catch (err: any) {
        console.warn('Lỗi tra cứu đơn hàng:', err);
      } finally {
        if (isMounted) setLoadingOrder(false);
      }
    };

    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [orderCode]);

  // 2. Chuyển đổi nhãn đánh giá
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // 3. Sao chép mã voucher
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  }, []);

  // 4. Gửi đánh giá dịch vụ
  const submitFeedback = useCallback(async (): Promise<{ success: boolean; data?: FeedbackSubmissionResponse; error?: string }> => {
    setErrorMsg('');

    if (!phone.trim()) {
      const err = 'Vui lòng nhập Số điện thoại để hệ thống cộng điểm thưởng và gửi mã giảm giá cho bạn.';
      setErrorMsg(err);
      return { success: false, error: err };
    }

    if (!orderCode) {
      const err = 'Thiếu mã hóa đơn. Vui lòng quét lại mã QR trên hóa đơn của bạn.';
      setErrorMsg(err);
      return { success: false, error: err };
    }

    try {
      setSubmitting(true);
      const res = await feedbackService.submitFeedback({
        orderCode,
        branchId: orderData?.branchId || 'BR-001',
        branchName: orderData?.branchName || 'Chi nhánh ABC Pharmacy',
        customerPhone: phone.trim(),
        customerName: customerName.trim(),
        rating,
        tags: selectedTags,
        comment: comment.trim(),
      });

      setSubmittedResult(res);

      // Lưu trạng thái đã đánh giá vào localStorage theo orderCode
      try {
        const reviewedOrders = JSON.parse(localStorage.getItem('reviewed_orders') || '[]');
        if (!reviewedOrders.includes(orderCode)) {
          reviewedOrders.push(orderCode);
          localStorage.setItem('reviewed_orders', JSON.stringify(reviewedOrders));
        }
        window.dispatchEvent(new Event('orderReviewed'));
      } catch (e) {
        console.warn('Lỗi lưu reviewed_orders:', e);
      }

      // Kích hoạt cập nhật điểm thành viên trên header
      window.dispatchEvent(new Event('loyaltyUpdated'));

      return { success: true, data: res };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại sau.';
      setErrorMsg(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, [phone, orderCode, orderData, rating, selectedTags, comment, customerName]);

  return {
    loadingOrder,
    orderData,
    rating,
    setRating,
    selectedTags,
    toggleTag,
    comment,
    setComment,
    phone,
    setPhone,
    customerName,
    setCustomerName,
    submitting,
    submittedResult,
    copiedVoucher,
    errorMsg,
    handleCopyCode,
    submitFeedback,
  };
}
