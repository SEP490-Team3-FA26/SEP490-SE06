import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  ShieldAlert,
  Award,
  Calendar,
} from 'lucide-react';
import { useBranchFeedback } from '../../hooks/useBranchFeedback';
import { FeedbackData } from '../../services/sales/feedback.service';

export const BranchFeedbackPage: React.FC = () => {
  // Get branchId from token/storage or default to current branch
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const branchId = user?.branchId || 'BR-001';

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRating, setFilterRating] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const {
    feedbacks,
    stats,
    loading,
    refresh,
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
  } = useBranchFeedback(branchId, filterStatus, filterRating);

  const onConfirmResolve = async () => {
    const res = await handleConfirmResolve();
    if (!res.success && res.error) {
      alert(res.error);
    }
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      fb.orderCode?.toLowerCase().includes(term) ||
      fb.customerPhone?.toLowerCase().includes(term) ||
      fb.comment?.toLowerCase().includes(term) ||
      fb.tags?.some((t) => t.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Tiêu đề & Nút làm mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5">
            <Award size={14} /> Quản Trị Trải Nghiệm Khách Hàng & CSKH
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Phản Hồi Dịch Vụ & Đo Lường CSAT - Chi Nhánh {branchId}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát mức độ hài lòng của khách hàng và giải quyết khiếu nại trong cam kết SLA 24 giờ.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới dữ liệu
        </button>
      </div>

      {/* 4 Thẻ KPI CSAT & Khiếu nại */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Điểm CSAT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center text-amber-500">
            <Star size={24} className="fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Điểm CSAT Trung Bình</div>
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1 mt-0.5">
              {stats.avgRating || '5.0'} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
            </div>
          </div>
        </div>

        {/* Tổng đánh giá */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-600">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Tổng Lượt Đánh Giá</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.totalFeedbacks || 0}
            </div>
          </div>
        </div>

        {/* Khiếu nại 1-2 sao chờ xử lý */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center text-rose-600">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-rose-800">Cần Xử Lý Trong 24h</div>
            <div className="text-2xl font-black text-rose-600 mt-0.5 flex items-center gap-2">
              {stats.unresolvedNegative || 0}
              {stats.unresolvedNegative > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full animate-pulse">
                  Khẩn cấp
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tỷ lệ 5 sao */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Đánh Giá Xuất Sắc (5★)</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {stats.ratingBreakdown?.[5] || 0} lượt
            </div>
          </div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, SĐT khách, nhận xét..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý khiếu nại (Pending)</option>
            <option value="RESOLVED">Đã giải quyết (Resolved)</option>
            <option value="CLOSED">Đã đóng (Closed)</option>
          </select>

          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none cursor-pointer"
          >
            <option value="">Tất cả mức sao</option>
            <option value="5">5 Sao (Xuất sắc)</option>
            <option value="4">4 Sao (Tốt)</option>
            <option value="3">3 Sao (Bình thường)</option>
            <option value="2">2 Sao (Kém)</option>
            <option value="1">1 Sao (Rất thất vọng)</option>
          </select>
        </div>
      </div>

      {/* Danh sách phản hồi */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            Đang tải dữ liệu đánh giá chi nhánh...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            <MessageSquare size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-slate-600">Chưa có phản hồi nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          filteredFeedbacks.map((fb) => {
            const isNegative = fb.rating <= 2;
            const needsAction = isNegative && fb.status === 'PENDING';

            return (
              <div
                key={fb._id}
                className={`p-5 rounded-2xl border transition-all ${
                  needsAction
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    {/* Số sao */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={18}
                          className={`${
                            s <= fb.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 fill-slate-50'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="font-bold text-slate-800 text-sm">
                      Mã đơn: <span className="font-mono text-emerald-700">{fb.orderCode}</span>
                    </span>

                    {/* Hạng thành viên */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        fb.customerTier === 'Diamond'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : fb.customerTier === 'Gold'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : fb.customerTier === 'Silver'
                          ? 'bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      {fb.customerTier || 'Bronze'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone size={13} className="text-slate-400" />
                      <strong>{fb.customerPhone}</strong> ({fb.customerName || 'Khách hàng'})
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={13} className="text-slate-400" />
                      {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>
                </div>

                {/* Nội dung đánh giá */}
                <div className="pt-3">
                  {fb.tags && fb.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {fb.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                            isNegative
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {fb.comment ? (
                    <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                      "{fb.comment}"
                    </p>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Không có nhận xét viết tay.</span>
                  )}
                </div>

                {/* Phần trạng thái xử lý CSKH */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    {fb.status === 'RESOLVED' && fb.resolution ? (
                      <div className="flex items-center gap-2 text-emerald-700 font-medium">
                        <CheckCircle2 size={16} />
                        <span>
                          Đã giải quyết bởi <strong>{fb.resolution.handledByName}</strong>: "{fb.resolution.notes}"
                        </span>
                      </div>
                    ) : needsAction ? (
                      <div className="flex items-center gap-2 text-rose-700 font-bold">
                        <Clock size={16} className="text-rose-500 animate-pulse" />
                        <span>Khiếu nại 1–2★: Trưởng chi nhánh cần gọi điện giải quyết trong vòng 24 giờ</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Trạng thái: Hoàn tất</span>
                    )}
                  </div>

                  {needsAction && (
                    <button
                      onClick={() => handleOpenResolveModal(fb)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Phone size={13} /> Xử Lý Khiếu Nại (SLA 24h)
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Xử Lý Khiếu Nại 24h Dành Cho Trưởng Chi Nhánh */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-rose-900 flex items-center gap-2">
                <AlertTriangle size={20} className="text-rose-600" />
                Biên Bản Xử Lý Khiếu Nại (SLA 24h)
              </h3>
              <button
                onClick={handleCloseResolveModal}
                className="text-slate-400 hover:text-slate-600 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <div className="font-bold text-rose-900">
                  Khách hàng: {selectedFeedback.customerName} ({selectedFeedback.customerPhone})
                </div>
                <div className="text-slate-600 mt-1">
                  Đơn hàng: <strong>{selectedFeedback.orderCode}</strong> - Đánh giá: <strong>{selectedFeedback.rating}★</strong>
                </div>
                {selectedFeedback.comment && (
                  <div className="mt-2 text-rose-800 italic">"{selectedFeedback.comment}"</div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hình thức xử lý của Trưởng chi nhánh:
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                >
                  <option value="CALLED_CUSTOMER">Đã gọi điện thoại xin lỗi & giải thích chuyên môn</option>
                  <option value="OFFERED_VOUCHER">Tặng voucher bồi thường trải nghiệm</option>
                  <option value="INTERNAL_TRAINING">Nhắc nhở & đào tạo lại dược sĩ đứng ca</option>
                  <option value="OTHER">Biện pháp khác</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung trao đổi & Biên bản giải quyết:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ghi rõ nội dung đã trao đổi với khách hàng, nguyên nhân và hướng giải quyết..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="satCheckbox"
                  checked={customerSatisfied}
                  onChange={(e) => setCustomerSatisfied(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="satCheckbox" className="font-semibold text-slate-700 cursor-pointer">
                  Khách hàng đã hài lòng và đồng ý khép lại khiếu nại
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={handleCloseResolveModal}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={onConfirmResolve}
                disabled={resolving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {resolving ? 'Đang lưu...' : 'Hoàn Tất Giải Quyết & Đóng Phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
