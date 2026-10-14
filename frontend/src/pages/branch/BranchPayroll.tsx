import React, { useState, useEffect } from "react";
import {
  Coins,
  Calculator,
  Send,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Award,
  Clock,
  ShieldCheck,
  Edit3,
  Calendar,
  Loader2,
  ChevronRight,
  Info,
  Utensils,
} from "lucide-react";
import { payrollService, PayrollPeriod, PayrollItem } from "../../services/hr/payroll.service";

export default function BranchPayroll() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [mealRate, setMealRate] = useState<number>(50000); // Mức ăn trưa chung toàn chi nhánh (50k/ca mặc định, quản lý có thể sửa lên 60k)
  const [payroll, setPayroll] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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
      setPayroll(found || null);
      if (found?.mealAllowanceRate) {
        setMealRate(found.mealAllowanceRate);
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
      setSuccess(`Đã tính toán bảng lương dự thảo tháng ${selectedMonth}/${selectedYear} theo định mức ăn trưa ${mealRate.toLocaleString('vi-VN')} đ/ca thành công!`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Lỗi khi tính toán bảng lương.");
    } finally {
      setCalculating(false);
    }
  };

  const handleApprovePayroll = async () => {
    if (!payroll) return;
    if (!window.confirm(`Xác nhận phê duyệt bảng lương Tháng ${selectedMonth}/${selectedYear} cho toàn bộ nhân sự chi nhánh? Quản lý chi nhánh chịu mọi trách nhiệm và rủi ro về bảng lương này.`)) {
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
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Dự Thảo (Chưa Duyệt)</span>;
      case "SUBMITTED":
      case "APPROVED":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Quản Lý Đã Phê Duyệt</span>;
      case "PAID":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Đã Chi Trả</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="text-emerald-600" size={26} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản Lý Bảng Lương & Hoa Hồng Chi Nhánh</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp lương ca làm việc, phụ cấp bằng cấp & CCHN, hoa hồng POS 1% và thưởng đạt chỉ tiêu
          </p>
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
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <span className="text-xs font-semibold text-slate-500">Năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 pr-2 py-1 outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Cấu hình tiền ăn trưa chung cho toàn chi nhánh */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 px-2.5 rounded-xl border border-slate-200">
            <Utensils size={14} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Ăn trưa:</span>
            <input
              type="number"
              step={5000}
              min={0}
              value={mealRate}
              disabled={calculating || (payroll && ["APPROVED", "PAID"].includes(payroll.status))}
              onChange={(e) => setMealRate(Math.max(0, Number(e.target.value)))}
              className="w-20 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-2 py-1 outline-none focus:border-emerald-500 text-right"
              title="Định mức phụ cấp ăn trưa chung cho toàn bộ nhân sự chi nhánh (VNĐ/ca)"
            />
            <span className="text-[11px] font-semibold text-slate-500">đ/ca</span>
          </div>

          <button
            onClick={handleCalculateDraft}
            disabled={calculating || (payroll && ["APPROVED", "PAID"].includes(payroll.status))}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
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
          <Loader2 size={30} className="animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-slate-500">Đang tải dữ liệu bảng lương...</p>
        </div>
      ) : !payroll ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Coins size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Chưa Có Bảng Lương Tháng {selectedMonth}/{selectedYear}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bảng lương tháng này chưa được tạo hoặc tính toán. Nhấp vào nút &quot;Tính Dự Thảo Lương&quot; để hệ thống tự động tổng hợp công và hoa hồng.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Thẻ Thống Kê Tổng Quan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tổng Quỹ Lương Gross</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={18} /></span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2">{formatVND(payroll.totalGross)}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>Trạng thái:</span> {getStatusBadge(payroll.status)}
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Thực Lĩnh Chi Trả (Net)</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Coins size={18} /></span>
              </div>
              <p className="text-xl font-extrabold text-emerald-700 mt-2">{formatVND(payroll.totalNet)}</p>
              <p className="text-[11px] text-slate-500 mt-2">Tổng số nhân sự: <strong className="text-slate-800">{payroll.items?.length || 0}</strong></p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tổng Hoa Hồng POS (1%)</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-xl"><TrendingUp size={18} /></span>
              </div>
              <p className="text-xl font-extrabold text-purple-700 mt-2">
                {formatVND(payroll.items?.reduce((sum, it) => sum + (it.commissionAmount || 0), 0))}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">Trực tiếp từ các đơn hàng POS</p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tổng Phụ Cấp CCHN & PTCM</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Award size={18} /></span>
              </div>
              <p className="text-xl font-extrabold text-amber-700 mt-2">
                {formatVND(payroll.items?.reduce((sum, it) => sum + (it.certificateAllowance || 0) + (it.picAllowance || 0), 0))}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">Bằng cấp & Dược sĩ phụ trách</p>
            </div>
          </div>

          {/* 3. Bảng Chi Tiết Nhân Sự */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Chi Tiết Bảng Lương Từng Nhân Viên</h2>
              <span className="text-xs text-slate-500">Đơn vị tiền tệ: VNĐ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nhân Viên</th>
                    <th className="py-3 px-3 text-right">Lương Cơ Bản</th>
                    <th className="py-3 px-3 text-center">Ca Thực / Chuẩn</th>
                    <th className="py-3 px-3 text-right">Lương Ca</th>
                    <th className="py-3 px-3 text-right">Phụ Cấp CCHN</th>
                    <th className="py-3 px-3 text-right">PTCM</th>
                    <th className="py-3 px-3 text-right">Ăn Trưa</th>
                    <th className="py-3 px-3 text-right">Hoa Hồng (1%)</th>
                    <th className="py-3 px-3 text-right">Khấu Trừ</th>
                    <th className="py-3 px-4 text-right font-extrabold text-slate-900">Thực Lĩnh</th>
                    <th className="py-3 px-3 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payroll.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{item.employeeName}</div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.role}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-700">{formatVND(item.baseSalary)}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-slate-800">{item.actualShifts}</span>
                        <span className="text-slate-400"> / {item.standardShifts}</span>
                        {item.lateMinutes > 0 && (
                          <div className="text-[10px] text-rose-600 font-medium">Muộn {item.lateMinutes}p</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-semibold text-slate-800">{formatVND(item.standardSalary)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          (~{formatVND(item.shiftRate || Math.round(item.baseSalary / (item.standardShifts || 26)))}/ca)
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right text-amber-700 font-medium">
                        {item.certificateAllowance > 0 ? formatVND(item.certificateAllowance) : "-"}
                      </td>
                      <td className="py-3.5 px-3 text-right text-indigo-700 font-medium">
                        {item.picAllowance > 0 ? formatVND(item.picAllowance) : "-"}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-semibold text-slate-700">{formatVND(item.mealAllowance)}</div>
                        <div className="text-[10px] text-emerald-600 font-medium">
                          ({formatVND(item.mealAllowanceRate || payroll.mealAllowanceRate || mealRate)}/ca)
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right text-purple-700 font-bold">
                        {item.commissionAmount > 0 ? formatVND(item.commissionAmount) : "-"}
                        {item.personalSalesRevenue > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">DS: {formatVND(item.personalSalesRevenue)}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-600 font-medium">
                        {item.penalties > 0 ? `-${formatVND(item.penalties)}` : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-800 text-sm">
                        {formatVND(item.netSalary)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {payroll.status === "DRAFT" && (
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Điều chỉnh thưởng/phạt"
                          >
                            <Edit3 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 4. Modal Điều Chỉnh Thưởng / Phạt */}
      {adjustingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Điều Chỉnh Lương: <span className="text-emerald-700">{adjustingItem.employeeName}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Thưởng / Điều Chỉnh Tăng (VNĐ):</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-bold outline-none focus:border-emerald-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Khấu Trừ Vi Phạm (VNĐ):</label>
                <input
                  type="number"
                  value={penaltiesAmount}
                  onChange={(e) => setPenaltiesAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-rose-700 font-bold outline-none focus:border-rose-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi Chú Điều Chỉnh:</label>
                <textarea
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-emerald-500"
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
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
