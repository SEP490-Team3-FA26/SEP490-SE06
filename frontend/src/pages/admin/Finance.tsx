import React, { useState } from 'react';
import {
  Banknote,
  Printer,
  TrendingUp,
  Building2,
  Calendar,
  CalendarDays,
  Filter,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Clock,
  Layers,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useBranchFinance } from '../../hooks/useBranchFinance';
import { CreateExpenseModal } from '../../components/CreateExpenseModal';
import { CreatePaymentVoucherModal } from '../../components/finance/CreatePaymentVoucherModal';
import { CashFlowListView } from '../../components/finance/CashFlowListView';
import { PaymentReconciliationTab } from '../../components/finance/PaymentReconciliationTab';
import { CustomerRFMTab } from '../../components/finance/CustomerRFMTab';
import { cn } from '../../lib/utils';

export function Finance() {
  const {
    activeTab,
    setActiveTab,
    viewType,
    setViewType,
    selectedDate,
    setSelectedDate,
    selectedBranch,
    setSelectedBranch,
    selectedYear,
    setSelectedYear,
    displayMode,
    setDisplayMode,
    loading,
    isAdmin,
    branchesList,
    activeBranchName,
    currentMonday,
    currentSunday,
    shifts,
    dayVouchers,
    weekVouchers,
    monthVouchers,
    weekDaysData,
    allVouchers,
    ordersCount,
    expensesCount,
    vouchersCount,
    displayInflow,
    displayOutflow,
    displayNetFlow,
    drawerBalance,
    drawerStatus,
    isAnyShiftScheduled,
    chartData,
    combinedLedger,
    refreshData,
    exportLedgerCsv,
    stepPeriod,
    jumpToToday,
  } = useBranchFinance();

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const periodSubtitle =
    viewType === 'shift'
      ? `Ca trực ngày ${selectedDate}`
      : viewType === 'day'
      ? `Gộp ngày ${selectedDate}`
      : viewType === 'week'
      ? `Gộp tuần từ ${currentMonday} đến ${currentSunday}`
      : `Gộp tháng ${selectedDate.slice(5, 7)}/${selectedDate.slice(0, 4)}`;

  return (
    <div className="space-y-6 flex flex-col h-full bg-slate-50/50 p-6 lg:p-8 overflow-y-auto print:bg-white print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kế Toán & Quản Lý Dòng Tiền</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dữ liệu trực tiếp Database
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
              {activeBranchName}
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs">
            Báo cáo dòng tiền chi nhánh theo Ca / Ngày / Tuần / Tháng, đối soát két bán lẻ POS & lập phiếu chi nhà cung cấp GDP.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            aria-label="Làm mới dữ liệu"
            className="h-9 w-9 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors border border-slate-200/80 flex items-center justify-center shadow-xs disabled:opacity-50"
            title="Làm mới dữ liệu từ Database"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Button: Create Payment Voucher */}
          <button
            type="button"
            onClick={() => setShowVoucherModal(true)}
            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 text-xs"
          >
            <FileText size={14} />
            <span>Lập Phiếu Chi NCC</span>
          </button>

          {/* Button: Create Fixed Expense */}
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="h-9 px-3.5 bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 font-medium rounded-xl shadow-xs transition-colors flex items-center gap-1.5 text-xs"
          >
            <Plus size={14} />
            <span>Chi Phí Cố Định</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="h-9 px-3 bg-white border border-slate-200/80 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5 text-xs"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">In Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={exportLedgerCsv}
            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl shadow-sm shadow-emerald-500/20 transition-colors flex items-center gap-1.5 text-xs"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Modern Segmented Control */}
      <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 p-1 text-slate-500 border border-slate-200/60 w-fit print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('cashflow')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            activeTab === 'cashflow'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Banknote size={14} />
          <span>Sổ Quỹ & Dòng Tiền</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reconciliation')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            activeTab === 'reconciliation'
              ? 'bg-white text-blue-700 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <ShieldCheck size={14} />
          <span>Đối Soát Thanh Toán</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            Auto
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rfm')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            activeTab === 'rfm'
              ? 'bg-white text-purple-700 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <UserCheck size={14} />
          <span>Phân Khúc Khách Hàng (RFM)</span>
        </button>
      </div>

      {/* Tab: Payment Reconciliation */}
      {activeTab === 'reconciliation' && (
        <PaymentReconciliationTab selectedBranch={selectedBranch} />
      )}

      {/* Tab: Customer RFM Segmentation */}
      {activeTab === 'rfm' && (
        <CustomerRFMTab selectedBranch={selectedBranch} />
      )}

      {/* Tab: Cash Flow & Drawer Ledger */}
      {activeTab === 'cashflow' && (
        <>
          {/* Multi-Tier Filter Bar: Shift detail vs Consolidated Day/Week/Month */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 print:hidden">
            {/* Left: View Type Selector with Detail vs Consolidated */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Detailed Shift Option */}
              <div className="inline-flex h-9 items-center rounded-xl bg-slate-100 p-1 text-slate-500 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setViewType('shift')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    viewType === 'shift'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                  title="Chi tiết từng ca trực và kiểm đếm két"
                >
                  <Clock size={13} />
                  <span>Theo Ca Trực</span>
                </button>
              </div>

              {/* Consolidated Options: Day, Week, Month */}
              <div className="inline-flex h-9 items-center rounded-xl bg-slate-100 p-1 text-slate-500 border border-slate-200/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 select-none">
                  Gộp:
                </span>
                <button
                  type="button"
                  onClick={() => setViewType('day')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    viewType === 'day'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                  title="Gộp toàn bộ doanh thu và chi phí trong 1 ngày"
                >
                  <Calendar size={13} />
                  <span>Ngày</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('week')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    viewType === 'week'
                      ? 'bg-white text-blue-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                  title="Gộp 7 ngày trong tuần (Thứ 2 đến Chủ Nhật)"
                >
                  <CalendarDays size={13} />
                  <span>Tuần</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('month')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    viewType === 'month'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                  title="Gộp toàn bộ các ngày trong tháng"
                >
                  <TrendingUp size={13} />
                  <span>Tháng</span>
                </button>
              </div>
            </div>

            {/* Middle: Period Navigation & Date Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Step Period Button: Previous */}
              <button
                type="button"
                onClick={() => stepPeriod(-1)}
                aria-label="Kỳ trước"
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs transition-colors"
                title="Lùi 1 kỳ thời gian"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Dynamic Period Information & Picker */}
              {viewType === 'shift' || viewType === 'day' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-9 px-3 text-xs font-medium font-mono rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="h-9 px-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shadow-xs"
                  >
                    Hôm nay
                  </button>
                </div>
              ) : viewType === 'week' ? (
                <div className="flex items-center gap-2">
                  <span className="h-9 px-3 flex items-center text-xs font-bold font-mono rounded-xl bg-blue-50 border border-blue-200/60 text-blue-800">
                    Tuần: {currentMonday.slice(8, 10)}/{currentMonday.slice(5, 7)} ➔ {currentSunday.slice(8, 10)}/{currentSunday.slice(5, 7)}/{currentSunday.slice(0, 4)}
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-9 px-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
                    title="Chọn ngày bất kỳ trong tuần"
                  />
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="h-9 px-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shadow-xs"
                  >
                    Tuần này
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="h-9 px-3 flex items-center text-xs font-bold font-mono rounded-xl bg-purple-50 border border-purple-200/60 text-purple-800">
                    Tháng {selectedDate.slice(5, 7)} / {selectedDate.slice(0, 4)}
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
                  >
                    <option value="2026">Năm 2026</option>
                    <option value="2025">Năm 2025</option>
                    <option value="2024">Năm 2024</option>
                    <option value="all">Tất cả năm</option>
                  </select>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="h-9 px-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shadow-xs"
                  >
                    Tháng này
                  </button>
                </div>
              )}

              {/* Step Period Button: Next */}
              <button
                type="button"
                onClick={() => stepPeriod(1)}
                aria-label="Kỳ sau"
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs transition-colors"
                title="Tiến 1 kỳ thời gian"
              >
                <ChevronRight size={15} />
              </button>

              {/* Admin Branch Filter (Only shown if user has admin privileges) */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-2">
                  <Building2 size={13} className="text-slate-400" />
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="h-9 px-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
                  >
                    <option value="all">Tất cả chi nhánh</option>
                    {branchesList.map((b) => (
                      <option key={b._id || b.id || b.branchCode} value={b.branchCode || b.id || b._id}>
                        {b.name || b.branchCode}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right: Display Mode Toggle */}
            <div className="inline-flex h-9 items-center rounded-xl bg-slate-100 p-1 text-slate-500 border border-slate-200/60 shrink-0">
              <button
                type="button"
                onClick={() => setDisplayMode('list_dropdown')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  displayMode === 'list_dropdown'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="Xem danh sách chi tiết dạng dropdown"
              >
                <Layers size={13} />
                <span>Danh Sách & Ca Trực</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('chart_overview')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  displayMode === 'chart_overview'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="Xem biểu đồ & sổ quỹ tổng hợp"
              >
                <TrendingUp size={13} />
                <span>Biểu Đồ & Sổ Quỹ</span>
              </button>
            </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block mb-8 text-center">
            <h1 className="text-3xl font-black text-black">SỔ QUỸ & BÁO CÁO DÒNG TIỀN</h1>
            <h2 className="text-xl font-bold mt-2">{activeBranchName}</h2>
            <p className="text-gray-600 mt-1">Kỳ báo cáo: {periodSubtitle}</p>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={36} className="animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-500">
                Đang tổng hợp dữ liệu thu chi & dòng tiền thực tế...
              </p>
            </div>
          ) : (
            <>
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-3">
                {/* Card 1: Total Inflow */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Tổng dòng tiền vào ({viewType === 'shift' ? 'Ca' : viewType === 'day' ? 'Ngày' : viewType === 'week' ? 'Tuần' : 'Tháng'})
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <Banknote size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                    +{displayInflow.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                    <ArrowUpRight size={13} /> Thu từ bán lẻ POS & VietQR ({ordersCount} đơn)
                  </div>
                </div>

                {/* Card 2: Total Outflow */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Tổng dòng tiền ra ({viewType === 'shift' ? 'Ca' : viewType === 'day' ? 'Ngày' : viewType === 'week' ? 'Tuần' : 'Tháng'})
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                      <Receipt size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-rose-600">
                    -{displayOutflow.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <ArrowDownRight size={13} /> Chi phí ({expensesCount}) + Phiếu chi NCC ({vouchersCount})
                  </div>
                </div>

                {/* Card 3: Net Cash Flow */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Dòng tiền thuần (Net Flow)</span>
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center border',
                        displayNetFlow >= 0
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                      )}
                    >
                      <PieChart size={16} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-2xl font-bold font-mono tracking-tight',
                      displayNetFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    )}
                  >
                    {displayNetFlow >= 0 ? '+' : ''}
                    {displayNetFlow.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-slate-500">
                    = Tổng dòng thu - Tổng dòng chi
                  </div>
                </div>

                {/* Card 4: Drawer Balance Status */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Két tiền mặt ca trực</span>
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center border',
                        isAnyShiftScheduled
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      )}
                    >
                      <CreditCard size={16} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-2xl font-bold font-mono tracking-tight',
                      isAnyShiftScheduled ? 'text-slate-900' : 'text-slate-400 font-semibold text-xl'
                    )}
                  >
                    {isAnyShiftScheduled ? `${drawerBalance.toLocaleString('vi-VN')} đ` : 'Chưa phân lịch'}
                  </div>
                  <div className="mt-2 text-[11px] font-medium flex items-center justify-between">
                    {isAnyShiftScheduled ? (
                      <>
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                          <CheckCircle2 size={11} /> Đang Hoạt Động
                        </span>
                        <span className="text-slate-400 font-normal">Cân đối 100%</span>
                      </>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md font-semibold">
                        Chưa mở ca trực
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Area based on displayMode */}
              {displayMode === 'list_dropdown' ? (
                /* Component 1: CashFlowListView with Expandable Accordions & Consolidated Views */
                <CashFlowListView
                  shifts={shifts}
                  vouchers={
                    viewType === 'shift' || viewType === 'day'
                      ? dayVouchers
                      : viewType === 'week'
                      ? weekVouchers
                      : monthVouchers
                  }
                  viewType={viewType}
                  weekDaysData={weekDaysData}
                  currentDate={selectedDate}
                  currentMonday={currentMonday}
                  currentSunday={currentSunday}
                  onRefresh={refreshData}
                  onOpenCreateVoucher={() => setShowVoucherModal(true)}
                />
              ) : (
                /* Component 2: Chart & Unified Ledger View */
                <div className="space-y-6">
                  {/* Chart Section */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">
                          Biểu đồ Dòng tiền & Lợi nhuận ròng{' '}
                          {selectedYear === 'all' ? 'Tất cả các năm' : `Năm ${selectedYear}`}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1">
                          So sánh Doanh thu bán lẻ vs Chi phí cố định & Tổng chi xuất quỹ (Đơn vị: Triệu VNĐ)
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-700 px-3 py-1 bg-blue-50 border border-blue-200/60 rounded-lg">
                        Cập nhật thời gian thực
                      </span>
                    </div>
                    <div className="h-[340px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{
                              backgroundColor: '#fff',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              fontWeight: 600,
                            }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar dataKey="revenue" name="Thu (Doanh thu)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Bar dataKey="fixedExpenses" name="Chi cố định (Mặt bằng/Lương)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Bar dataKey="expense" name="Tổng chi (Gồm COGS & NCC)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Bar dataKey="netProfit" name="Lợi nhuận ròng" fill="#0057cd" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Net Cash Flow Ledger Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:shadow-none print:border-gray-800 flex flex-col flex-1">
                    <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between print:bg-white print:border-b-2 print:border-gray-800 print:px-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm tracking-tight print:text-xl">
                          Sổ Quỹ & Nhật Ký Dòng Tiền (Net Cash Flow Ledger)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Nhật ký Thu (Đơn hàng POS) và Chi (Mặt bằng, Lương, Phiếu chi NCC GDP...) theo {periodSubtitle}
                        </p>
                      </div>
                      <div className="hidden print:block text-xs font-bold font-mono">
                        Ngày in: {new Date().toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/80 border-b border-slate-200/80 print:bg-gray-100 print:text-black">
                          <tr>
                            <th className="px-6 py-3 print:px-2">Mã GD</th>
                            <th className="px-6 py-3 print:px-2">Ngày</th>
                            {selectedBranch === 'all' && <th className="px-6 py-3 print:px-2">Chi nhánh</th>}
                            <th className="px-6 py-3 print:px-2">Loại GD</th>
                            <th className="px-6 py-3 print:px-2">Nội Dung / Chứng Từ</th>
                            <th className="px-6 py-3 print:px-2">Hình Thức / Ghi Chú</th>
                            <th className="px-6 py-3 text-right print:px-2">Số Tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-gray-400">
                          {combinedLedger.length > 0 ? (
                            combinedLedger.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-6 py-3.5 font-mono font-bold text-slate-800 print:px-2 print:text-black">
                                  #{tx.id}
                                </td>
                                <td className="px-6 py-3.5 text-slate-600 font-mono print:px-2 print:text-black">
                                  {tx.date}
                                </td>
                                {selectedBranch === 'all' && (
                                  <td className="px-6 py-3.5 font-medium text-slate-800 print:px-2 print:text-black">
                                    {tx.branch}
                                  </td>
                                )}
                                <td className="px-6 py-3.5 print:px-2">
                                  {tx.type === 'INCOME' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                      <ArrowUpRight size={11} /> THU BÁN HÀNG
                                    </span>
                                  ) : tx.category === 'SUPPLIER_PAYMENT' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                      <ArrowDownRight size={11} /> CHI NCC (PO)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                                      <ArrowDownRight size={11} /> CHI PHÍ CỐ ĐỊNH
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5 print:px-2">
                                  <span className="font-bold text-slate-900 block">{tx.title}</span>
                                  <span className="text-[11px] text-slate-500">{tx.categoryText}</span>
                                </td>
                                <td className="px-6 py-3.5 text-slate-500 text-xs print:px-2 print:text-black">
                                  <span className="font-semibold text-slate-700 block">{tx.method}</span>
                                  <span className="text-[11px]">{tx.notes}</span>
                                </td>
                                <td
                                  className={cn(
                                    'px-6 py-3.5 text-right font-bold font-mono print:px-2',
                                    tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                                  )}
                                >
                                  {tx.type === 'INCOME' ? '+' : '-'}
                                  {tx.amount.toLocaleString('vi-VN')} đ
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">
                                Chưa có giao dịch nào được ghi nhận trong kỳ báo cáo này.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal: Create Payment Voucher */}
      <CreatePaymentVoucherModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        onSuccess={() => {
          setShowVoucherModal(false);
          refreshData();
        }}
        branches={branchesList.map((b) => ({
          id: b.branchCode || b.id || b._id,
          name: b.name || b.branchCode,
        }))}
        defaultBranchId={selectedBranch !== 'all' ? selectedBranch : 'BR-001'}
      />

      {/* Modal: Create Fixed Expense */}
      <CreateExpenseModal
        isOpen={showExpenseModal}
        branches={branchesList.map((b) => ({
          id: b.branchCode || b.id || b._id,
          name: b.name || b.branchCode,
          code: b.branchCode,
        }))}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={() => {
          setShowExpenseModal(false);
          refreshData();
        }}
      />
    </div>
  );
}
