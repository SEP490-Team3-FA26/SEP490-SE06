import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Search,
  Filter,
  BarChart3,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Target,
  Coins,
  ChevronRight,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { hrService } from '../../services/hr/hr.service';

export default function PharmacistKpiReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showGuide, setShowGuide] = useState<boolean>(true);

  const loadKpiReport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await hrService.getPharmacistKpiReport({
        month: selectedMonth,
        year: selectedYear,
      });
      setReportData(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải báo cáo KPI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpiReport();
  }, [selectedMonth, selectedYear]);

  const kpiList = reportData?.kpiList || [];

  // Filter list by search query
  const filteredList = kpiList.filter((item: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.pharmacistName || '').toLowerCase().includes(q) ||
      (item.pharmacistId || '').toLowerCase().includes(q)
    );
  });

  // Calculate totals
  const totalBranchRevenue = kpiList.reduce((sum: number, it: any) => sum + (it.totalRevenue || 0), 0);
  const totalBranchOrders = kpiList.reduce((sum: number, it: any) => sum + (it.orderCount || 0), 0);
  const avgBranchAov = totalBranchOrders > 0 ? Math.round(totalBranchRevenue / totalBranchOrders) : 0;
  const avgOtcRate =
    kpiList.length > 0
      ? Number(
          (kpiList.reduce((sum: number, it: any) => sum + (it.otcAttachmentRate || 0), 0) / kpiList.length).toFixed(1)
        )
      : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
              <Award size={14} />
              <span>UC-111 • SCRUM-106</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Báo Cáo Hiệu Suất Nhân Viên Bán Hàng (KPI)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl font-medium">
              Đo lường doanh số bán buôn/bán lẻ, tỷ lệ tư vấn kèm sản phẩm OTC/TPBVSK, chỉ số trung thực két tiền mặt và
              tiến độ chỉ tiêu (Quota) của từng dược sĩ tại chi nhánh.
            </p>
          </div>

          {/* Month/Year Picker & Refresh */}
          <div className="flex items-center gap-3 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/15">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold">
              <Calendar size={14} className="text-emerald-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadKpiReport}
              disabled={loading}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50"
              title="Tải lại dữ liệu"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs font-bold">
          <AlertTriangle size={18} className="shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh Thu Toàn Chi Nhánh</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{totalBranchRevenue.toLocaleString('vi-VN')}₫</p>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp size={13} />
              <span>{kpiList.length} Dược sĩ ghi nhận doanh số</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Đơn Hàng Thành Công</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{totalBranchOrders.toLocaleString('vi-VN')}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Trung bình: <strong className="text-slate-800">{kpiList.length > 0 ? Math.round(totalBranchOrders / kpiList.length) : 0} đơn/dược sĩ</strong>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá Trị Trung Bình Đơn (AOV)</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{avgBranchAov.toLocaleString('vi-VN')}₫</p>
            <p className="text-xs text-purple-700 font-bold mt-1">
              <span>Đạt tiêu chuẩn giỏ hàng nhà thuốc</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỷ Lệ Bán Kèm OTC / TPBVSK</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{avgOtcRate}%</p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Mục tiêu chuỗi: <strong className="text-emerald-700 font-bold">&gt; 35%</strong>
            </p>
          </div>
        </div>
      </div>

      {/* KPI Methodology Explanation Box */}
      <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HelpCircle size={17} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950 uppercase tracking-wide">
                Quy Chuẩn Đo Lường & Công Thức Tính Các Chỉ Số KPI Dược Sĩ (GPP)
              </h3>
              <p className="text-[11px] text-emerald-800 font-medium">
                Bấm để {showGuide ? 'thu gọn' : 'xem chi tiết'} cách hệ thống tính toán từng cột chỉ số thi đua
              </p>
            </div>
          </div>
          <button className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition">
            {showGuide ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4 pt-4 border-t border-emerald-200/60 animate-in fade-in">
            <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <DollarSign size={14} className="text-emerald-600" />
                <span>1. Doanh Thu & Chỉ Tiêu (Quota)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                • <strong>Doanh thu</strong>: Tổng tiền đơn hàng bán thành công (tách Tiền mặt vs Chuyển khoản QR).<br />
                • <strong>Chỉ tiêu (Quota)</strong>: Mức doanh số giao tháng (chuẩn 50.000.000₫/DS).<br />
                • <strong>% Hoàn thành</strong>: = (Doanh thu / Quota) × 100%.
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Target size={14} className="text-indigo-600" />
                <span>2. AOV & Tỷ Lệ Kèm OTC</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                • <strong>AOV (Đơn/Giá)</strong>: = Tổng doanh thu / Tổng số đơn. Đo lường giá trị giỏ hàng trung bình.<br />
                • <strong>Tỷ lệ kèm OTC</strong>: % đơn hàng có bán kèm TPBVSK, Vitamin, Men vi sinh... Đánh giá kỹ năng upsell tư vấn của Dược sĩ (Mục tiêu &ge; 35%).
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck size={14} className="text-teal-600" />
                <span>3. Khớp Két & Xếp Loại Thi Đua</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                • <strong>Khớp két tiền</strong>: Tỷ lệ trung thực khi bàn giao ca (đạt 100% nếu không lệch két hoặc có giải trình hợp lệ).<br />
                • <strong>Xếp loại</strong>: <strong>Xuất Sắc</strong> (&ge; 100%), <strong>Đạt Chỉ Tiêu</strong> (&ge; 70%), <strong>Cần Cố Gắng</strong> (&lt; 70%).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Table & Filter */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã Dược sĩ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold w-full sm:w-auto justify-end">
            <span>Hiển thị: </span>
            <strong className="text-slate-800">{filteredList.length} nhân sự</strong>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500 font-bold">Đang tổng hợp dữ liệu KPI...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Users size={40} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Chưa có dữ liệu bán hàng trong tháng {selectedMonth}/{selectedYear}</p>
            <p className="text-xs text-slate-400">Dữ liệu sẽ tự động tổng hợp khi Dược sĩ xuất đơn và chốt bàn giao ca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Dược Sĩ</th>
                  <th className="py-3.5 px-4">Doanh Thu Bán</th>
                  <th className="py-3.5 px-4">Chỉ Tiêu (Quota)</th>
                  <th className="py-3.5 px-4 text-center">Số Đơn</th>
                  <th className="py-3.5 px-4">AOV (Đơn/Giá)</th>
                  <th className="py-3.5 px-4 text-center">Tỷ Lệ Kèm OTC</th>
                  <th className="py-3.5 px-4 text-center">Khớp Két Tiền</th>
                  <th className="py-3.5 px-4 text-center">Xếp Loại Thi Đua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredList.map((item: any, idx: number) => {
                  const quotaRate = item.quotaCompletionRate || 0;
                  const isTopRank = idx === 0 && quotaRate >= 80;
                  const cashRate = item.cashIntegrityRate ?? 100;

                  // Parse pharmacist display name & branch note
                  const rawName = item.pharmacistName || 'Dược sĩ';
                  const match = rawName.match(/^([^(]+)(\([^)]+\))?$/);
                  const mainName = match ? match[1].trim() : rawName;
                  const subBranch = match && match[2] ? match[2].trim() : '';

                  const isOnlineOrUnassigned =
                    item.pharmacistId === 'ONLINE_UNASSIGNED' ||
                    item.pharmacistId === 'UNASSIGNED' ||
                    rawName.includes('Online') ||
                    rawName.includes('Vãng Lai');

                  const avatarChar = isOnlineOrUnassigned
                    ? 'ON'
                    : isTopRank
                    ? '★'
                    : mainName.replace(/^(DS\.|Dược sĩ)\s*/i, '').trim().charAt(0).toUpperCase() || 'DS';

                  return (
                    <tr key={item.pharmacistId || idx} className="hover:bg-slate-50/80 transition">
                      {/* Name & ID */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isOnlineOrUnassigned
                              ? 'bg-slate-100 text-slate-600 border border-slate-300'
                              : isTopRank
                              ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 shadow-xs'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {avatarChar}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {mainName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                              {subBranch && <span className="text-slate-600 font-bold">{subBranch}</span>}
                              <span>•</span>
                              <span className="font-mono text-slate-400">
                                {isOnlineOrUnassigned
                                  ? 'Kênh Online / POS'
                                  : item.pharmacistId && /^[0-9a-fA-F]{24}$/.test(item.pharmacistId)
                                  ? `ID: #${item.pharmacistId.slice(-6).toUpperCase()}`
                                  : `Mã: DS-${(idx + 1).toString().padStart(2, '0')}`}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="py-4 px-4 font-black text-slate-900 text-sm">
                        {(item.totalRevenue || 0).toLocaleString('vi-VN')}₫
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                          TM: {(item.cashRevenue || 0).toLocaleString('vi-VN')}₫ • CK: {(item.digitalRevenue || 0).toLocaleString('vi-VN')}₫
                        </span>
                      </td>

                      {/* Quota Progress */}
                      <td className="py-4 px-4 min-w-[140px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500">{(item.assignedQuota || 50000000).toLocaleString('vi-VN')}₫</span>
                            <span className={quotaRate >= 100 ? 'text-emerald-700' : 'text-slate-800'}>
                              {quotaRate}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                quotaRate >= 100
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : quotaRate >= 70
                                  ? 'bg-emerald-500'
                                  : quotaRate >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${Math.min(100, quotaRate)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td className="py-4 px-4 text-center font-black text-slate-800">
                        {item.orderCount || 0}
                      </td>

                      {/* AOV */}
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {(item.averageOrderValue || 0).toLocaleString('vi-VN')}₫
                      </td>

                      {/* OTC Attachment */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-extrabold ${
                            item.otcAttachmentRate >= 35
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <Sparkles size={11} />
                          <span>{item.otcAttachmentRate}%</span>
                        </span>
                      </td>

                      {/* Cash Drawer Integrity */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-extrabold ${
                            cashRate >= 95
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title={`Tổng tiền lệch: ${item.cashDiscrepancyTotal ? item.cashDiscrepancyTotal.toLocaleString('vi-VN') + '₫' : '0₫'}`}
                        >
                          <Coins size={11} />
                          <span>{cashRate}%</span>
                        </span>
                      </td>

                      {/* Rating Badge */}
                      <td className="py-4 px-4 text-center">
                        {quotaRate >= 100 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Xuất Sắc
                          </span>
                        ) : quotaRate >= 70 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                            Đạt Chỉ Tiêu
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                            Cần Cố Gắng
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
