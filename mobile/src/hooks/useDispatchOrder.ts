/**
 * useDispatchOrder.ts - Custom Hook (Tier 2) quản lý vòng đời chi tiết 1 Phiếu Xuất Kho trên Mobile.
 * Xử lý:
 * - Tải phiếu xuất & danh sách Tote khả dụng.
 * - Optimistic UI khi nhận HTTP 202 Accepted + Delayed Re-fetch (650ms) + Socket.IO đồng bộ realtime.
 * - Rollback + In-app CustomToast khi nhận sự kiện dispatch_action_rejected từ Microservice.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { DispatchOrder, ToteItem } from '../types/pharmacy.types';
import { DispatchMobileService } from '../services/inventory/dispatch.service';
import { SocketService } from '../services/socket.service';

export interface AsyncMutationFeedback {
  type: 'info' | 'success' | 'error';
  message: string;
}

export function useDispatchOrder(
  orderId: string | undefined,
  onFeedback?: (fb: AsyncMutationFeedback) => void,
) {
  const [order, setOrder] = useState<DispatchOrder | null>(null);
  const [totes, setTotes] = useState<ToteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const [detail, toteList] = await Promise.all([
        DispatchMobileService.getDispatchOrderById(orderId),
        DispatchMobileService.getTotes().catch(() => [] as ToteItem[]),
      ]);
      setOrder(detail);
      setTotes(toteList);
    } catch (err: any) {
      setError(err?.message || 'Không tải được chi tiết phiếu xuất kho.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, [loadOrder]);

  // Lắng nghe sự kiện Socket.IO để cập nhật ngay khi Kafka consumer xử lý xong hoặc báo lỗi
  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = SocketService.subscribe((notif: any) => {
      if (!notif) return;
      const targetId = notif.dispatchOrderId || notif.order?._id;
      if (targetId && targetId !== orderId) return;

      if (notif.type === 'DISPATCH_ACTION_REJECTED') {
        onFeedback?.({
          type: 'error',
          message: notif.reason || 'Thao tác xuất kho không thành công.',
        });
        void loadOrder();
        return;
      }

      if (
        ['DISPATCH_UPDATED', 'DISPATCH_APPROVED', 'DISPATCH_COMPLETED'].includes(notif.type)
      ) {
        if (notif.order) {
          setOrder(notif.order);
        } else {
          void loadOrder();
        }
      }
    });
    return unsubscribe;
  }, [orderId, loadOrder, onFeedback]);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      void loadOrder();
    }, 650);
  }, [loadOrder]);

  const pickItem = useCallback(
    async (
      body: Parameters<typeof DispatchMobileService.pickItem>[1],
      optimisticApply?: (prev: DispatchOrder) => DispatchOrder,
    ) => {
      if (!orderId) return false;
      try {
        setSubmitting(true);
        if (optimisticApply) {
          setOrder((prev) => (prev ? optimisticApply(prev) : prev));
        }
        await DispatchMobileService.pickItem(orderId, body);
        scheduleRefetch();
        return true;
      } catch (err: any) {
        onFeedback?.({ type: 'error', message: err?.message || 'Lỗi khi gửi lệnh nhặt hàng.' });
        void loadOrder();
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [orderId, scheduleRefetch, loadOrder, onFeedback],
  );

  const returnItem = useCallback(
    async (body: Parameters<typeof DispatchMobileService.returnItem>[1]) => {
      if (!orderId) return false;
      try {
        setSubmitting(true);
        await DispatchMobileService.returnItem(orderId, body);
        scheduleRefetch();
        onFeedback?.({ type: 'success', message: 'Đã ghi nhận trả hàng về khay / xử lý hỏng.' });
        return true;
      } catch (err: any) {
        onFeedback?.({ type: 'error', message: err?.message || 'Không thể trả hàng.' });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [orderId, scheduleRefetch, onFeedback],
  );

  const markShortage = useCallback(
    async (lineId: string, reason?: string) => {
      if (!orderId) return false;
      try {
        setSubmitting(true);
        await DispatchMobileService.markShortage(orderId, { lineId, reason });
        scheduleRefetch();
        onFeedback?.({ type: 'info', message: 'Đã ghi nhận thiếu hàng & tạo đề xuất bổ sung.' });
        return true;
      } catch (err: any) {
        onFeedback?.({ type: 'error', message: err?.message || 'Không thể báo thiếu hàng.' });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [orderId, scheduleRefetch, onFeedback],
  );

  const stageOrder = useCallback(
    async (toteCode: string) => {
      if (!orderId) return false;
      try {
        setSubmitting(true);
        await DispatchMobileService.stageDispatchOrder(orderId, toteCode);
        scheduleRefetch();
        onFeedback?.({ type: 'success', message: `Đã tập kết giỏ ${toteCode} tại khu bàn giao.` });
        return true;
      } catch (err: any) {
        onFeedback?.({ type: 'error', message: err?.message || 'Lỗi khi tập kết giỏ.' });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [orderId, scheduleRefetch, onFeedback],
  );

  const confirmDispatch = useCallback(
    async (handoverRecipient: { driverName: string; vehiclePlate?: string; carrierNote?: string }) => {
      if (!orderId) return false;
      try {
        setSubmitting(true);
        await DispatchMobileService.confirmDispatch(orderId, handoverRecipient);
        scheduleRefetch();
        onFeedback?.({ type: 'success', message: 'Đã gửi lệnh xác nhận xuất kho thật.' });
        return true;
      } catch (err: any) {
        onFeedback?.({ type: 'error', message: err?.message || 'Lỗi khi xác nhận xuất kho.' });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [orderId, scheduleRefetch, onFeedback],
  );

  return {
    order,
    totes,
    loading,
    submitting,
    error,
    reload: loadOrder,
    pickItem,
    returnItem,
    markShortage,
    stageOrder,
    confirmDispatch,
  };
}
