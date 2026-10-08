import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  FileCheck,
  Search,
  Filter,
  CreditCard,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Gift,
  Zap,
} from 'lucide-react';
import { usePaymentReconciliation } from '../../hooks/usePaymentReconciliation';
import { PaymentReconciliationRecord } from '../../services/sales/reconciliation.service';

interface Props {
  selectedBranch: string;
}

export const PaymentReconciliationTab: React.FC<Props> = ({ selectedBranch }) => {
  const {
    discrepancies,
    summary,
    loading,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    totalPages,
    resolving,
    refresh,
    resolveDiscrepancy,
  } = usePaymentReconciliation(selectedBranch === 'all' ? undefined : selectedBranch);

  const [selectedRecord, setSelectedRecord] = useState<PaymentReconciliationRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenResolveModal = (record: PaymentReconciliationRecord) => {
    setSelectedRecord(record);
    setResolutionNotes(record.resolutionNotes || '');
    setModalOpen(true);
  };

  const handleSubmitResolve = async () => {
    if (!selectedRecord?._id) return;
    if (!resolutionNotes.trim()) {
      alert('Vui lòng nhập ghi chú hoặc biên bản đối soát!');
      return;
    }
    const res = await resolveDiscrepancy(selectedRecord._id, resolutionNotes.trim());
    if (res.success) {
      setModalOpen(false);
      setSelectedRecord(null);
      setResolutionNotes('');
    } else {
      alert(res.error || 'Có lỗi xảy ra khi xử lý biên bản');
    }
  };

  // Helper render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Khớp Chuẩn 100%
          </span>
        );
      case 'UNDERPAID_TOLERANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <ShieldCheck size={13} className="text-blue-600" />
            Dung Sai (≤5K) Đã Trừ Điểm
          </span>
        );
      case 'OVERPAID_CREDITED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Gift size={13} className="text-purple-600" />
            Thừa Tiền (Cộng Điểm Loyalty)
          </span>
        );
      case 'UNDERPAID_BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={13} className="text-rose-600" />
            Thiếu Tiền Lớn (Chặn Xuất)
          </span>
        );
      case 'MANUAL_OVERRIDE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Zap size={13} className="text-amber-600" />
            Dược Sĩ Xác Nhận Khẩn Cấp
          </span>
        );
      case 'ORPHAN_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <HelpCircle size={13} className="text-slate-600" />
            Tiền Mồ Côi (Chưa Rõ Mã Đơn)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Reconciliation KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Match rate card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tỷ Lệ Tự Động Khớp</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{summary.matchRate}%</h3>
            <p className="text-xs text-slate-400 mt-0.5">Khớp chuẩn & trong dung sai</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Total transactions card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng GD Webhook</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{summary.totalRecords.toLocaleString()}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Khớp: {summary.breakdown.matched} | Dung sai: {summary.breakdown.underpaidTolerance}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
        </div>

        {/* Discrepancies needing reconciliation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lệch Cần Xử Lý</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {summary.breakdown.underpaidBlocked + summary.breakdown.manualOverride + summary.breakdown.orphan}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Khẩn cấp: {summary.breakdown.manualOverride} | Mồ côi: {summary.breakdown.orphan}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Total difference */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chênh Lệch Dòng Tiền</p>
            <h3
              className={`text-2xl font-black mt-1 ${
                summary.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {summary.difference >= 0 ? '+' : ''}
              {summary.difference.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Thực thu: {summary.totalActual.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ArrowRightLeft size={24} />
          </div>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Trạng thái:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="UNDERPAID_BLOCKED">⚠️ Thiếu tiền (Chặn xuất)</option>
            <option value="MANUAL_OVERRIDE">⚡ Xác nhận khẩn cấp (POS)</option>
            <option value="ORPHAN_PAYMENT">❓ Tiền mồ côi</option>
            <option value="UNDERPAID_TOLERANCE">🛡️ Dung sai (≤5.000đ)</option>
            <option value="OVERPAID_CREDITED">🎁 Thừa tiền (Cộng điểm)</option>
            <option value="MATCHED">✅ Khớp chuẩn 100%</option>
          </select>
        </div>

        <button
          onClick={() => refresh()}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* Reconciliation Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Mã đơn / GD</th>
                <th className="py-3.5 px-4">Cổng TT</th>
                <th className="py-3.5 px-4 text-right">Dự kiến</th>
                <th className="py-3.5 px-4 text-right">Thực nhận</th>
                <th className="py-3.5 px-4 text-right">Chênh lệch</th>
                <th className="py-3.5 px-4">Trạng thái đối soát</th>
                <th className="py-3.5 px-4">Ghi chú & Xử lý</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Đang tải dữ liệu đối soát...
                  </td>
                </tr>
              ) : discrepancies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <ShieldCheck size={36} className="mx-auto text-emerald-500 mb-2 opacity-60" />
                    <p className="text-sm font-semibold text-slate-700">Tuyệt vời! Không có sai lệch thanh toán nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Mọi giao dịch ngân hàng / VietQR đều đã khớp hoàn toàn hoặc nằm trong dung sai cho phép.
                    </p>
                  </td>
                </tr>
              ) : (
                discrepancies.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      {record.reconciledAt
                        ? new Date(record.reconciledAt).toLocaleString('vi-VN')
                        : new Date(record.createdAt || '').toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      #{record.orderCode}
                      {record.bankTransactionId && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Bank Ref: {record.bankTransactionId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[11px]">
                        {record.gateway}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {record.expectedAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {record.actualAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-black ${
                        record.difference === 0
                          ? 'text-slate-400'
                          : record.difference > 0
                          ? 'text-purple-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {record.difference > 0 ? '+' : ''}
                      {record.difference.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(record.status)}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                      {record.toleranceApplied && (
                        <span className="text-[11px] text-blue-600 block">
                          🛡️ Áp dụng dung sai thông minh
                        </span>
                      )}
                      {record.creditedToLoyaltyPoints ? (
                        <span className="text-[11px] text-purple-600 block">
                          🎁 +{record.creditedToLoyaltyPoints} điểm tích lũy
                        </span>
                      ) : null}
                      {record.overrideReason && (
                        <span className="text-[11px] text-amber-700 block">
                          Lý do: {record.overrideReason}
                        </span>
                      )}
                      {record.resolutionNotes && (
                        <span className="text-[11px] text-emerald-700 block italic">
                          Đã giải trình: {record.resolutionNotes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenResolveModal(record)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 mx-auto"
                      >
                        <FileCheck size={14} />
                        Biên bản
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reconciliation Resolution Modal */}
      {modalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Xử Lý Biên Bản Đối Soát</h3>
                <p className="text-xs text-slate-500">Đơn hàng #{selectedRecord.orderCode}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền dự kiến:</span>
                <span className="font-bold text-slate-800">
                  {selectedRecord.expectedAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thực thu ngân hàng:</span>
                <span className="font-bold text-slate-900">
                  {selectedRecord.actualAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chênh lệch:</span>
                <span
                  className={`font-black ${
                    selectedRecord.difference >= 0 ? 'text-purple-600' : 'text-rose-600'
                  }`}
                >
                  {selectedRecord.difference > 0 ? '+' : ''}
                  {selectedRecord.difference.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái hiện tại:</span>
                <span>{renderStatusBadge(selectedRecord.status)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Ghi chú giải trình / Quyết định kế toán:
              </label>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="VD: Đã đối chiếu với sao kê VCB lúc 17:30, khách chuyển 2 lần nên gộp đủ tiền..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={resolving}
                onClick={handleSubmitResolve}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {resolving && <RefreshCw size={14} className="animate-spin" />}
                Lưu Biên Bản & Khép Hồ Sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
