import { useState, useEffect, useCallback } from 'react';
import {
  reconciliationService,
  PaymentReconciliationRecord,
  ReconciliationSummary,
} from '../services/sales/reconciliation.service';

export function usePaymentReconciliation(branchId?: string) {
  const [discrepancies, setDiscrepancies] = useState<PaymentReconciliationRecord[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary>({
    totalRecords: 0,
    totalExpected: 0,
    totalActual: 0,
    difference: 0,
    matchRate: 100,
    breakdown: {
      matched: 0,
      underpaidTolerance: 0,
      underpaidBlocked: 0,
      overpaidCredited: 0,
      manualOverride: 0,
      orphan: 0,
    },
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [resolving, setResolving] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [discRes, sumRes] = await Promise.all([
        reconciliationService.getDiscrepancies({
          branchId: branchId || undefined,
          status: filterStatus || undefined,
          page,
          limit: 15,
        }),
        reconciliationService.getSummary({
          branchId: branchId || undefined,
        }),
      ]);

      if (discRes) {
        setDiscrepancies(discRes.items || []);
        setTotalPages(discRes.totalPages || 1);
      }
      if (sumRes) {
        setSummary(sumRes);
      }
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu đối soát thanh toán:', err);
    } finally {
      setLoading(false);
    }
  }, [branchId, filterStatus, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resolveDiscrepancy = useCallback(
    async (id: string, notes: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setResolving(true);
        await reconciliationService.resolveDiscrepancy(id, {
          resolutionNotes: notes,
        });
        await loadData();
        return { success: true };
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Lỗi khi xử lý biên bản đối soát';
        return { success: false, error: msg };
      } finally {
        setResolving(false);
      }
    },
    [loadData]
  );

  return {
    discrepancies,
    summary,
    loading,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    totalPages,
    resolving,
    refresh: loadData,
    resolveDiscrepancy,
  };
}
