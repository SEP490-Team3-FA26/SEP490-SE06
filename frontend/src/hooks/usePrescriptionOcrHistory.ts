import { useState, useEffect, useCallback } from 'react';
import {
  aiClinicalService,
  PrescriptionOcrLogItem,
  OcrHistoryQuery,
  PharmacistAdjustedItem,
} from '../services/ai/aiClinical.service';

export function usePrescriptionOcrHistory(initialBranch: string = 'BR-001') {
  const [logs, setLogs] = useState<PrescriptionOcrLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selected log for inspection
  const [selectedLog, setSelectedLog] = useState<PrescriptionOcrLogItem | null>(null);

  // Fetch OCR history logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query: OcrHistoryQuery = {
        branchId: selectedBranch === 'ALL' ? undefined : selectedBranch,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchKeyword.trim() || undefined,
        page: currentPage,
        limit: 20,
      };

      const res = await aiClinicalService.getOcrHistory(query);
      if (res?.success) {
        setLogs(res.data || []);
        setTotal(res.pagination?.total || 0);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load OCR audit history';
      setError(msg);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedStatus, searchKeyword, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Save pharmacist adjustment to an OCR log
  const saveAdjustment = async (
    scanId: string,
    adjustedItems: PharmacistAdjustedItem[],
    summary: string,
    pharmacistInfo?: any,
    auditCode?: string,
    orderCode?: number
  ) => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await aiClinicalService.saveOcrAdjustment(scanId, {
        pharmacistAdjustedItems: adjustedItems,
        adjustmentSummary: summary,
        pharmacistInfo,
        auditCode,
        orderCode,
      });

      // Delayed refetch to ensure database synchronization
      setTimeout(() => {
        fetchLogs();
      }, 1000);

      return { success: true, data: res.data };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save adjustments';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    logs,
    total,
    loading,
    submitting,
    error,
    selectedBranch,
    setSelectedBranch,
    selectedStatus,
    setSelectedStatus,
    searchKeyword,
    setSearchKeyword,
    currentPage,
    setCurrentPage,
    selectedLog,
    setSelectedLog,
    refetch: fetchLogs,
    saveAdjustment,
  };
}
