import { useState, useEffect, useCallback } from 'react';
import { voucherService, VoucherPayload } from '../services/sales/voucher.service';

/**
 * Custom Hook quản lý Voucher và quy tắc khuyến mãi điều kiện (UC-75: Mua X tặng Y, Combo)
 * Tuân thủ chuẩn 3-Tier Architecture trong Playbook v2.0
 */
export function useVoucherManagement() {
  const [vouchers, setVouchers] = useState<VoucherPayload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Tải danh sách voucher từ API Gateway
  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await voucherService.getVouchers();
      setVouchers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể tải danh sách voucher.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Lưu voucher (Tạo mới hoặc Cập nhật) với độ trễ re-fetch bảo đảm Kafka & Redis đồng bộ
  const saveVoucher = async (payload: VoucherPayload, id?: string) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      if (id) {
        await voucherService.updateVoucher(id, payload);
        setSuccessMsg('Cập nhật voucher thành công!');
      } else {
        // Nếu là quy tắc Mua X tặng Y hoặc Combo, gọi advanced-rules
        if (payload.ruleType === 'BUY_X_GET_Y' || payload.ruleType === 'COMBO') {
          await voucherService.createAdvancedRule(payload);
        } else {
          await voucherService.createVoucher(payload);
        }
        setSuccessMsg('Tạo voucher khuyến mãi mới thành công!');
      }

      // Re-fetch sau khi backend ghi nhận vào DB
      setTimeout(() => {
        fetchVouchers();
      }, 500);

      setTimeout(() => setSuccessMsg(null), 4000);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu voucher.';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // Bật/tắt trạng thái hoạt động với Optimistic UI
  const toggleActive = async (v: VoucherPayload) => {
    const vId = v._id;
    if (!vId || updatingIds.has(vId)) return;

    setUpdatingIds((prev) => new Set(prev).add(vId));
    const originalStatus = v.isActive;

    // Cập nhật Optimistic trên giao diện
    setVouchers((prev) =>
      prev.map((item) => (item._id === vId ? { ...item, isActive: !item.isActive } : item))
    );

    try {
      await voucherService.updateVoucher(vId, { isActive: !originalStatus });
    } catch (err: any) {
      // Rollback nếu thất bại
      setVouchers((prev) =>
        prev.map((item) => (item._id === vId ? { ...item, isActive: originalStatus } : item))
      );
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi thao tác trạng thái.');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(vId);
        return next;
      });
    }
  };

  // Vô hiệu hóa / Xóa voucher
  const deleteVoucher = async (id: string) => {
    try {
      await voucherService.deleteVoucher(id);
      setSuccessMsg('Vô hiệu hóa voucher thành công!');
      setTimeout(() => fetchVouchers(), 500);
      setTimeout(() => setSuccessMsg(null), 3000);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi xóa voucher.';
      setErrorMsg(msg);
      return { success: false, error: msg };
    }
  };

  return {
    vouchers,
    loading,
    submitting,
    errorMsg,
    successMsg,
    updatingIds,
    fetchVouchers,
    saveVoucher,
    toggleActive,
    deleteVoucher,
    setErrorMsg,
    setSuccessMsg,
  };
}
