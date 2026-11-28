import { useCallback, useEffect, useRef, useState } from 'react';
import { dispatchOrderService, DispatchOrder, ToteItem } from '../services/inventory/dispatchOrder.service';
import { useSocket } from './useSocket';

/**
 * Tầng Custom Hook (Tier 2) quản lý danh sách Phiếu Xuất Kho Tổng & Tote trên Web React.
 * Tự động lắng nghe SSE realtime và hỗ trợ Delayed Re-fetch 700ms sau HTTP 202 Accepted.
 */
export function useDispatchOrders(initialStatus = 'ALL') {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [totes, setTotes] = useState<ToteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [asyncErrorBanner, setAsyncErrorBanner] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { onEvent, offEvent } = useSocket();

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderData, toteData] = await Promise.all([
        dispatchOrderService.listOrders({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: search.trim() || undefined,
        }),
        dispatchOrderService.listTotes().catch(() => [] as ToteItem[]),
      ]);
      setOrders(orderData);
      setTotes(toteData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách phiếu xuất kho.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void fetchAll();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchAll]);

  useEffect(() => {
    const onRefresh = () => void fetchAll();
    const onRejected = (payload: any) => {
      setAsyncErrorBanner(payload?.reason || 'Thao tác xuất kho không thành công.');
      void fetchAll();
    };

    const refreshEvents = [
      'dispatch_order_created',
      'dispatch_order_approved',
      'dispatch_order_updated',
      'dispatch_order_dispatched',
      'dispatch_order_stale_alert',
    ];
    refreshEvents.forEach((ev) => onEvent(ev, onRefresh));
    onEvent('dispatch_action_rejected', onRejected);

    return () => {
      refreshEvents.forEach((ev) => offEvent(ev, onRefresh));
      offEvent('dispatch_action_rejected', onRejected);
    };
  }, [fetchAll, onEvent, offEvent]);

  const scheduleRefetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void fetchAll();
    }, 700);
  }, [fetchAll]);

  const createOrder = async (payload: Parameters<typeof dispatchOrderService.createOrder>[0]) => {
    setSubmitting(true);
    setAsyncErrorBanner(null);
    try {
      const res = await dispatchOrderService.createOrderSync(payload);
      await fetchAll();
      return res;
    } finally {
      setSubmitting(false);
    }
  };

  const approveOrder = async (id: string, note?: string) => {
    setSubmitting(true);
    setAsyncErrorBanner(null);
    try {
      const res = await dispatchOrderService.approveOrder(id, note);
      // Optimistic removal khi đang lọc PENDING_APPROVAL
      if (statusFilter === 'PENDING_APPROVAL') {
        setOrders((prev) => prev.filter((o) => o._id !== id));
      }
      scheduleRefetch();
      return res;
    } finally {
      setSubmitting(false);
    }
  };

  const rejectOrder = async (id: string, reason: string) => {
    setSubmitting(true);
    setAsyncErrorBanner(null);
    try {
      const res = await dispatchOrderService.rejectOrder(id, reason);
      if (statusFilter === 'PENDING_APPROVAL') {
        setOrders((prev) => prev.filter((o) => o._id !== id));
      }
      scheduleRefetch();
      return res;
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (id: string, reason?: string) => {
    setSubmitting(true);
    setAsyncErrorBanner(null);
    try {
      const res = await dispatchOrderService.cancelOrder(id, reason);
      scheduleRefetch();
      return res;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    orders,
    totes,
    loading,
    submitting,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    error,
    asyncErrorBanner,
    setAsyncErrorBanner,
    reload: fetchAll,
    createOrder,
    approveOrder,
    rejectOrder,
    cancelOrder,
  };
}
