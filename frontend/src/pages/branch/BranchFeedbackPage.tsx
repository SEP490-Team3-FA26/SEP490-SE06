import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
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
  Download,
  TrendingUp,
  UserCheck,
  UserX,
  Building2,
  ShoppingBag,
  ShoppingCart,
  BarChart3,
  FileSpreadsheet,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useBranchFeedback } from '../../hooks/useBranchFeedback';
import { feedbackService, FeedbackData } from '../../services/feedback/feedback.service';

export const BranchFeedbackPage: React.FC = () => {
  // Lấy thông tin người dùng từ localStorage
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userBranchId = user?.branchId || 'BR-001';

  // Quản lý Tab chính: 'feedbacks' (Danh sách & SLA) hoặc 'performance' (Báo cáo hiệu suất)
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'performance'>('feedbacks');

  // Bộ lọc cho Tab Danh sách đánh giá
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRating, setFilterRating] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Bộ lọc cho Tab Báo cáo hiệu suất
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [perfStartDate, setPerfStartDate] = useState<string>('');
  const [perfEndDate, setPerfEndDate] = useState<string>('');
  const [perfLoading, setPerfLoading] = useState<boolean>(false);

  // Dữ liệu báo cáo hiệu suất từ Backend
  const [staffPerfData, setStaffPerfData] = useState<{
    topFiveStarStaff: any[];
    atRiskStaff: any[];
    allStaff: any[];
  }>({
    topFiveStarStaff: [],
    atRiskStaff: [],
    allStaff: [],
  });

  const [branchPerfData, setBranchPerfData] = useState<{
    chainAverageRating: number;
    totalBranches: number;
    excellentBranchesCount: number;
    poorBranchesCount: number;
    branches: any[];
  }>({
    chainAverageRating: 5.0,
    totalBranches: 0,
    excellentBranchesCount: 0,
    poorBranchesCount: 0,
    branches: [],
  });

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
  } = useBranchFeedback(userBranchId, filterStatus, filterRating);

  // Tải dữ liệu Báo cáo hiệu suất nhân viên & chi nhánh
  const fetchPerformanceReports = useCallback(async () => {
    setPerfLoading(true);
    try {
      const params: any = {};
      if (selectedBranch && selectedBranch !== 'all') {
        params.branchId = selectedBranch;
      }
      if (perfStartDate) params.startDate = perfStartDate;
      if (perfEndDate) params.endDate = perfEndDate;

      const [staffRes, branchRes] = await Promise.all([
        feedbackService.getStaffPerformance(params),
        feedbackService.getBranchPerformance(params),
      ]);

      if (staffRes?.success) {
        setStaffPerfData({
          topFiveStarStaff: staffRes.topFiveStarStaff || [],
          atRiskStaff: staffRes.atRiskStaff || [],
          allStaff: staffRes.allStaff || [],
        });
      }

      if (branchRes?.success) {
        setBranchPerfData({
          chainAverageRating: branchRes.chainAverageRating || 5.0,
          totalBranches: branchRes.totalBranches || 0,
          excellentBranchesCount: branchRes.excellentBranchesCount || 0,
          poorBranchesCount: branchRes.poorBranchesCount || 0,
          branches: branchRes.branches || [],
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải báo cáo hiệu suất chi nhánh:', err);
    } finally {
      setPerfLoading(false);
    }
  }, [selectedBranch, perfStartDate, perfEndDate]);

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceReports();
    }
  }, [activeTab, fetchPerformanceReports]);

  // Xử lý xác nhận giải quyết khiếu nại SLA 24h
  const onConfirmResolve = async () => {
    const res = await handleConfirmResolve();
    if (!res.success && res.error) {
      alert(res.error);
    }
  };

  // Xuất file CSV Báo cáo hiệu suất chi nhánh kèm dữ liệu mua và bán hàng
  const handleExportCsv = () => {
    if (!branchPerfData.branches.length) {
      alert('Không có dữ liệu chi nhánh để xuất báo cáo!');
      return;
    }

    const headers = [
      'Mã Chi Nhánh',
      'Tên Chi Nhánh',
      'Quản Lý Phụ Trách',
      'Tổng Đánh Giá',
      'Điểm CSAT',
      'Số Lượt 5★',
      'Số Lượt Tiêu Cực (1-2★)',
      'Tỷ Lệ Tích Cực (%)',
      'Tỷ Lệ Tiêu Cực (%)',
      'Tỷ Lệ Giải Quyết Khiếu Nại (%)',
      'Xếp Hạng Dịch Vụ',
      'Số Đơn Mua Hàng PO',
      'Tổng Giá Trị Nhập Kho (VNĐ)',
      'Số Đơn Bán Lẻ',
      'Doanh Thu Bán Lẻ (VNĐ)',
    ];

    const rows = branchPerfData.branches.map((b) => [
      `"${b.branchId}"`,
      `"${b.branchName}"`,
      `"${b.manager}"`,
      b.totalFeedbacks,
      b.avgRating,
      b.fiveStarCount,
      b.negativeCount,
      `${b.positiveRatio}%`,
      `${b.negativeRatio}%`,
      `${b.resolutionRate}%`,
      `"${b.serviceQualityLabel}"`,
      b.procurement?.totalPoCount || 0,
      b.procurement?.totalPurchaseValue || 0,
      b.sales?.totalOrders || 0,
      b.sales?.totalSalesRevenue || 0,
    ]);

    // Chuẩn bị nội dung CSV có UTF-8 BOM để Excel hiển thị tiếng Việt không bị lỗi font
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Hieu_Suat_Chi_Nhanh_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      {/* Tiêu đề trang & Tabs chuyển đổi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5">
            <Award size={14} /> Quản Trị Trải Nghiệm Khách Hàng & CSKH Chuỗi Nhà Thuốc
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Đo Lường CSAT & Phân Tích Hiệu Suất Bán Hàng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đánh giá chất lượng phục vụ dược sĩ, giải quyết khiếu nại SLA 24h và đối soát hiệu suất mua bán toàn chi nhánh.
          </p>
        </div>

        {/* Nút Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'feedbacks'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={14} /> Đánh Giá & SLA Khiếu Nại
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={14} /> Báo Cáo Hiệu Suất & Chất Lượng
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH ĐÁNH GIÁ & XỬ LÝ KHIẾU NẠI SLA 24H                      */}
      {/* ========================================================================= */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Nút làm mới dữ liệu */}
          <div className="flex justify-end">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Loader2 size={14} className={loading ? 'animate-spin text-emerald-600' : ''} /> Làm mới dữ liệu
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
              <div className="w-12 h-12 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-center text-sky-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Đánh Giá Xuất Sắc (5★)</div>
                <div className="text-2xl font-black text-sky-600 mt-0.5">
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
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
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-sky-600" />
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
                          Mã đơn: <span className="font-mono text-sky-700">{fb.orderCode}</span>
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
                          {fb.customerTier || 'Khách vãng lai'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : ''}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                          {fb.branchName || fb.branchId}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-bold text-slate-700">Khách hàng:</span>
                        <span>{fb.customerName || 'Khách hàng'}</span>
                        <span className="text-slate-400 font-mono">({fb.customerPhone})</span>
                      </div>

                      {/* Thẻ tags */}
                      {fb.tags && fb.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {fb.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className={`text-[11px] px-2.5 py-0.5 rounded-lg font-medium ${
                                isNegative
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-sky-50 text-sky-700 border border-sky-100'
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Lời nhận xét */}
                      {fb.comment && (
                        <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-800 leading-relaxed font-normal">
                          "{fb.comment}"
                        </div>
                      )}
                    </div>

                    {/* Phần xử lý khiếu nại SLA 24h */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        {fb.status === 'RESOLVED' && fb.resolution ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BÁO CÁO HIỆU SUẤT NHÂN VIÊN & CHI NHÁNH (THEO YÊU CẦU ẢNH)        */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Thanh công cụ lọc & Xuất Báo Cáo CSV */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Chọn chi nhánh */}
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-400 shrink-0" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Toàn bộ chi nhánh</option>
                  <option value="BR-001">Chi nhánh Quận 1 (BR-001)</option>
                  <option value="BR-002">Chi nhánh Bình Thạnh (BR-002)</option>
                  <option value="BR-003">Chi nhánh Thủ Đức (BR-003)</option>
                  <option value="BR-004">Chi nhánh Gò Vấp (BR-004)</option>
                </select>
              </div>

              {/* Lọc ngày bắt đầu */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={14} className="text-slate-400" />
                <span>Từ:</span>
                <input
                  type="date"
                  value={perfStartDate}
                  onChange={(e) => setPerfStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
                />
              </div>

              {/* Lọc ngày kết thúc */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Đến:</span>
                <input
                  type="date"
                  value={perfEndDate}
                  onChange={(e) => setPerfEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
                />
              </div>

              <button
                onClick={fetchPerformanceReports}
                disabled={perfLoading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className={perfLoading ? 'animate-spin text-sky-600' : ''} />
                Lọc dữ liệu
              </button>
            </div>

            {/* Nút Xuất Báo Cáo CSV */}
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 self-end lg:self-auto"
            >
              <FileSpreadsheet size={16} /> Xuất Báo Cáo Hiệu Suất (CSV)
            </button>
          </div>

          {/* 4 Thẻ Tổng Quan Toàn Chuỗi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center text-amber-500">
                <Star size={24} className="fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">CSAT Chuỗi Trung Bình</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {branchPerfData.chainAverageRating || 5.0} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-center text-sky-600">
                <Building2 size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Tổng Số Chi Nhánh</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {branchPerfData.totalBranches} cơ sở
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-600">
                <ThumbsUp size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-800">Cơ Sở Xuất Sắc (5★)</div>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {branchPerfData.excellentBranchesCount} chi nhánh
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center text-rose-600">
                <ThumbsDown size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-800">Cần Chấn Chỉnh (1-2★)</div>
                <div className="text-2xl font-black text-rose-600 mt-0.5">
                  {branchPerfData.poorBranchesCount} chi nhánh
                </div>
              </div>
            </div>
          </div>

          {/* 2 Cột Phân Tích Dược Sĩ: Ai thường 5★ vs Ai bị 1-2★ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cột 1: Top Dược Sĩ Đạt 5 Sao Thường Xuyên */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">
                      Dược Sĩ Thường Xuyên Được Đánh Giá 5★
                    </h3>
                    <p className="text-[11px] text-slate-500">Gương mặt tiêu biểu tư vấn tận tâm và làm hài lòng khách hàng</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Top Khen Ngợi
                </span>
              </div>

              {perfLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 size={18} className="animate-spin mx-auto mb-1 text-emerald-600" />
                  Đang đối soát dữ liệu bán hàng...
                </div>
              ) : staffPerfData.topFiveStarStaff.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa ghi nhận dữ liệu dược sĩ đạt mốc 5★ trong khoảng thời gian này.
                </div>
              ) : (
                <div className="space-y-3">
                  {staffPerfData.topFiveStarStaff.map((staff, idx) => (
                    <div
                      key={staff.pharmacistId || idx}
                      className="p-3.5 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {staff.pharmacistName}
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-normal">
                              {staff.branchName || staff.branchId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Tổng {staff.totalFeedbacks} đánh giá</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">{staff.fiveStarCount} lần đạt 5★</span>
                            <span>•</span>
                            <span className="text-amber-600 font-bold">★ {staff.avgRating}</span>
                          </div>
                          {staff.topTags && staff.topTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {staff.topTags.map((t: string, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-emerald-200 text-emerald-700 rounded-md font-medium">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-emerald-600">
                          {staff.fiveStarRatio}%
                        </div>
                        <div className="text-[10px] text-slate-400">Tỷ lệ 5 sao</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cột 2: Dược Sĩ Bị Phàn Nàn 1-2 Sao (Cần Đào Tạo Lại) */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <UserX size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">
                      Dược Sĩ Thường Bị 1★ - 2★ (Cần Chấn Chỉnh)
                    </h3>
                    <p className="text-[11px] text-slate-500">Giám sát nguy cơ dịch vụ để hỗ trợ đào tạo và chấn chỉnh thái độ</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                  Cảnh Báo Rủi Ro
                </span>
              </div>

              {perfLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 size={18} className="animate-spin mx-auto mb-1 text-rose-600" />
                  Đang rà soát khiếu nại nhân viên...
                </div>
              ) : staffPerfData.atRiskStaff.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-600" />
                  Tuyệt vời! Không có nhân viên nào có tỷ lệ phản hồi tiêu cực vượt ngưỡng cảnh báo.
                </div>
              ) : (
                <div className="space-y-3">
                  {staffPerfData.atRiskStaff.map((staff, idx) => (
                    <div
                      key={staff.pharmacistId || idx}
                      className="p-3.5 bg-rose-50/50 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          !
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {staff.pharmacistName}
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-normal">
                              {staff.branchName || staff.branchId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Tổng {staff.totalFeedbacks} đánh giá</span>
                            <span>•</span>
                            <span className="text-rose-700 font-bold">{staff.negativeCount} lần bị 1-2★</span>
                            <span>•</span>
                            <span className="text-amber-600 font-bold">★ {staff.avgRating}</span>
                          </div>
                          {staff.topTags && staff.topTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {staff.topTags.map((t: string, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-rose-200 text-rose-700 rounded-md font-medium">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-rose-600">
                          {staff.negativeRatio}%
                        </div>
                        <div className="text-[10px] text-rose-800 font-bold">Tỷ lệ 1-2 sao</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bảng Xếp Hạng Chất Lượng Dịch Vụ Chi Nhánh & Dữ Liệu Mua/Bán */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Building2 size={18} className="text-sky-600" />
                  Bảng Xếp Hạng Chất Lượng Dịch Vụ & Đối Soát Mua Bán Theo Chi Nhánh
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đánh giá toàn diện chất lượng phục vụ (Tốt/Xấu), tỷ lệ giải quyết SLA khiếu nại, kèm số liệu mua hàng (PO) và bán lẻ.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Chi Nhánh & Quản Lý</th>
                    <th className="py-3 px-4 text-center">CSAT Trung Bình</th>
                    <th className="py-3 px-4 text-center">Tỷ Lệ Hài Lòng (4-5★)</th>
                    <th className="py-3 px-4 text-center">Khiếu Nại & Xử Lý SLA</th>
                    <th className="py-3 px-4 text-center">Chất Lượng Phục Vụ</th>
                    <th className="py-3 px-4 text-right">Mua Hàng (PO / GRN)</th>
                    <th className="py-3 px-4 text-right">Bán Lẻ (Đơn / Doanh Thu)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {perfLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <Loader2 size={20} className="animate-spin mx-auto mb-1 text-sky-600" />
                        Đang tổng hợp dữ liệu toàn chuỗi...
                      </td>
                    </tr>
                  ) : branchPerfData.branches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không có dữ liệu chi nhánh phù hợp.
                      </td>
                    </tr>
                  ) : (
                    branchPerfData.branches.map((b) => (
                      <tr key={b.branchId} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{b.branchName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-sky-700 font-bold">{b.branchId}</span>
                            <span>• Quản lý: {b.manager}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1 font-black text-slate-900">
                            <Star size={14} className="fill-amber-400 text-amber-400" />
                            {b.avgRating}
                          </div>
                          <div className="text-[10px] text-slate-400">{b.totalFeedbacks} đánh giá</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-emerald-600">{b.positiveRatio}%</span>
                          <div className="text-[10px] text-slate-400">{b.fiveStarCount} lượt 5★</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-rose-600">{b.negativeCount} khiếu nại</div>
                          <div className="text-[10px] text-slate-500">Đã xử lý: {b.resolutionRate}%</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${b.serviceBadgeColor}`}>
                            {b.serviceQualityLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-900">
                            {b.procurement?.totalPoCount || 0} đơn PO
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {(b.procurement?.totalPurchaseValue || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-sky-700">
                            {b.sales?.totalOrders || 0} đơn xuất
                          </div>
                          <div className="text-[11px] text-emerald-600 font-bold font-mono">
                            {(b.sales?.totalSalesRevenue || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal Xử Lý Khiếu Nại 24h Dành Cho Trưởng Chi Nhánh                      */}
      {/* ========================================================================= */}
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
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
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
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
export default BranchFeedbackPage;
