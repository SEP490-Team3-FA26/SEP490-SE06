import React, { useState, useEffect, useMemo } from "react";
import {
  Coins,
  Calculator,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Award,
  Edit3,
  Loader2,
  Info,
  Utensils,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  X,
  Check,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { payrollService, PayrollPeriod, PayrollItem } from "../../services/hr/payroll.service";

type StaffFilterMode = "ALL" | "ACTIVE" | "ZERO_SHIFT";

export default function BranchPayroll() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [mealRate, setMealRate] = useState<number>(50000);
  const [payroll, setPayroll] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Bộ lọc & hiển thị hướng dẫn nghiệp vụ
  const [showFormulaGuide, setShowFormulaGuide] = useState<boolean>(true);
  const [staffFilter, setStaffFilter] = useState<StaffFilterMode>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal xem phiếu lương chi tiết
  const [viewingPayslip, setViewingPayslip] = useState<PayrollItem | null>(null);

  // Modal điều chỉnh thủ công
  const [adjustingItem, setAdjustingItem] = useState<PayrollItem | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [penaltiesAmount, setPenaltiesAmount] = useState<number>(0);
  const [adjustmentNote, setAdjustmentNote] = useState<string>("");
  const [isSavingAdjust, setIsSavingAdjust] = useState<boolean>(false);

  const loadPayroll = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await payrollService.listPayrolls(selectedYear);
      const found = list.find((p) => p.month === selectedMonth && p.year === selectedYear);

      if (found) {
        const currentMealRate = found.mealAllowanceRate || mealRate;
        if (found.mealAllowanceRate) {
          setMealRate(found.mealAllowanceRate);
        }

        // Nếu bản nháp cũ chưa áp dụng Pro-rata (0 ca nhưng vẫn cộng 100% phụ cấp CCHN/PTCM), tự động đồng bộ lại công thức mới
        const hasLegacyUnproratedZeroShift =
          found.status === "DRAFT" &&
          found.items?.some(
            (it) =>
              it.actualShifts === 0 &&
              ((it.certificateAllowance || 0) > 0 || (it.picAllowance || 0) > 0),
          );

        if (hasLegacyUnproratedZeroShift) {
          const recalculated = await payrollService.calculatePayroll(
            selectedMonth,
            selectedYear,
            undefined,
            currentMealRate,
          );
          setPayroll(recalculated);
        } else {
          setPayroll(found);
        }
      } else {
        setPayroll(null);
      }
    } catch (err: any) {
      console.error("Lỗi tải bảng lương:", err);
      setError(err?.response?.data?.message || "Không thể tải dữ liệu bảng lương.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, selectedYear]);

  const handleCalculateDraft = async () => {
    setCalculating(true);
    setError("");
    setSuccess("");
    try {
      const res = await payrollService.calculatePayroll(selectedMonth, selectedYear, undefined, mealRate);
      setPayroll(res);
      setSuccess(
        `Đã tính toán bảng lương dự thảo tháng ${selectedMonth}/${selectedYear} theo định mức ăn trưa ${mealRate.toLocaleString("vi-VN")} đ/ca thành công!`,
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Lỗi khi tính toán bảng lương.");
    } finally {
      setCalculating(false);
    }
  };

  const handleApprovePayroll = async () => {
    if (!payroll) return;
    if (
      !window.confirm(
        `Xác nhận phê duyệt bảng lương Tháng ${selectedMonth}/${selectedYear} cho toàn bộ nhân sự chi nhánh? Quản lý chi nhánh chịu mọi trách nhiệm và rủi ro về bảng lương này.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await payrollService.approvePayroll(payroll._id);
      setPayroll(res);
      setSuccess("Quản lý chi nhánh đã phê duyệt bảng lương thành công!");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Lỗi khi phê duyệt bảng lương.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAdjustModal = (item: PayrollItem) => {
    setAdjustingItem(item);
    setAdjustmentAmount(item.manualAdjustment || 0);
    setPenaltiesAmount(item.penalties || 0);
    setAdjustmentNote(item.adjustmentNote || "");
  };

  const handleSaveAdjustment = async () => {
    if (!payroll || !adjustingItem) return;
    setIsSavingAdjust(true);
    try {
      const res = await payrollService.adjustPayrollItem(payroll._id, {
        employeeId: adjustingItem.employeeId,
        manualAdjustment: Number(adjustmentAmount),
        penalties: Number(penaltiesAmount),
        adjustmentNote,
      });
      setPayroll(res);
      setAdjustingItem(null);
      setSuccess(`Đã cập nhật điều chỉnh cho nhân viên ${adjustingItem.employeeName}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi khi cập nhật điều chỉnh.");
    } finally {
      setIsSavingAdjust(false);
    }
  };

  const formatVND = (num: number) => {
    return Math.round(num || 0).toLocaleString("vi-VN") + " đ";
  };

  const formatRoleLabel = (role: string) => {
    switch ((role || "").toLowerCase()) {
      case "branch":
        return "Quản lý chi nhánh";
      case "pharmacist":
        return "Dược sĩ bán hàng";
      case "warehouse":
        return "Thủ kho";
      default:
        return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Dự Thảo (Chưa Duyệt)
          </span>
        );
      case "SUBMITTED":
      case "APPROVED":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Quản Lý Đã Phê Duyệt
          </span>
        );
      case "PAID":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            Đã Chi Trả
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Phân loại & sắp xếp danh sách nhân viên (Ưu tiên nhân sự có phát sinh công/lương lên đầu bảng)
  const { sortedItems, filteredItems, activeCount, zeroShiftCount, totals } = useMemo(() => {
    const items = [...(payroll?.items || [])];

    // Sắp xếp: Nhân viên có Thực lĩnh > 0 hoặc Ca thực > 0 đứng trước, sau đó theo tên
    items.sort((a, b) => {
      const aActive = a.actualShifts > 0 || a.netSalary > 0 ? 1 : 0;
      const bActive = b.actualShifts > 0 || b.netSalary > 0 ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      if (b.netSalary !== a.netSalary) return b.netSalary - a.netSalary;
      if (b.actualShifts !== a.actualShifts) return b.actualShifts - a.actualShifts;
      return (a.employeeName || "").localeCompare(b.employeeName || "vi");
    });

    const active = items.filter((it) => it.actualShifts > 0 || it.netSalary > 0 || it.grossSalary > 0);
    const zero = items.filter((it) => it.actualShifts === 0 && it.netSalary === 0 && it.grossSalary === 0);

    const filtered = items.filter((it) => {
      if (staffFilter === "ACTIVE" && !(it.actualShifts > 0 || it.netSalary > 0 || it.grossSalary > 0)) {
        return false;
      }
      if (staffFilter === "ZERO_SHIFT" && (it.actualShifts > 0 || it.netSalary > 0 || it.grossSalary > 0)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (it.employeeName || "").toLowerCase().includes(q) ||
          (it.role || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    const summary = filtered.reduce(
      (acc, it) => {
        acc.actualShifts += it.actualShifts || 0;
        acc.otShifts += it.otShifts || 0;
        acc.shiftAndOtSalary += (it.standardSalary || 0) + (it.otSalary || 0);
        acc.certificateAllowance += it.certificateAllowance || 0;
        acc.picAllowance += it.picAllowance || 0;
        acc.mealAllowance += it.mealAllowance || 0;
        acc.commissionAmount += it.commissionAmount || 0;
        acc.personalSalesRevenue += it.personalSalesRevenue || 0;
        acc.bonusAndAdjust += (it.branchBonus || 0) + (it.manualAdjustment || 0);
        acc.penalties += it.penalties || 0;
        acc.grossSalary += it.grossSalary || 0;
        acc.netSalary += it.netSalary || 0;
        return acc;
      },
      {
        actualShifts: 0,
        otShifts: 0,
        shiftAndOtSalary: 0,
        certificateAllowance: 0,
        picAllowance: 0,
        mealAllowance: 0,
        commissionAmount: 0,
        personalSalesRevenue: 0,
        bonusAndAdjust: 0,
        penalties: 0,
        grossSalary: 0,
        netSalary: 0,
      },
    );

    return {
      sortedItems: items,
      filteredItems: filtered,
      activeCount: active.length,
      zeroShiftCount: zero.length,
      totals: summary,
    };
  }, [payroll, staffFilter, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
              <Coins size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Quản Lý Bảng Lương & Hoa Hồng Chi Nhánh
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng hợp lương ca thực tế (chuẩn 26 ca), phụ cấp bằng cấp CCHN & PTCM theo tỷ lệ công, hoa hồng POS 1% và khấu trừ kỷ luật
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tháng / Năm & Nút Hành Động */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 pl-2">Tháng:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 pr-2 py-1 outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <span className="text-xs font-semibold text-slate-500">Năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 pr-2 py-1 outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Cấu hình tiền ăn trưa chung cho toàn chi nhánh */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 px-2.5 rounded-xl border border-slate-200">
            <Utensils size={14} className="text-sky-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Ăn trưa:</span>
            <input
              type="number"
              step={5000}
              min={0}
              value={mealRate}
              disabled={calculating || Boolean(payroll && ["APPROVED", "PAID"].includes(payroll.status))}
              onChange={(e) => setMealRate(Math.max(0, Number(e.target.value)))}
              className="w-20 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-2 py-1 outline-none focus:border-sky-500 text-right"
              title="Định mức phụ cấp ăn trưa chung cho toàn bộ nhân sự chi nhánh (VNĐ/ca)"
            />
            <span className="text-[11px] font-semibold text-slate-500">đ/ca</span>
          </div>

          <button
            onClick={handleCalculateDraft}
            disabled={calculating || Boolean(payroll && ["APPROVED", "PAID"].includes(payroll.status))}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            {calculating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
            <span>Tính Dự Thảo Lương</span>
          </button>

          {payroll && ["DRAFT", "SUBMITTED"].includes(payroll.status) && (
            <button
              onClick={handleApprovePayroll}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              <span>Quản Lý Phê Duyệt Bảng Lương</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Khung Giải Thích Nghiệp Vụ & Công Thức Tính Lương Chuẩn GPP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFormulaGuide((prev) => !prev)}
          className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-sky-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              Chú Thích Thuật Ngữ & Quy Tắc Tính Lương Chuẩn Chuỗi Nhà Thuốc GPP
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-700 rounded-md">
              Công thức minh bạch 100%
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <span>{showFormulaGuide ? "Thu gọn" : "Xem công thức"}</span>
            {showFormulaGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {showFormulaGuide && (
          <div className="p-5 border-t border-slate-200 space-y-4">
            {/* Dải công thức tổng quát */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="text-xs font-bold text-sky-950">
                CÔNG THỨC THỰC LĨNH (NET) ={" "}
                <span className="text-sky-700">
                  Lương Ca (+OT) + Phụ Cấp CCHN + Phụ Cấp PTCM + Ăn Trưa + Hoa Hồng POS (1%) + Thưởng/Điều Chỉnh
                </span>{" "}
                <span className="text-rose-600">- Khấu Trừ Vi Phạm</span>
              </div>
              <span className="text-[11px] font-semibold text-sky-700 shrink-0">
                Định mức chuẩn: 26 ca / tháng
              </span>
            </div>

            {/* 4 khối giải thích chi tiết */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-sky-600" />
                  <span>1. Lương Ca & Tăng Ca (OT)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>Đơn giá 1 ca</strong> = <code className="bg-white px-1 py-0.5 rounded border">Lương cơ bản / 26 ca</code>.
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>Lương ca thực tế</strong> = <code className="bg-white px-1 py-0.5 rounded border">Đơn giá ca x Số ca thực (tối đa 26)</code>.
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>Ca vượt chuẩn (&gt; 26 ca)</strong>: Tính Tăng ca (OT) hưởng hệ số <strong>150%</strong> đơn giá ca.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-1.5">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Award size={14} className="text-amber-600" />
                  <span>2. Phụ Cấp CCHN & PTCM (Pro-rata)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>CCHN (Chứng chỉ hành nghề Dược)</strong>: Phụ cấp bằng cấp đã được Quản lý duyệt.
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>PTCM (Phụ trách chuyên môn)</strong>: Dược sĩ đứng tên pháp lý cơ sở GPP (định mức <strong>3.000.000 đ/tháng</strong>).
                </p>
                <p className="text-amber-800 font-medium leading-relaxed text-[11px]">
                  • <strong>Quy tắc Pro-rata</strong>: Tính theo tỷ lệ <code className="bg-white px-1 py-0.5 rounded border">Định mức x (Số ca thực / 26)</code>. Nhân sự 0 ca không phát sinh phụ cấp.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-200/70 space-y-1.5">
                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-purple-600" />
                  <span>3. Ăn Trưa & Hoa Hồng POS (1%)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>Phụ cấp Ăn trưa</strong> = <code className="bg-white px-1 py-0.5 rounded border">Định mức ăn/ca x Số ca thực tế</code> (chỉ tính ngày có đi làm).
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>Hoa hồng POS (1%)</strong> = <code className="bg-white px-1 py-0.5 rounded border">1% x Doanh số POS cá nhân</code> từ các hóa đơn Dược sĩ trực tiếp đứng quầy bán.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200/70 space-y-1.5">
                <div className="font-bold text-rose-950 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-rose-600" />
                  <span>4. Khấu Trừ & Điều Chỉnh</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>Phạt đi muộn</strong>: Tự động trừ <strong>50.000 đ / lần</strong> Check-in trễ quá 15 phút so với giờ bắt đầu ca.
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  • <strong>Tính công theo từng ca trực</strong>: Mỗi ca làm việc (kể cả nhân sự tăng cường làm nhiều ca/ngày) tính đủ 1 công chuẩn sau khi hoàn thành Check-in và Check-out. Hệ thống tự động chống trùng bản ghi trong cùng 1 ca.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thông báo lỗi & thành công */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-emerald-800">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3">
          <Loader2 size={30} className="animate-spin text-sky-600" />
          <p className="text-xs font-semibold text-slate-500">Đang tải và đồng bộ dữ liệu bảng lương...</p>
        </div>
      ) : !payroll ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Coins size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Chưa Có Bảng Lương Tháng {selectedMonth}/{selectedYear}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bảng lương tháng này chưa được tạo hoặc tính toán. Nhấp vào nút &quot;Tính Dự Thảo Lương&quot; để hệ thống tự động tổng hợp công và hoa hồng.
          </p>
        </div>
      ) : (
        <>
          {/* 3. Thẻ Thống Kê Tổng Quan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tổng Quỹ Lương Gross</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <DollarSign size={18} />
                </span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2">{formatVND(payroll.totalGross)}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>Trạng thái:</span> {getStatusBadge(payroll.status)}
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Thực Lĩnh Chi Trả (Net)</span>
                <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <Coins size={18} />
                </span>
              </div>
              <p className="text-xl font-extrabold text-sky-700 mt-2">{formatVND(payroll.totalNet)}</p>
              <p className="text-[11px] text-slate-500 mt-2">
                Nhân sự phát sinh lương:{" "}
                <strong className="text-emerald-700">{activeCount}</strong> /{" "}
                <strong className="text-slate-800">{payroll.items?.length || 0}</strong> người
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tổng Hoa Hồng POS (1%)</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <TrendingUp size={18} />
                </span>
              </div>
              <p className="text-xl font-extrabold text-purple-700 mt-2">
                {formatVND(payroll.items?.reduce((sum, it) => sum + (it.commissionAmount || 0), 0) || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Tổng doanh số POS:{" "}
                <strong className="text-slate-700">
                  {formatVND(payroll.items?.reduce((sum, it) => sum + (it.personalSalesRevenue || 0), 0) || 0)}
                </strong>
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tổng Phụ Cấp CCHN & PTCM</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Award size={18} />
                </span>
              </div>
              <p className="text-xl font-extrabold text-amber-700 mt-2">
                {formatVND(
                  payroll.items?.reduce(
                    (sum, it) => sum + (it.certificateAllowance || 0) + (it.picAllowance || 0),
                    0,
                  ) || 0,
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Đã quy đổi theo tỷ lệ ca làm việc thực tế / 26 ca
              </p>
            </div>
          </div>

          {/* 4. Bảng Chi Tiết Nhân Sự */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            {/* Thanh công cụ lọc nhanh nhân sự */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 mr-2">Chi Tiết Bảng Lương Nhân Viên</h2>
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setStaffFilter("ALL")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      staffFilter === "ALL"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({sortedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffFilter("ACTIVE")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      staffFilter === "ACTIVE"
                        ? "bg-white text-emerald-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Có công / thu nhập ({activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffFilter("ZERO_SHIFT")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      staffFilter === "ZERO_SHIFT"
                        ? "bg-white text-amber-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Chưa phát sinh công - 0 ca ({zeroShiftCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên nhân viên..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 w-48"
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                  Đơn vị: VNĐ
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nhân Viên</th>
                    <th className="py-3 px-2.5 text-right" title="Mức lương cơ bản định mức cho đủ 26 ca/tháng">
                      <div>Lương Cơ Bản</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Định mức 26 ca</div>
                    </th>
                    <th className="py-3 px-2.5 text-center" title="Số ca đi làm thực tế / 26 ca tiêu chuẩn">
                      <div>Ca Thực / Chuẩn</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Tối đa 1 ca/ngày</div>
                    </th>
                    <th className="py-3 px-2.5 text-right" title="Lương ca thực tế = Đơn giá ca x Số ca thực (+ Lương OT nếu vượt 26 ca)">
                      <div>Lương Ca (+OT)</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Theo công thực</div>
                    </th>
                    <th className="py-3 px-2.5 text-right" title="Phụ cấp Chứng chỉ hành nghề & Bằng cấp = Định mức x (Ca thực / 26)">
                      <div>Phụ Cấp CCHN</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Theo tỷ lệ ca</div>
                    </th>
                    <th className="py-3 px-2.5 text-right" title="Phụ cấp Dược sĩ Phụ trách chuyên môn (3.000.000đ/26 ca) = 3tr x (Ca thực / 26)">
                      <div>Phụ Cấp PTCM</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Dược sĩ đứng tên</div>
                    </th>
                    <th className="py-3 px-2.5 text-right" title="Phụ cấp ăn ca = Định mức ăn trưa/ca x Số ca thực tế">
                      <div>Ăn Trưa</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Ca thực x ĐM</div>
                    </th>
                    <th className="py-3 px-2.5 text-right" title="Hoa hồng bán lẻ = 1% x Doanh số đơn hàng POS cá nhân">
                      <div>Hoa Hồng (1%)</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">1% doanh số POS</div>
                    </th>
                    <th className="py-3 px-2.5 text-right" title="Thưởng chi nhánh hoặc điều chỉnh cộng thêm của Quản lý">
                      <div>Thưởng / Đ.Chỉnh</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Cộng thêm (+)</div>
                    </th>
                    <th className="py-3 px-2.5 text-right" title="Khấu trừ vi phạm đi muộn (50.000đ/lần muộn > 15 phút) hoặc phạt kỷ luật">
                      <div>Khấu Trừ</div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case">Muộn 50k/lần (-)</div>
                    </th>
                    <th className="py-3 px-4 text-right font-extrabold text-slate-900" title="Thực lĩnh = Tổng thu nhập Gross - Khấu trừ">
                      <div>Thực Lĩnh (Net)</div>
                      <div className="text-[9px] font-normal text-sky-600 normal-case">Chi trả thực tế</div>
                    </th>
                    <th className="py-3 px-3 text-center">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                        Không có nhân viên nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const shiftRate =
                        item.shiftRate || Math.round((item.baseSalary || 0) / (item.standardShifts || 26));
                      const bonusAndAdjust = (item.branchBonus || 0) + (item.manualAdjustment || 0);
                      const inferredLateCount =
                        item.lateCount !== undefined
                          ? item.lateCount
                          : item.penalties >= 50000
                            ? Math.round(item.penalties / 50000)
                            : 0;
                      const isZeroActivity = item.actualShifts === 0 && item.netSalary === 0;

                      return (
                        <tr
                          key={item.employeeId || idx}
                          className={`hover:bg-sky-50/40 transition-colors ${
                            isZeroActivity ? "bg-slate-50/40 text-slate-500" : ""
                          }`}
                        >
                          {/* 1. Nhân viên */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => setViewingPayslip(item)}
                              className="text-left group cursor-pointer"
                              title="Nhấn để xem phiếu lương diễn giải chi tiết"
                            >
                              <div className="font-bold text-slate-900 group-hover:text-sky-700 transition">
                                {item.employeeName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  {formatRoleLabel(item.role)}
                                </span>
                                {(item.basePicAllowance || 0) > 0 && (
                                  <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">
                                    DS. PTCM
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>

                          {/* 2. Lương cơ bản */}
                          <td className="py-3.5 px-2.5 text-right text-slate-700 font-medium">
                            <div>{formatVND(item.baseSalary)}</div>
                            <div className="text-[10px] text-slate-400">~{formatVND(shiftRate)}/ca</div>
                          </td>

                          {/* 3. Ca thực / chuẩn */}
                          <td className="py-3.5 px-2.5 text-center">
                            <div className="inline-flex items-baseline gap-0.5">
                              <span
                                className={`font-extrabold text-sm ${
                                  item.actualShifts > 0 ? "text-slate-900" : "text-slate-400"
                                }`}
                              >
                                {item.actualShifts}
                              </span>
                              <span className="text-slate-400 font-semibold"> / {item.standardShifts}</span>
                            </div>
                            {item.otShifts > 0 && (
                              <div className="text-[10px] font-bold text-emerald-600">
                                +{item.otShifts} ca OT (150%)
                              </div>
                            )}
                            {item.lateMinutes > 0 && (
                              <div className="text-[10px] text-rose-600 font-semibold">
                                Muộn {inferredLateCount > 0 ? `${inferredLateCount} lần • ` : ""}
                                {item.lateMinutes}p
                              </div>
                            )}
                          </td>

                          {/* 4. Lương ca (+OT) */}
                          <td className="py-3.5 px-2.5 text-right">
                            <div
                              className={`font-bold ${
                                item.standardSalary + (item.otSalary || 0) > 0
                                  ? "text-slate-900"
                                  : "text-slate-400"
                              }`}
                            >
                              {formatVND((item.standardSalary || 0) + (item.otSalary || 0))}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.actualShifts > 0
                                ? `${Math.min(item.actualShifts, item.standardShifts)} ca x ${formatVND(shiftRate)}`
                                : "Chưa có ca trực"}
                            </div>
                            {item.otSalary > 0 && (
                              <div className="text-[10px] text-emerald-600 font-medium">
                                (Gồm OT: {formatVND(item.otSalary)})
                              </div>
                            )}
                          </td>

                          {/* 5. Phụ cấp CCHN */}
                          <td className="py-3.5 px-2.5 text-right">
                            {item.certificateAllowance > 0 ? (
                              <>
                                <div className="font-bold text-amber-700">
                                  {formatVND(item.certificateAllowance)}
                                </div>
                                {(item.baseCertificateAllowance || 0) > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    ĐM: {formatVND(item.baseCertificateAllowance || 0)} ({item.actualShifts}/26 ca)
                                  </div>
                                )}
                              </>
                            ) : (item.baseCertificateAllowance || 0) > 0 ? (
                              <div>
                                <div className="text-slate-400 font-semibold">0 đ</div>
                                <div
                                  className="text-[10px] text-amber-600/80"
                                  title="Nhân sự có bằng cấp CCHN nhưng tháng này 0 ca làm việc nên phụ cấp Pro-rata = 0đ"
                                >
                                  0/26 ca (ĐM: {formatVND(item.baseCertificateAllowance || 0)})
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 6. Phụ cấp PTCM */}
                          <td className="py-3.5 px-2.5 text-right">
                            {item.picAllowance > 0 ? (
                              <>
                                <div className="font-bold text-indigo-700">{formatVND(item.picAllowance)}</div>
                                {(item.basePicAllowance || 0) > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    ĐM: {formatVND(item.basePicAllowance || 0)} ({item.actualShifts}/26 ca)
                                  </div>
                                )}
                              </>
                            ) : (item.basePicAllowance || 0) > 0 ? (
                              <div>
                                <div className="text-slate-400 font-semibold">0 đ</div>
                                <div
                                  className="text-[10px] text-indigo-600/80"
                                  title="Dược sĩ PTCM nhưng tháng này 0 ca làm việc nên phụ cấp Pro-rata = 0đ"
                                >
                                  0/26 ca (ĐM: {formatVND(item.basePicAllowance || 0)})
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 7. Ăn trưa */}
                          <td className="py-3.5 px-2.5 text-right">
                            <div
                              className={`font-semibold ${
                                item.mealAllowance > 0 ? "text-slate-800" : "text-slate-400"
                              }`}
                            >
                              {formatVND(item.mealAllowance)}
                            </div>
                            <div className="text-[10px] text-sky-600 font-medium">
                              {item.actualShifts} ca x{" "}
                              {formatVND(item.mealAllowanceRate || payroll.mealAllowanceRate || mealRate)}
                            </div>
                          </td>

                          {/* 8. Hoa hồng POS 1% */}
                          <td className="py-3.5 px-2.5 text-right">
                            {item.commissionAmount > 0 ? (
                              <>
                                <div className="text-purple-700 font-bold">
                                  {formatVND(item.commissionAmount)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  DS: {formatVND(item.personalSalesRevenue)}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 9. Thưởng / Điều chỉnh (+) */}
                          <td className="py-3.5 px-2.5 text-right">
                            {bonusAndAdjust > 0 ? (
                              <>
                                <div className="text-emerald-700 font-bold">+{formatVND(bonusAndAdjust)}</div>
                                {item.adjustmentNote && (
                                  <div
                                    className="text-[10px] text-slate-400 max-w-[110px] truncate ml-auto"
                                    title={item.adjustmentNote}
                                  >
                                    {item.adjustmentNote}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 10. Khấu trừ (-) */}
                          <td className="py-3.5 px-2.5 text-right">
                            {item.penalties > 0 ? (
                              <>
                                <div className="text-rose-600 font-bold">-{formatVND(item.penalties)}</div>
                                <div className="text-[10px] text-rose-500">
                                  {inferredLateCount > 0
                                    ? `Muộn ${inferredLateCount} lần (-50k)`
                                    : item.adjustmentNote || "Phạt vi phạm"}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 11. Thực lĩnh (Net) */}
                          <td className="py-3.5 px-4 text-right">
                            <div
                              className={`font-extrabold text-sm ${
                                item.netSalary > 0 ? "text-sky-800" : "text-slate-400"
                              }`}
                            >
                              {formatVND(item.netSalary)}
                            </div>
                            {item.grossSalary !== item.netSalary && (
                              <div className="text-[10px] text-slate-400">
                                Gross: {formatVND(item.grossSalary)}
                              </div>
                            )}
                          </td>

                          {/* 12. Hành động */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingPayslip(item)}
                                className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                                title="Xem phiếu lương chi tiết"
                              >
                                <FileText size={15} />
                              </button>
                              {payroll.status === "DRAFT" && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjustModal(item)}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="Điều chỉnh thưởng / phạt"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Dòng Tổng Cộng Cuối Bảng (Khớp 100% cộng ngang & cộng dọc) */}
                {filteredItems.length > 0 && (
                  <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 text-xs font-extrabold text-slate-900">
                    <tr>
                      <td className="py-3.5 px-4">
                        <div>TỔNG CỘNG ({filteredItems.length} NHÂN SỰ)</div>
                        <div className="text-[10px] font-medium text-slate-500">
                          Đối chiếu khớp ngang & dọc 100%
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-slate-400 font-semibold">-</td>
                      <td className="py-3.5 px-2.5 text-center">
                        <span className="text-slate-900">{totals.actualShifts} ca</span>
                        {totals.otShifts > 0 && (
                          <div className="text-[10px] text-emerald-700">+{totals.otShifts} OT</div>
                        )}
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-slate-900">
                        {formatVND(totals.shiftAndOtSalary)}
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-amber-800">
                        {formatVND(totals.certificateAllowance)}
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-indigo-800">
                        {formatVND(totals.picAllowance)}
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-slate-800">
                        {formatVND(totals.mealAllowance)}
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-purple-800">
                        <div>{formatVND(totals.commissionAmount)}</div>
                        <div className="text-[9px] font-normal text-slate-500">
                          DS: {formatVND(totals.personalSalesRevenue)}
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-emerald-700">
                        {totals.bonusAndAdjust > 0 ? `+${formatVND(totals.bonusAndAdjust)}` : "0 đ"}
                      </td>
                      <td className="py-3.5 px-2.5 text-right text-rose-600">
                        {totals.penalties > 0 ? `-${formatVND(totals.penalties)}` : "0 đ"}
                      </td>
                      <td className="py-3.5 px-4 text-right text-sky-800 text-sm">
                        <div>{formatVND(totals.netSalary)}</div>
                        <div className="text-[10px] font-medium text-slate-500">
                          Gross: {formatVND(totals.grossSalary)}
                        </div>
                      </td>
                      <td className="py-3.5 px-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 5. Modal Phiếu Lương Chi Tiết Từng Nhân Viên (Payslip Breakdown Modal) */}
      {viewingPayslip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded text-[10px] font-extrabold uppercase">
                    Phiếu Lương Chi Tiết T{selectedMonth}/{selectedYear}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {formatRoleLabel(viewingPayslip.role)}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {viewingPayslip.employeeName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingPayslip(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tóm tắt chấm công */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Lương cơ bản (26 ca)</span>
                <strong className="text-slate-900 text-sm">{formatVND(viewingPayslip.baseSalary)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Số ca thực tế / Chuẩn</span>
                <strong className="text-sky-700 text-sm">
                  {viewingPayslip.actualShifts} / {viewingPayslip.standardShifts} ca
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Đi muộn (&gt;15 phút)</span>
                <strong className="text-rose-600 text-sm">
                  {viewingPayslip.lateMinutes > 0
                    ? `${viewingPayslip.lateCount || Math.round(viewingPayslip.penalties / 50000)} lần (${viewingPayslip.lateMinutes}p)`
                    : "Không vi phạm"}
                </strong>
              </div>
            </div>

            {/* Bảng diễn giải từng khoản */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">
                I. Các Khoản Thu Nhập (+)
              </div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">1. Lương ca tiêu chuẩn</div>
                    <div className="text-[11px] text-slate-500">
                      {Math.min(viewingPayslip.actualShifts, viewingPayslip.standardShifts)} ca x{" "}
                      {formatVND(
                        viewingPayslip.shiftRate ||
                          Math.round(viewingPayslip.baseSalary / (viewingPayslip.standardShifts || 26)),
                      )}
                      /ca
                    </div>
                  </div>
                  <div className="font-bold text-slate-900">{formatVND(viewingPayslip.standardSalary)}</div>
                </div>

                {viewingPayslip.otShifts > 0 && (
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">2. Lương tăng ca (OT 150%)</div>
                      <div className="text-[11px] text-slate-500">
                        {viewingPayslip.otShifts} ca vượt chuẩn x 150% đơn giá ca
                      </div>
                    </div>
                    <div className="font-bold text-emerald-700">{formatVND(viewingPayslip.otSalary)}</div>
                  </div>
                )}

                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Phụ cấp Chứng chỉ hành nghề & Bằng cấp (CCHN)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {(viewingPayslip.baseCertificateAllowance || 0) > 0
                        ? `Định mức ${formatVND(viewingPayslip.baseCertificateAllowance || 0)} x (${viewingPayslip.actualShifts}/26 ca)`
                        : "Không có định mức phụ cấp bằng cấp"}
                    </div>
                  </div>
                  <div className="font-bold text-amber-700">
                    {formatVND(viewingPayslip.certificateAllowance)}
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Phụ cấp Dược sĩ Phụ trách chuyên môn (PTCM)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {(viewingPayslip.basePicAllowance || 0) > 0
                        ? `Định mức ${formatVND(viewingPayslip.basePicAllowance || 0)} x (${viewingPayslip.actualShifts}/26 ca)`
                        : "Không giữ vai trò Dược sĩ PTCM đứng tên cơ sở"}
                    </div>
                  </div>
                  <div className="font-bold text-indigo-700">{formatVND(viewingPayslip.picAllowance)}</div>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Phụ cấp ăn trưa</div>
                    <div className="text-[11px] text-slate-500">
                      {viewingPayslip.actualShifts} ca thực tế x{" "}
                      {formatVND(viewingPayslip.mealAllowanceRate || payroll?.mealAllowanceRate || mealRate)}
                      /ca
                    </div>
                  </div>
                  <div className="font-bold text-slate-800">{formatVND(viewingPayslip.mealAllowance)}</div>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Hoa hồng bán lẻ POS (1%)</div>
                    <div className="text-[11px] text-slate-500">
                      1% x Doanh số cá nhân ({formatVND(viewingPayslip.personalSalesRevenue)})
                    </div>
                  </div>
                  <div className="font-bold text-purple-700">
                    {formatVND(viewingPayslip.commissionAmount)}
                  </div>
                </div>

                {((viewingPayslip.branchBonus || 0) > 0 || (viewingPayslip.manualAdjustment || 0) > 0) && (
                  <div className="p-3 flex items-center justify-between bg-emerald-50/40">
                    <div>
                      <div className="font-semibold text-emerald-900">Thưởng / Điều chỉnh cộng thêm</div>
                      <div className="text-[11px] text-emerald-700">
                        {viewingPayslip.adjustmentNote || "Quản lý chi nhánh điều chỉnh"}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-700">
                      +{formatVND((viewingPayslip.branchBonus || 0) + (viewingPayslip.manualAdjustment || 0))}
                    </div>
                  </div>
                )}

                <div className="p-3 flex items-center justify-between bg-slate-50 font-bold">
                  <span className="text-slate-700">TỔNG THU NHẬP GROSS (A)</span>
                  <span className="text-slate-900 text-sm">{formatVND(viewingPayslip.grossSalary)}</span>
                </div>
              </div>

              <div className="font-bold text-slate-700 uppercase text-[11px] tracking-wider pt-2">
                II. Các Khoản Khấu Trừ (-)
              </div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Khấu trừ đi muộn & Vi phạm nội quy (B)</div>
                    <div className="text-[11px] text-slate-500">
                      {viewingPayslip.penalties > 0
                        ? `Đi muộn quá 15 phút: 50.000 đ/lần (Tổng ${viewingPayslip.lateMinutes} phút muộn)`
                        : "Không có khoản khấu trừ"}
                    </div>
                  </div>
                  <div className="font-bold text-rose-600">
                    {viewingPayslip.penalties > 0 ? `-${formatVND(viewingPayslip.penalties)}` : "0 đ"}
                  </div>
                </div>
              </div>

              {/* Tổng thực lĩnh */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between mt-3">
                <div>
                  <div className="text-xs font-extrabold text-sky-950 uppercase">
                    THỰC LĨNH CHI TRẢ (NET = A - B)
                  </div>
                  <div className="text-[11px] text-sky-700">
                    {formatVND(viewingPayslip.grossSalary)} - {formatVND(viewingPayslip.penalties)}
                  </div>
                </div>
                <div className="text-lg font-extrabold text-sky-800">
                  {formatVND(viewingPayslip.netSalary)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {payroll?.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingPayslip;
                    setViewingPayslip(null);
                    handleOpenAdjustModal(target);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs cursor-pointer"
                >
                  Điều Chỉnh Thưởng / Phạt
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingPayslip(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Điều Chỉnh Thưởng / Phạt */}
      {adjustingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Điều Chỉnh Lương: <span className="text-sky-700">{adjustingItem.employeeName}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Thưởng / Điều Chỉnh Tăng (VNĐ):
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={adjustmentAmount}
                  onKeyDown={(e) => {
                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => setAdjustmentAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-bold outline-none focus:border-sky-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Khấu Trừ Vi Phạm (VNĐ):
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={penaltiesAmount}
                  onKeyDown={(e) => {
                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => setPenaltiesAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-rose-700 font-bold outline-none focus:border-rose-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi Chú Điều Chỉnh:</label>
                <textarea
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-sky-500"
                  rows={3}
                  placeholder="Lý do điều chỉnh thưởng KPI hoặc phạt vi phạm..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={isSavingAdjust}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingAdjust ? "Đang lưu..." : "Lưu Điều Chỉnh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
