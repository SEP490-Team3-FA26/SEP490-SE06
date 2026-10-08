import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Banknote,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Plus,
  UserCheck,
  AlertCircle,
  Search,
  Filter,
  Sun,
  Moon,
  Building2,
  CalendarDays,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import { ShiftDetail, PaymentVoucherItem } from '../../services/finance.service';
import { WeekDaySummary } from '../../hooks/useBranchFinance';
import { cn } from '../../lib/utils';

interface CashFlowListViewProps {
  shifts: ShiftDetail[];
  vouchers: PaymentVoucherItem[];
  viewType?: 'shift' | 'day' | 'week' | 'month';
  weekDaysData?: WeekDaySummary[];
  currentDate?: string;
  currentMonday?: string;
  currentSunday?: string;
  onRefresh?: () => void;
  onOpenCreateVoucher?: () => void;
}

export const CashFlowListView: React.FC<CashFlowListViewProps> = ({
  shifts,
  vouchers,
  viewType = 'shift',
  weekDaysData = [],
  currentDate,
  currentMonday,
  currentSunday,
  onOpenCreateVoucher,
}) => {
  const [expandedShifts, setExpandedShifts] = useState<Record<string, boolean>>({
    'SHIFT-MORNING': true,
    'SHIFT-AFTERNOON': true,
  });
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'vouchers'>('main');

  // Filter state for payment vouchers
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherMethodFilter, setVoucherMethodFilter] = useState<'ALL' | 'BANK_TRANSFER' | 'CASH'>('ALL');

  const toggleShift = (shiftId: string) => {
    setExpandedShifts((prev) => ({
      ...prev,
      [shiftId]: !prev[shiftId],
    }));
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const q = voucherSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (v.voucherCode && v.voucherCode.toLowerCase().includes(q)) ||
        (v.supplierName && v.supplierName.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.purchaseOrderId && v.purchaseOrderId.toLowerCase().includes(q));

      const matchMethod =
        voucherMethodFilter === 'ALL' || v.paymentMethod === voucherMethodFilter;

      return matchSearch && matchMethod;
    });
  }, [vouchers, voucherSearch, voucherMethodFilter]);

  // Total metrics for consolidated views
  const totalDayInflow = useMemo(() => shifts.reduce((s, sh) => s + sh.totalInflow, 0), [shifts]);
  const totalDayCash = useMemo(() => shifts.reduce((s, sh) => s + sh.cashInflow, 0), [shifts]);
  const totalDayDigital = useMemo(() => shifts.reduce((s, sh) => s + sh.digitalInflow, 0), [shifts]);
  const totalDayExpenses = useMemo(() => shifts.reduce((s, sh) => s + sh.pettyExpenses, 0), [shifts]);
  const totalDayNet = totalDayInflow - totalDayExpenses;

  // Flattened orders across shifts
  const allDayOrders = useMemo(() => {
    return shifts.flatMap((s) => s.recentOrders || []);
  }, [shifts]);

  return (
    <div className="space-y-4">
      {/* Sub Header & Segmented Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            {viewType === 'shift' && <Clock className="w-4.5 h-4.5" />}
            {viewType === 'day' && <Calendar className="w-4.5 h-4.5" />}
            {viewType === 'week' && <CalendarDays className="w-4.5 h-4.5" />}
            {viewType === 'month' && <TrendingUp className="w-4.5 h-4.5" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              {viewType === 'shift' && 'Chi Tiết Ca Trực & Sổ Quỹ Két'}
              {viewType === 'day' && 'Báo Cáo Gộp Dòng Tiền Theo Ngày'}
              {viewType === 'week' && 'Báo Cáo Gộp Dòng Tiền Theo Tuần (7 Ngày)'}
              {viewType === 'month' && 'Báo Cáo Gộp Dòng Tiền Theo Tháng'}
            </h3>
            <p className="text-xs text-slate-500">
              {viewType === 'shift' && 'Đối soát thu tiền mặt POS, thanh toán VietQR và kết chuyển két tiền từng ca'}
              {viewType === 'day' && `Tổng hợp toàn bộ doanh thu, chi phí và giao dịch trong ngày ${currentDate}`}
              {viewType === 'week' && `Tổng hợp dòng tiền từ Thứ 2 (${currentMonday}) đến Chủ Nhật (${currentSunday})`}
              {viewType === 'month' && 'Tổng quan dòng tiền, doanh thu và cơ cấu chi phí toàn tháng'}
            </p>
          </div>
        </div>

        {/* Segmented Pill Switcher */}
        <div className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-100 p-1 text-slate-500 border border-slate-200/60 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('main')}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1 text-xs font-medium transition-all gap-1.5',
              activeSubTab === 'main'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {viewType === 'shift' ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Ca Trực & Két Tiền ({shifts.length})</span>
              </>
            ) : viewType === 'week' ? (
              <>
                <CalendarDays className="w-3.5 h-3.5" />
                <span>7 Ngày Trong Tuần</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>Báo Cáo Gộp</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('vouchers')}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1 text-xs font-medium transition-all gap-1.5',
              activeSubTab === 'vouchers'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Phiếu Chi NCC ({vouchers.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content based on viewType */}
      {activeSubTab === 'main' && (
        <>
          {/* VIEW TYPE 1: SHIFT (Shift detail view) */}
          {viewType === 'shift' && (
            <div className="space-y-3.5">
              {shifts.map((shift) => {
                const isExpanded = !!expandedShifts[shift.shiftId];
                const isBalanced = shift.status === 'BALANCED';
                const isMorning = shift.shiftId.toLowerCase().includes('morning');

                return (
                  <div
                    key={shift.shiftId}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                  >
                    {/* Accordion Header Row */}
                    <div
                      onClick={() => toggleShift(shift.shiftId)}
                      className="p-4.5 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white hover:bg-slate-50/70 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs',
                            !shift.isScheduled
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : isMorning
                              ? 'bg-amber-50 text-amber-600 border-amber-200/60'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-200/60'
                          )}
                        >
                          {isMorning ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm tracking-tight">{shift.name}</h4>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                                !shift.isScheduled
                                  ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                                  : isBalanced
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                  : 'bg-blue-50 text-blue-700 border-blue-200/60'
                              )}
                            >
                              {!shift.isScheduled ? (
                                <>
                                  <AlertCircle className="w-3 h-3 text-amber-600" /> Chưa Phân Lịch Trực
                                </>
                              ) : isBalanced ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã Bàn Giao Ca
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-blue-600" /> Đang Hoạt Động
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {shift.isScheduled ? (
                                <span className="text-slate-800 font-semibold">
                                  {shift.pharmacistName || shift.staffName}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Chưa có dược sĩ nhận ca</span>
                              )}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-slate-700 font-mono">
                              {shift.ordersCount} đơn POS thực tế
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Metrics in Header */}
                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Dòng Tiền Thuần
                          </span>
                          <span className="text-sm font-bold font-mono text-emerald-600">
                            +{shift.netFlow.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Số Dư Két Cuối Ca
                          </span>
                          <span
                            className={cn(
                              'text-sm font-bold font-mono',
                              shift.isScheduled ? 'text-slate-900' : 'text-slate-400 italic font-normal text-xs'
                            )}
                          >
                            {shift.isScheduled
                              ? `${shift.closingDrawerBalance.toLocaleString('vi-VN')} đ`
                              : 'Chưa phát sinh'}
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Dropdown / Accordion Body */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in-0 duration-150">
                        {/* 3 Metric Cards for this Shift */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* Total Inflow */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                              <span>Tổng thu trong ca</span>
                              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <Banknote className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="text-xl font-bold font-mono text-emerald-700 tracking-tight">
                              +{shift.totalInflow.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                              <div className="flex justify-between">
                                <span>Tiền mặt quầy:</span>
                                <span className="text-slate-900 font-bold font-mono">
                                  +{shift.cashInflow.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>VietQR / PayOS:</span>
                                <span className="text-slate-900 font-bold font-mono">
                                  +{shift.digitalInflow.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Petty Expenses */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                              <span>Chi tiền mặt tại quầy</span>
                              <div className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                                <Receipt className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="text-xl font-bold font-mono text-rose-600 tracking-tight">
                              -{shift.pettyExpenses.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
                              Chi tiền lặt vặt trực tiếp từ két (vệ sinh quầy, đá lạnh, vật tư...)
                            </div>
                          </div>

                          {/* Drawer Balance (Matches requested pattern) */}
                          <div
                            className={cn(
                              'p-4 rounded-xl border shadow-xs transition-all',
                              shift.isScheduled
                                ? 'bg-white border-slate-200/80'
                                : 'bg-slate-50/70 border-dashed border-slate-300'
                            )}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                              <span>Két tiền mặt cuối ca</span>
                              <div
                                className={cn(
                                  'p-1 rounded-lg border',
                                  shift.isScheduled
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                )}
                              >
                                {shift.isScheduled ? (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </div>

                            {shift.isScheduled ? (
                              <>
                                <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                                  {shift.closingDrawerBalance.toLocaleString('vi-VN')} đ
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between font-medium">
                                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Cân đối 100%
                                  </span>
                                  <span className="font-mono text-slate-500">
                                    Đầu ca: {shift.openingFloat.toLocaleString('vi-VN')} đ
                                  </span>
                                </div>
                                <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate">
                                    Dược sĩ trực: <strong className="text-slate-800 font-semibold">{shift.pharmacistName || shift.staffName}</strong>
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-semibold text-slate-400 italic tracking-tight flex items-center gap-1.5 py-1">
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span>Chưa phân lịch trực ca</span>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 leading-snug">
                                  Chỉ kết chuyển và đưa ra số dư két khi dược sĩ được phân lịch trực và nhận bàn giao đầu ca.
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Table: Real POS Orders in Shift */}
                        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              Giao Dịch Bán Lẻ Tại Quầy POS Trong Ca (Database MongoDB)
                            </h5>
                            <span className="text-xs text-slate-500 font-medium font-mono">
                              {shift.recentOrders?.length || 0} đơn hàng
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                                <tr>
                                  <th className="px-4 py-2.5">Mã Đơn POS</th>
                                  <th className="px-4 py-2.5">Thời Gian</th>
                                  <th className="px-4 py-2.5">Khách Hàng</th>
                                  <th className="px-4 py-2.5">Phương Thức Thanh Toán</th>
                                  <th className="px-4 py-2.5 text-right">Số Tiền</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {shift.recentOrders && shift.recentOrders.length > 0 ? (
                                  shift.recentOrders.map((ord, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                        #{ord.orderId}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-500 font-mono">
                                        {new Date(ord.createdAt || Date.now()).toLocaleTimeString('vi-VN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </td>
                                      <td className="px-4 py-2.5 font-medium text-slate-800">
                                        {ord.customerName}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        {ord.paymentMethod === 'CASH' || ord.paymentMethod === 'TIEN_MAT' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                            <Banknote className="w-3 h-3" /> Tiền Mặt Quầy
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                            <CreditCard className="w-3 h-3" /> VietQR / PayOS
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-bold font-mono text-slate-900">
                                        +{Number(ord.amount).toLocaleString('vi-VN')} đ
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                                      Chưa phát sinh giao dịch bán lẻ nào trong ca trực này.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW TYPE 2: DAY (Consolidated daily view) */}
          {viewType === 'day' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Tổng Hợp Gộp Dòng Tiền Ngày {currentDate}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gộp toàn bộ doanh thu quầy POS (Ca Sáng + Ca Chiều) và các khoản chi cố định/NCC
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-lg">
                    +{totalDayNet.toLocaleString('vi-VN')} đ (Dòng tiền thuần ngày)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 font-medium block">Tổng tiền mặt quầy</span>
                    <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                      +{totalDayCash.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Thu từ khách trả tiền mặt</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 font-medium block">Tổng chuyển khoản VietQR</span>
                    <span className="text-lg font-bold font-mono text-blue-700 mt-1 block">
                      +{totalDayDigital.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Tài khoản ngân hàng / PayOS</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-xs text-slate-500 font-medium block">Chi lặt vặt & xuất quỹ</span>
                    <span className="text-lg font-bold font-mono text-rose-600 mt-1 block">
                      -{totalDayExpenses.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Chi trực tiếp trong ngày</span>
                  </div>
                </div>
              </div>

              {/* Day Orders Table */}
              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Toàn Bộ Giao Dịch Trong Ngày ({allDayOrders.length} đơn hàng)
                  </h5>
                  <span className="text-xs font-bold font-mono text-slate-700">
                    Tổng: +{totalDayInflow.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-5 py-2.5">Mã Đơn</th>
                        <th className="px-5 py-2.5">Thời Gian</th>
                        <th className="px-5 py-2.5">Khách Hàng</th>
                        <th className="px-5 py-2.5">Phương Thức</th>
                        <th className="px-5 py-2.5 text-right">Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allDayOrders.length > 0 ? (
                        allDayOrders.map((ord, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-2.5 font-mono font-bold text-slate-900">#{ord.orderId}</td>
                            <td className="px-5 py-2.5 text-slate-500 font-mono">
                              {new Date(ord.createdAt || Date.now()).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-5 py-2.5 font-medium text-slate-800">{ord.customerName}</td>
                            <td className="px-5 py-2.5">
                              {ord.paymentMethod === 'CASH' || ord.paymentMethod === 'TIEN_MAT' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  <Banknote className="w-3 h-3" /> Tiền Mặt
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                  <CreditCard className="w-3 h-3" /> VietQR / PayOS
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right font-bold font-mono text-slate-900">
                              +{Number(ord.amount).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">
                            Chưa phát sinh giao dịch nào trong ngày này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TYPE 3: WEEK (Consolidated weekly view - 7 days) */}
          {viewType === 'week' && (
            <div className="space-y-4">
              {/* 7 Days Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {weekDaysData.map((d) => {
                  const isPositive = d.netFlow >= 0;
                  const isCurrentDay = d.date === currentDate;

                  return (
                    <div
                      key={d.date}
                      className={cn(
                        'p-3.5 rounded-2xl border transition-all flex flex-col justify-between shadow-xs',
                        isCurrentDay
                          ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800">{d.shortDay}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium block">
                          {d.ordersCount} đơn POS
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>Thu:</span>
                          <span className="font-mono text-emerald-700 font-semibold">
                            +{d.inflow > 0 ? (d.inflow / 1000).toLocaleString('vi-VN') + 'k' : '0'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>Chi:</span>
                          <span className="font-mono text-rose-600 font-semibold">
                            -{d.outflow > 0 ? (d.outflow / 1000).toLocaleString('vi-VN') + 'k' : '0'}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-600">Net:</span>
                          <span
                            className={cn(
                              'text-xs font-bold font-mono',
                              isPositive ? 'text-emerald-700' : 'text-rose-600'
                            )}
                          >
                            {isPositive ? '+' : ''}
                            {(d.netFlow / 1000).toLocaleString('vi-VN')}k
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 7-Day Table Breakdown */}
              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                    Bảng Thống Kê Gộp 7 Ngày Trong Tuần ({currentMonday} ➔ {currentSunday})
                  </h5>
                  <span className="text-xs text-slate-500 font-medium">Đơn vị: VNĐ</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-5 py-2.5">Ngày</th>
                        <th className="px-5 py-2.5">Số Đơn POS</th>
                        <th className="px-5 py-2.5 text-right">Tiền Mặt Quầy</th>
                        <th className="px-5 py-2.5 text-right">VietQR / Chuyển Khoản</th>
                        <th className="px-5 py-2.5 text-right">Tổng Dòng Thu</th>
                        <th className="px-5 py-2.5 text-right">Tổng Dòng Chi</th>
                        <th className="px-5 py-2.5 text-right">Dòng Tiền Thuần (Net)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weekDaysData.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800">{d.dayName}</td>
                          <td className="px-5 py-3 font-mono font-medium text-slate-600">{d.ordersCount}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-700">
                            +{d.cashInflow.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-blue-700">
                            +{d.digitalInflow.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700">
                            +{d.inflow.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-rose-600">
                            -{d.outflow.toLocaleString('vi-VN')} đ
                          </td>
                          <td
                            className={cn(
                              'px-5 py-3 text-right font-mono font-bold',
                              d.netFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            )}
                          >
                            {d.netFlow >= 0 ? '+' : ''}
                            {d.netFlow.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TYPE 4: MONTH (Consolidated monthly view) */}
          {viewType === 'month' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Báo Cáo Dòng Tiền Gộp Toàn Chuỗi / Chi Nhánh Theo Tháng
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chuyển sang chế độ "Biểu Đồ & Sổ Quỹ" để xem trực quan tỷ trọng doanh thu và cơ cấu chi phí 12 tháng
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium block">Doanh thu bán lẻ tháng</span>
                  <span className="text-lg font-bold font-mono text-emerald-700 mt-1 block">
                    +{(totalDayInflow).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Tất cả giao dịch POS & Online</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium block">Chi phí vận hành & NCC</span>
                  <span className="text-lg font-bold font-mono text-rose-600 mt-1 block">
                    -{(totalDayExpenses).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Mặt bằng, lương & nhập kho GDP</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium block">Dòng tiền thuần tháng</span>
                  <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                    +{(totalDayNet).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Thuần sau chi trả</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* View 2: Payment Vouchers List with GDP Supplier Search */}
      {activeSubTab === 'vouchers' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header & Search Bar */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">
                  Danh Sách Phiếu Chi Nhà Cung Cấp & Đối Tác
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Chuẩn GDP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chứng từ kế toán chi trả tiền hàng PO & chi phí vận hành chi nhánh theo Playbook v2.0
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              {/* Search Input */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo NCC, mã phiếu, PO..."
                  value={voucherSearch}
                  onChange={(e) => setVoucherSearch(e.target.value)}
                  className="w-full h-8.5 pl-8.5 pr-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
                />
              </div>

              {/* Payment Method Filter */}
              <div className="inline-flex h-8.5 items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setVoucherMethodFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-all',
                    voucherMethodFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherMethodFilter('BANK_TRANSFER')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-all',
                    voucherMethodFilter === 'BANK_TRANSFER'
                      ? 'bg-white text-blue-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Chuyển Khoản
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherMethodFilter('CASH')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-all',
                    voucherMethodFilter === 'CASH'
                      ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Tiền Mặt
                </button>
              </div>

              {onOpenCreateVoucher && (
                <button
                  type="button"
                  onClick={onOpenCreateVoucher}
                  className="h-8.5 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lập Phiếu Chi Mới</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Mã Phiếu</th>
                  <th className="px-5 py-3">Ngày Chi</th>
                  <th className="px-5 py-3">Đối Tượng Nhận / NCC GDP</th>
                  <th className="px-5 py-3">Nội Dung / Hóa Đơn PO</th>
                  <th className="px-5 py-3">Phương Thức</th>
                  <th className="px-5 py-3">Trạng Thái</th>
                  <th className="px-5 py-3 text-right">Số Tiền Chi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVouchers && filteredVouchers.length > 0 ? (
                  filteredVouchers.map((v) => (
                    <tr key={v._id || v.voucherCode} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-blue-700">{v.voucherCode}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono">
                        {v.transactionDate ? new Date(v.transactionDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {v.supplierName || (v.recipientType === 'SUPPLIER' ? 'Nhà cung cấp dược phẩm' : v.recipientType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <span className="font-medium text-slate-800 block">{v.description}</span>
                        {v.purchaseOrderId && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-0.5">
                            Ref: {v.purchaseOrderId}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {v.paymentMethod === 'BANK_TRANSFER' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                            <CreditCard className="w-3 h-3" /> Chuyển Khoản
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <Banknote className="w-3 h-3" /> Tiền Mặt Quầy
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3" /> Đã Hoàn Tất
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold font-mono text-rose-600">
                        -{Number(v.amount).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400 font-medium">
                      {voucherSearch
                        ? 'Không tìm thấy phiếu chi nào khớp với từ khóa tìm kiếm.'
                        : 'Chưa có phiếu chi nào được lập trong hệ thống.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
